"""
seed_admin.py — Create the initial admin account for OrthoPAR.

Run once after containers start:
    docker exec <backend_container> python seed_admin.py

Reads from environment:
    ADMIN_EMAIL    (default: admin@orthopar.local)
    ADMIN_PASSWORD (default: Admin@1234  -- CHANGE IN PRODUCTION)

Idempotent: safe to run multiple times, will skip if admin exists.
"""
import os
import sys

# Make sure the backend package root is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base, get_db
from models import User, UserRole, AccountStatus
from auth import hash_password
from datetime import datetime, timezone

ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL",    "admin@orthopar.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin@1234")

def seed():
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        # Clean up legacy invalid local domain admins
        db.query(User).filter(User.email == "admin@orthopar.local").delete()
        db.commit()

        existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if existing:
            print(f"[seed_admin] Admin already exists: {ADMIN_EMAIL} (skipping)")
            return

        admin = User(
            email=ADMIN_EMAIL,
            full_name="System Administrator",
            hashed_password=hash_password(ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            account_status=AccountStatus.APPROVED,
            approved_at=datetime.now(timezone.utc),
        )
        db.add(admin)
        db.commit()
        print(f"[seed_admin] Admin created successfully: {ADMIN_EMAIL}")
        print(f"[seed_admin] IMPORTANT: Change the default password immediately!")
    except Exception as e:
        db.rollback()
        print(f"[seed_admin] ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
