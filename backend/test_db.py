import mysql.connector

try:
    conn = mysql.connector.connect(
        host='127.0.0.1',
        user='root',
        password='',
        database='appdb'
    )
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT COUNT(*) as count FROM user_model')
    result = cursor.fetchone()
    count = result.get('count', 0) if result else 0
    print(f'✓ Success! user_model has {count} records')
    
    # Also test attractions table
    cursor.execute('SELECT COUNT(*) as count FROM attraction')
    result = cursor.fetchone()
    count = result.get('count', 0) if result else 0
    print(f'✓ attraction table has {count} records')
    
    cursor.close()
    conn.close()
except Exception as e:
    print(f'✗ Database Error: {type(e).__name__}: {e}')
