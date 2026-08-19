# =============================================================================
# recommendation.py — ระบบแนะนำสถานที่ศักดิ์สิทธิ์
# =============================================================================
# Endpoints:
#   GET  /api/recommend/{user_id}       → แนะนำสถานที่สำหรับผู้ใช้
#
# หลักการแนะนำ (ตาม main (1).py):
#   - ผู้ใช้เก่า (เคยให้คะแนน) → Blend CF 70% + Popularity 30%
#     (Popularity = sum(axis=0) จาก user-item matrix)
#   - ผู้ใช้ใหม่ (ยังไม่เคยให้คะแนน) → Popularity 100%
#   - Real-time model recalculation หลังให้คะแนน (ไม่ save .pkl)
#   - Global score normalization (max = 5.0)
#   - กรองสถานที่ตาม category_name ใน DB
# =============================================================================

import math
import os
import pickle
from typing import Dict, Any, Tuple, List, Set

import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from fastapi import APIRouter, HTTPException

from app.core.database import get_connection
from app.schemas.schemas import RecommendationResponse

router = APIRouter(tags=["recommendation"])

# หมวดหมู่โมเดล (key ภาษาอังกฤษ → label ภาษาไทย)
MODEL_CATEGORIES = {
    "work": "การงาน",
    "finance": "การเงิน",
    "love": "ความรัก",
}

# Alias ชื่อหมวดหมู่ภาษาไทยที่อาจปรากฏใน DB (ใช้กรองสถานที่ให้ตรงหมวด)
CATEGORY_ALIASES = {
    "work": ["การงาน"],
    "finance": ["การเงิน"],
    "love": ["ความรัก"],
}

# Mapping column names ใน DB → model key
# ตาราง rating ใน DB ใช้ rating_work, rating_finance, rating_love
DB_COLUMN_MAP = {
    "work": "rating_work",
    "finance": "rating_finance",
    "love": "rating_love",
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
                print(f"Model loaded from {path}")
                break
            except Exception:
                continue

        if not loaded:
            models[category]["user_similarity"] = None
            models[category]["user_item_matrix"] = None

    _models_loaded = True


# ---------------------------------------------------------------------------
# Real-time model recalculation (ตาม main (1).py)
# ---------------------------------------------------------------------------

def recalculate_model_in_memory(category: str, connection) -> None:
    """คำนวณ cosine similarity ใหม่ทันทีหลังให้คะแนน

    อ่าน rating จากตาราง `rating` → สร้าง user-item matrix → cosine similarity
    แล้วอัปเดต models[category] ใน memory ทันที

    Args:
        category: หมวดหมู่ที่ต้องการ recalculate ("work" / "finance" / "love")
        connection: MySQL connection object (ยังเปิดอยู่)
    """
    global models

    db_column = DB_COLUMN_MAP[category]
    query = f"SELECT user_id, attraction_id, {db_column} FROM rating WHERE {db_column} > 0"

    try:
        df_cat = pd.read_sql(query, connection)
    except Exception as e:
        print(f"Warning: Could not read ratings for {category}: {e}")
        return

    if df_cat.empty:
        return  # ยังไม่มี rating ในหมวดนี้

    # สร้าง User-Item Matrix
    matrix = df_cat.pivot_table(
        index="user_id",
        columns="attraction_id",
        values=db_column,
        fill_value=0,
    )

    # คำนวณ Cosine Similarity
    user_sim = cosine_similarity(matrix)
    user_sim_df = pd.DataFrame(user_sim, index=matrix.index, columns=matrix.index)

    # อัปเดต in-memory models ทันที
    models[category]["user_similarity"] = user_sim_df
    models[category]["user_item_matrix"] = matrix

    print(f"DEBUG: Real-time update {category} model (Users: {len(matrix.index)}, Items: {len(matrix.columns)})")


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


# ---------------------------------------------------------------------------
# Recommendation builder (Per-category Isolated Calculation & Normalization)
# ---------------------------------------------------------------------------

def _compute_category_scores(
    user_id: int,
    item_matrix: Any,
    sim_matrix: Any
) -> Dict[int, float]:
    """คำนวณคะแนนแนะนำสำหรับหมวดหมู่เดี่ยว (CF 70% + Pop 30% หรือ Pop 100%)"""
    if item_matrix is None or sim_matrix is None:
        return {}

    # Popularity baseline: sum(axis=0) ต่อ item ในหมวดหมู่นี้
    col_sums = item_matrix.sum(axis=0)
    pop_scores = {
        int(col): float(col_sums[col])
        for col in item_matrix.columns
        if float(col_sums[col]) > 0
    }

    # ตรวจสอบว่าผู้ใช้เคยให้คะแนนในหมวดหมู่นี้หรือไม่
    user_has_rated = user_id in item_matrix.index

    if not user_has_rated:
        # ผู้ใช้ยังไม่เคยให้คะแนนในหมวดนี้ → ใช้ Popularity 100%
        return pop_scores

    # สถานที่ที่ผู้ใช้เคยให้คะแนนแล้วในหมวดหมู่นี้
    user_ratings = item_matrix.loc[user_id]
    visited_in_cat = set(user_ratings[user_ratings > 0].index.tolist())

    # Collaborative Filtering (หา 5 คนที่คล้ายที่สุด ข้ามตัวเอง)
    cf_scores: Dict[int, float] = {}
    similar_users = sim_matrix[user_id].sort_values(ascending=False)[1:6]

    for sim_user, sim_score in similar_users.items():
        their_ratings = item_matrix.loc[sim_user]
        for place_id, rating in their_ratings.items():
            place_id_int = int(place_id)
            if float(rating) > 0 and place_id_int not in visited_in_cat:
                cf_scores[place_id_int] = cf_scores.get(place_id_int, 0.0) + float(rating) * float(sim_score)

    max_cf = max(cf_scores.values(), default=0.0)
    if max_cf >= 0.5:
        # Blend: normalize CF ให้สเกลเดียวกับ Popularity แล้ว 70/30
        cf_max = max_cf
        pop_max = max(pop_scores.values(), default=1.0)
        final_scores: Dict[int, float] = {}

        candidate_ids = (set(cf_scores.keys()) | set(pop_scores.keys())) - visited_in_cat
        for place_id in candidate_ids:
            cf_norm = (cf_scores.get(place_id, 0.0) / cf_max) * pop_max
            pop_val = pop_scores.get(place_id, 0.0)
            score = cf_norm * 0.7 + pop_val * 0.3
            if score > 0:
                final_scores[place_id] = score

        return final_scores

    # Fallback: Popularity ล้วน (กรองสถานที่ที่เคยไปแล้วออก)
    return {pid: score for pid, score in pop_scores.items() if pid not in visited_in_cat}


def _build_category_recommendations(
    category_label: str,
    target_aliases: List[str],
    raw_scores: Dict[int, float],
    attraction_map: Dict[int, Dict[str, Any]],
    max_items: int = 100
) -> List[Dict[str, Any]]:
    if not raw_scores:
        return []
    max_score = max(raw_scores.values(), default=1.0)
    if max_score <= 0:
        max_score = 1.0

    # จัดเรียงตามคะแนนดิบจากมากไปน้อย
    sorted_places = sorted(raw_scores.items(), key=lambda x: x[1], reverse=True)

    category_results: List[Dict[str, Any]] = []

    for place_id, score in sorted_places:
        row = attraction_map.get(place_id)
        if not row:
            continue

        # กรองเฉพาะสถานที่ที่มี category ใน DB ตรงกับหมวดหมู่นี้
        db_categories_str = str(row.get("categories") or "").strip()
        if (
            not db_categories_str
            or db_categories_str == "None"
            or not any(alias in db_categories_str for alias in target_aliases)
        ):
            continue

        normalized_score = round((score / max_score) * 5.0, 2)

        category_results.append({
            "id": str(place_id),
            "name": row.get("attraction_name") or "Unknown",
            "type": row.get("type_name") or "ไม่ระบุประเภท",
            "category": db_categories_str,
            "target_category": category_label,
            "lat": _safe_float(row.get("lat")),
            "lng": _safe_float(row.get("lng")),
            "score": normalized_score,
            "image": row.get("attraction_image") or "",
            "sacred_object": row.get("sacred_obj") or "-",
            "offerings": row.get("offering") or "-",
        })

        if len(category_results) >= max_items:
            break

    return category_results


@router.get("/recommend/{user_id}", response_model=RecommendationResponse)
@router.get("/api/recommend/{user_id}", response_model=RecommendationResponse)
async def recommend(user_id: int):
    _load_models_once()

    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        # 1. ดึงข้อมูลสถานที่ทั้งหมด (พร้อม category จาก DB)
        attraction_map = _fetch_attractions_map(cursor)

        # 2. ตรวจสอบสถานะว่าผู้ใช้เคยให้คะแนนในระบบหรือไม่
        is_new_user = not any(
            mats["user_item_matrix"] is not None and user_id in mats["user_item_matrix"].index
            for mats in models.values()
        )

        # 3. คำนวณคะแนนแยกทีละหมวดหมู่
        results: List[Dict[str, Any]] = []

        for cat_key, cat_label in MODEL_CATEGORIES.items():
            mats = models.get(cat_key, {})
            item_matrix = mats.get("user_item_matrix")
            sim_matrix = mats.get("user_similarity")
            target_aliases = CATEGORY_ALIASES.get(cat_key, [cat_label])

            # คำนวณคะแนนเฉพาะหมวดหมู่นี้
            raw_scores = _compute_category_scores(user_id, item_matrix, sim_matrix)
            cat_recommendations = _build_category_recommendations(
                category_label=cat_label,
                target_aliases=target_aliases,
                raw_scores=raw_scores,
                attraction_map=attraction_map,
                max_items=100
            )
            results.extend(cat_recommendations)

        category_order = ["การงาน", "การเงิน", "ความรัก"]

        return {
            "user_id": str(user_id),
            "is_new_user": is_new_user,
            "recommendations": results,
            "category_order": category_order,
        }

    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Recommendation error: {error}")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
