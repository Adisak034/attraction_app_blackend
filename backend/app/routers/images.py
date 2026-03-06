from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from app.core.database import get_connection
from app.schemas.schemas import ImageCreate, ImageUpdate
from typing import List, Optional
import os
from urllib.parse import urlparse

router = APIRouter(prefix="/api/image", tags=["images"])

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
UPLOAD_DIR = os.path.join(PROJECT_ROOT, "public", "uploads")


def _normalize_image_path(raw_value: str) -> str:
    """Normalize any local upload reference to canonical /uploads/<filename>."""
    value = (raw_value or "").strip()
    if not value:
        return value

    normalized = value.replace("\\", "/")

    if normalized.startswith("http://") or normalized.startswith("https://"):
        parsed = urlparse(normalized)
        path = (parsed.path or "").replace("\\", "/")
        if "/uploads/" in path:
            filename = path.rsplit("/", 1)[-1]
            return f"/uploads/{filename}"
        if "/images/" in path:
            filename = path.rsplit("/", 1)[-1]
            return f"/uploads/{filename}"
        return value

    if normalized.startswith("public/uploads/"):
        filename = normalized.rsplit("/", 1)[-1]
        return f"/uploads/{filename}"

    if normalized.startswith("uploads/"):
        filename = normalized.rsplit("/", 1)[-1]
        return f"/uploads/{filename}"

    if normalized.startswith("/uploads/"):
        filename = normalized.rsplit("/", 1)[-1]
        return f"/uploads/{filename}"

    if normalized.startswith("images/"):
        filename = normalized.rsplit("/", 1)[-1]
        return f"/uploads/{filename}"

    if normalized.startswith("/images/"):
        filename = normalized.rsplit("/", 1)[-1]
        return f"/uploads/{filename}"

    return value

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

        for row in rows:
            row["attraction_image"] = _normalize_image_path(row.get("attraction_image") or "")
        
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
        
        normalized_path = _normalize_image_path(image.Image_name)

        cursor.execute(
            "UPDATE attraction SET attraction_image = %s WHERE attraction_id = %s",
            (normalized_path, image.attraction_id)
        )
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return {
            "attraction_id": image.attraction_id,
            "Image_name": normalized_path,
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

        image["attraction_image"] = _normalize_image_path(image.get("attraction_image") or "")
        
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
        
        normalized_path = _normalize_image_path(image.Image_name)

        cursor.execute(
            "UPDATE attraction SET attraction_image = %s WHERE attraction_id = %s",
            (normalized_path, id)
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

        cursor.execute(
            "SELECT attraction_id, attraction_image FROM attraction WHERE attraction_id = %s",
            (id,),
        )
        attraction = cursor.fetchone()
        if not attraction:
            raise HTTPException(status_code=404, detail="Attraction not found")

        cursor.execute("UPDATE attraction SET attraction_image = NULL WHERE attraction_id = %s", (id,))

        connection.commit()

        return {
            "message": "Image deleted successfully",
            "attraction_id": id,
            "already_empty": attraction.get("attraction_image") in (None, ""),
        }

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
async def upload_image(
    file: UploadFile = File(...),
    attraction_id: Optional[int] = Form(None),
):
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

        # Use attraction_id as filename when provided (example: 12.png)
        if attraction_id is not None:
            if attraction_id <= 0:
                raise HTTPException(status_code=400, detail="attraction_id must be greater than 0")

            # Remove existing files for the same attraction id but different extensions.
            prefix = f"{attraction_id}."
            for existing in os.listdir(UPLOAD_DIR):
                if existing.startswith(prefix):
                    try:
                        os.remove(os.path.join(UPLOAD_DIR, existing))
                    except OSError:
                        pass

            filename = f"{attraction_id}{file_ext}"
        else:
            # Backward-compatible fallback naming when attraction_id is not sent.
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
