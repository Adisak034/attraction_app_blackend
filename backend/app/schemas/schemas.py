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
from typing import Optional, List, Any, Dict
from datetime import date

# ===== Generic Schema =====

class MessageResponse(BaseModel):
    """Schema สำหรับส่งข้อความตอบกลับทั่วไป"""
    message: str

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
    attraction_image: Optional[str] = None  # path รูปภาพของสถานที่

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

class AttractionDetailResponse(AttractionBase):
    """Schema สำหรับส่งข้อมูลสถานที่เดียวพร้อมรายการหมวดหมู่"""
    attraction_id: int
    categories: List[CategoryItem] = []

class AttractionCreateResponse(BaseModel):
    """Schema สำหรับผลลัพธ์หลังสร้างสถานที่ใหม่"""
    message: str
    attraction_id: int

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

class UserLoginRequest(BaseModel):
    """Schema สำหรับข้อมูลเข้าสู่ระบบ"""
    user_name: str
    password: str

class UserLoginResponse(BaseModel):
    """Schema สำหรับผลลัพธ์การเข้าสู่ระบบ"""
    user_id: int
    user_name: str
    role: str

class CheckUsernameResponse(BaseModel):
    """Schema สำหรับผลลัพธ์ตรวจสอบชื่อผู้ใช้ซ้ำ"""
    exists: bool
    username: str

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

class ImageItemResponse(BaseModel):
    """Schema สำหรับข้อมูลรูปภาพของสถานที่"""
    attraction_id: int
    attraction_image: Optional[str] = None

class ImageCreateResponse(BaseModel):
    """Schema สำหรับผลลัพธ์หลังบันทึก path รูปภาพ"""
    attraction_id: int
    Image_name: str
    message: str

class ImageDeleteResponse(BaseModel):
    """Schema สำหรับผลลัพธ์หลังลบรูปภาพ"""
    message: str
    attraction_id: int
    already_empty: bool

class ImageUploadResponse(BaseModel):
    """Schema สำหรับผลลัพธ์หลังอัปโหลดไฟล์รูปภาพ"""
    image_url: str

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

class RatingDetailResponse(RatingResponse):
    """Schema สำหรับส่งข้อมูลคะแนนรีวิวพร้อมรายละเอียดชื่อ"""
    created_at: Optional[Any] = None
    user_name: Optional[str] = None
    attraction_name: Optional[str] = None

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

class ActivityLogResponse(BaseModel):
    """Schema สำหรับส่งข้อมูลบันทึกกิจกรรมกลับไปยัง client"""
    log_id: int
    user_id: int
    user_name: Optional[str] = None
    attraction_id: int
    attraction_name: Optional[str] = None
    action_type: str
    created_at: Optional[Any] = None

class TopAttractionStat(BaseModel):
    attraction_id: int
    attraction_name: Optional[str] = None
    view_count: int

class ActivityStatsResponse(BaseModel):
    """Schema สำหรับสถิติภาพรวมกิจกรรม"""
    total_activities: int
    unique_users: int
    unique_attractions: int
    top_attractions: List[TopAttractionStat]

class NavigationHistoryItem(BaseModel):
    """Schema สำหรับประวัติการนำทางของผู้ใช้"""
    attraction_id: int
    attraction_name: str
    last_navigated_at: Optional[Any] = None
    has_rated: int

# ===== Schemas สำหรับระบบแนะนำ (Recommendation) =====

class RecommendationItem(BaseModel):
    """Schema สำหรับข้อมูลสถานที่แต่ละรายการในคำแนะนำ"""
    id: str
    name: str
    type: str
    category: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    score: float
    image: str
    sacred_object: str
    offerings: str

class RecommendationResponse(BaseModel):
    """Schema สำหรับผลลัพธ์การแนะนำสถานที่"""
    user_id: str
    is_new_user: bool
    recommendations: List[RecommendationItem]

