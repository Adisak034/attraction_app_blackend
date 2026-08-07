# =============================================================================
# recommendation.py — ระบบแนะนำสถานที่ศักดิ์สิทธิ์
# =============================================================================
# Endpoints:
#   GET  /api/recommend/{user_id}       → แนะนำสถานที่สำหรับผู้ใช้
#
# หลักการแนะนำ:
#   - ผู้ใช้เก่า (เคยให้คะแนน) → Blend CF 70% + Popularity 30%
#   - ผู้ใช้ใหม่ (ยังไม่เคยให้คะแนน) → Popularity (Bayesian Average) จากฐานข้อมูล MySQL 100%
# =============================================================================

import math
import os
import pickle
from typing import Dict, Any, Tuple, List, Set

from fastapi import APIRouter, HTTPException

from app.core.database import get_connection
from app.schemas.schemas import RecommendationResponse

router = APIRouter(tags=["recommendation"])

# หมวดหมู่โมเดล (key ภาษาอังกฤษ → label ภาษาไทย)
MODEL_CATEGORIES = {
    "work": "การงาน",
    "finance": "โชคลาภ",
    "love": "ความรัก",
}

# Alias ชื่อหมวดหมู่ภาษาไทยที่อาจปรากฏใน DB (ใช้กรองสถานที่ให้ตรงหมวด)
CATEGORY_ALIASES = {
    "work": ["การงาน"],
    "finance": ["การเงิน", "โชคลาภ"],
    "love": ["ความรัก"],
}

# เก็บโมเดลไว้ใน memory แยกตามหมวดหมู่
models: Dict[str, Dict[str, Any]] = {
    category: {"user_similarity": None, "user_item_matrix": None}
    for category in MODEL_CATEGORIES
}

_models_loaded = False


# ---------------------------------------------------------------------------
# Model file helpers
# ---------------------------------------------------------------------------

def _model_storage_dir() -> str:
    """คืน path โฟลเดอร์สำหรับเก็บไฟล์โมเดล (.pkl)"""
    base_dir = os.path.dirname(__file__)
    backend_dir = os.path.abspath(os.path.join(base_dir, "..", "..", ".."))
    storage = os.path.join(backend_dir, "models", "recommendation")
    os.makedirs(storage, exist_ok=True)
    return storage


def _saved_model_path(category: str) -> str:
    """คืน path ไฟล์โมเดลสำหรับหมวดหมู่ที่ระบุ"""
    return os.path.join(_model_storage_dir(), f"recommendation_model_{category}.pkl")


def _candidate_model_paths(category: str) -> List[str]:
    """คืนรายการ path ที่อาจมีไฟล์โมเดล ตามลำดับความสำคัญ"""
    base_dir = os.path.dirname(__file__)
    backend_dir = os.path.abspath(os.path.join(base_dir, "..", "..", ".."))
    project_dir = os.path.abspath(os.path.join(backend_dir, ".."))
    filename = f"recommendation_model_{category}.pkl"
    return [
        _saved_model_path(category),                                    # โฟลเดอร์หลักของโมเดล
        os.path.join(project_dir, filename),                            # root โปรเจค
        os.path.join(project_dir, "other-backend", filename),           # other-backend
        os.path.join(backend_dir, filename),                            # backend
    ]


def _load_models_once(force: bool = False):
    """โหลดโมเดลทั้งหมดครั้งเดียว (force=True เพื่อโหลดใหม่)

    ค้นหาไฟล์ .pkl ในหลาย path แล้วโหลดเข้า memory
    ถ้าไม่พบไฟล์ ตั้งค่าโมเดลเป็น None (ระบบจะใช้ popularity-based แทน)
    """
    global _models_loaded
    if force:
        _models_loaded = False
    if _models_loaded:
        return

    for category in MODEL_CATEGORIES:
        loaded = False
        for path in _candidate_model_paths(category):
            if not os.path.exists(path):
                continue
            try:
                with open(path, "rb") as f:
                    data = pickle.load(f)
                models[category]["user_similarity"] = data.get("user_similarity_df")
                models[category]["user_item_matrix"] = data.get("user_item_matrix")
                loaded = True
                break
            except Exception:
                continue

        if not loaded:
            models[category]["user_similarity"] = None
            models[category]["user_item_matrix"] = None

    _models_loaded = True



# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def _safe_float(value: Any) -> float:
    """แปลงค่าเป็น float อย่างปลอดภัย — คืน 0.0 ถ้าเป็น None / NaN / Inf"""
    try:
        result = float(value) if value is not None else 0.0
        return 0.0 if math.isnan(result) or math.isinf(result) else result
    except Exception:
        return 0.0


def _to_int(value: Any):
    """แปลงค่าเป็น int อย่างปลอดภัย — คืน None ถ้าแปลงไม่ได้"""
    try:
        return int(str(value).strip()) if value is not None else None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Scoring helpers
# ---------------------------------------------------------------------------

def _compute_bayesian_scores(
    sums: Dict[str, Dict[int, float]],
    counts: Dict[str, Dict[int, int]],
    min_reviews: int = 3,
) -> Dict[str, Dict[int, float]]:
    """คำนวณ Popularity ด้วย Bayesian Average แยกตามหมวดหมู่

    สูตร: (n / (n + m)) × avg_rating + (m / (n + m)) × C
        n = จำนวนรีวิวของสถานที่นี้
        m = จำนวนรีวิวขั้นต่ำ (ค่าเริ่มต้น = 3)
        C = คะแนนเฉลี่ยรวมทั้งระบบ (global mean)

    ข้อดี: สถานที่ที่มีรีวิว 1 คนให้ 5 ดาวจะไม่ชนะสถานที่ที่มีรีวิว 50 คนเฉลี่ย 4.5
    """
    scores: Dict[str, Dict[int, float]] = {}

    for cat in MODEL_CATEGORIES:
        # คำนวณ global mean (C) สำหรับหมวดนี้
        total_sum = sum(sums[cat].values())
        total_count = sum(counts[cat].values())
        global_mean = total_sum / total_count if total_count > 0 else 2.5

        scores[cat] = {}
        for aid, rating_sum in sums[cat].items():
            n = counts[cat].get(aid, 0)
            if n <= 0:
                continue
            avg_rating = rating_sum / n
            m = min_reviews
            # Bayesian Average
            bayesian_score = (n / (n + m)) * avg_rating + (m / (n + m)) * global_mean
            scores[cat][aid] = bayesian_score

    return scores


def _filter_cf_by_category(
    cf_scores: Dict[int, float],
    category_key: str,
    attraction_map: Dict[int, Dict[str, Any]],
) -> Dict[int, float]:
    """กรอง CF scores ให้เหลือเฉพาะสถานที่ที่มีหมวดหมู่ตรงกับหมวดที่กำลังประมวลผล

    ป้องกันการแนะนำสถานที่ข้ามหมวดหมู่ เช่น สถานที่ด้านความรักไปอยู่ใน tab การงาน
    """
    target_aliases = CATEGORY_ALIASES.get(category_key, [])
    if not target_aliases:
        return cf_scores

    filtered: Dict[int, float] = {}
    for aid, score in cf_scores.items():
        row = attraction_map.get(aid)
        if not row:
            continue
        db_categories = str(row.get("categories") or "").strip()
        # เก็บเฉพาะสถานที่ที่มีหมวดหมู่ตรงกัน
        if db_categories and db_categories != "None" and any(alias in db_categories for alias in target_aliases):
            filtered[aid] = score

    return filtered

def _compute_cf_scores(category: str, user_id: int, visited_ids: Set[int]) -> Dict[int, float]:
    """คำนวณคะแนน Collaborative Filtering (CF) สำหรับผู้ใช้

    ใช้ user similarity และ rating ของผู้ใช้ที่คล้ายกัน (สูงสุด 5 คน)
    เพื่อประมาณว่าผู้ใช้นี้น่าจะชอบสถานที่ใด

    Returns:
        dict[attraction_id → CF score]  (ว่างถ้าโมเดลยังไม่โหลด หรือผู้ใช้ไม่อยู่ในโมเดล)
    """
    user_similarity = models[category]["user_similarity"]
    user_item_matrix = models[category]["user_item_matrix"]

    if user_similarity is None or user_item_matrix is None:
        return {}

    try:
        if user_id not in user_item_matrix.index:
            return {}

        similar_users = user_similarity.loc[user_id].sort_values(ascending=False)
        cf_scores: Dict[int, float] = {}

        neighbors_used = 0
        for similar_user, similarity_score in similar_users.items():
            if _to_int(similar_user) == user_id:
                continue  # ข้ามตัวเอง

            neighbors_used += 1
            if neighbors_used > 5:
                break  # ใช้แค่ 5 คนที่คล้ายที่สุด

            similarity = _safe_float(similarity_score)
            for attraction_key, rating_value in user_item_matrix.loc[similar_user].items():
                attraction_id = _to_int(attraction_key)
                rating = _safe_float(rating_value)

                if attraction_id is None or attraction_id in visited_ids:
                    continue
                if rating <= 0 or similarity <= 0:
                    continue

                # สะสมคะแนน = rating × similarity
                cf_scores[attraction_id] = cf_scores.get(attraction_id, 0.0) + (rating * similarity)

        return cf_scores
    except Exception:
        return {}


# ---------------------------------------------------------------------------
# Database fetch helpers
# ---------------------------------------------------------------------------

def _fetch_attractions_map(cursor) -> Dict[int, Dict[str, Any]]:
    """ดึงสถานที่ทั้งหมดจาก DB พร้อมประเภทและหมวดหมู่

    Returns:
        dict[attraction_id → row data]
    """
    cursor.execute(
        """
        SELECT
            a.attraction_id,
            a.attraction_name,
            a.lat,
            a.lng,
            a.sacred_obj,
            a.offering,
            a.attraction_image,
            t.type_name,
            GROUP_CONCAT(c.category_name SEPARATOR ', ') AS categories
        FROM attraction a
        LEFT JOIN `type` t ON a.type_id = t.type_id
        LEFT JOIN attraction_category ac ON a.attraction_id = ac.attraction_id
        LEFT JOIN category c ON ac.category_id = c.category_id
        GROUP BY a.attraction_id
        """
    )
    return {int(row["attraction_id"]): row for row in cursor.fetchall()}


def _fetch_ratings_and_popularity(
    cursor, user_id: int
) -> Tuple[Dict[str, Dict[int, float]], Set[int]]:
    """ดึงข้อมูล rating ทั้งหมด เพื่อคำนวณ Popularity (คะแนนเฉลี่ย) และหาสถานที่ที่ผู้ใช้เคยไป/เคยให้คะแนนแล้ว

    Returns:
        popularity_scores: dict[category → dict[attraction_id → คะแนนเฉลี่ย]]
        user_visited_ids:  set ของ attraction_id ที่ผู้ใช้นี้เคยให้คะแนนแล้ว (จาก rating และ activity_log)
    """
    cursor.execute("SELECT user_id, attraction_id, rating_work, rating_finance, rating_love FROM rating")
    ratings = cursor.fetchall()

    popularity_sums: Dict[str, Dict[int, float]] = {cat: {} for cat in MODEL_CATEGORIES}
    popularity_counts: Dict[str, Dict[int, int]] = {cat: {} for cat in MODEL_CATEGORIES}
    user_visited_ids: Set[int] = set()

    for row in ratings:
        attraction_id = _to_int(row.get("attraction_id"))
        if attraction_id is None:
            continue

        scores_by_category = {
            "work":    _safe_float(row.get("rating_work")),
            "finance": _safe_float(row.get("rating_finance")),
            "love":    _safe_float(row.get("rating_love")),
        }

        # สะสม Popularity score และนับจำนวนรีวิวในแต่ละหมวดหมู่
        for cat, score in scores_by_category.items():
            if score > 0:
                popularity_sums[cat][attraction_id] = popularity_sums[cat].get(attraction_id, 0.0) + score
                popularity_counts[cat][attraction_id] = popularity_counts[cat].get(attraction_id, 0) + 1

        # ถ้าเป็น rating ของผู้ใช้ปัจจุบัน และมีคะแนนอย่างน้อยหนึ่งด้าน → ถือว่าเคยไป/เคยให้คะแนนแล้ว
        if _to_int(row.get("user_id")) == user_id and any(s > 0 for s in scores_by_category.values()):
            user_visited_ids.add(attraction_id)

    # คำนวณคะแนน Bayesian Average แทน Simple Average
    # สูตร: (n / (n + m)) × avg + (m / (n + m)) × C
    # n = จำนวนรีวิว, m = รีวิวขั้นต่ำ, C = ค่าเฉลี่ยรวมทั้งระบบ
    popularity_scores = _compute_bayesian_scores(popularity_sums, popularity_counts)

    # ดึงสถานที่ที่ผู้ใช้นี้เคยให้คะแนน (action_type = 'rate') จาก activity_log เพิ่มเติม
    cursor.execute(
        "SELECT DISTINCT attraction_id FROM activity_log WHERE user_id = %s AND action_type = 'rate'",
        (user_id,)
    )
    rated_activity_rows = cursor.fetchall()
    for row in rated_activity_rows:
        aid = _to_int(row.get("attraction_id"))
        if aid is not None:
            user_visited_ids.add(aid)

    return popularity_scores, user_visited_ids


# ---------------------------------------------------------------------------
# Recommendation builder
# ---------------------------------------------------------------------------

def _generate_category_entries(
    category_key: str,
    category_label: str,
    popularity_scores: Dict[int, float],
    cf_scores: Dict[int, float],
    attraction_map: Dict[int, Dict[str, Any]],
    visited_ids: Set[int] = None,
    limit: int = 100,
) -> Tuple[List[Dict[str, Any]], bool]:
    """สร้างรายการคำแนะนำสำหรับหมวดหมู่เดียว (จำกัดตาม limit เช่น 100 อันดับแรก)

    - ผู้ใช้เก่า (cf_scores มีคะแนน > 0) → Blend CF 70% + Popularity 30%
    - ผู้ใช้ใหม่ (cf_scores ว่าง)          → ใช้ Popularity (Bayesian Average) 100%
    - กรองสถานที่ที่อยู่ใน visited_ids (เคยให้คะแนนแล้ว) ออกเสมอ
    - กรองให้เฉพาะสถานที่ที่มีหมวดหมู่ตรงกับหมวดที่กำลังประมวลผล

    Returns:
        entries:          รายการแนะนำตามจำนวน limit (สูงสุด 100 รายการ)
        is_existing_user: True ถ้าเป็นผู้ใช้เก่า (มีข้อมูลใน CF model)
    """
    if visited_ids is None:
        visited_ids = set()

    max_cf = max(cf_scores.values(), default=0.0)
    is_existing_user = max_cf > 0

    if is_existing_user:
        # Normalize CF scores เป็นสเกล 0-5
        cf_normalized = {
            aid: (cf_scores[aid] / max_cf) * 5
            for aid in cf_scores
            if cf_scores[aid] > 0 and max_cf > 0
        }
        # Blend: CF 70% + Popularity 30%
        all_aids = set(cf_normalized.keys()) | set(popularity_scores.keys())
        final_scores = {}
        for aid in all_aids:
            if aid in visited_ids:
                continue
            cf_val = cf_normalized.get(aid, 0.0)
            pop_val = popularity_scores.get(aid, 0.0)
            blended = cf_val * 0.7 + pop_val * 0.3
            if blended > 0:
                final_scores[aid] = blended
    else:
        # ผู้ใช้ใหม่ → Popularity (Bayesian Average) 100%
        final_scores = {
            aid: popularity_scores[aid]
            for aid in popularity_scores
            if popularity_scores[aid] > 0 and aid not in visited_ids
        }

    target_aliases = CATEGORY_ALIASES.get(category_key, [category_label])

    # เรียงจากคะแนนมากไปน้อย แล้วนำตามจำนวน limit (เช่น 100 อันดับแรก)
    sorted_ids = sorted(final_scores, key=final_scores.__getitem__, reverse=True)

    entries = []
    for attraction_id in sorted_ids:
        if len(entries) >= limit:
            break
        row = attraction_map.get(attraction_id)
        if not row:
            continue

        db_categories_str = str(row.get("categories") or "").strip()
        # กรองเฉพาะสถานที่ที่มีหมวดหมู่ระบุตรงกับ target_aliases (หากไม่มีหมวดหมู่ระบุใน DB ให้ข้าม)
        if not db_categories_str or db_categories_str == "None" or not any(alias in db_categories_str for alias in target_aliases):
            continue

        entries.append({
            "id": str(attraction_id),
            "name": row.get("attraction_name") or "Unknown",
            "type": row.get("type_name") or "ไม่ระบุประเภท",
            "category": db_categories_str,
            "target_category": category_label,
            "lat": _safe_float(row.get("lat")),
            "lng": _safe_float(row.get("lng")),
            "score": round(final_scores[attraction_id], 2),  # คะแนนเฉลี่ย 0-5 ดาว
            "image": row.get("attraction_image") or "",
            "sacred_object": row.get("sacred_obj") or "-",
            "offerings": row.get("offering") or "-",
        })

    return entries, is_existing_user


# ---------------------------------------------------------------------------
# Main recommendation endpoint
# ---------------------------------------------------------------------------

@router.get("/recommend/{user_id}", response_model=RecommendationResponse)
@router.get("/api/recommend/{user_id}", response_model=RecommendationResponse)
async def recommend(user_id: int):
    """แนะนำสถานที่ศักดิ์สิทธิ์สำหรับผู้ใช้ (การงาน, โชคลาภ, ความรัก)

    - ผู้ใช้เก่า (เคยให้คะแนน) → ใช้โมเดล Collaborative Filtering (.pkl)
    - ผู้ใช้ใหม่ (ไม่เคยให้คะแนน) → ใช้คะแนน Popularity จากฐานข้อมูล MySQL
    """
    _load_models_once()

    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        # 1. ดึงข้อมูลสถานที่ทั้งหมด
        attraction_map = _fetch_attractions_map(cursor)

        # 2. ดึงคะแนนรีวิวทั้งหมด เพื่อคำนวณ Popularity และสถานที่ที่ผู้ใช้เคยไป
        popularity_scores, user_visited_ids = _fetch_ratings_and_popularity(cursor, user_id)

        recommendation_entries = []
        is_new_user = True

        # 3. คำนวณคำแนะนำแต่ละหมวดหมู่ (ดึงหมวดละ 100 สถานที่)
        for category_key, category_label in MODEL_CATEGORIES.items():
            cf_scores = _compute_cf_scores(category_key, user_id, user_visited_ids)
            # กรอง CF scores ให้เหลือเฉพาะสถานที่ที่ตรงหมวดหมู่
            cf_scores = _filter_cf_by_category(cf_scores, category_key, attraction_map)
            entries, is_existing_user = _generate_category_entries(
                category_key=category_key,
                category_label=category_label,
                popularity_scores=popularity_scores[category_key],
                cf_scores=cf_scores,
                attraction_map=attraction_map,
                visited_ids=user_visited_ids,
                limit=150,
            )
            recommendation_entries.extend(entries)
            if is_existing_user:
                is_new_user = False

        # 4. รวมผลลัพธ์ เรียงตามคะแนน
        recommendation_entries.sort(key=lambda item: item["score"], reverse=True)

        # 5. คำนวณลำดับหมวดหมู่ตามคะแนนที่ผู้ใช้ให้มากที่สุด
        category_order = _get_user_category_order(cursor, user_id)

        return {
            "user_id": str(user_id),
            "is_new_user": is_new_user,
            "recommendations": recommendation_entries,
            "category_order": category_order,
        }

    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Recommendation error: {error}")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


def _get_user_category_order(cursor, user_id: int) -> List[str]:
    """คำนวณลำดับหมวดหมู่สถานที่ตามผลรวมคะแนนการให้คะแนนของผู้ใช้ (มากไปน้อย)

    ดึงรายชื่อหมวดหมู่จากตาราง category ในฐานข้อมูล MySQL มาประมวลผลตามจริง
    """
    cursor.execute("SELECT category_name FROM category ORDER BY category_id ASC")
    db_cat_rows = cursor.fetchall()
    db_categories = [r["category_name"] for r in db_cat_rows if r.get("category_name")]
    if not db_categories:
        db_categories = ["การงาน", "โชคลาภ", "ความรัก"]

    cursor.execute(
        "SELECT rating_work, rating_finance, rating_love FROM rating WHERE user_id = %s",
        (user_id,)
    )
    rows = cursor.fetchall()

    cat_scores = {cat: 0.0 for cat in db_categories}

    for row in rows:
        if "การงาน" in cat_scores:
            cat_scores["การงาน"] += _safe_float(row.get("rating_work"))
        if "โชคลาภ" in cat_scores:
            cat_scores["โชคลาภ"] += _safe_float(row.get("rating_finance"))
        elif "การเงิน" in cat_scores:
            cat_scores["การเงิน"] += _safe_float(row.get("rating_finance"))
        if "ความรัก" in cat_scores:
            cat_scores["ความรัก"] += _safe_float(row.get("rating_love"))

    # เรียงลำดับตามคะแนนสะสมจากมากไปน้อย
    sorted_categories = sorted(db_categories, key=lambda cat: cat_scores.get(cat, 0.0), reverse=True)
    return sorted_categories

