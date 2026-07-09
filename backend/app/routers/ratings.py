# =============================================================================
# ratings.py
# =============================================================================
# Router สำหรับ API จัดการคะแนนรีวิวสถานที่ (Ratings)
# คะแนนแบ่งเป็น 3 มิติ: การงาน (work), การเงิน/โชคลาภ (finance),
#                        และความรัก (love) ช่วง 0-5
# Endpoints:
#   GET    /api/rating              → ดึงคะแนนรีวิวทั้งหมด พร้อมชื่อผู้ใช้/สถานที่
#   POST   /api/rating              → เพิ่มคะแนนรีวิวใหม่
#   GET    /api/rating/user/{id}    → ดึงคะแนนรีวิวทั้งหมดของผู้ใช้คนเดียว
#   DELETE /api/rating/{id}         → ลบคะแนนรีวิวตาม rating_id
# =============================================================================

from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException
from app.core.database import get_connection
from app.schemas.schemas import MessageResponse, RatingCreate, RatingDetailResponse, RatingResponse

# กำหนด router สำหรับจัดการคะแนนรีวิว
router = APIRouter(prefix="/api/rating", tags=["ratings"])


# =============================================================================
# Helper Functions
# =============================================================================

def _validate_rating_input(rating: RatingCreate) -> None:
    """ตรวจสอบความถูกต้องของข้อมูลคะแนนรีวิวก่อนบันทึก"""
    if not rating.user_id or not rating.attraction_id:
        raise HTTPException(status_code=400, detail="user_id and attraction_id are required")
    for value in [rating.rating_work, rating.rating_finance, rating.rating_love]:
        if value is not None and (value < 0 or value > 5):
            raise HTTPException(status_code=400, detail="Rating values must be between 0 and 5")


def _fetch_all_ratings_with_names(cursor: Any) -> List[Dict[str, Any]]:
    """ดึงคะแนนรีวิวทั้งหมด พร้อม JOIN ชื่อผู้ใช้และชื่อสถานที่"""
    query = """
        SELECT 
            r.rating_id,
            r.user_id,
            r.attraction_id,
            r.rating_work,
            r.rating_finance,
            r.rating_love,
            r.created_at,
            u.user_name,
            a.attraction_name
        FROM rating r
        JOIN `user` u ON r.user_id = u.user_id
        JOIN attraction a ON r.attraction_id = a.attraction_id
        ORDER BY r.created_at DESC
    """
    cursor.execute(query)
    return cursor.fetchall()


def _insert_rating_record(cursor: Any, rating: RatingCreate) -> int:
    """บันทึกคะแนนรีวิวใหม่ลงในตาราง rating และคืนค่า rating_id ที่เพิ่งสร้าง"""
    cursor.execute(
        "INSERT INTO rating (user_id, attraction_id, rating_work, rating_finance, rating_love) VALUES (%s, %s, %s, %s, %s)",
        (
            rating.user_id,
            rating.attraction_id,
            rating.rating_work or 0,
            rating.rating_finance or 0,
            rating.rating_love or 0,
        )
    )
    return cursor.lastrowid


def _insert_rating_activity_log(cursor: Any, user_id: int, attraction_id: int) -> None:
    """บันทึกกิจกรรมการรีวิว (rate) ลงในตาราง activity_log"""
    cursor.execute(
        "INSERT INTO activity_log (user_id, attraction_id, action_type) VALUES (%s, %s, %s)",
        (user_id, attraction_id, "rate")
    )


def _fetch_user_ratings_with_names(cursor: Any, user_id: int) -> List[Dict[str, Any]]:
    """ดึงคะแนนรีวิวของผู้ใช้คนเดียว พร้อม JOIN ชื่อสถานที่"""
    query = """
        SELECT 
            r.rating_id,
            r.user_id,
            r.attraction_id,
            r.rating_work,
            r.rating_finance,
            r.rating_love,
            r.created_at,
            a.attraction_name
        FROM rating r
        JOIN attraction a ON r.attraction_id = a.attraction_id
        WHERE r.user_id = %s
        ORDER BY r.created_at DESC
    """
    cursor.execute(query, (user_id,))
    return cursor.fetchall()


def _delete_rating_by_id(cursor: Any, rating_id: int) -> int:
    """ลบคะแนนรีวิวตาม ID คืนค่าจำนวนแถวที่ถูกลบ"""
    cursor.execute("DELETE FROM rating WHERE rating_id = %s", (rating_id,))
    return cursor.rowcount


# =============================================================================
# API Endpoints
# =============================================================================

@router.get("", response_model=List[RatingDetailResponse])
async def get_ratings():
    """ดึงคะแนนรีวิวทั้งหมด พร้อมชื่อผู้ใช้และชื่อสถานที่"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        return _fetch_all_ratings_with_names(cursor)
    except Exception as e:
        print(f"Error in get_ratings: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.post("", status_code=201, response_model=RatingResponse)
async def create_rating(rating: RatingCreate):
    """สร้างคะแนนรีวิวใหม่"""
    _validate_rating_input(rating)

    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        connection.start_transaction()

        rating_id = _insert_rating_record(cursor, rating)
        _insert_rating_activity_log(cursor, rating.user_id, rating.attraction_id)

        connection.commit()
        return {
            "rating_id": rating_id,
            "user_id": rating.user_id,
            "attraction_id": rating.attraction_id,
            "rating_work": rating.rating_work or 0,
            "rating_finance": rating.rating_finance or 0,
            "rating_love": rating.rating_love or 0,
        }
    except HTTPException as e:
        if connection:
            connection.rollback()
        raise e
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"Error in create_rating: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.get("/user/{user_id}", response_model=List[RatingDetailResponse])
async def get_user_ratings(user_id: int):
    """ดึงคะแนนรีวิวทั้งหมดของผู้ใช้คนเดียว พร้อมชื่อสถานที่"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        return _fetch_user_ratings_with_names(cursor, user_id)
    except Exception as e:
        print(f"Error in get_user_ratings: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.delete("/{id}", response_model=MessageResponse)
async def delete_rating(id: int):
    """ลบคะแนนรีวิวตาม rating_id"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        connection.start_transaction()

        deleted_count = _delete_rating_by_id(cursor, id)
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail="Rating not found")

        connection.commit()
        return {"message": "Rating deleted successfully"}
    except HTTPException as e:
        if connection:
            connection.rollback()
        raise e
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"Error in delete_rating: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
