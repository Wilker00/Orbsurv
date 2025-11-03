#!/usr/bin/env python3
"""
Create a dev admin user for Orbsurv backend
Run this script after setting up the database to create an admin user
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.database import get_session
from backend.crud.users import create_user
from backend.schemas import UserCreate
from backend.models import UserRole


async def create_admin_user():
    """Create a dev admin user"""
    
    # Get database session
    async for session in get_session():
        try:
            # Check if admin user already exists
            from backend.crud.users import get_by_email
            existing = await get_by_email(session, email="admin@orbsurv.com")
            if existing:
                print("✅ Admin user already exists!")
                return
            
            # Create admin user
            admin_data = UserCreate(
                email="admin@orbsurv.com",
                password="admin123",
                name="Admin User",
                organization="Orbsurv"
            )
            
            admin_user = await create_user(
                session=session,
                payload=admin_data,
                role=UserRole.DEV
            )
            
            await session.commit()
            
            print("✅ Admin user created successfully!")
            print(f"   Email: admin@orbsurv.com")
            print(f"   Password: admin123")
            print(f"   Role: DEV")
            print(f"   ID: {admin_user.id}")
            
        except Exception as e:
            print(f"❌ Error creating admin user: {e}")
            await session.rollback()
        finally:
            await session.close()
        break


if __name__ == "__main__":
    print("🔧 Creating Orbsurv Admin User...")
    asyncio.run(create_admin_user())

