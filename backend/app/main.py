# =============================================================================
# main.py
# =============================================================================
# จุดเริ่มต้นของแอปพลิเคชัน FastAPI (Entry Point)
# หน้าที่หลัก:
#   - สร้างและกำหนดค่า FastAPI application instance
#   - ตั้งค่า CORS Middleware (รองรับทั้ง development และ production)
#   - Mount โฟลเดอร์ static files สำหรับรูปภาพที่อัปโหลด (/uploads)
#   - ลงทะเบียน router ทั้งหมด (attractions, users, images, ratings,
#     lookup_tables, activity_log, recommendation)
#   - กำหนด health check endpoint (/health) และ root endpoint (/)
#
# รันด้วยคำสั่ง: uvicorn app.main:app --reload
# =============================================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv

# โหลดตัวแปรสภาพแวดล้อมจากไฟล์ .env
load_dotenv()

# นำเข้า router ทั้งหมดของระบบ
from app.routers import attractions, users, images, ratings, lookup_tables, activity_log, recommendation

# สร้างแอปพลิเคชัน FastAPI พร้อมข้อมูลพื้นฐาน
app = FastAPI(
    title="Temple Admin Backend",
    description="FastAPI Backend for Temple Attractions Management",
    version="1.0.0"
)

# ตั้งค่า CORS - อนุญาต localhost สำหรับ dev และ origin ที่กำหนดจาก environment สำหรับ server
ALLOWED_ORIGINS = os.getenv('CORS_ORIGINS', '').split(',') if os.getenv('CORS_ORIGINS') else []

# กำหนด origin ที่อนุญาตสำหรับการพัฒนา (localhost ทุก port ที่ใช้งาน)
DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:4173",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
    "http://127.0.0.1:4173",
    "http://127.0.0.1:5173",
    "http://localhost"
]

# รวม origin ค่าเริ่มต้นกับ origin ที่กำหนดจาก environment
CORS_ORIGINS = DEFAULT_ORIGINS + [origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()]

# โหมดพัฒนา: อนุญาตทุก origin เพื่อให้ทดสอบง่ายจากต่าง IP/เครื่อง
if os.getenv('ENVIRONMENT', 'development').lower() == 'development':
    CORS_ORIGINS = ["*"]

# เพิ่ม middleware สำหรับจัดการ CORS
# หมายเหตุ: allow_credentials=True ใช้ร่วมกับ allow_origins=["*"] ไม่ได้ตาม CORS spec
_use_credentials = CORS_ORIGINS != ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=_use_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# กำหนด path สำหรับเก็บไฟล์ที่อัปโหลด (อยู่ที่ project-root/public/uploads)
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
UPLOADS_DIR = os.path.join(PROJECT_ROOT, "public", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)  # สร้างโฟลเดอร์ถ้ายังไม่มี

# mount โฟลเดอร์ uploads เพื่อให้เข้าถึงไฟล์รูปภาพผ่าน URL /uploads/...
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# ลงทะเบียน router ทั้งหมดเข้ากับแอป
app.include_router(attractions.router)    # router สถานที่/วัด
app.include_router(users.router)          # router ผู้ใช้งาน
app.include_router(images.router)         # router รูปภาพ
app.include_router(ratings.router)        # router คะแนนรีวิว
app.include_router(lookup_tables.router)  # router ตารางข้อมูลอ้างอิง
app.include_router(activity_log.router)   # router บันทึกกิจกรรม
app.include_router(recommendation.router) # router ระบบแนะนำ

@app.get("/health")
async def health_check():
    """ตรวจสอบสถานะการทำงานของ Backend"""
    return {"status": "ok", "message": "Backend is running"}

@app.get("/")
async def root():
    """หน้าหลักของ API แสดงข้อมูลพื้นฐาน"""
    return {
        "message": "Temple Admin Backend API",
        "docs": "/docs",
        "version": "1.0.0"
    }

# รันเซิร์ฟเวอร์โดยตรงเมื่อรันไฟล์นี้
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
