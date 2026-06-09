from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from app.core.database import get_connection
from app.schemas.schemas import ImageCreate, ImageUpdate
from typing import List, Optional
import os
import time
import random
import string
from urllib.parse import urlparse

# กำหนด router สำหรับจัดการรูปภาพ
router = APIRouter(prefix="/api/image", tags=["images"])

# กำหนด path สำหรับเก็บไฟล์รูปภาพที่อัปโหลด
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
UPLOAD_DIR = os.path.join(PROJECT_ROOT, "public", "uploads")


def _normalize_image_path(raw_value: str) -> str:
    """แปลง path รูปภาพทุกรูปแบบให้เป็น format มาตรฐาน /uploads/<filename>
    
    รองรับ path ทั้งแบบ URL, relative path และ absolute path
    เพื่อให้ client สามารถเรียกรูปภาพได้จาก URL เดียวกันเสมอ
    """
    value = (raw_value or "").strip()
    if not value:
        return value

    # แปลง backslash เป็น forward slash
    normalized = value.replace("\\", "/")

    # จัดการ URL แบบ http/https
    if normalized.startswith("http://") or normalized.startswith("https://"):
        parsed = urlparse(normalized)
        path = (parsed.path or "").replace("\\", "/")
        # ดึงชื่อไฟล์จาก /uploads/ หรือ /images/
        if "/uploads/" in path:
            filename = path.rsplit("/", 1)[-1]
            return f"/uploads/{filename}"
        if "/images/" in path:
            filename = path.rsplit("/", 1)[-1]
            return f"/uploads/{filename}"
        return value  # คืนค่าเดิมถ้าไม่ใช่ path ที่รู้จัก

    # จัดการ path แบบ public/uploads/...
    if normalized.startswith("public/uploads/"):
        filename = normalized.rsplit("/", 1)[-1]
        return f"/uploads/{filename}"

    # จัดการ path แบบ uploads/...
    if normalized.startswith("uploads/"):
        filename = normalized.rsplit("/", 1)[-1]
        return f"/uploads/{filename}"

    # จัดการ path แบบ /uploads/... (มี leading slash)
    if normalized.startswith("/uploads/"):
        filename = normalized.rsplit("/", 1)[-1]
        return f"/uploads/{filename}"

    # จัดการ path แบบ images/...
    if normalized.startswith("images/"):
        filename = normalized.rsplit("/", 1)[-1]
        return f"/uploads/{filename}"

    # จัดการ path แบบ /images/... (มี leading slash)
    if normalized.startswith("/images/"):
        filename = normalized.rsplit("/", 1)[-1]
        return f"/uploads/{filename}"

    # คืนค่าเดิมถ้าไม่ตรงกับรูปแบบใดเลย
    return value

@router.get("", response_model=List[dict])
async def get_images(attraction_id: Optional[int] = None):
    """ดึงรูปภาพของสถานที่ทั้งหมด หรือกรองตาม attraction_id"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Query พื้นฐาน - ดึงเฉพาะสถานที่ที่มีรูปภาพ
        query = "SELECT attraction_id, attraction_image FROM attraction WHERE attraction_image IS NOT NULL"
        params = []
        
        # เพิ่มเงื่อนไขกรองตาม attraction_id ถ้าระบุมา
        if attraction_id:
            query += " AND attraction_id = %s"
            params.append(attraction_id)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        cursor.close()
        connection.close()

        # แปลง path รูปภาพให้เป็น format มาตรฐาน
        for row in rows:
            row["attraction_image"] = _normalize_image_path(row.get("attraction_image") or "")
        
        return rows
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("", status_code=201)
async def create_image(image: ImageCreate):
    """อัปเดต URL รูปภาพให้กับสถานที่ (บันทึก path ลงฐานข้อมูล)"""
    try:
        # ตรวจสอบข้อมูลที่จำเป็น
        if not image.Image_name or not image.attraction_id:
            raise HTTPException(status_code=400, detail="Image_name and attraction_id are required")
        
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # แปลง path เป็น format มาตรฐานก่อนบันทึก
        normalized_path = _normalize_image_path(image.Image_name)

        # อัปเดต path รูปภาพในตาราง attraction
        cursor.execute(
            "UPDATE attraction SET attraction_image = %s WHERE attraction_id = %s",
            (normalized_path, image.attraction_id)
        )
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return {
            "attraction_id": image.attraction_id,
            "Image_name": normalized_path,
            "message": "Image updated successfully"
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/{id}", response_model=dict)
async def get_image(id: int):
    """ดึงข้อมูลรูปภาพของสถานที่ตาม attraction_id"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # ดึง path รูปภาพของสถานที่
        cursor.execute(
            "SELECT attraction_id, attraction_image FROM attraction WHERE attraction_id = %s",
            (id,)
        )
        image = cursor.fetchone()
        cursor.close()
        connection.close()
        
        # ถ้าไม่พบสถานที่ ส่ง 404
        if not image:
            raise HTTPException(status_code=404, detail="Attraction not found")

        # แปลง path เป็น format มาตรฐาน
        image["attraction_image"] = _normalize_image_path(image.get("attraction_image") or "")
        
        return image
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.put("/{id}")
async def update_image(id: int, image: ImageUpdate):
    """อัปเดต path รูปภาพของสถานที่ตาม attraction_id"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # ตรวจสอบว่ามีชื่อไฟล์รูปภาพ
        if not image.Image_name:
            raise HTTPException(status_code=400, detail="Image_name is required")
        
        # แปลง path เป็น format มาตรฐาน
        normalized_path = _normalize_image_path(image.Image_name)

        # อัปเดต path รูปภาพ
        cursor.execute(
            "UPDATE attraction SET attraction_image = %s WHERE attraction_id = %s",
            (normalized_path, id)
        )
        connection.commit()
        cursor.close()
        connection.close()
        
        return {"message": "Image updated successfully"}
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.delete("/{id}")
async def delete_image(id: int):
    """ลบรูปภาพของสถานที่ ทั้งในฐานข้อมูลและไฟล์จริงบนดิสก์"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        # ดึง path รูปภาพของสถานที่ก่อนลบ
        cursor.execute(
            "SELECT attraction_id, attraction_image FROM attraction WHERE attraction_id = %s",
            (id,),
        )
        attraction = cursor.fetchone()
        if not attraction:
            raise HTTPException(status_code=404, detail="Attraction not found")

        # ดึง path ไฟล์รูปภาพ
        image_path = attraction.get("attraction_image")
        if image_path:
            # แยกชื่อไฟล์จาก path (เช่น "/uploads/12.jpg" -> "12.jpg")
            filename = image_path.rsplit("/", 1)[-1] if "/" in image_path else image_path
            filepath = os.path.join(UPLOAD_DIR, filename)
            
            # ลบไฟล์รูปภาพออกจากดิสก์
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
            except OSError as e:
                # แจ้งเตือนแต่ไม่หยุดการทำงาน (ลบออกจาก DB ต่อ)
                print(f"Warning: Could not delete file {filepath}: {e}")

        # อัปเดตฐานข้อมูล - ลบ reference รูปภาพออก
        cursor.execute("UPDATE attraction SET attraction_image = NULL WHERE attraction_id = %s", (id,))
        connection.commit()

        return {
            "message": "Image deleted successfully",
            "attraction_id": id,
            "already_empty": image_path in (None, ""),  # บอกว่าไม่มีรูปอยู่แล้วหรือเปล่า
        }

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

@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    attraction_id: Optional[int] = Form(None),
):
    """อัปโหลดไฟล์รูปภาพสำหรับสถานที่"""
    try:
        # ตรวจสอบนามสกุลไฟล์ - รับเฉพาะไฟล์รูปภาพ
        allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail="Invalid file type")
        
        # ตรวจสอบขนาดไฟล์ (ไม่เกิน 5MB)
        file_content = await file.read()
        if len(file_content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large (max 5MB)")
        
        # สร้างโฟลเดอร์ uploads ถ้ายังไม่มี
        os.makedirs(UPLOAD_DIR, exist_ok=True)

        # ถ้าระบุ attraction_id มา ให้ลบรูปเก่าออกก่อน (ทุกนามสกุล)
        if attraction_id is not None:
            if attraction_id <= 0:
                raise HTTPException(status_code=400, detail="attraction_id must be greater than 0")

            # ค้นหาและลบไฟล์เก่าที่มีชื่อขึ้นต้นด้วย attraction_id
            prefix = f"{attraction_id}."
            for existing in os.listdir(UPLOAD_DIR):
                if existing.startswith(prefix):
                    try:
                        os.remove(os.path.join(UPLOAD_DIR, existing))
                    except OSError:
                        pass  # ข้ามถ้าลบไม่ได้

            # ตั้งชื่อไฟล์เป็น <attraction_id>.<ext> เช่น 5.jpg
            filename = f"{attraction_id}{file_ext}"
        else:
            # ถ้าไม่มี attraction_id ใช้ timestamp + random string ตั้งชื่อ
            timestamp = int(time.time())
            random_str = ''.join(random.choices(string.ascii_letters + string.digits, k=6))
            filename = f"{timestamp}-{random_str}{file_ext}"

        filepath = os.path.join(UPLOAD_DIR, filename)
        
        # บันทึกไฟล์รูปภาพลงดิสก์
        with open(filepath, 'wb') as f:
            f.write(file_content)
        
        # ส่ง URL รูปภาพกลับ
        return {"image_url": f"/uploads/{filename}"}
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
