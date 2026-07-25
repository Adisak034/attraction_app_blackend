# =============================================================================
# images.py
# =============================================================================
# Router สำหรับ API จัดการรูปภาพของสถานที่ (Images)
# Endpoints:
#   GET    /api/image              → ดึงรูปภาพทั้งหมด (กรองตาม attraction_id ได้)
#   POST   /api/image              → บันทึก path รูปภาพลงฐานข้อมูล
#   GET    /api/image/{id}         → ดึงรูปภาพตาม attraction_id
#   PUT    /api/image/{id}         → อัปเดต path รูปภาพตาม attraction_id
#   DELETE /api/image/{id}         → ลบรูปภาพทั้งจาก DB และไฟล์จริงบนดิสก์
#   POST   /api/image/upload       → อัปโหลดไฟล์รูปภาพ (รองรับ jpg, jpeg, png, webp)
# =============================================================================

import os
import random
import string
import time
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from app.core.database import get_connection
from app.schemas.schemas import (
    ImageCreate, ImageCreateResponse, ImageDeleteResponse, ImageItemResponse,
    ImageUpdate, ImageUploadResponse, MessageResponse
)

# กำหนด router สำหรับจัดการรูปภาพ
router = APIRouter(prefix="/api/image", tags=["images"])

# กำหนด path สำหรับเก็บไฟล์รูปภาพที่อัปโหลด
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
UPLOAD_DIR = os.path.join(PROJECT_ROOT, "backend", "uploads")


# =============================================================================
# Helper Functions
# =============================================================================

def _fetch_attraction_images_query(cursor: Any, attraction_id: Optional[int]) -> List[Dict[str, Any]]:
    """ดึงรายการรูปภาพของสถานที่จากฐานข้อมูล (กรองตาม attraction_id ได้หากระบุ)"""
    query = "SELECT attraction_id, attraction_image FROM attraction WHERE attraction_image IS NOT NULL"
    params: List[Any] = []
    if attraction_id:
        query += " AND attraction_id = %s"
        params.append(attraction_id)
    cursor.execute(query, params)
    return cursor.fetchall()


def _update_attraction_image_in_db(cursor: Any, attraction_id: int, image_name: str) -> None:
    """อัปเดตค่า attraction_image ในตาราง attraction"""
    cursor.execute(
        "UPDATE attraction SET attraction_image = %s WHERE attraction_id = %s",
        (image_name, attraction_id)
    )


def _fetch_attraction_image_by_id(cursor: Any, attraction_id: int) -> Optional[Dict[str, Any]]:
    """ดึงค่า attraction_image ของสถานที่เดียวตาม ID"""
    cursor.execute(
        "SELECT attraction_id, attraction_image FROM attraction WHERE attraction_id = %s",
        (attraction_id,)
    )
    return cursor.fetchone()


def _clear_attraction_image_in_db(cursor: Any, attraction_id: int) -> None:
    """ลบค่าอ้างอิงรูปภาพในตาราง attraction (ตั้งค่าเป็น NULL)"""
    cursor.execute(
        "UPDATE attraction SET attraction_image = NULL WHERE attraction_id = %s",
        (attraction_id,)
    )


def _delete_image_file_from_disk(image_path: Optional[str]) -> None:
    """ลบไฟล์รูปภาพออกจากดิสก์อย่างปลอดภัย (ไม่เกิด Error หากไฟล์ไม่มีอยู่จริง)"""
    if not image_path:
        return
    filename = image_path.rsplit("/", 1)[-1] if "/" in image_path else image_path
    filepath = os.path.join(UPLOAD_DIR, filename)
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except OSError as e:
        print(f"Warning: Could not delete file {filepath}: {e}")


def _clean_old_uploaded_images(attraction_id: int) -> None:
    """ลบไฟล์รูปภาพเก่าใน UPLOAD_DIR ที่ขึ้นต้นด้วยรหัส attraction_id ก่อนอัปโหลดไฟล์ใหม่"""
    prefix = f"{attraction_id}."
    for existing in os.listdir(UPLOAD_DIR):
        if existing.startswith(prefix):
            try:
                os.remove(os.path.join(UPLOAD_DIR, existing))
            except OSError:
                pass


def _generate_upload_filename(file_ext: str, attraction_id: Optional[int]) -> str:
    """สร้างชื่อไฟล์สำหรับรูปภาพที่อัปโหลด"""
    if attraction_id is not None:
        return f"{attraction_id}{file_ext}"
    timestamp = int(time.time())
    random_str = ''.join(random.choices(string.ascii_letters + string.digits, k=6))
    return f"{timestamp}-{random_str}{file_ext}"


# =============================================================================
# API Endpoints
# =============================================================================

@router.get("", response_model=List[ImageItemResponse])
async def get_images(attraction_id: Optional[int] = None):
    """ดึงรูปภาพของสถานที่ทั้งหมด หรือกรองตาม attraction_id"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        return _fetch_attraction_images_query(cursor, attraction_id)
    except Exception as e:
        print(f"Error in get_images: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.post("", status_code=201, response_model=ImageCreateResponse)
async def create_image(image: ImageCreate):
    """บันทึกชื่อ/path รูปภาพให้กับสถานที่ลงในฐานข้อมูล"""
    if not image.Image_name or not image.attraction_id:
        raise HTTPException(status_code=400, detail="Image_name and attraction_id are required")

    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        connection.start_transaction()

        _update_attraction_image_in_db(cursor, image.attraction_id, image.Image_name)

        connection.commit()
        return {
            "attraction_id": image.attraction_id,
            "Image_name": image.Image_name,
            "message": "Image updated successfully"
        }
    except HTTPException as e:
        if connection:
            connection.rollback()
        raise e
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"Error in create_image: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.get("/{id}", response_model=ImageItemResponse)
async def get_image(id: int):
    """ดึงข้อมูลรูปภาพของสถานที่ตาม attraction_id"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        image = _fetch_attraction_image_by_id(cursor, id)
        if not image:
            raise HTTPException(status_code=404, detail="Attraction not found")

        return image
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in get_image: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.put("/{id}", response_model=MessageResponse)
async def update_image(id: int, image: ImageUpdate):
    """อัปเดตชื่อ/path รูปภาพของสถานที่ตาม attraction_id"""
    if not image.Image_name:
        raise HTTPException(status_code=400, detail="Image_name is required")

    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        connection.start_transaction()

        _update_attraction_image_in_db(cursor, id, image.Image_name)

        connection.commit()
        return {"message": "Image updated successfully"}
    except HTTPException as e:
        if connection:
            connection.rollback()
        raise e
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"Error in update_image: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.delete("/{id}", response_model=ImageDeleteResponse)
async def delete_image(id: int):
    """ลบรูปภาพของสถานที่ ทั้งในฐานข้อมูลและไฟล์จริงบนดิสก์"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        connection.start_transaction()

        attraction = _fetch_attraction_image_by_id(cursor, id)
        if not attraction:
            raise HTTPException(status_code=404, detail="Attraction not found")

        image_path = attraction.get("attraction_image")
        _delete_image_file_from_disk(image_path)
        _clear_attraction_image_in_db(cursor, id)

        connection.commit()
        return {
            "message": "Image deleted successfully",
            "attraction_id": id,
            "already_empty": image_path in (None, ""),
        }
    except HTTPException as e:
        if connection:
            connection.rollback()
        raise e
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"Error in delete_image: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.post("/upload", response_model=ImageUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    attraction_id: Optional[int] = Form(None),
):
    """อัปโหลดไฟล์รูปภาพสำหรับสถานที่ (รองรับ .jpg, .jpeg, .png, .webp)"""
    try:
        # ตรวจสอบนามสกุลไฟล์ - ไม่รองรับ .gif แล้ว
        allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
        file_ext = os.path.splitext(file.filename or "")[1].lower()

        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail="Invalid file type (Allowed: jpg, jpeg, png, webp)")

        file_content = await file.read()
        if len(file_content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large (max 5MB)")

        os.makedirs(UPLOAD_DIR, exist_ok=True)

        if attraction_id is not None:
            if attraction_id <= 0:
                raise HTTPException(status_code=400, detail="attraction_id must be greater than 0")
            _clean_old_uploaded_images(attraction_id)

        filename = _generate_upload_filename(file_ext, attraction_id)
        filepath = os.path.join(UPLOAD_DIR, filename)

        with open(filepath, 'wb') as f:
            f.write(file_content)

        return {"image_url": f"/uploads/{filename}"}
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in upload_image: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
