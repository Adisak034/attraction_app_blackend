# =============================================================================
# attractions.py
# =============================================================================
# Router สำหรับ API จัดการข้อมูลสถานที่ศักดิ์สิทธิ์/วัด (Attractions)
# Endpoints:
#   GET    /api/attraction         → ดึงสถานที่ทั้งหมด พร้อมหมวดหมู่
#   POST   /api/attraction         → สร้างสถานที่ใหม่ พร้อมเชื่อมหมวดหมู่
#   GET    /api/attraction/{id}    → ดึงสถานที่เดียวตาม ID
#   PUT    /api/attraction/{id}    → อัปเดตข้อมูลสถานที่ตาม ID
#   DELETE /api/attraction/{id}    → ลบสถานที่และข้อมูลที่เกี่ยวข้องทั้งหมด
# =============================================================================

from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException
from app.core.database import get_connection
from app.schemas.schemas import (
    AttractionResponse, AttractionCreate, AttractionUpdate,
    AttractionDetailResponse, AttractionCreateResponse, MessageResponse
)

# กำหนด router สำหรับจัดการข้อมูลสถานที่/วัด
router = APIRouter(prefix="/api/attraction", tags=["attractions"])


# =============================================================================
# Helper Functions
# =============================================================================

def _fetch_all_attractions_query(cursor: Any) -> List[Dict[str, Any]]:
    """ดึงข้อมูลสถานที่ทั้งหมดพร้อมกลุ่มหมวดหมู่ (GROUP_CONCAT categories)"""
    query = """
        SELECT 
            a.attraction_id, 
            a.attraction_name, 
            a.type_id, 
            a.district_id, 
            a.sect_id, 
            a.lat, 
            a.lng, 
            a.sacred_obj, 
            a.offering,
            a.attraction_image,
            GROUP_CONCAT(c.category_name SEPARATOR ', ') as categories
        FROM attraction a
        LEFT JOIN attraction_category ac ON a.attraction_id = ac.attraction_id
        LEFT JOIN category c ON ac.category_id = c.category_id
        GROUP BY a.attraction_id
    """
    cursor.execute(query)
    return cursor.fetchall()


def _fetch_single_attraction(cursor: Any, attraction_id: int) -> Dict[str, Any]:
    """ดึงข้อมูลสถานที่เดียวตาม ID"""
    cursor.execute("SELECT * FROM attraction WHERE attraction_id = %s", (attraction_id,))
    return cursor.fetchone()


def _fetch_attraction_categories(cursor: Any, attraction_id: int) -> List[Dict[str, int]]:
    """ดึงรายการ ID หมวดหมู่ทั้งหมดที่เชื่อมโยงกับสถานที่นี้"""
    cursor.execute(
        "SELECT category_id FROM attraction_category WHERE attraction_id = %s",
        (attraction_id,)
    )
    return [{"category_id": row["category_id"]} for row in cursor.fetchall()]


def _insert_attraction_record(cursor: Any, attraction: AttractionCreate) -> int:
    """บันทึกข้อมูลสถานที่ใหม่ลงในตาราง attraction และคืนค่า lastrowid"""
    insert_query = """
        INSERT INTO attraction 
        (attraction_name, type_id, district_id, sect_id, lat, lng, sacred_obj, offering)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """
    cursor.execute(insert_query, (
        attraction.attraction_name,
        attraction.type_id,
        attraction.district_id,
        attraction.sect_id,
        attraction.lat,
        attraction.lng,
        attraction.sacred_obj,
        attraction.offering
    ))
    return cursor.lastrowid


def _replace_attraction_categories(cursor: Any, attraction_id: int, category_ids: List[int]) -> None:
    """ลบความสัมพันธ์หมวดหมู่เดิมและเพิ่มความสัมพันธ์หมวดหมู่ใหม่ทั้งหมด"""
    cursor.execute("DELETE FROM attraction_category WHERE attraction_id = %s", (attraction_id,))
    if category_ids:
        for category_id in category_ids:
            cursor.execute(
                "INSERT INTO attraction_category (attraction_id, category_id) VALUES (%s, %s)",
                (attraction_id, category_id)
            )


def _update_attraction_record(cursor: Any, attraction_id: int, attraction: AttractionUpdate) -> None:
    """อัปเดตข้อมูลสถานที่หลักตาม ID"""
    update_query = """
        UPDATE attraction 
        SET attraction_name = %s, type_id = %s, district_id = %s, 
            sect_id = %s, lat = %s, lng = %s, sacred_obj = %s, offering = %s
        WHERE attraction_id = %s
    """
    cursor.execute(update_query, (
        attraction.attraction_name,
        attraction.type_id,
        attraction.district_id,
        attraction.sect_id,
        attraction.lat,
        attraction.lng,
        attraction.sacred_obj,
        attraction.offering,
        attraction_id
    ))


def _delete_attraction_all_relations(cursor: Any, attraction_id: int) -> int:
    """ลบข้อมูลหมวดหมู่ คะแนนรีวิว และข้อมูลสถานที่หลักตาม ID คืนค่าจำนวนแถวที่ถูกลบ"""
    cursor.execute("DELETE FROM attraction_category WHERE attraction_id = %s", (attraction_id,))
    cursor.execute("DELETE FROM rating WHERE attraction_id = %s", (attraction_id,))
    cursor.execute("DELETE FROM attraction WHERE attraction_id = %s", (attraction_id,))
    return cursor.rowcount


# =============================================================================
# API Endpoints
# =============================================================================

@router.get("", response_model=List[AttractionResponse])
async def get_attractions():
    """ดึงข้อมูลสถานที่ทั้งหมดพร้อมหมวดหมู่"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        return _fetch_all_attractions_query(cursor)
    except Exception as e:
        print(f"Error in get_attractions: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.post("", status_code=201, response_model=AttractionCreateResponse)
async def create_attraction(attraction: AttractionCreate):
    """สร้างสถานที่ใหม่และเชื่อมโยงกับหมวดหมู่"""
    if not attraction.attraction_name or not isinstance(attraction.category_ids, list):
        raise HTTPException(status_code=400, detail="Missing required fields")

    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        connection.start_transaction()

        attraction_id = _insert_attraction_record(cursor, attraction)
        if attraction.category_ids:
            _replace_attraction_categories(cursor, attraction_id, attraction.category_ids)

        connection.commit()
        return {
            "message": "Attraction created successfully",
            "attraction_id": attraction_id
        }
    except HTTPException as e:
        if connection:
            connection.rollback()
        raise e
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"Error in create_attraction: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.get("/{id}", response_model=AttractionDetailResponse)
async def get_attraction(id: int):
    """ดึงข้อมูลสถานที่เดียวพร้อมหมวดหมู่ตาม ID"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        attraction = _fetch_single_attraction(cursor, id)
        if not attraction:
            raise HTTPException(status_code=404, detail="Attraction not found")

        attraction["categories"] = _fetch_attraction_categories(cursor, id)
        return attraction
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in get_attraction: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.put("/{id}", response_model=MessageResponse)
async def update_attraction(id: int, attraction: AttractionUpdate):
    """อัปเดตข้อมูลสถานที่และหมวดหมู่ตาม ID"""
    if not attraction.attraction_name or not isinstance(attraction.category_ids, list):
        raise HTTPException(status_code=400, detail="Missing required fields")

    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        connection.start_transaction()

        _update_attraction_record(cursor, id, attraction)
        _replace_attraction_categories(cursor, id, attraction.category_ids)

        connection.commit()
        return {"message": "Attraction updated successfully"}
    except HTTPException as e:
        if connection:
            connection.rollback()
        raise e
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"Error in update_attraction: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.delete("/{id}", response_model=MessageResponse)
async def delete_attraction(id: int):
    """ลบสถานที่และข้อมูลที่เกี่ยวข้องทั้งหมดตาม ID"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        connection.start_transaction()

        deleted_count = _delete_attraction_all_relations(cursor, id)
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail="Attraction not found")

        connection.commit()
        return {"message": "Attraction deleted successfully"}
    except HTTPException as e:
        if connection:
            connection.rollback()
        raise e
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"Error in delete_attraction: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
