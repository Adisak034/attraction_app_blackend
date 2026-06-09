# นำเข้าไลบรารี่สำหรับเชื่อมต่อ MySQL
import mysql.connector
from mysql.connector import pooling
import os
from dotenv import load_dotenv

# โหลดตัวแปรสภาพแวดล้อมจากไฟล์ .env
load_dotenv()

# ตั้งค่าการเชื่อมต่อฐานข้อมูล จากตัวแปรสภาพแวดล้อม
config = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),  # ที่อยู่เซิร์ฟเวอร์ฐานข้อมูล
    'user': os.getenv('DB_USER', 'root'),  # ชื่อผู้ใช้
    'password': os.getenv('DB_PASSWORD', ''),  # รหัสผ่าน
    'database': os.getenv('DB_NAME', 'appdb'),  # ชื่อฐานข้อมูล
    'port': int(os.getenv('DB_PORT', 3306)),  # พอร์ต
}

# สร้าง connection pool เพื่อจัดการการเชื่อมต่อ
try:
    db_pool = pooling.MySQLConnectionPool(
        pool_name='appdb_pool',  # ชื่อ pool
        pool_size=2,  # จำนวนการเชื่อมต่อสูงสุด
        pool_reset_session=True,  # รีเซ็ตเซสชั่นหลังใช้งาน
        autocommit=True,  # ยืนยันการเปลี่ยนแปลงโดยอัตโนมัติ
        **config  # ส่งข้อมูลการเชื่อมต่อ
    )
# จัดการข้อผิดพลาดในการเชื่อมต่อ
except mysql.connector.Error as err:
    if err.errno == 2003:
        print(f"Can't connect to MySQL Server: {err}")
    else:
        print(f"Database Error: {err}")
    raise

def get_connection():
    """ดึงการเชื่อมต่อจาก pool"""
    return db_pool.get_connection()
