import math
import os
import pickle
import shutil
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from app.core.database import get_connection

router = APIRouter(tags=["recommendation"])

MODEL_CATEGORIES = {
    "work": "การงาน",
    "finance": "โชคลาภ",
    "love": "ความรัก",
}

models: Dict[str, Dict[str, Any]] = {
    "work": {"user_similarity": None, "user_item_matrix": None},
    "finance": {"user_similarity": None, "user_item_matrix": None},
    "love": {"user_similarity": None, "user_item_matrix": None},
}

_models_loaded = False


def _model_storage_dir() -> str:
    base_dir = os.path.dirname(__file__)
    backend_dir = os.path.abspath(os.path.join(base_dir, "..", "..", ".."))
    storage = os.path.join(backend_dir, "models", "recommendation")
    os.makedirs(storage, exist_ok=True)
    return storage


def _saved_model_path(category: str) -> str:
    return os.path.join(_model_storage_dir(), f"recommendation_model_{category}.pkl")


def _candidate_model_paths(category: str):
    base_dir = os.path.dirname(__file__)
    backend_dir = os.path.abspath(os.path.join(base_dir, "..", "..", ".."))
    project_dir = os.path.abspath(os.path.join(backend_dir, ".."))
    return [
        _saved_model_path(category),
        os.path.join(project_dir, f"recommendation_model_{category}.pkl"),
        os.path.join(project_dir, "other-backend", f"recommendation_model_{category}.pkl"),
        os.path.join(backend_dir, f"recommendation_model_{category}.pkl"),
    ]


def _load_models_once(force: bool = False):
    global _models_loaded
    if force:
        _models_loaded = False
    if _models_loaded:
        return

    for category in MODEL_CATEGORIES.keys():
        loaded = False
        for path in _candidate_model_paths(category):
            if not os.path.exists(path):
                continue
            try:
                with open(path, "rb") as file:
                    data = pickle.load(file)
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


@router.get("/api/recommend/models/status")
async def recommendation_model_status():
    _load_models_once()
    return {
        "models_loaded": {
            category: (models[category]["user_similarity"] is not None and models[category]["user_item_matrix"] is not None)
            for category in MODEL_CATEGORIES.keys()
        },
        "stored_files": {
            category: os.path.exists(_saved_model_path(category))
            for category in MODEL_CATEGORIES.keys()
        },
    }


@router.post("/api/recommend/models/reload")
async def reload_recommendation_models():
    _load_models_once(force=True)
    return {
        "message": "Recommendation models reloaded",
        "models_loaded": {
            category: (models[category]["user_similarity"] is not None and models[category]["user_item_matrix"] is not None)
            for category in MODEL_CATEGORIES.keys()
        },
    }


@router.post("/api/recommend/models/upload")
async def upload_recommendation_model(
    category: str = Form(...),
    file: UploadFile = File(...),
):
    category_normalized = (category or "").strip().lower()
    if category_normalized not in MODEL_CATEGORIES:
        raise HTTPException(status_code=400, detail="category must be one of: work, finance, love")

    filename = file.filename or ""
    if not filename.lower().endswith(".pkl"):
        raise HTTPException(status_code=400, detail="Only .pkl files are allowed")

    destination = _saved_model_path(category_normalized)
    try:
        with open(destination, "wb") as output:
            shutil.copyfileobj(file.file, output)
        _load_models_once(force=True)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Upload failed: {error}")
    finally:
        await file.close()

    return {
        "message": "Model uploaded successfully",
        "category": category_normalized,
        "stored_path": destination,
        "model_loaded": models[category_normalized]["user_similarity"] is not None,
    }


def _safe_float(value: Any) -> float:
    try:
        if value is None:
            return 0.0
        result = float(value)
        if math.isnan(result) or math.isinf(result):
            return 0.0
        return result
    except Exception:
        return 0.0


def _to_int(value: Any):
    try:
        if value is None:
            return None
        return int(str(value).strip())
    except Exception:
        return None


def _compute_cf_scores(category: str, user_id: int, visited_ids: set[int]) -> Dict[int, float]:
    user_similarity = models[category]["user_similarity"]
    user_item_matrix = models[category]["user_item_matrix"]
    if user_similarity is None or user_item_matrix is None:
        return {}

    try:
        if user_id not in user_item_matrix.index:
            return {}

        similar_users = user_similarity.loc[user_id].sort_values(ascending=False)
        cf_scores: Dict[int, float] = {}

        used = 0
        for similar_user, similarity_score in similar_users.items():
            if _to_int(similar_user) == user_id:
                continue
            used += 1
            if used > 5:
                break

            ratings_row = user_item_matrix.loc[similar_user]
            for attraction_key, rating_value in ratings_row.items():
                attraction_id = _to_int(attraction_key)
                if attraction_id is None or attraction_id in visited_ids:
                    continue

                rating_value_float = _safe_float(rating_value)
                similarity_float = _safe_float(similarity_score)
                if rating_value_float <= 0 or similarity_float <= 0:
                    continue

                cf_scores[attraction_id] = cf_scores.get(attraction_id, 0.0) + (
                    rating_value_float * similarity_float
                )

        return cf_scores
    except Exception:
        return {}


@router.get("/recommend/{user_id}")
@router.get("/api/recommend/{user_id}")
async def recommend(user_id: int):
    _load_models_once()

    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

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
        attractions = cursor.fetchall()

        cursor.execute(
            """
            SELECT user_id, attraction_id, rating_work, rating_finance, rating_love
            FROM rating
            """
        )
        ratings = cursor.fetchall()

        attraction_map: Dict[int, Dict[str, Any]] = {
            int(row["attraction_id"]): row for row in attractions
        }

        user_visited_ids: set[int] = set()
        popularity_scores: Dict[str, Dict[int, float]] = {
            "work": {},
            "finance": {},
            "love": {},
        }

        for row in ratings:
            attraction_id = _to_int(row.get("attraction_id"))
            if attraction_id is None:
                continue

            rating_work = _safe_float(row.get("rating_work"))
            rating_finance = _safe_float(row.get("rating_finance"))
            rating_love = _safe_float(row.get("rating_love"))

            popularity_scores["work"][attraction_id] = (
                popularity_scores["work"].get(attraction_id, 0.0) + rating_work
            )
            popularity_scores["finance"][attraction_id] = (
                popularity_scores["finance"].get(attraction_id, 0.0) + rating_finance
            )
            popularity_scores["love"][attraction_id] = (
                popularity_scores["love"].get(attraction_id, 0.0) + rating_love
            )

            if _to_int(row.get("user_id")) == user_id and (rating_work > 0 or rating_finance > 0 or rating_love > 0):
                user_visited_ids.add(attraction_id)

        recommendation_entries = []

        for category_key, category_label in MODEL_CATEGORIES.items():
            pop_scores = popularity_scores[category_key]
            cf_scores = _compute_cf_scores(category_key, user_id, user_visited_ids)

            max_pop = max(pop_scores.values(), default=1.0)
            max_cf = max(cf_scores.values(), default=0.0)

            combined_scores: Dict[int, float] = {}
            all_ids = set(pop_scores.keys()) | set(cf_scores.keys())
            for attraction_id in all_ids:
                pop_norm = (pop_scores.get(attraction_id, 0.0) / max_pop) if max_pop > 0 else 0.0
                if max_cf > 0:
                    cf_norm = cf_scores.get(attraction_id, 0.0) / max_cf
                    final_score = (cf_norm * 0.7) + (pop_norm * 0.3)
                else:
                    final_score = pop_norm
                if final_score > 0:
                    combined_scores[attraction_id] = final_score

            sorted_scores = sorted(combined_scores.items(), key=lambda item: item[1], reverse=True)
            for attraction_id, score in sorted_scores[:100]:
                if attraction_id not in attraction_map:
                    continue

                row = attraction_map[attraction_id]
                recommendation_entries.append({
                    "id": str(attraction_id),
                    "name": row.get("attraction_name") or "Unknown",
                    "type": row.get("type_name") or "ไม่ระบุประเภท",
                    "category": category_label,
                    "lat": _safe_float(row.get("lat")),
                    "lng": _safe_float(row.get("lng")),
                    "score": round(score * 5, 2),
                    "image": row.get("attraction_image") or "",
                    "sacred_object": row.get("sacred_obj") or "-",
                    "offerings": row.get("offering") or "-",
                })

        recommendation_entries.sort(key=lambda item: item["score"], reverse=True)

        return {
            "user_id": str(user_id),
            "recommendations": recommendation_entries[:150],
        }

    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Recommendation error: {error}")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
