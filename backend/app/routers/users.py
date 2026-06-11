from fastapi import APIRouter, HTTPException
from app.core.database import get_connection
from app.schemas.schemas import UserCreate, UserUpdate, UserResponse
from typing import List

# กำหนด router สำหรับจัดการข้อมูลผู้ใช้งาน
router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("", response_model=List[dict])
async def get_users():
    """ดึงข้อมูลผู้ใช้งานทั้งหมด"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # ดึงข้อมูลผู้ใช้ทุกคน (รวม password สำหรับ admin)
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
    """สร้างผู้ใช้งานใหม่"""
    try:
        # ตรวจสอบว่ามีชื่อผู้ใช้และรหัสผ่าน
        if not user.user_name or not user.password:
            raise HTTPException(status_code=400, detail="Username and password are required")
        
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # บันทึกข้อมูลผู้ใช้ใหม่ลงฐานข้อมูล
        cursor.execute(
            "INSERT INTO `user` (user_name, password, role) VALUES (%s, %s, %s)",
            (user.user_name, user.password, user.role or 'user')
        )
        
        # ดึง ID ของผู้ใช้ที่เพิ่งสร้าง
        user_id = cursor.lastrowid
        connection.commit()
        cursor.close()
        connection.close()
        
        # ส่งข้อมูลผู้ใช้ที่สร้างกลับ
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
    """ดึงข้อมูลผู้ใช้งานคนเดียวตาม ID"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # ดึงข้อมูลผู้ใช้ตาม ID
        cursor.execute(
            "SELECT user_id, user_name, password, role FROM `user` WHERE user_id = %s",
            (id,)
        )
        user = cursor.fetchone()
        cursor.close()
        connection.close()
        
        # ถ้าไม่พบผู้ใช้ ส่ง 404
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
    """อัปเดตข้อมูลผู้ใช้งานตาม ID"""
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # สร้าง query แบบ dynamic ตาม field ที่ส่งมา
        fields = []   # รายการ field ที่จะอัปเดต
        values = []   # รายการ value สำหรับ field แต่ละตัว
        
        if user.user_name is not None:
            fields.append("user_name = %s")
            values.append(user.user_name)
        if user.password is not None:
            fields.append("password = %s")
            values.append(user.password)
        if user.role is not None:
            fields.append("role = %s")
            values.append(user.role)
        
        # ถ้าไม่มี field ที่จะอัปเดต ส่ง 400
        if not fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # เพิ่ม ID ต่อท้าย values สำหรับ WHERE clause
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
    """ลบผู้ใช้งานและข้อมูลที่เกี่ยวข้องทั้งหมดตาม ID"""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        connection.start_transaction()  # เริ่ม transaction
        
        # ลบ activity log ของผู้ใช้ก่อน (ลบ foreign key)
        cursor.execute("DELETE FROM activity_log WHERE user_id = %s", (id,))
        
        # ลบคะแนนรีวิวของผู้ใช้
        cursor.execute("DELETE FROM rating WHERE user_id = %s", (id,))
        
        # ลบผู้ใช้
        cursor.execute("DELETE FROM `user` WHERE user_id = %s", (id,))
        if cursor.rowcount == 0:
            # ถ้าไม่มีแถวที่ถูกลบ แสดงว่าไม่พบผู้ใช้
            raise HTTPException(status_code=404, detail="User not found")
        
        connection.commit()
        
        return {"message": "User deleted successfully"}
    
    except HTTPException as e:
        if connection:
            connection.rollback()  # ยกเลิก transaction
        raise e
    
    except Exception as e:
        if connection:
            connection.rollback()  # ยกเลิก transaction ถ้าเกิดข้อผิดพลาด
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    
    finally:
        # ปิด cursor และ connection เสมอ
        if cursor:
            cursor.close()
        if connection:
            connection.close()

@router.post("/login", tags=["auth"])
async def login(login_data: dict):
    """เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่าน"""
    try:
        # รับข้อมูล login และตัดช่องว่าง
        user_name = login_data.get('user_name', '').strip()
        password = login_data.get('password', '')
        
        # ตรวจสอบว่ามีข้อมูลครบ
        if not user_name or not password:
            raise HTTPException(status_code=400, detail="Username and password are required")
        
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # ค้นหาผู้ใช้ตามชื่อ (case-insensitive) และจำกัด 1 รายการ
        cursor.execute(
            "SELECT user_id, user_name, password, role FROM `user` WHERE LOWER(user_name) = LOWER(%s) LIMIT 1",
            (user_name,)
        )
        user = cursor.fetchone()
        cursor.close()
        connection.close()
        
        # ตรวจสอบรหัสผ่าน - ถ้าไม่ตรงหรือไม่พบผู้ใช้ ส่ง 401
        if not user or user['password'] != password:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # ส่งข้อมูลผู้ใช้กลับ (ไม่รวม password)
        return {
            "user_id": user['user_id'],
            "user_name": user['user_name'],
            "role": user.get('role', 'user')
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/check-username/{username}", tags=["auth"])
async def check_username_exists(username: str):
    """ตรวจสอบว่าชื่อผู้ใช้มีในระบบแล้วหรือไม่ (ใช้ตอนสมัครสมาชิก)"""
    try:
        # ตรวจสอบว่าชื่อผู้ใช้ไม่ว่าง
        if not username.strip():
            raise HTTPException(status_code=400, detail="Username is required")
        
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # ค้นหาชื่อผู้ใช้แบบ case-insensitive
        cursor.execute(
            "SELECT user_id FROM `user` WHERE LOWER(user_name) = LOWER(%s) LIMIT 1",
            (username.strip(),)
        )
        user = cursor.fetchone()
        cursor.close()
        connection.close()
        
        # ส่งผลว่ามีชื่อผู้ใช้นี้ในระบบหรือไม่
        return {
            "exists": user is not None,
            "username": username
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
