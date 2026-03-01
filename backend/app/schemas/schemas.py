from pydantic import BaseModel
from typing import Optional, List
from datetime import date

# Attraction Schemas
class CategoryItem(BaseModel):
    category_id: int

class AttractionBase(BaseModel):
    attraction_name: str
    type_id: Optional[int] = None
    district_id: Optional[int] = None
    sect_id: Optional[int] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    sacred_obj: Optional[str] = None
    offering: Optional[str] = None

class AttractionCreate(AttractionBase):
    category_ids: List[int] = []

class AttractionUpdate(AttractionBase):
    category_ids: List[int] = []

class AttractionResponse(AttractionBase):
    attraction_id: int
    categories: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    user_name: str
    password: Optional[str] = None
    role: Optional[str] = "user"

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    user_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None

class UserResponse(UserBase):
    user_id: int

# Image Schemas
class ImageBase(BaseModel):
    Image_name: str
    attraction_id: int

class ImageCreate(ImageBase):
    pass

class ImageUpdate(BaseModel):
    Image_name: Optional[str] = None
    attraction_id: Optional[int] = None

class ImageResponse(ImageBase):
    image_id: int

# Rating Schemas
class RatingBase(BaseModel):
    user_id: int
    attraction_id: int
    rating_work: Optional[int] = 0
    rating_finance: Optional[int] = 0
    rating_love: Optional[int] = 0

class RatingCreate(RatingBase):
    pass

class RatingResponse(RatingBase):
    rating_id: int

# Lookup Table Schemas
class CategoryResponse(BaseModel):
    category_id: int
    category_name: str

class DistrictResponse(BaseModel):
    district_id: int
    district_name: str

class TypeResponse(BaseModel):
    type_id: int
    type_name: str

class SectResponse(BaseModel):
    sect_id: int
    sect_name: str
