import mysql.connector
conn = mysql.connector.connect(host='localhost', port=3306, user='root', password='', database='appdb')
cur = conn.cursor(dictionary=True)
cur.execute('DESCRIBE attraction')
cols = cur.fetchall()
print('=== COLUMNS ===')
for c in cols:
    print(c['Field'])
print()
cur.execute('SELECT * FROM attraction LIMIT 3')
rows = cur.fetchall()
print('=== SAMPLE ROWS ===')
for r in rows:
    print(r)
conn.close()
