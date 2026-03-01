from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from app.core.database import get_connection
from app.schemas.schemas import ImageCreate, ImageUpdate
from typing import List, Optional
import os
import time
import random
import string

router = APIRouter(prefix="/api/image", tags=["images"])

UPLOAD_DIR = "public/uploads"

@router.get("", response_model=List[dict])
async def get_images(attraction_id: Optional[int] = None):
    """Get all images from attractions"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        query = "SELECT attraction_id, attraction_image FROM attraction WHERE attraction_image IS NOT NULL"
        params = []
        
        if attraction_id:
            query += " AND attraction_id = %s"
            params.append(attraction_id)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return rows
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("", status_code=201)
async def create_image(image: ImageCreate):
    """Update attraction with image URL"""
    try:
        if not image.Image_name or not image.attraction_id:
            raise HTTPException(status_code=400, detail="Image_name and attraction_id are required")
        
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            "UPDATE attraction SET attraction_image = %s WHERE attraction_id = %s",
            (image.Image_name, image.attraction_id)
        )
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return {
            "attraction_id": image.attraction_id,
            "Image_name": image.Image_name,
            "message": "Image updated successfully"
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/{id}", response_model=dict)
async def get_image(id: int):
    """Get image for an attraction"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT attraction_id, attraction_image FROM attraction WHERE attraction_id = %s",
            (id,)
        )
        image = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if not image:
            raise HTTPException(status_code=404, detail="Attraction not found")
        
        return image
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.put("/{id}")
async def update_image(id: int, image: ImageUpdate):
    """Update attraction's image"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        if not image.Image_name:
            raise HTTPException(status_code=400, detail="Image_name is required")
        
        cursor.execute(
            "UPDATE attraction SET attraction_image = %s WHERE attraction_id = %s",
            (image.Image_name, id)
        )
        connection.commit()
        cursor.close()
        connection.close()
        
        return {"message": "Image updated successfully"}
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.delete("/{id}")
async def delete_image(id: int):
    """Delete attraction's image"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("UPDATE attraction SET attraction_image = NULL WHERE attraction_id = %s", (id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Image record not found")

        connection.commit()
        
        return {"message": "Image deleted successfully"}

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

@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """Upload an image file"""
    try:
        # Validate file type
        allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail="Invalid file type")
        
        # Validate file size (max 5MB)
        file_content = await file.read()
        if len(file_content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large (max 5MB)")
        
        # Create upload directory if it doesn't exist
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        
        # Generate unique filename
        timestamp = int(time.time())
        random_str = ''.join(random.choices(string.ascii_letters + string.digits, k=6))
        filename = f"{timestamp}-{random_str}{file_ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        
        # Save file
        with open(filepath, 'wb') as f:
            f.write(file_content)
        
        return {"image_url": f"/uploads/{filename}"}
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
