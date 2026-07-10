"""Add missing columns to PostgreSQL tables that were added to models.py after initial table creation."""
from sqlalchemy import text
from database import engine

migrations = [
    "ALTER TABLE scans ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'temp'",
]

conn = engine.connect()
for sql in migrations:
    try:
        conn.execute(text(sql))
        print(f"OK: {sql}")
    except Exception as e:
        print(f"SKIP: {sql} -- {e}")
conn.commit()
conn.close()
print("\nDone! Restart uvicorn to pick up the changes.")
