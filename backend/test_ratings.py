import mysql.connector

try:
    conn = mysql.connector.connect(
        host='127.0.0.1',
        user='root',
        password='',
        database='appdb'
    )
    cursor = conn.cursor(dictionary=True)
    
    query = """
        SELECT 
            r.rating_id,
            r.user_id,
            r.attraction_id,
            r.rating_work,
            r.rating_finance,
            r.rating_love,
            r.created_at,
            u.user_name,
            a.attraction_name
        FROM rating r
        JOIN user_model u ON r.user_id = u.user_id
        JOIN attraction a ON r.attraction_id = a.attraction_id
        LIMIT 5
    """
    
    cursor.execute(query)
    rows = cursor.fetchall()
    print(f"✓ Got {len(rows)} ratings")
    if rows:
        print(f"First rating: {rows[0]}")
    
    cursor.close()
    conn.close()
except Exception as e:
    print(f"✗ Error: {type(e).__name__}: {e}")
