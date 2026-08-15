# =============================================================================
# users.py
# =============================================================================
# Router สำหรับ API จัดการข้อมูลผู้ใช้งาน (Users) และการยืนยันตัวตน (Auth)
# Endpoints:
#   GET    /api/users                        → ดึงผู้ใช้ทั้งหมด
#   POST   /api/users                        → สร้างผู้ใช้ใหม่
#   GET    /api/users/{id}                   → ดึงผู้ใช้เดียวตาม ID
#   PUT    /api/users/{id}                   → อัปเดตข้อมูลผู้ใช้ตาม ID
#   DELETE /api/users/{id}                   → ลบผู้ใช้และข้อมูลที่เกี่ยวข้อง
#   POST   /api/users/login                  → เข้าสู่ระบบ (username + password)
#   GET    /api/users/check-username/{name}  → ตรวจสอบว่าชื่อผู้ใช้ซ้ำหรือไม่
#
# รหัสผ่านถูกเข้ารหัสด้วย bcrypt ก่อนบันทึกลงฐานข้อมูล
# =============================================================================

from typing import Any, Dict, List, Optional
import bcrypt
from fastapi import APIRouter, HTTPException
from app.core.database import get_connection
from app.schemas.schemas import (
    CheckUsernameResponse, MessageResponse, UserCreate, UserLoginRequest,
    UserLoginResponse, UserResponse, UserUpdate
)


def hash_password(plain: str) -> str:
    """เข้ารหัสรหัสผ่านด้วย bcrypt"""
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    """ตรวจสอบรหัสผ่านกับ hash — รองรับรหัสผ่าน plain-text เดิมด้วย"""
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except (ValueError, TypeError):
        return plain == hashed


# กำหนด router สำหรับจัดการข้อมูลผู้ใช้งาน
router = APIRouter(prefix="/api/users", tags=["users"])


# =============================================================================
# Helper Functions
# =============================================================================

def _fetch_all_users_list(cursor: Any) -> List[Dict[str, Any]]:
    """ดึงข้อมูลผู้ใช้งานทุกคนพร้อมบทบาท (role) จากตาราง user"""
    cursor.execute("SELECT user_id, user_name, password, role FROM `user`")
    return cursor.fetchall()


def _insert_new_user_record(cursor: Any, user_name: str, hashed_pw: str, role: str) -> int:
    """บันทึกข้อมูลผู้ใช้ใหม่ลงในตาราง user และคืนค่า user_id ที่สร้าง"""
    cursor.execute(
        "INSERT INTO `user` (user_name, password, role) VALUES (%s, %s, %s)",
        (user_name, hashed_pw, role)
    )
    return cursor.lastrowid


def _fetch_user_by_id(cursor: Any, user_id: int) -> Optional[Dict[str, Any]]:
    """ดึงข้อมูลผู้ใช้คนเดียวตาม user_id"""
    cursor.execute(
        "SELECT user_id, user_name, password, role FROM `user` WHERE user_id = %s",
        (user_id,)
    )
    return cursor.fetchone()


def _update_user_record(cursor: Any, user_id: int, user: UserUpdate) -> int:
    """สร้างและรันคำสั่ง Dynamic SQL เพื่ออัปเดตข้อมูลผู้ใช้ คืนค่าจำนวนฟิลด์ที่ถูกอัปเดต"""
    fields: List[str] = []
    values: List[Any] = []

    if user.user_name is not None:
        fields.append("user_name = %s")
        values.append(user.user_name)
    if user.password is not None:
        fields.append("password = %s")
        values.append(hash_password(user.password))
    if user.role is not None:
        fields.append("role = %s")
        values.append(user.role)

    if not fields:
        return 0

    values.append(user_id)
    query = f"UPDATE `user` SET {', '.join(fields)} WHERE user_id = %s"
    cursor.execute(query, values)
    return len(fields)


def _delete_user_and_relations(cursor: Any, user_id: int) -> int:
    """ลบกิจกรรม (activity_log), คะแนนรีวิว (rating), และผู้ใช้ตาม user_id คืนค่าจำนวนผู้ใช้ที่ลบ"""
    cursor.execute("DELETE FROM activity_log WHERE user_id = %s", (user_id,))
    cursor.execute("DELETE FROM rating WHERE user_id = %s", (user_id,))
    cursor.execute("DELETE FROM `user` WHERE user_id = %s", (user_id,))
    return cursor.rowcount


def _fetch_user_by_username(cursor: Any, username: str) -> Optional[Dict[str, Any]]:
    """ดึงข้อมูลผู้ใช้ตามชื่อแบบ case-insensitive"""
    cursor.execute(
        "SELECT user_id, user_name, password, role FROM `user` WHERE LOWER(user_name) = LOWER(%s) LIMIT 1",
        (username.strip(),)
    )
    return cursor.fetchone()


def _upgrade_password_if_needed(user_id: int, plain_pw: str, current_pw_hash: str) -> None:
    """อัปเกรดรหัสผ่านที่เป็น Plain text ให้เป็น bcrypt hash อย่างปลอดภัย"""
    if current_pw_hash.startswith('$2'):
        return
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute(
            "UPDATE `user` SET password = %s WHERE user_id = %s",
            (hash_password(plain_pw), user_id)
        )
        connection.commit()
    except Exception:
        if connection:
            connection.rollback()
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# =============================================================================
# API Endpoints
# =============================================================================

@router.get("", response_model=List[UserResponse])
async def get_users():
    """ดึงข้อมูลผู้ใช้งานทั้งหมด"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        return _fetch_all_users_list(cursor)
    except Exception as e:
        print(f"Error in get_users: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.post("", status_code=201, response_model=UserResponse)
async def create_user(user: UserCreate):
    """สร้างผู้ใช้งานใหม่"""
    if not user.user_name or not user.password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    if len(user.password) < 8 or not any(c.islower() for c in user.password) or not any(c.isupper() for c in user.password):
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long and contain both uppercase and lowercase letters"
        )

    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        connection.start_transaction()

        hashed_pw = hash_password(user.password)
        role = user.role or "user"
        user_id = _insert_new_user_record(cursor, user.user_name, hashed_pw, role)

        connection.commit()
        return {"user_id": user_id, "user_name": user.user_name, "role": role}
    except HTTPException as e:
        if connection:
            connection.rollback()
        raise e
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"Error in create_user: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.get("/{id}", response_model=UserResponse)
async def get_user(id: int):
    """ดึงข้อมูลผู้ใช้งานคนเดียวตาม ID"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        user = _fetch_user_by_id(cursor, id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return user
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in get_user: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.put("/{id}", response_model=MessageResponse)
async def update_user(id: int, user: UserUpdate):
    """อัปเดตข้อมูลผู้ใช้งานตาม ID"""
    if user.password is not None:
        if len(user.password) < 8 or not any(c.islower() for c in user.password) or not any(c.isupper() for c in user.password):
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 8 characters long and contain both uppercase and lowercase letters"
            )

    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        connection.start_transaction()

        updated_fields_count = _update_user_record(cursor, id, user)
        if updated_fields_count == 0:
            raise HTTPException(status_code=400, detail="No fields to update")

        connection.commit()
        return {"message": "User updated successfully"}
    except HTTPException as e:
        if connection:
            connection.rollback()
        raise e
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"Error in update_user: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.delete("/{id}", response_model=MessageResponse)
async def delete_user(id: int):
    """ลบผู้ใช้งานและข้อมูลที่เกี่ยวข้องทั้งหมดตาม ID"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        connection.start_transaction()

        deleted_count = _delete_user_and_relations(cursor, id)
        if deleted_count == 0:
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
        print(f"Error in delete_user: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.post("/login", tags=["auth"], response_model=UserLoginResponse)
async def login(login_data: UserLoginRequest):
    """เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่าน"""
    user_name = (login_data.user_name or "").strip()
    password = login_data.password

    if not user_name or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        user = _fetch_user_by_username(cursor, user_name)
        if not user or not verify_password(password, user['password']):
            raise HTTPException(status_code=401, detail="Invalid username or password")

        # อัปเกรดรหัสผ่าน plain text เดิมเป็น hash อัตโนมัติในเบื้องหลัง
        _upgrade_password_if_needed(user['user_id'], password, user['password'])

        return {
            "user_id": user['user_id'],
            "user_name": user['user_name'],
            "role": user.get('role', 'user')
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in login: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@router.get("/check-username/{username}", tags=["auth"], response_model=CheckUsernameResponse)
async def check_username_exists(username: str):
    """ตรวจสอบว่าชื่อผู้ใช้มีในระบบแล้วหรือไม่ (ใช้ตอนสมัครสมาชิก)"""
    if not (username or "").strip():
        raise HTTPException(status_code=400, detail="Username is required")

    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        user = _fetch_user_by_username(cursor, username)
        return {
            "exists": user is not None,
            "username": username
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in check_username_exists: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
