"""
Admin User Creation Script

This script creates a default admin user for initial setup.
Use this only once when setting up the application for the first time.
"""

import sys
import os

# Add parent directory to path to import backend modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import SessionLocal, User
from auth import get_password_hash

def create_admin():
    """Create a default admin user"""
    db = SessionLocal()
    email = "admin@bithumb.com"
    password = "admin_password_123!"
    
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"Admin user {email} already exists.")
            return

        hashed_password = get_password_hash(password)
        admin = User(email=email, hashed_password=hashed_password)
        db.add(admin)
        db.commit()
        print(f"Admin user created: {email} / {password}")
        print("⚠️  IMPORTANT: Change the default password after first login!")
    except Exception as e:
        print(f"Error creating admin: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()


