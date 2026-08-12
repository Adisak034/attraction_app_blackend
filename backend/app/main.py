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

import os
from typing import List, Tuple
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# โหลดตัวแปรสภาพแวดล้อมจากไฟล์ .env
load_dotenv()

# นำเข้า router ทั้งหมดของระบบ
from app.routers import (
    activity_log, attractions, images, lookup_tables, ratings,
    recommendation, users
)


# =============================================================================
# Helper Setup Functions (Single Responsibility & Clean Architecture)
# =============================================================================

def _get_cors_config() -> Tuple[List[str], bool]:
    """คำนวณและเตรียมรายการ CORS Origins และการตั้งค่า Credentials ตาม Environment"""
    allowed_from_env = os.getenv('CORS_ORIGINS', '').split(',') if os.getenv('CORS_ORIGINS') else []
    default_origins = [
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
        "http://localhost",
    ]

    cors_origins = default_origins + [origin.strip() for origin in allowed_from_env if origin.strip()]

    if os.getenv('ENVIRONMENT', 'development').lower() == 'development':
        cors_origins = ["*"]

    use_credentials = cors_origins != ["*"]
    return cors_origins, use_credentials


def _setup_cors_middleware(app_instance: FastAPI) -> None:
    """ติดตั้ง CORSMiddleware เข้ากับแอปพลิเคชัน FastAPI"""
    origins, credentials = _get_cors_config()
    app_instance.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def _setup_static_uploads_mount(app_instance: FastAPI) -> None:
    """ตรวจสอบ/สร้างโฟลเดอร์ backend/uploads และ Mount StaticFiles สำหรับเซิร์ฟรูปภาพ"""
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    uploads_dir = os.path.join(project_root, "backend", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    app_instance.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


def _register_all_routers(app_instance: FastAPI) -> None:
    """ลงทะเบียน Routers ทั้งหมดของระบบเข้ากับแอปพลิเคชัน"""
    app_instance.include_router(attractions.router)    # router สถานที่/วัด
    app_instance.include_router(users.router)          # router ผู้ใช้งาน
    app_instance.include_router(images.router)         # router รูปภาพ
    app_instance.include_router(ratings.router)        # router คะแนนรีวิว
    app_instance.include_router(lookup_tables.router)  # router ตารางข้อมูลอ้างอิง
    app_instance.include_router(activity_log.router)   # router บันทึกกิจกรรม
    app_instance.include_router(recommendation.router) # router ระบบแนะนำ


# =============================================================================
# Application Initialization
# =============================================================================

app = FastAPI(
    title="Temple Attractions & Recommendation API",
    description="""
**คุณสมบัติหลัก:**
- 🏛️ **Attractions Management:** จัดการข้อมูลสถานที่ศักดิ์สิทธิ์, ของไหว้, และหมวดหมู่คำขอพร (การงาน, การเงิน, ความรัก)
- 🤖 **Recommendation System:** ระบบแนะนำสถานที่ (Existing User ใช้ Pickle CF 100%, New User ใช้ Popularity 100%)
- 📊 **Activity Logs & Navigations:** บันทึกประวัติการนำทางและสถิติการใช้งาน
- ⭐ **Ratings:** จัดการคะแนนรีวิวตามหมวดหมู่
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ตั้งค่า Middleware, Static Files, และ Routers ผ่าน Helper Functions ที่เป็นสัดส่วนชัดเจน
_setup_cors_middleware(app)
_setup_static_uploads_mount(app)
_register_all_routers(app)


# =============================================================================
# Core Endpoints
# =============================================================================

@app.get("/favicon.ico", include_in_schema=False)
async def get_favicon():
    """ส่งคืนไฟล์ favicon.ico จากโฟลเดอร์ public"""
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    favicon_path = os.path.join(project_root, "public", "favicon.ico")
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path)
    return {"status": "not found"}


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
