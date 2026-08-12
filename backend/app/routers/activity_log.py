# =============================================================================
# activity_log.py
# =============================================================================
# Router สำหรับ API จัดการบันทึกกิจกรรมของผู้ใช้ (Activity Log)
# Endpoints:
#   GET    /api/activity-logs          → ดึง activity log ทั้งหมด (กำหนดจำนวนได้)
#   GET    /api/activity-logs/stats    → ดึงสถิติภาพรวม เช่น จำนวนกิจกรรม,
#                                        ผู้ใช้ไม่ซ้ำ, สถานที่ยอดนิยม Top 10
#   DELETE /api/activity-logs/{log_id} → ลบ activity log ตาม ID
#   GET    /api/activity-logs/user/{user_id}/navigations → ดึงประวัติการนำทาง
# =============================================================================

from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException
from app.core.database import get_connection
from app.schemas.schemas import (
    ActivityLogCreate, ActivityLogResponse, ActivityStatsResponse,
    NavigationHistoryItem, MessageResponse
)

# กำหนด router สำหรับจัดการ Activity Log (บันทึกกิจกรรมของผู้ใช้)
router = APIRouter(prefix="/api", tags=["activity"])


# =============================================================================
# Helper Functions
# =============================================================================

def _insert_activity_log(cursor: Any, log: ActivityLogCreate) -> None:
    """บันทึกข้อมูลกิจกรรมใหม่ลงในตาราง activity_log"""
    query = "INSERT INTO activity_log (user_id, attraction_id, action_type) VALUES (%s, %s, %s)"
    cursor.execute(query, (log.user_id, log.attraction_id, log.action_type))


def _fetch_recent_activity_logs(cursor: Any, limit: int) -> List[Dict[str, Any]]:
    """ดึงบันทึกกิจกรรมล่าสุด พร้อม JOIN ชื่อผู้ใช้และชื่อสถานที่"""
    query = """
        SELECT 
            al.log_id,
            al.user_id,
            um.user_name,
            um.role,
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
    return cursor.fetchall()


def _fetch_activity_summary_stats(cursor: Any) -> Dict[str, Any]:
    """ดึงสถิติภาพรวมจำนวนกิจกรรมทั้งหมด จำนวนผู้ใช้ไม่ซ้ำ และจำนวนสถานที่ที่ถูกเข้าชม (เฉพาะผู้ใช้จริง)"""
    cursor.execute("""
        SELECT 
            (SELECT COUNT(*) FROM activity_log al LEFT JOIN `user` u ON al.user_id = u.user_id WHERE u.role IS NULL OR LOWER(REPLACE(REPLACE(u.role, ' ', ''), '_', '')) != 'usermodel') as total,
            (SELECT COUNT(DISTINCT al.user_id) FROM activity_log al LEFT JOIN `user` u ON al.user_id = u.user_id WHERE u.role IS NULL OR LOWER(REPLACE(REPLACE(u.role, ' ', ''), '_', '')) != 'usermodel') as unique_users,
            (SELECT COUNT(DISTINCT al.attraction_id) FROM activity_log al LEFT JOIN `user` u ON al.user_id = u.user_id WHERE u.role IS NULL OR LOWER(REPLACE(REPLACE(u.role, ' ', ''), '_', '')) != 'usermodel') as unique_attractions
    """)
    result = cursor.fetchone()
    return result or {"total": 0, "unique_users": 0, "unique_attractions": 0}


def _fetch_top_attractions_by_views(cursor: Any, limit: int = 10) -> List[Dict[str, Any]]:
    """ดึงรายชื่อสถานที่ที่มีการบันทึกกิจกรรมเข้าชมมากที่สุด Top N (เฉพาะผู้ใช้จริง)"""
    query = """
        SELECT a.attraction_id, a.attraction_name, COUNT(*) as view_count
        FROM activity_log al
        LEFT JOIN `user` u ON al.user_id = u.user_id
        LEFT JOIN attraction a ON al.attraction_id = a.attraction_id
        WHERE u.role IS NULL OR LOWER(REPLACE(REPLACE(u.role, ' ', ''), '_', '')) != 'usermodel'
        GROUP BY al.attraction_id, a.attraction_name
        ORDER BY view_count DESC
        LIMIT %s
    """
    cursor.execute(query, (limit,))
    return cursor.fetchall()


def _delete_activity_log_by_id(cursor: Any, log_id: int) -> int:
    """ลบกิจกรรมตาม log_id และคืนค่าจำนวนแถวที่ถูกลบ"""
    cursor.execute("DELETE FROM activity_log WHERE log_id = %s", (log_id,))
    return cursor.rowcount


def _fetch_user_navigation_history(cursor: Any, user_id: int) -> List[Dict[str, Any]]:
    """ดึงประวัติการนำทาง (view_map) ของผู้ใช้ตาม ID พร้อมตรวจสอบสถานะการให้คะแนน"""
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
    return cursor.fetchall()


# =============================================================================
# API Endpoints
# =============================================================================

@router.post("/activity-logs", status_code=201, response_model=MessageResponse)
async def create_activity_log(log: ActivityLogCreate):
    """สร้างบันทึกกิจกรรมใหม่"""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        _insert_activity_log(cursor, log)
        conn.commit()
        return {"message": "Activity log created successfully"}
    except Exception as err:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {err}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@router.get("/activity-logs", response_model=List[ActivityLogResponse])
async def get_activity_logs(limit: int = 100):
    """ดึงบันทึกกิจกรรมของผู้ใช้ พร้อมชื่อผู้ใช้และสถานที่ (จำกัดจำนวน)"""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        return _fetch_recent_activity_logs(cursor, limit)
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Database Error: {err}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@router.get("/activity-logs/stats", response_model=ActivityStatsResponse)
async def get_activity_stats():
    """ดึงสถิติภาพรวมของกิจกรรม เช่น จำนวนกิจกรรมทั้งหมด ผู้ใช้ที่ไม่ซ้ำ และสถานที่ยอดนิยม"""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        stats = _fetch_activity_summary_stats(cursor)
        top_attractions = _fetch_top_attractions_by_views(cursor, limit=10)

        return {
            "total_activities": stats.get('total') or 0,
            "unique_users": stats.get('unique_users') or 0,
            "unique_attractions": stats.get('unique_attractions') or 0,
            "top_attractions": top_attractions
        }
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Database Error: {err}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@router.delete("/activity-logs/{log_id}", response_model=MessageResponse)
async def delete_activity_log(log_id: int):
    """ลบบันทึกกิจกรรมตาม log_id"""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        deleted_count = _delete_activity_log_by_id(cursor, log_id)
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail="Activity log not found")

        conn.commit()
        return {"message": "Activity log deleted successfully"}
    except HTTPException as err:
        if conn:
            conn.rollback()
        raise err
    except Exception as err:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {err}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@router.get("/activity-logs/user/{user_id}/navigations", response_model=List[NavigationHistoryItem])
async def get_user_navigations(user_id: int):
    """ดึงประวัติการนำทาง (view_map) ของผู้ใช้ พร้อมเช็คว่าให้คะแนนหรือยัง"""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        return _fetch_user_navigation_history(cursor, user_id)
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Database Error: {err}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
