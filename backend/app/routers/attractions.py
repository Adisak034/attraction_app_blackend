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

from fastapi import APIRouter, HTTPException
from app.core.database import get_connection
from app.schemas.schemas import (
    AttractionResponse, AttractionCreate, AttractionUpdate
)
from typing import List

# กำหนด router สำหรับจัดการข้อมูลสถานที่/วัด
router = APIRouter(prefix="/api/attraction", tags=["attractions"])

@router.get("", response_model=List[dict])
async def get_attractions():
    """ดึงข้อมูลสถานที่ทั้งหมดพร้อมหมวดหมู่"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Query ดึงข้อมูลสถานที่ทั้งหมด พร้อม JOIN ตารางหมวดหมู่
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
        rows = cursor.fetchall()  # ดึงข้อมูลทั้งหมด
        cursor.close()
        connection.close()
        
        return rows
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("", status_code=201)
async def create_attraction(attraction: AttractionCreate):
    """สร้างสถานที่ใหม่และเชื่อมโยงกับหมวดหมู่"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # ตรวจสอบข้อมูลที่จำเป็น
        if not attraction.attraction_name or not isinstance(attraction.category_ids, list):
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # บันทึกข้อมูลสถานที่ลงฐานข้อมูล
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
        
        # ดึง ID ของสถานที่ที่เพิ่งสร้าง
        attraction_id = cursor.lastrowid
        
        # เชื่อมโยงสถานที่กับหมวดหมู่ที่เลือก
        if attraction.category_ids:
            category_query = "INSERT INTO attraction_category (attraction_id, category_id) VALUES (%s, %s)"
            for category_id in attraction.category_ids:
                cursor.execute(category_query, (attraction_id, category_id))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return {
            "message": "Attraction created successfully",
            "attraction_id": attraction_id
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/{id}", response_model=dict)
async def get_attraction(id: int):
    """ดึงข้อมูลสถานที่เดียวพร้อมหมวดหมู่ตาม ID"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # ดึงข้อมูลสถานที่ตาม ID
        cursor.execute("SELECT * FROM attraction WHERE attraction_id = %s", (id,))
        attraction = cursor.fetchone()
        
        # ถ้าไม่พบสถานที่ ส่ง 404
        if not attraction:
            raise HTTPException(status_code=404, detail="Attraction not found")
        
        # ดึงรายการหมวดหมู่ของสถานที่นี้
        cursor.execute(
            "SELECT category_id FROM attraction_category WHERE attraction_id = %s",
            (id,)
        )
        categories = [{"category_id": row["category_id"]} for row in cursor.fetchall()]
        
        # แนบหมวดหมู่เข้ากับข้อมูลสถานที่
        attraction["categories"] = categories
        cursor.close()
        connection.close()
        
        return attraction
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.put("/{id}")
async def update_attraction(id: int, attraction: AttractionUpdate):
    """อัปเดตข้อมูลสถานที่และหมวดหมู่ตาม ID"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # ตรวจสอบข้อมูลที่จำเป็น
        if not attraction.attraction_name or not isinstance(attraction.category_ids, list):
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        try:
            connection.start_transaction()  # เริ่ม transaction
            
            # อัปเดตข้อมูลสถานที่
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
                id
            ))
            
            # ลบหมวดหมู่เก่าออกก่อน
            cursor.execute("DELETE FROM attraction_category WHERE attraction_id = %s", (id,))
            
            # บันทึกหมวดหมู่ใหม่
            if attraction.category_ids:
                for category_id in attraction.category_ids:
                    cursor.execute(
                        "INSERT INTO attraction_category (attraction_id, category_id) VALUES (%s, %s)",
                        (id, category_id)
                    )
            
            connection.commit()
            cursor.close()
            connection.close()
            
            return {"message": "Attraction updated successfully"}
        
        except Exception as e:
            connection.rollback()  # ยกเลิก transaction ถ้าเกิดข้อผิดพลาด
            raise e
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.delete("/{id}")
async def delete_attraction(id: int):
    """ลบสถานที่และข้อมูลที่เกี่ยวข้องทั้งหมดตาม ID"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        connection.start_transaction()  # เริ่ม transaction
        
        # ลบข้อมูลหมวดหมู่ของสถานที่ก่อน (ลบ foreign key)
        cursor.execute("DELETE FROM attraction_category WHERE attraction_id = %s", (id,))
        
        # ลบคะแนนรีวิวของสถานที่
        cursor.execute("DELETE FROM rating WHERE attraction_id = %s", (id,))
        
        # ลบสถานที่
        cursor.execute("DELETE FROM attraction WHERE attraction_id = %s", (id,))
        if cursor.rowcount == 0:
            # ถ้าไม่มีแถวที่ถูกลบ แสดงว่าไม่พบสถานที่
            raise HTTPException(status_code=404, detail="Attraction not found")
        
        connection.commit()
        
        return {"message": "Attraction deleted successfully"}
    
    except HTTPException as e:
        if connection:
            connection.rollback()  # ยกเลิก transaction
        raise e
    
    except Exception as e:
        if connection:
            connection.rollback()  # ยกเลิก transaction ถ้าเกิดข้อผิดพลาด
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    
    finally:
        # ปิด cursor และ connection เสมอ (ไม่ว่าจะสำเร็จหรือไม่)
        if cursor:
            cursor.close()
        if connection:
            connection.close()
