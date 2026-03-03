from fastapi import APIRouter, HTTPException
from app.core.database import get_connection
from app.schemas.schemas import RatingCreate, RatingResponse
from typing import List

router = APIRouter(prefix="/api/rating", tags=["ratings"])

@router.get("", response_model=List[dict])
async def get_ratings():
    """Get all ratings with user and attraction names"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        query = """
            SELECT 
                r.rating_id,
                r.user_id,
                r.attraction_id,
                r.rating_work,
                r.rating_finance,
                r.rating_love,
                r.created_at,
                u.user_name,
                a.attraction_name
            FROM rating r
            JOIN `user` u ON r.user_id = u.user_id
            JOIN attraction a ON r.attraction_id = a.attraction_id
            ORDER BY r.created_at DESC
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return rows
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("", status_code=201)
async def create_rating(rating: RatingCreate):
    """Create a new rating"""
    try:
        if not rating.user_id or not rating.attraction_id:
            raise HTTPException(status_code=400, detail="user_id and attraction_id are required")
        
        # Validate rating values (1-5 or 0 for no rating)
        for value in [rating.rating_work, rating.rating_finance, rating.rating_love]:
            if value is not None and (value < 0 or value > 5):
                raise HTTPException(status_code=400, detail="Rating values must be between 0 and 5")
        
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            "INSERT INTO rating (user_id, attraction_id, rating_work, rating_finance, rating_love) VALUES (%s, %s, %s, %s, %s)",
            (rating.user_id, rating.attraction_id, rating.rating_work or 0, rating.rating_finance or 0, rating.rating_love or 0)
        )
        
        rating_id = cursor.lastrowid
        connection.commit()
        cursor.close()
        connection.close()
        
        return {
            "rating_id": rating_id,
            "user_id": rating.user_id,
            "attraction_id": rating.attraction_id,
            "rating_work": rating.rating_work or 0,
            "rating_finance": rating.rating_finance or 0,
            "rating_love": rating.rating_love or 0
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.delete("/{id}")
async def delete_rating(id: int):
    """Delete a rating"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("DELETE FROM rating WHERE rating_id = %s", (id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Rating not found")

        connection.commit()
        
        return {"message": "Rating deleted successfully"}

    except HTTPException as e:
        raise e
    
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
