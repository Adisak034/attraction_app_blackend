from fastapi import APIRouter, HTTPException
from app.core.database import get_connection
from app.schemas.schemas import (
    AttractionResponse, AttractionCreate, AttractionUpdate
)
from typing import List

router = APIRouter(prefix="/api/attraction", tags=["attractions"])

@router.get("", response_model=List[dict])
async def get_attractions():
    """Get all attractions with their categories"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        query = """
            SELECT 
                a.attraction_id, 
                a.attraction_name, 
                a.type_id, 
                a.district_id, 
                a.sect_id, 
                a.lat, 
                a.lng, 
                a.sacred_obj, 
                a.offering,
                a.attraction_image,
                GROUP_CONCAT(c.category_name SEPARATOR ', ') as categories
            FROM attraction a
            LEFT JOIN attraction_category ac ON a.attraction_id = ac.attraction_id
            LEFT JOIN category c ON ac.category_id = c.category_id
            GROUP BY a.attraction_id
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
async def create_attraction(attraction: AttractionCreate):
    """Create a new attraction and link it to categories"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Validate input
        if not attraction.attraction_name or not isinstance(attraction.category_ids, list):
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Insert attraction
        insert_query = """
            INSERT INTO attraction 
            (attraction_name, type_id, district_id, sect_id, lat, lng, sacred_obj, offering)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        cursor.execute(insert_query, (
            attraction.attraction_name,
            attraction.type_id,
            attraction.district_id,
            attraction.sect_id,
            attraction.lat,
            attraction.lng,
            attraction.sacred_obj,
            attraction.offering
        ))
        
        attraction_id = cursor.lastrowid
        
        # Link categories
        if attraction.category_ids:
            category_query = "INSERT INTO attraction_category (attraction_id, category_id) VALUES (%s, %s)"
            for category_id in attraction.category_ids:
                cursor.execute(category_query, (attraction_id, category_id))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return {
            "message": "Attraction created successfully",
            "attraction_id": attraction_id
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/{id}", response_model=dict)
async def get_attraction(id: int):
    """Get a single attraction with its categories"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get attraction
        cursor.execute("SELECT * FROM attraction WHERE attraction_id = %s", (id,))
        attraction = cursor.fetchone()
        
        if not attraction:
            raise HTTPException(status_code=404, detail="Attraction not found")
        
        # Get categories
        cursor.execute(
            "SELECT category_id FROM attraction_category WHERE attraction_id = %s",
            (id,)
        )
        categories = [{"category_id": row["category_id"]} for row in cursor.fetchall()]
        
        attraction["categories"] = categories
        cursor.close()
        connection.close()
        
        return attraction
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.put("/{id}")
async def update_attraction(id: int, attraction: AttractionUpdate):
    """Update an attraction and its categories"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        if not attraction.attraction_name or not isinstance(attraction.category_ids, list):
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        try:
            connection.start_transaction()
            
            # Update attraction
            update_query = """
                UPDATE attraction 
                SET attraction_name = %s, type_id = %s, district_id = %s, 
                    sect_id = %s, lat = %s, lng = %s, sacred_obj = %s, offering = %s
                WHERE attraction_id = %s
            """
            
            cursor.execute(update_query, (
                attraction.attraction_name,
                attraction.type_id,
                attraction.district_id,
                attraction.sect_id,
                attraction.lat,
                attraction.lng,
                attraction.sacred_obj,
                attraction.offering,
                id
            ))
            
            # Delete old categories
            cursor.execute("DELETE FROM attraction_category WHERE attraction_id = %s", (id,))
            
            # Insert new categories
            if attraction.category_ids:
                for category_id in attraction.category_ids:
                    cursor.execute(
                        "INSERT INTO attraction_category (attraction_id, category_id) VALUES (%s, %s)",
                        (id, category_id)
                    )
            
            connection.commit()
            cursor.close()
            connection.close()
            
            return {"message": "Attraction updated successfully"}
        
        except Exception as e:
            connection.rollback()
            raise e
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.delete("/{id}")
async def delete_attraction(id: int):
    """Delete an attraction and all its related data"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        connection.start_transaction()
        
        # Delete categories
        cursor.execute("DELETE FROM attraction_category WHERE attraction_id = %s", (id,))
        
        # Delete ratings
        cursor.execute("DELETE FROM rating WHERE attraction_id = %s", (id,))
        
        # Delete attraction
        cursor.execute("DELETE FROM attraction WHERE attraction_id = %s", (id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Attraction not found")
        
        connection.commit()
        
        return {"message": "Attraction deleted successfully"}
    
    except HTTPException as e:
        if connection:
            connection.rollback()
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
