#!/usr/bin/env python3
import mysql.connector
import os

config = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': '',
    'port': 3306,
}

# Find appdb.sql in parent directory
sql_file = '../appdb.sql'
if not os.path.exists(sql_file):
    sql_file = 'appdb.sql'

with open(sql_file, 'r', encoding='utf-8') as f:
    sql_content = f.read()

# Connect without DB
conn = mysql.connector.connect(**config)
cursor = conn.cursor()

# Drop and recreate database
print("Dropping database appdb...")
cursor.execute("DROP DATABASE IF EXISTS appdb")
cursor.execute("CREATE DATABASE appdb")
cursor.execute("USE appdb")
conn.commit()

print("Importing schema...")

# Parse and execute all statements
statements = []
current_stmt = ""

for line in sql_content.split('\n'):
    line = line.rstrip()
    # Skip comments and empty lines
    if line.startswith('--') or line.startswith('/*') or not line:
        continue
    
    current_stmt += line + " "
    
    # Statement ends with semicolon
    if line.endswith(';'):
        stmt = current_stmt.strip()
        if stmt:
            statements.append(stmt)
        current_stmt = ""

# Execute statements
count = 0
for stmt in statements:
    if not stmt.strip():
        continue
    try:
        cursor.execute(stmt)
        count += 1
        if 'CREATE TABLE' in stmt.upper():
            table = stmt.split('`')[1] if '`' in stmt else "?"
            print(f"  ✓ {table}")
    except mysql.connector.Error as e:
        if '1146' not in str(e) and 'already exists' not in str(e):
            print(f"  ✗ {stmt[:80]}: {e}")

conn.commit()
cursor.close()
conn.close ()

print(f"\n✓ Complete! {count} statements executed")
