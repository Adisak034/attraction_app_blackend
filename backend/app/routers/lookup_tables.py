# =============================================================================
# lookup_tables.py
# =============================================================================
# ไฟล์นี้เป็น Router สำหรับ API ที่ใช้ดึงข้อมูลตารางอ้างอิง (Lookup Tables)
# ซึ่งเป็นข้อมูลพื้นฐานที่ใช้ในระบบ เช่น:
#   - /api/category  → หมวดหมู่ความต้องการ (การงาน, ความรัก, โชคลาภ ฯลฯ)
#   - /api/district  → อำเภอ/เขต
#   - /api/type      → ประเภทสถานที่ศักดิ์สิทธิ์ (วัด, ศาล, เจดีย์ ฯลฯ)
#   - /api/sect      → นิกาย (เถรวาท, มหายาน ฯลฯ)
#
# Endpoints เหล่านี้ส่งคืนข้อมูลจากฐานข้อมูล MySQL เพื่อใช้ populate
# dropdown หรือ filter ต่าง ๆ ในฝั่ง Frontend
# =============================================================================

from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException
from app.core.database import get_connection
from app.schemas.schemas import CategoryResponse, DistrictResponse, SectResponse, TypeResponse

# กำหนด router สำหรับดึงข้อมูลตารางอ้างอิง (Lookup Tables)
router = APIRouter(prefix="/api", tags=["lookup-tables"])


# =============================================================================
# Helper Functions
# =============================================================================

def _fetch_categories_list(cursor: Any) -> List[Dict[str, Any]]:
    """ดึงข้อมูล ID และชื่อหมวดหมู่ทั้งหมดจากตาราง category"""
    cursor.execute("SELECT category_id, category_name FROM category")
    return cursor.fetchall()


def _fetch_districts_list(cursor: Any) -> List[Dict[str, Any]]:
    """ดึงข้อมูล ID และชื่ออำเภอ/เขตทั้งหมดจากตาราง district"""
    cursor.execute("SELECT district_id, district_name FROM district")
    return cursor.fetchall()


def _fetch_types_list(cursor: Any) -> List[Dict[str, Any]]:
    """ดึงข้อมูล ID และชื่อประเภทสถานที่ทั้งหมดจากตาราง type"""
    cursor.execute("SELECT type_id, type_name FROM type")
    return cursor.fetchall()


def _fetch_sects_list(cursor: Any) -> List[Dict[str, Any]]:
    """ดึงข้อมูล ID และชื่อนิกายทั้งหมดจากตาราง sect"""
    cursor.execute("SELECT sect_id, sect_name FROM sect")
    return cursor.fetchall()


# =============================================================================
# API Endpoints
# =============================================================================

@router.get("/category", response_model=List[CategoryResponse])
async def get_categories():
    """ดึงข้อมูลหมวดหมู่ทั้งหมด (เช่น การงาน ความรัก โชคลาภ)"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        return _fetch_categories_list(cursor)
    except Exception as e:
        print(f"Error in get_categories: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.get("/district", response_model=List[DistrictResponse])
async def get_districts():
    """ดึงข้อมูลอำเภอ/เขตทั้งหมด"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        return _fetch_districts_list(cursor)
    except Exception as e:
        print(f"Error in get_districts: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.get("/type", response_model=List[TypeResponse])
async def get_types():
    """ดึงข้อมูลประเภทสถานที่ทั้งหมด (เช่น วัด ศาล เจดีย์)"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        return _fetch_types_list(cursor)
    except Exception as e:
        print(f"Error in get_types: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.get("/sect", response_model=List[SectResponse])
async def get_sects():
    """ดึงข้อมูลนิกายทั้งหมด (เช่น เถรวาท มหายาน)"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        return _fetch_sects_list(cursor)
    except Exception as e:
        print(f"Error in get_sects: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
