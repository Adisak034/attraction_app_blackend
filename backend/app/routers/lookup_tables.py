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

from fastapi import APIRouter, HTTPException
from app.core.database import get_connection
from typing import List

# กำหนด router สำหรับดึงข้อมูลตารางอ้างอิง (Lookup Tables)
router = APIRouter(prefix="/api", tags=["lookup-tables"])

@router.get("/category", response_model=List[dict])
async def get_categories():
    """ดึงข้อมูลหมวดหมู่ทั้งหมด (เช่น การงาน ความรัก โชคลาภ)"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # ดึง ID และชื่อหมวดหมู่ทั้งหมด
        cursor.execute("SELECT category_id, category_name FROM category")
        rows = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return rows
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/district", response_model=List[dict])
async def get_districts():
    """ดึงข้อมูลอำเภอ/เขตทั้งหมด"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # ดึง ID และชื่ออำเภอทั้งหมด
        cursor.execute("SELECT district_id, district_name FROM district")
        rows = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return rows
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/type", response_model=List[dict])
async def get_types():
    """ดึงข้อมูลประเภทสถานที่ทั้งหมด (เช่น วัด ศาล เจดีย์)"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # ดึง ID และชื่อประเภทสถานที่ทั้งหมด
        cursor.execute("SELECT type_id, type_name FROM type")
        rows = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return rows
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/sect", response_model=List[dict])
async def get_sects():
    """ดึงข้อมูลนิกายทั้งหมด (เช่น เถรวาท มหายาน)"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # ดึง ID และชื่อนิกายทั้งหมด
        cursor.execute("SELECT sect_id, sect_name FROM sect")
        rows = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return rows
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
