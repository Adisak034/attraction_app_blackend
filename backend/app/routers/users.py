from fastapi import APIRouter, HTTPException
from app.core.database import get_connection
from app.schemas.schemas import UserCreate, UserUpdate, UserResponse
from typing import List

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("", response_model=List[dict])
async def get_users():
    """Get all users"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT user_id, user_name, password, role FROM `user`"
        )
        rows = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return rows
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("", status_code=201)
async def create_user(user: UserCreate):
    """Create a new user"""
    try:
        if not user.user_name or not user.password:
            raise HTTPException(status_code=400, detail="Username and password are required")
        
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            "INSERT INTO `user` (user_name, password, role) VALUES (%s, %s, %s)",
            (user.user_name, user.password, user.role or 'user')
        )
        
        user_id = cursor.lastrowid
        connection.commit()
        cursor.close()
        connection.close()
        
        return {
            "user_id": user_id,
            "user_name": user.user_name,
            "password": user.password,
            "role": user.role or 'user'
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/{id}", response_model=dict)
async def get_user(id: int):
    """Get a single user"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT user_id, user_name, password, role FROM `user` WHERE user_id = %s",
            (id,)
        )
        user = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.put("/{id}")
async def update_user(id: int, user: UserUpdate):
    """Update a user"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Build dynamic query
        fields = []
        values = []
        
        if user.user_name is not None:
            fields.append("user_name = %s")
            values.append(user.user_name)
        if user.password is not None:
            fields.append("password = %s")
            values.append(user.password)
        if user.role is not None:
            fields.append("role = %s")
            values.append(user.role)
        
        if not fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        values.append(id)
        query = f"UPDATE `user` SET {', '.join(fields)} WHERE user_id = %s"
        
        cursor.execute(query, values)
        connection.commit()
        cursor.close()
        connection.close()
        
        return {"message": "User updated successfully"}
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.delete("/{id}")
async def delete_user(id: int):
    """Delete a user and all their ratings"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        connection.start_transaction()
        
        # Delete user's activity logs
        cursor.execute("DELETE FROM activity_log WHERE user_id = %s", (id,))
        
        # Delete user's ratings
        cursor.execute("DELETE FROM rating WHERE user_id = %s", (id,))
        
        cursor.execute("DELETE FROM `user` WHERE user_id = %s", (id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        connection.commit()
        
        return {"message": "User deleted successfully"}
    
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
