# =============================================================================
# activity_log.py
# =============================================================================
# Router สำหรับ API จัดการบันทึกกิจกรรมของผู้ใช้ (Activity Log)
# Endpoints:
#   GET    /api/activity-logs          → ดึง activity log ทั้งหมด (กำหนดจำนวนได้)
#   GET    /api/activity-logs/stats    → ดึงสถิติภาพรวม เช่น จำนวนกิจกรรม,
#                                        ผู้ใช้ไม่ซ้ำ, สถานที่ยอดนิยม Top 10
#   DELETE /api/activity-logs/{log_id} → ลบ activity log ตาม ID
# =============================================================================

from typing import List
from fastapi import APIRouter, HTTPException
from app.core.database import get_connection
from app.schemas.schemas import (
    AttractionCreate, RatingCreate, UserCreate, ActivityLogCreate,
    ActivityLogResponse, ActivityStatsResponse, NavigationHistoryItem
)

# กำหนด router สำหรับจัดการ Activity Log (บันทึกกิจกรรมของผู้ใช้)
router = APIRouter(prefix="/api", tags=["activity"])

@router.post("/activity-logs", status_code=201)
async def create_activity_log(log: ActivityLogCreate):
    """สร้างบันทึกกิจกรรมใหม่"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "INSERT INTO activity_log (user_id, attraction_id, action_type) VALUES (%s, %s, %s)",
            (log.user_id, log.attraction_id, log.action_type)
        )
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return {"message": "Activity log created successfully"}
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Database Error: {err}")

@router.get("/activity-logs", response_model=List[ActivityLogResponse])
async def get_activity_logs(limit: int = 100):
    """ดึงบันทึกกิจกรรมของผู้ใช้ พร้อมชื่อผู้ใช้และสถานที่ (จำกัดจำนวน)"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # JOIN ตาราง user และ attraction เพื่อดึงชื่อมาแสดงแทน ID
        query = """
        SELECT 
            al.log_id,
            al.user_id,
            um.user_name,
            al.attraction_id,
            a.attraction_name,
            al.action_type,
            al.created_at
        FROM activity_log al
        LEFT JOIN `user` um ON al.user_id = um.user_id
        LEFT JOIN attraction a ON al.attraction_id = a.attraction_id
        ORDER BY al.created_at DESC
        LIMIT %s
        """
        
        cursor.execute(query, (limit,))
        result = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return result
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Database Error: {err}")

@router.get("/activity-logs/stats", response_model=ActivityStatsResponse)
async def get_activity_stats():
    """ดึงสถิติภาพรวมของกิจกรรม เช่น จำนวนกิจกรรมทั้งหมด ผู้ใช้ที่ไม่ซ้ำ และสถานที่ยอดนิยม"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # ดึงสถิติทั้งหมดในคำสั่งเดียว (มีประสิทธิภาพมากกว่า)
        cursor.execute("""
            SELECT 
                (SELECT COUNT(*) FROM activity_log) as total,
                (SELECT COUNT(DISTINCT user_id) FROM activity_log) as unique_users,
                (SELECT COUNT(DISTINCT attraction_id) FROM activity_log) as unique_attractions
        """)
        stats = cursor.fetchone()
        
        # ดึงสถานที่ที่มีการเข้าชมมากที่สุด (Top 10)
        cursor.execute("""
            SELECT a.attraction_id, a.attraction_name, COUNT(*) as view_count
            FROM activity_log al
            LEFT JOIN attraction a ON al.attraction_id = a.attraction_id
            GROUP BY al.attraction_id
            ORDER BY view_count DESC
            LIMIT 10
        """)
        top_attractions = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # รวมสถิติและสถานที่ยอดนิยมไว้ใน response เดียว
        return {
            "total_activities": stats['total'] or 0,          # จำนวนกิจกรรมทั้งหมด
            "unique_users": stats['unique_users'] or 0,        # จำนวนผู้ใช้ที่ไม่ซ้ำ
            "unique_attractions": stats['unique_attractions'] or 0,  # จำนวนสถานที่ที่ถูกเข้าชม
            "top_attractions": top_attractions                 # สถานที่ยอดนิยม 10 อันดับ
        }
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Database Error: {err}")

@router.delete("/activity-logs/{log_id}")
async def delete_activity_log(log_id: int):
    """ลบบันทึกกิจกรรมตาม log_id"""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # ลบ activity log ตาม ID
        cursor.execute("DELETE FROM activity_log WHERE log_id = %s", (log_id,))
        
        # ถ้าไม่มีแถวที่ถูกลบ แสดงว่าไม่พบ log นี้
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Activity log not found")

        conn.commit()
        
        return {"message": "Activity log deleted successfully"}

    except HTTPException as err:
        raise err

    except Exception as err:
        if conn:
            conn.rollback()  # ยกเลิก transaction ถ้าเกิดข้อผิดพลาด
        raise HTTPException(status_code=500, detail=f"Database Error: {err}")

    finally:
        # ปิด cursor และ connection เสมอ
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@router.get("/activity-logs/user/{user_id}/navigations", response_model=List[NavigationHistoryItem])
async def get_user_navigations(user_id: int):
    """ดึงประวัติการนำทาง (view_map) ของผู้ใช้ พร้อมเช็คว่าให้คะแนนหรือยัง"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # ดึง attraction ที่ user เคย view_map และเช็คว่าให้คะแนนแล้วหรือยัง
        query = """
            SELECT 
                a.attraction_id,
                a.attraction_name,
                MAX(al.created_at) as last_navigated_at,
                CASE WHEN r.rating_id IS NOT NULL THEN 1 ELSE 0 END as has_rated
            FROM activity_log al
            JOIN attraction a ON al.attraction_id = a.attraction_id
            LEFT JOIN rating r ON r.user_id = al.user_id AND r.attraction_id = al.attraction_id
            WHERE al.user_id = %s
              AND al.action_type = 'view_map'
            GROUP BY a.attraction_id, a.attraction_name, has_rated
            ORDER BY last_navigated_at DESC
        """
        
        cursor.execute(query, (user_id,))
        result = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return result
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Database Error: {err}")
