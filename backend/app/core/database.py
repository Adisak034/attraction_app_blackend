import mysql.connector
from mysql.connector import pooling
import os
from dotenv import load_dotenv

load_dotenv()

config = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'appdb'),
    'port': int(os.getenv('DB_PORT', 3306)),
}

try:
    db_pool = pooling.MySQLConnectionPool(
        pool_name='appdb_pool',
        pool_size=5,
        pool_reset_session=True,
        **config
    )
except mysql.connector.Error as err:
    if err.errno == 2003:
        print(f"Can't connect to MySQL Server: {err}")
    else:
        print(f"Database Error: {err}")
    raise

def get_connection():
    """Get a connection from the pool"""
    return db_pool.get_connection()
