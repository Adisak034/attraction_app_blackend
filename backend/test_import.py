import traceback
import sys
sys.path.insert(0, '.')

try:
    print("Importing users router...")
    from app.routers import users
    print(f"✓ Users router imported successfully")
    print(f"  Router prefix: {users.router.prefix}")
except Exception as e:
    print(f"✗ Error importing users: {e}")
    traceback.print_exc()

try:
    print("\nImporting all routers...")
    from app.routers import attractions, images, ratings, lookup_tables, activity_log
    print("✓ All routers imported successfully")
except Exception as e:
    print(f"✗ Error importing routers: {e}")
    traceback.print_exc()

try:
    print("\nImporting main app...")
    from app.main import app
    print("✓ Main app imported successfully")
except Exception as e:
    print(f"✗ Error importing main: {e}")
    traceback.print_exc()
