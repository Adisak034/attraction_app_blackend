from fastapi import APIRouter, HTTPException
from app.core.database import get_connection
from typing import List

router = APIRouter(prefix="/api", tags=["lookup-tables"])

@router.get("/category", response_model=List[dict])
async def get_categories():
    """Get all categories"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("SELECT category_id, category_name FROM category")
        rows = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return rows
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/district", response_model=List[dict])
async def get_districts():
    """Get all districts"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("SELECT district_id, district_name FROM district")
        rows = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return rows
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/type", response_model=List[dict])
async def get_types():
    """Get all attraction types"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("SELECT type_id, type_name FROM type")
        rows = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return rows
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/sect", response_model=List[dict])
async def get_sects():
    """Get all sects"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("SELECT sect_id, sect_name FROM sect")
        rows = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return rows
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
