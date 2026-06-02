from fastapi import APIRouter, HTTPException
from app.core.database import get_connection
from app.schemas.schemas import (
    AttractionCreate, RatingCreate, UserCreate
)

router = APIRouter(prefix="/api", tags=["activity"])

@router.get("/activity-logs")
async def get_activity_logs(limit: int = 100):
    """Get activity logs with user and attraction names"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
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

@router.get("/activity-logs/stats")
async def get_activity_stats():
    """Get activity statistics"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get all stats in a single query (more efficient)
        cursor.execute("""
            SELECT 
                (SELECT COUNT(*) FROM activity_log) as total,
                (SELECT COUNT(DISTINCT user_id) FROM activity_log) as unique_users,
                (SELECT COUNT(DISTINCT attraction_id) FROM activity_log) as unique_attractions
        """)
        stats = cursor.fetchone()
        
        # Get top attractions
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
        
        return {
            "total_activities": stats['total'] or 0,
            "unique_users": stats['unique_users'] or 0,
            "unique_attractions": stats['unique_attractions'] or 0,
            "top_attractions": top_attractions
        }
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Database Error: {err}")

@router.delete("/activity-logs/{log_id}")
async def delete_activity_log(log_id: int):
    """Delete an activity log entry"""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM activity_log WHERE log_id = %s", (log_id,))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Activity log not found")

        conn.commit()
        
        return {"message": "Activity log deleted successfully"}

    except HTTPException as err:
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
