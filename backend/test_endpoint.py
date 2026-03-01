import asyncio
import traceback
from app.routers.users import get_users

async def test_get_users():
    try:
        print("Calling get_users()...")
        result = await get_users()
        print(f"✓ Success! Got {len(result)} users")
        if result:
            print(f"  First user: {result[0]}")
    except Exception as e:
        print(f"✗ Error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_get_users())
