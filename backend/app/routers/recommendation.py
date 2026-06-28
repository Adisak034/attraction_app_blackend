# =============================================================================
# recommendation.py
# =============================================================================
# Router สำหรับระบบแนะนำสถานที่ศักดิ์สิทธิ์ (Recommendation System)
# ใช้อัลกอริทึม Collaborative Filtering และ Popularity-based Scoring
#   - ผู้ใช้เก่า (Existing User) : ดึงคำแนะนำจากโมเดล Pickle (CF 100%)
#   - ผู้ใช้ใหม่ (New User)      : ดึงคำแนะนำจากฐานข้อมูล (Popularity 100%)
#
# โมเดลถูกโหลดจากไฟล์ .pkl (pickle) แยกตาม 3 หมวดหมู่:
#   work (การงาน), finance (โชคลาภ), love (ความรัก)
#
# Endpoints:
#   GET  /api/recommend/{user_id}           → ดึงรายการแนะนำสำหรับผู้ใช้
#   GET  /api/recommend/models/status       → ตรวจสอบสถานะโมเดลทุกหมวดหมู่
#   POST /api/recommend/models/reload       → โหลดโมเดลใหม่ทั้งหมด
#   POST /api/recommend/models/upload       → อัปโหลดไฟล์โมเดล (.pkl)
# =============================================================================

import math
import os
import pickle
import shutil
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from app.core.database import get_connection
from app.schemas.schemas import RecommendationResponse

# กำหนด router สำหรับระบบแนะนำสถานที่ (Recommendation System)
router = APIRouter(tags=["recommendation"])

# กำหนดหมวดหมู่ของโมเดลแนะนำ (ภาษาอังกฤษ -> ภาษาไทย)
MODEL_CATEGORIES = {
    "work": "การงาน",
    "finance": "โชคลาภ",
    "love": "ความรัก",
}

# เก็บโมเดลแนะนำไว้ใน memory สำหรับแต่ละหมวดหมู่
models: Dict[str, Dict[str, Any]] = {
    "work": {"user_similarity": None, "user_item_matrix": None},
    "finance": {"user_similarity": None, "user_item_matrix": None},
    "love": {"user_similarity": None, "user_item_matrix": None},
}

# flag สำหรับตรวจสอบว่าโหลดโมเดลแล้วหรือยัง
_models_loaded = False


def _model_storage_dir() -> str:
    """คืน path โฟลเดอร์สำหรับเก็บไฟล์โมเดล (.pkl)"""
    base_dir = os.path.dirname(__file__)
    backend_dir = os.path.abspath(os.path.join(base_dir, "..", "..", ".."))
    storage = os.path.join(backend_dir, "models", "recommendation")
    os.makedirs(storage, exist_ok=True)  # สร้างโฟลเดอร์ถ้ายังไม่มี
    return storage


def _saved_model_path(category: str) -> str:
    """คืน path ไฟล์โมเดลสำหรับหมวดหมู่ที่ระบุ"""
    return os.path.join(_model_storage_dir(), f"recommendation_model_{category}.pkl")


def _candidate_model_paths(category: str):
    """คืนรายการ path ที่อาจมีไฟล์โมเดล - ค้นหาตามลำดับความสำคัญ"""
    base_dir = os.path.dirname(__file__)
    backend_dir = os.path.abspath(os.path.join(base_dir, "..", "..", ".."))
    project_dir = os.path.abspath(os.path.join(backend_dir, ".."))
    return [
        _saved_model_path(category),                                                        # โฟลเดอร์หลักของโมเดล
        os.path.join(project_dir, f"recommendation_model_{category}.pkl"),                  # root ของโปรเจค
        os.path.join(project_dir, "other-backend", f"recommendation_model_{category}.pkl"), # โฟลเดอร์ other-backend
        os.path.join(backend_dir, f"recommendation_model_{category}.pkl"),                  # โฟลเดอร์ backend
    ]


def _load_models_once(force: bool = False):
    """โหลดโมเดลทั้งหมดครั้งเดียว (โหลดซ้ำได้ถ้า force=True)
    
    ค้นหาไฟล์ .pkl ในหลาย path แล้วโหลดเข้า memory
    ถ้าไม่พบไฟล์ ตั้งค่าโมเดลเป็น None (ระบบจะใช้ popularity-based แทน)
    """
    global _models_loaded
    if force:
        _models_loaded = False  # บังคับโหลดใหม่
    if _models_loaded:
        return  # ถ้าโหลดแล้วไม่ต้องโหลดซ้ำ

    for category in MODEL_CATEGORIES.keys():
        loaded = False
        # ลองโหลดจากทุก path ที่เป็นไปได้
        for path in _candidate_model_paths(category):
            if not os.path.exists(path):
                continue  # ข้ามถ้าไม่มีไฟล์
            try:
                with open(path, "rb") as file:
                    data = pickle.load(file)  # โหลด pickle file
                models[category]["user_similarity"] = data.get("user_similarity_df")
                models[category]["user_item_matrix"] = data.get("user_item_matrix")
                loaded = True
                break  # หยุดค้นหาเมื่อโหลดสำเร็จ
            except Exception:
                continue  # ลอง path ถัดไปถ้าโหลดไม่ได้

        if not loaded:
            # ถ้าไม่พบโมเดล ตั้งค่าเป็น None
            models[category]["user_similarity"] = None
            models[category]["user_item_matrix"] = None

    _models_loaded = True


@router.get("/api/recommend/models/status")
async def recommendation_model_status():
    """ตรวจสอบสถานะโมเดลแนะนำ - โหลดอยู่หรือไม่ และมีไฟล์บันทึกหรือไม่"""
    _load_models_once()
    return {
        "models_loaded": {
            # True ถ้าโมเดลทั้งสองส่วนถูกโหลดแล้ว
            category: (models[category]["user_similarity"] is not None and models[category]["user_item_matrix"] is not None)
            for category in MODEL_CATEGORIES.keys()
        },
        "stored_files": {
            # True ถ้ามีไฟล์โมเดลบันทึกอยู่
            category: os.path.exists(_saved_model_path(category))
            for category in MODEL_CATEGORIES.keys()
        },
    }


@router.post("/api/recommend/models/reload")
async def reload_recommendation_models():
    """โหลดโมเดลแนะนำใหม่ทั้งหมด (ใช้เมื่ออัปโหลดโมเดลใหม่)"""
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
    """อัปโหลดไฟล์โมเดลแนะนำ (.pkl) สำหรับหมวดหมู่ที่ระบุ"""
    # ตรวจสอบว่าหมวดหมู่ถูกต้อง
    category_normalized = (category or "").strip().lower()
    if category_normalized not in MODEL_CATEGORIES:
        raise HTTPException(status_code=400, detail="category must be one of: work, finance, love")

    # ตรวจสอบนามสกุลไฟล์ - รับเฉพาะ .pkl
    filename = file.filename or ""
    if not filename.lower().endswith(".pkl"):
        raise HTTPException(status_code=400, detail="Only .pkl files are allowed")

    # บันทึกไฟล์โมเดลลงดิสก์
    destination = _saved_model_path(category_normalized)
    try:
        with open(destination, "wb") as output:
            shutil.copyfileobj(file.file, output)  # คัดลอกเนื้อหาไฟล์
        _load_models_once(force=True)  # โหลดโมเดลใหม่ทันที
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Upload failed: {error}")
    finally:
        await file.close()  # ปิดไฟล์เสมอ

    return {
        "message": "Model uploaded successfully",
        "category": category_normalized,
        "stored_path": destination,
        "model_loaded": models[category_normalized]["user_similarity"] is not None,
    }


def _safe_float(value: Any) -> float:
    """แปลงค่าเป็น float อย่างปลอดภัย - คืน 0.0 ถ้าไม่สามารถแปลงได้หรือเป็น NaN/Inf"""
    try:
        if value is None:
            return 0.0
        result = float(value)
        # ตรวจสอบค่าที่ไม่ถูกต้อง (NaN หรือ Infinity)
        if math.isnan(result) or math.isinf(result):
            return 0.0
        return result
    except Exception:
        return 0.0


def _to_int(value: Any):
    """แปลงค่าเป็น int อย่างปลอดภัย - คืน None ถ้าแปลงไม่ได้"""
    try:
        if value is None:
            return None
        return int(str(value).strip())
    except Exception:
        return None


def _compute_cf_scores(category: str, user_id: int, visited_ids: set[int]) -> Dict[int, float]:
    """คำนวณคะแนนแนะนำแบบ Collaborative Filtering (CF) สำหรับผู้ใช้
    
    ใช้ความคล้ายของผู้ใช้ (user similarity) และ rating ของผู้ใช้ที่คล้ายกัน
    เพื่อประมาณว่าผู้ใช้นี้น่าจะชอบสถานที่ใดบ้าง
    
    Returns:
        dict ของ attraction_id -> คะแนน CF (ยิ่งสูงยิ่งแนะนำ)
    """
    user_similarity = models[category]["user_similarity"]
    user_item_matrix = models[category]["user_item_matrix"]
    # ถ้าโมเดลยังไม่ได้โหลด คืน dict ว่าง
    if user_similarity is None or user_item_matrix is None:
        return {}

    try:
        # ถ้าผู้ใช้ไม่อยู่ในโมเดล คืน dict ว่าง
        if user_id not in user_item_matrix.index:
            return {}

        # เรียงลำดับผู้ใช้ที่คล้ายกันมากที่สุด
        similar_users = user_similarity.loc[user_id].sort_values(ascending=False)
        cf_scores: Dict[int, float] = {}

        used = 0
        for similar_user, similarity_score in similar_users.items():
            if _to_int(similar_user) == user_id:
                continue  # ข้ามตัวเอง
            used += 1
            if used > 5:
                break  # ใช้แค่ 5 คนที่คล้ายที่สุด

            # คำนวณคะแนนจาก rating ของผู้ใช้ที่คล้ายกัน
            ratings_row = user_item_matrix.loc[similar_user]
            for attraction_key, rating_value in ratings_row.items():
                attraction_id = _to_int(attraction_key)
                # ข้าม: ถ้าไม่มี ID หรือผู้ใช้เคยไปแล้ว
                if attraction_id is None or attraction_id in visited_ids:
                    continue

                rating_value_float = _safe_float(rating_value)
                similarity_float = _safe_float(similarity_score)
                # ข้ามถ้าค่าคะแนนหรือ similarity เป็นลบหรือศูนย์
                if rating_value_float <= 0 or similarity_float <= 0:
                    continue

                # สะสมคะแนน = rating * similarity
                cf_scores[attraction_id] = cf_scores.get(attraction_id, 0.0) + (
                    rating_value_float * similarity_float
                )

        return cf_scores
    except Exception:
        return {}


@router.get("/recommend/{user_id}", response_model=RecommendationResponse)
@router.get("/api/recommend/{user_id}", response_model=RecommendationResponse)
async def recommend(user_id: int):
    """แนะนำสถานที่ศักดิ์สิทธิ์สำหรับผู้ใช้
    
    หลักการทำงาน:
    - ผู้ใช้เก่า (Existing User ที่เคยให้คะแนน): ใช้คำแนะนำจากโมเดล Collaborative Filtering (.pkl) 100%
    - ผู้ใช้ใหม่ (New User ยังไม่เคยให้คะแนน): ใช้คำแนะนำจากคะแนนความนิยม (Popularity) จากฐานข้อมูล 100%
    """
    _load_models_once()  # โหลดโมเดลถ้ายังไม่ได้โหลด

    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        # ดึงข้อมูลสถานที่ทั้งหมด พร้อม type และ category
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

        # ดึง rating ทั้งหมดของทุกผู้ใช้
        cursor.execute(
            """
            SELECT user_id, attraction_id, rating_work, rating_finance, rating_love
            FROM rating
            """
        )
        ratings = cursor.fetchall()

        # สร้าง map ของ attraction_id -> ข้อมูลสถานที่ เพื่อให้ lookup เร็ว
        attraction_map: Dict[int, Dict[str, Any]] = {
            int(row["attraction_id"]): row for row in attractions
        }

        # เก็บ ID สถานที่ที่ผู้ใช้นี้เคยให้คะแนนแล้ว
        user_visited_ids: set[int] = set()
        
        # เก็บคะแนนความนิยมสะสมของแต่ละสถานที่ในแต่ละหมวดหมู่
        popularity_scores: Dict[str, Dict[int, float]] = {
            "work": {},
            "finance": {},
            "love": {},
        }

        # ประมวลผล rating ทั้งหมด
        for row in ratings:
            attraction_id = _to_int(row.get("attraction_id"))
            if attraction_id is None:
                continue

            # แปลงคะแนนเป็น float (ป้องกัน None หรือค่าผิดพลาด)
            rating_work = _safe_float(row.get("rating_work"))
            rating_finance = _safe_float(row.get("rating_finance"))
            rating_love = _safe_float(row.get("rating_love"))

            # สะสมคะแนนความนิยมของแต่ละสถานที่
            popularity_scores["work"][attraction_id] = (
                popularity_scores["work"].get(attraction_id, 0.0) + rating_work
            )
            popularity_scores["finance"][attraction_id] = (
                popularity_scores["finance"].get(attraction_id, 0.0) + rating_finance
            )
            popularity_scores["love"][attraction_id] = (
                popularity_scores["love"].get(attraction_id, 0.0) + rating_love
            )

            # ถ้า rating นี้เป็นของผู้ใช้ที่ขอ ให้เพิ่มในรายการที่เคยไปแล้ว
            if _to_int(row.get("user_id")) == user_id and (rating_work > 0 or rating_finance > 0 or rating_love > 0):
                user_visited_ids.add(attraction_id)

        recommendation_entries = []
        has_any_cf = False

        # คำนวณการแนะนำสำหรับแต่ละหมวดหมู่
        for category_key, category_label in MODEL_CATEGORIES.items():
            pop_scores = popularity_scores[category_key]
            # คำนวณคะแนน CF จากผู้ใช้ที่คล้ายกัน
            cf_scores = _compute_cf_scores(category_key, user_id, user_visited_ids)

            # หาค่าสูงสุดสำหรับ normalize
            max_pop = max(pop_scores.values(), default=1.0)
            max_cf = max(cf_scores.values(), default=0.0)
            if max_cf > 0:
                has_any_cf = True

            # รวมคะแนนจากทุกสถานที่ที่มีข้อมูล
            combined_scores: Dict[int, float] = {}
            all_ids = set(pop_scores.keys()) | set(cf_scores.keys())
            for attraction_id in all_ids:
                # Normalize คะแนน popularity (0.0 - 1.0)
                pop_norm = (pop_scores.get(attraction_id, 0.0) / max_pop) if max_pop > 0 else 0.0
                if max_cf > 0:
                    # ใช้คะแนน CF จากโมเดล Pickle 100% สำหรับผู้ใช้เดิม
                    cf_norm = cf_scores.get(attraction_id, 0.0) / max_cf
                    final_score = cf_norm
                else:
                    # ถ้าไม่มีโมเดล CF ใช้ popularity อย่างเดียว
                    final_score = pop_norm
                if final_score > 0:
                    combined_scores[attraction_id] = final_score

            # เรียงลำดับสถานที่ตามคะแนน (มากไปน้อย)
            sorted_scores = sorted(combined_scores.items(), key=lambda item: item[1], reverse=True)
            for attraction_id, score in sorted_scores[:100]:
                if attraction_id not in attraction_map:
                    continue  # ข้ามถ้าไม่พบสถานที่ใน map

                row = attraction_map[attraction_id]
                recommendation_entries.append({
                    "id": str(attraction_id),
                    "name": row.get("attraction_name") or "Unknown",
                    "type": row.get("type_name") or "ไม่ระบุประเภท",
                    "category": category_label,           # ชื่อหมวดหมู่ภาษาไทย
                    "lat": _safe_float(row.get("lat")),
                    "lng": _safe_float(row.get("lng")),
                    "score": round(score * 5, 2),         # แปลงคะแนนเป็น scale 0-5
                    "image": row.get("attraction_image") or "",
                    "sacred_object": row.get("sacred_obj") or "-",
                    "offerings": row.get("offering") or "-",
                })

        # เรียงลำดับผลลัพธ์สุดท้ายตามคะแนน (มากไปน้อย) แล้วจำกัด 150 รายการ
        recommendation_entries.sort(key=lambda item: item["score"], reverse=True)

        return {
            "user_id": str(user_id),
            "is_new_user": not has_any_cf,
            "recommendations": recommendation_entries[:150],
        }

    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Recommendation error: {error}")
    finally:
        # ปิด cursor และ connection เสมอ
        if cursor:
            cursor.close()
        if connection:
            connection.close()
