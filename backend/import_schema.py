#!/usr/bin/env python3
"""
Database Schema Import Script
Imports appdb.sql schema into MySQL database
"""

import mysql.connector
from mysql.connector import errorcode
import sys
import os

# Database configuration
config = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': '',
    'database': 'appdb',
    'port': 3306,
}

def import_schema(sql_file_path):
    """Import SQL schema from file"""
    try:
        # First, try to connect to MySQL without specifying a database to create it if needed
        config_no_db = {
            'host': config['host'],
            'user': config['user'],
            'password': config['password'],
            'port': config['port'],
        }
        
        conn = mysql.connector.connect(**config_no_db)
        cursor = conn.cursor()
        
        # Create database if it doesn't exist
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {config['database']}")
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"✓ Database '{config['database']}' ready")
        
        # Connect and drop existing tables to avoid conflicts
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        
        # Disable foreign key checks temporarily
        cursor.execute("SET FOREIGN_KEY_CHECKS=0")
        
        # Get all tables in the database
        cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = %s", (config['database'],))
        tables = cursor.fetchall()
        
        if tables:
            print(f"⚠ Dropping {len(tables)} existing tables...")
            for table in tables:
                table_name = table[0]
                try:
                    cursor.execute(f"DROP TABLE `{table_name}`")
                    print(f"  ✓ Dropped table: {table_name}")
                except mysql.connector.Error as err:
                    print(f"  ✗ Error dropping {table_name}: {err.msg}")
            
            conn.commit()
        
        # Re-enable foreign key checks
        cursor.execute("SET FOREIGN_KEY_CHECKS=1")
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"✓ Database ready for fresh import")
        
        # Now connect to the actual database and import schema
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        
        # Read SQL file
        with open(sql_file_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Split by statements but handle multi-line comments and strings
        statements = []
        current_statement = ""
        in_comment = False
        in_string = False
        string_char = None
        
        for line in sql_content.split('\n'):
            # Skip comment lines
            if line.strip().startswith('--'):
                continue
            if line.strip().startswith('/*'):
                in_comment = True
            if in_comment and '*/' in line:
                in_comment = False
                continue
            if in_comment:
                continue
            
            current_statement += line + "\n"
            
            # Check if statement ends with semicolon (outside of strings)
            if ';' in line:
                statements.append(current_statement.strip())
                current_statement = ""
        
        if current_statement.strip():
            statements.append(current_statement.strip())
        
        # Execute statements
        success_count = 0
        error_count = 0
        errors = []
        
        for i, statement in enumerate(statements, 1):
            statement = statement.strip()
            if not statement:
                continue
            
            try:
                cursor.execute(statement)
                success_count += 1
                
                # Show progress for table creation/insertion
                if 'CREATE TABLE' in statement.upper():
                    table_name = statement.split('`')[1] if '`' in statement else "unknown"
                    print(f"  ✓ Created table: {table_name}")
                elif 'INSERT INTO' in statement.upper():
                    # Count the number of rows being inserted
                    value_count = statement.count('VALUES')
                    print(f"  ✓ Inserted {value_count} record(s)")
                    
            except mysql.connector.Error as err:
                error_count += 1
                if err.errno == errorcode.ER_TABLE_EXISTS_ERROR:
                    # This is expected if tables already exist
                    if 'CREATE TABLE' in statement.upper():
                        table_name = statement.split('`')[1] if '`' in statement else "unknown"
                        print(f"  ⚠ Table already exists: {table_name}")
                else:
                    error_details = f"Statement {i}: {err.msg[:100]}"
                    errors.append(error_details)
                    print(f"  ✗ Error: {error_details}")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"\n✓ Import Complete!")
        print(f"  - {success_count} statements executed successfully")
        print(f"  - {error_count} errors/warnings")
        
        if errors and error_count > 5:  # Only show first few errors
            print(f"\n  (showing first errors, {error_count} total)")
        
        return True
        
    except mysql.connector.Error as err:
        print(f"✗ Connection Error: {err.msg}")
        print(f"  Host: {config['host']}:{config['port']}")
        print(f"  User: {config['user']}")
        print(f"  Database: {config['database']}")
        return False
    except FileNotFoundError:
        print(f"✗ SQL file not found: {sql_file_path}")
        return False
    except Exception as err:
        print(f"✗ Unexpected Error: {err}")
        return False

if __name__ == "__main__":
    # Get the SQL file path (relative to this script)
    sql_file = os.path.join(os.path.dirname(__file__), '..', '..', 'appdb.sql')
    sql_file = os.path.abspath(sql_file)
    
    print(f"Importing database schema from: {sql_file}\n")
    
    if import_schema(sql_file):
        sys.exit(0)
    else:
        sys.exit(1)
