# =============================================================================
# recommendation.py — ระบบแนะนำสถานที่ศักดิ์สิทธิ์
# =============================================================================
# Endpoints:
#   GET  /api/recommend/{user_id}       → แนะนำสถานที่สำหรับผู้ใช้
#   GET  /api/recommend/models/status   → ตรวจสอบสถานะโมเดล
#   POST /api/recommend/models/reload   → โหลดโมเดลใหม่
#   POST /api/recommend/models/upload   → อัปโหลดไฟล์โมเดล (.pkl)
#
# หลักการแนะนำ:
#   - ผู้ใช้เก่า (เคยให้คะแนน) → Collaborative Filtering จากไฟล์ .pkl 100%
#   - ผู้ใช้ใหม่ (ยังไม่เคยให้คะแนน) → Popularity จากฐานข้อมูล MySQL 100%
# =============================================================================

import math
import os
import pickle
import shutil
from typing import Dict, Any, Tuple, List, Set

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from app.core.database import get_connection
from app.schemas.schemas import (
    RecommendationResponse, ModelStatusResponse, ModelReloadResponse, ModelUploadResponse
)
router = APIRouter(tags=["recommendation"])

# หมวดหมู่โมเดล (key ภาษาอังกฤษ → label ภาษาไทย)
MODEL_CATEGORIES = {
    "work": "การงาน",
    "finance": "การเงิน",
    "love": "ความรัก",
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
# Endpoints: Model management
# ---------------------------------------------------------------------------

def _is_model_ready(category: str) -> bool:
    """ตรวจสอบว่าโมเดลของหมวดหมู่นั้นโหลดครบแล้วหรือไม่"""
    return (
        models[category]["user_similarity"] is not None
        and models[category]["user_item_matrix"] is not None
    )


@router.get("/api/recommend/models/status", response_model=ModelStatusResponse)
async def recommendation_model_status():
    """ตรวจสอบสถานะโมเดลแนะนำ — โหลดอยู่หรือไม่ และมีไฟล์บันทึกหรือไม่"""
    _load_models_once()
    return {
        "models_loaded": {cat: _is_model_ready(cat) for cat in MODEL_CATEGORIES},
        "stored_files": {cat: os.path.exists(_saved_model_path(cat)) for cat in MODEL_CATEGORIES},
    }


@router.post("/api/recommend/models/reload", response_model=ModelReloadResponse)
async def reload_recommendation_models():
    """โหลดโมเดลแนะนำใหม่ทั้งหมด (ใช้เมื่ออัปโหลดโมเดลใหม่)"""
    _load_models_once(force=True)
    return {
        "message": "Recommendation models reloaded",
        "models_loaded": {cat: _is_model_ready(cat) for cat in MODEL_CATEGORIES},
    }


@router.post("/api/recommend/models/upload", response_model=ModelUploadResponse)
async def upload_recommendation_model(
    category: str = Form(...),
    file: UploadFile = File(...),
):
    """อัปโหลดไฟล์โมเดลแนะนำ (.pkl) สำหรับหมวดหมู่ที่ระบุ"""
    category = (category or "").strip().lower()
    if category not in MODEL_CATEGORIES:
        raise HTTPException(status_code=400, detail="category must be one of: work, finance, love")

    if not (file.filename or "").lower().endswith(".pkl"):
        raise HTTPException(status_code=400, detail="Only .pkl files are allowed")

    destination = _saved_model_path(category)
    try:
        with open(destination, "wb") as out:
            shutil.copyfileobj(file.file, out)
        _load_models_once(force=True)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Upload failed: {error}")
    finally:
        await file.close()

    return {
        "message": "Model uploaded successfully",
        "category": category,
        "stored_path": destination,
        "model_loaded": models[category]["user_similarity"] is not None,
    }


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
    """ดึงข้อมูล rating ทั้งหมด เพื่อคำนวณ Popularity และหาสถานที่ที่ผู้ใช้เคยไปแล้ว

    Returns:
        popularity_scores: dict[category → dict[attraction_id → ผลรวม rating]]
        user_visited_ids:  set ของ attraction_id ที่ผู้ใช้นี้เคยให้คะแนนแล้ว
    """
    cursor.execute("SELECT user_id, attraction_id, rating_work, rating_finance, rating_love FROM rating")
    ratings = cursor.fetchall()

    popularity_scores: Dict[str, Dict[int, float]] = {cat: {} for cat in MODEL_CATEGORIES}
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

        # สะสม Popularity score ทุกหมวดหมู่
        for cat, score in scores_by_category.items():
            popularity_scores[cat][attraction_id] = popularity_scores[cat].get(attraction_id, 0.0) + score

        # ถ้าเป็น rating ของผู้ใช้ปัจจุบัน และมีคะแนนอย่างน้อยหนึ่งด้าน → ถือว่าเคยไปแล้ว
        if _to_int(row.get("user_id")) == user_id and any(s > 0 for s in scores_by_category.values()):
            user_visited_ids.add(attraction_id)

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
) -> Tuple[List[Dict[str, Any]], bool]:
    """สร้างรายการคำแนะนำสำหรับหมวดหมู่เดียว

    - ผู้ใช้เก่า (cf_scores มีคะแนน > 0) → ใช้ CF 100%
    - ผู้ใช้ใหม่ (cf_scores ว่าง)          → ใช้ Popularity 100%

    Returns:
        entries:          รายการแนะนำ 100 อันดับแรก
        is_existing_user: True ถ้าเป็นผู้ใช้เก่า (มีข้อมูลใน CF model)
    """
    max_cf = max(cf_scores.values(), default=0.0)
    is_existing_user = max_cf > 0

    if is_existing_user:
        raw_scores = cf_scores
        max_score = max_cf
    else:
        raw_scores = popularity_scores
        max_score = max(popularity_scores.values(), default=1.0)

    final_scores = {
        aid: raw_scores[aid] / max_score
        for aid in raw_scores
        if raw_scores[aid] > 0 and max_score > 0
    }

    # เรียงจากคะแนนมากไปน้อย แล้วนำ 100 อันดับแรก
    sorted_ids = sorted(final_scores, key=final_scores.__getitem__, reverse=True)

    entries = []
    for attraction_id in sorted_ids[:100]:
        row = attraction_map.get(attraction_id)
        if not row:
            continue
        entries.append({
            "id": str(attraction_id),
            "name": row.get("attraction_name") or "Unknown",
            "type": row.get("type_name") or "ไม่ระบุประเภท",
            "category": category_label,
            "lat": _safe_float(row.get("lat")),
            "lng": _safe_float(row.get("lng")),
            "score": round(final_scores[attraction_id] * 5, 2),  # แปลงเป็นสเกล 0-5 ดาว
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

    - ผู้ใช้เก่า (เคยให้คะแนน) → ใช้โมเดล Collaborative Filtering (.pkl) 100%
    - ผู้ใช้ใหม่ (ไม่เคยให้คะแนน) → ใช้คะแนน Popularity จากฐานข้อมูล MySQL 100%
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

        # 3. คำนวณคำแนะนำแต่ละหมวดหมู่
        for category_key, category_label in MODEL_CATEGORIES.items():
            cf_scores = _compute_cf_scores(category_key, user_id, user_visited_ids)
            entries, is_existing_user = _generate_category_entries(
                category_key=category_key,
                category_label=category_label,
                popularity_scores=popularity_scores[category_key],
                cf_scores=cf_scores,
                attraction_map=attraction_map,
            )
            recommendation_entries.extend(entries[:5])
            if is_existing_user:
                is_new_user = False

        # 4. รวมผลลัพธ์ เรียงตามคะแนน ตัดที่ 150 รายการ
        recommendation_entries.sort(key=lambda item: item["score"], reverse=True)

        return {
            "user_id": str(user_id),
            "is_new_user": is_new_user,
            "recommendations": recommendation_entries,
        }

    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Recommendation error: {error}")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
