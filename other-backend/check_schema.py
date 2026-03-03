import mysql.connector
conn = mysql.connector.connect(host='localhost', port=3306, user='root', password='', database='appdb')
cur = conn.cursor()
cur.execute('DESCRIBE attraction')
print("=== COLUMNS IN attraction TABLE ===")
for row in cur.fetchall():
    print(row)
conn.close()
