from fastapi import APIRouter, HTTPException
from app.core.database import get_connection
from app.schemas.schemas import RatingCreate, RatingResponse
from typing import List

# กำหนด router สำหรับจัดการคะแนนรีวิว
router = APIRouter(prefix="/api/rating", tags=["ratings"])

@router.get("", response_model=List[dict])
async def get_ratings():
    """ดึงคะแนนรีวิวทั้งหมด พร้อมชื่อผู้ใช้และชื่อสถานที่"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # JOIN ตาราง user และ attraction เพื่อดึงชื่อมาแสดง
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
        rows = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return rows
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("", status_code=201)
async def create_rating(rating: RatingCreate):
    """สร้างคะแนนรีวิวใหม่"""
    try:
        # ตรวจสอบข้อมูลที่จำเป็น
        if not rating.user_id or not rating.attraction_id:
            raise HTTPException(status_code=400, detail="user_id and attraction_id are required")
        
        # ตรวจสอบค่าคะแนนต้องอยู่ในช่วง 0-5
        for value in [rating.rating_work, rating.rating_finance, rating.rating_love]:
            if value is not None and (value < 0 or value > 5):
                raise HTTPException(status_code=400, detail="Rating values must be between 0 and 5")
        
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # บันทึกคะแนนรีวิวลงฐานข้อมูล (ใช้ 0 ถ้าไม่ได้ระบุค่า)
        cursor.execute(
            "INSERT INTO rating (user_id, attraction_id, rating_work, rating_finance, rating_love) VALUES (%s, %s, %s, %s, %s)",
            (rating.user_id, rating.attraction_id, rating.rating_work or 0, rating.rating_finance or 0, rating.rating_love or 0)
        )
        
        # ดึง ID ของคะแนนที่เพิ่งสร้าง
        rating_id = cursor.lastrowid
        connection.commit()
        cursor.close()
        connection.close()
        
        # ส่งข้อมูลคะแนนที่สร้างกลับ
        return {
            "rating_id": rating_id,
            "user_id": rating.user_id,
            "attraction_id": rating.attraction_id,
            "rating_work": rating.rating_work or 0,
            "rating_finance": rating.rating_finance or 0,
            "rating_love": rating.rating_love or 0
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/user/{user_id}", response_model=List[dict])
async def get_user_ratings(user_id: int):
    """ดึงคะแนนรีวิวทั้งหมดของผู้ใช้คนเดียว พร้อมชื่อสถานที่"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # ดึงคะแนนรีวิวของผู้ใช้ที่ระบุ พร้อมชื่อสถานที่
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
        rows = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return rows
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.delete("/{id}")
async def delete_rating(id: int):
    """ลบคะแนนรีวิวตาม rating_id"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # ลบคะแนนรีวิว
        cursor.execute("DELETE FROM rating WHERE rating_id = %s", (id,))
        if cursor.rowcount == 0:
            # ถ้าไม่มีแถวที่ถูกลบ แสดงว่าไม่พบคะแนนนี้
            raise HTTPException(status_code=404, detail="Rating not found")

        connection.commit()
        
        return {"message": "Rating deleted successfully"}

    except HTTPException as e:
        raise e
    
    except Exception as e:
        if connection:
            connection.rollback()  # ยกเลิก transaction ถ้าเกิดข้อผิดพลาด
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

    finally:
        # ปิด cursor และ connection เสมอ
        if cursor:
            cursor.close()
        if connection:
            connection.close()
