import mysql.connector

conn = mysql.connector.connect(host='localhost', port=3306, user='root', password='', database='appdb')
cur = conn.cursor()

# Step 1: Add attraction_image column
try:
    cur.execute("ALTER TABLE attraction ADD COLUMN attraction_image VARCHAR(500) DEFAULT NULL")
    print("Column attraction_image created!")
except Exception as e:
    print(f"(Column may already exist: {e})")

# Step 2: Update image paths for temples with photos
image_updates = [
    ("วัดสามง่าม",       "/images/temples/วัดสามง่าม.png"),
    ("วัดกลางบางแก้ว",   "/images/temples/วัดกลางบางแก้ว.png"),
    ("วัดสว่างอารมณ์",   "/images/temples/วัดสว่างอารมณ์.png"),
    ("วัดส่างอารมณ์",    "/images/temples/วัดสว่างอารมณ์.png"),
    ("วัดไร่ขิง",        "/images/temples/วัดไร่ขิง.png"),
    ("วัดไผ่ล้อม",       "/images/temples/วัดไผ่ล้อม.png"),
    ("วัดบางพระ",        "/images/temples/วัดบางพระ.png"),
    ("วัดศีรษะทอง",      "/images/temples/วัดศีรษะทอง.jpeg"),
]

for name, path in image_updates:
    cur.execute(
        "UPDATE attraction SET attraction_image = %s WHERE attraction_name LIKE %s",
        (path, f"%{name}%")
    )
    print(f"Updated {cur.rowcount} row(s) for: {name}")

conn.commit()
conn.close()
print("\nDone! Image paths saved to database.")
