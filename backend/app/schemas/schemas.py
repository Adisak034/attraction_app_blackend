# =============================================================================
# schemas.py
# =============================================================================
# กำหนด Pydantic Schema (Data Models) สำหรับ validate ข้อมูล request/response
# ของทุก endpoint ในระบบ แบ่งตามกลุ่มดังนี้:
#
#   Attraction  → AttractionBase, AttractionCreate, AttractionUpdate,
#                 AttractionResponse, CategoryItem
#   User        → UserBase, UserCreate, UserUpdate, UserResponse
#   Image       → ImageBase, ImageCreate, ImageUpdate, ImageResponse
#   Rating      → RatingBase, RatingCreate, RatingResponse
#   Lookup      → CategoryResponse, DistrictResponse, TypeResponse, SectResponse
#
# Schema เหล่านี้ทำหน้าที่:
#   - Validate และ parse ข้อมูลที่รับเข้ามา (request body)
#   - กำหนดโครงสร้างข้อมูลที่ส่งกลับ (response model)
#   - สร้าง API documentation อัตโนมัติผ่าน FastAPI / Swagger UI
# =============================================================================

from pydantic import BaseModel
from typing import Optional, List
from datetime import date

# ===== Schemas สำหรับสถานที่ (Attraction) =====

class CategoryItem(BaseModel):
    """Schema สำหรับรับ ID หมวดหมู่"""
    category_id: int

class AttractionBase(BaseModel):
    """Schema พื้นฐานของสถานที่ - ใช้เป็น base class"""
    attraction_name: str                    # ชื่อสถานที่
    type_id: Optional[int] = None           # รหัสประเภทสถานที่
    district_id: Optional[int] = None       # รหัสอำเภอ/เขต
    sect_id: Optional[int] = None           # รหัสนิกาย
    lat: Optional[float] = None             # ละติจูด
    lng: Optional[float] = None             # ลองจิจูด
    sacred_obj: Optional[str] = None        # สิ่งศักดิ์สิทธิ์
    offering: Optional[str] = None          # ของบน/ของไหว้

class AttractionCreate(AttractionBase):
    """Schema สำหรับสร้างสถานที่ใหม่ - รับ ID หมวดหมู่เพิ่มเติม"""
    category_ids: List[int] = []            # รายการ ID หมวดหมู่

class AttractionUpdate(AttractionBase):
    """Schema สำหรับอัปเดตข้อมูลสถานที่"""
    category_ids: List[int] = []            # รายการ ID หมวดหมู่ที่ต้องการอัปเดต

class AttractionResponse(AttractionBase):
    """Schema สำหรับส่งข้อมูลสถานที่กลับไปยัง client"""
    attraction_id: int                      # ID ของสถานที่
    categories: Optional[str] = None        # ชื่อหมวดหมู่แบบ string (คั่นด้วยเครื่องหมายจุลภาค)

# ===== Schemas สำหรับผู้ใช้งาน (User) =====

class UserBase(BaseModel):
    """Schema พื้นฐานของผู้ใช้งาน"""
    user_name: str                          # ชื่อผู้ใช้
    password: Optional[str] = None          # รหัสผ่าน
    role: Optional[str] = "user"            # บทบาท (user/admin)

class UserCreate(UserBase):
    """Schema สำหรับสร้างผู้ใช้ใหม่ - รหัสผ่านต้องระบุ"""
    password: str                           # รหัสผ่าน (บังคับ)

class UserUpdate(BaseModel):
    """Schema สำหรับอัปเดตข้อมูลผู้ใช้ - ทุก field เป็น optional"""
    user_name: Optional[str] = None         # ชื่อผู้ใช้ใหม่
    password: Optional[str] = None          # รหัสผ่านใหม่
    role: Optional[str] = None              # บทบาทใหม่

class UserResponse(UserBase):
    """Schema สำหรับส่งข้อมูลผู้ใช้กลับไปยัง client"""
    user_id: int                            # ID ผู้ใช้

# ===== Schemas สำหรับรูปภาพ (Image) =====

class ImageBase(BaseModel):
    """Schema พื้นฐานของรูปภาพ"""
    Image_name: str                         # ชื่อไฟล์หรือ path รูปภาพ
    attraction_id: int                      # ID ของสถานที่ที่รูปนี้เป็นของ

class ImageCreate(ImageBase):
    """Schema สำหรับเพิ่มรูปภาพใหม่"""
    pass

class ImageUpdate(BaseModel):
    """Schema สำหรับอัปเดตรูปภาพ"""
    Image_name: Optional[str] = None        # ชื่อไฟล์หรือ path ใหม่
    attraction_id: Optional[int] = None     # ID สถานที่ใหม่

class ImageResponse(ImageBase):
    """Schema สำหรับส่งข้อมูลรูปภาพกลับไปยัง client"""
    image_id: int                           # ID รูปภาพ

# ===== Schemas สำหรับคะแนนรีวิว (Rating) =====

class RatingBase(BaseModel):
    """Schema พื้นฐานของคะแนนรีวิว"""
    user_id: int                            # ID ผู้ใช้ที่ให้คะแนน
    attraction_id: int                      # ID สถานที่ที่ถูกให้คะแนน
    rating_work: Optional[int] = 0          # คะแนนด้านการงาน (0-5)
    rating_finance: Optional[int] = 0       # คะแนนด้านการเงิน/โชคลาภ (0-5)
    rating_love: Optional[int] = 0          # คะแนนด้านความรัก (0-5)

class RatingCreate(RatingBase):
    """Schema สำหรับสร้างคะแนนรีวิวใหม่"""
    pass

class RatingResponse(RatingBase):
    """Schema สำหรับส่งข้อมูลคะแนนรีวิวกลับไปยัง client"""
    rating_id: int                          # ID คะแนนรีวิว

# ===== Schemas สำหรับตารางข้อมูลอ้างอิง (Lookup Tables) =====

class CategoryResponse(BaseModel):
    """Schema สำหรับข้อมูลหมวดหมู่"""
    category_id: int                        # ID หมวดหมู่
    category_name: str                      # ชื่อหมวดหมู่

class DistrictResponse(BaseModel):
    """Schema สำหรับข้อมูลอำเภอ/เขต"""
    district_id: int                        # ID อำเภอ
    district_name: str                      # ชื่ออำเภอ

class TypeResponse(BaseModel):
    """Schema สำหรับข้อมูลประเภทสถานที่"""
    type_id: int                            # ID ประเภท
    type_name: str                          # ชื่อประเภท

class SectResponse(BaseModel):
    """Schema สำหรับข้อมูลนิกาย"""
    sect_id: int                            # ID นิกาย
    sect_name: str                          # ชื่อนิกาย

# ===== Schemas สำหรับบันทึกกิจกรรม (Activity Log) =====

class ActivityLogCreate(BaseModel):
    """Schema สำหรับสร้างบันทึกกิจกรรมใหม่"""
    user_id: int                            # ID ผู้ใช้
    attraction_id: int                      # ID สถานที่
    action_type: str                        # ประเภทกิจกรรม (เช่น 'view_map', 'rate')
