from database import engine
from sqlalchemy import text

migrations = [
    # scans table
    "ALTER TABLE scans ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'temp'",

    # par_scores table
    "ALTER TABLE par_scores ADD COLUMN IF NOT EXISTS is_partial BOOLEAN DEFAULT FALSE",
    "ALTER TABLE par_scores ADD COLUMN IF NOT EXISTS missing_segments JSONB DEFAULT '[]'",

    # ml_models table (may be missing entirely or missing columns)
    """CREATE TABLE IF NOT EXISTS ml_models (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR,
        version VARCHAR UNIQUE,
        file_path VARCHAR,
        is_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )""",

    # audit_logs — ensure all columns present
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id INTEGER",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_email VARCHAR",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id VARCHAR",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'success'",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS summary VARCHAR",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent VARCHAR",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS http_method VARCHAR",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS endpoint VARCHAR",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW()",
]

with engine.connect() as conn:
    for sql in migrations:
        try:
            conn.execute(text(sql))
            short = sql.strip().split('\n')[0][:70]
            print(f"OK: {short}")
        except Exception as e:
            short = sql.strip().split('\n')[0][:60]
            print(f"SKIP ({type(e).__name__}): {short} -> {str(e)[:60]}")
    conn.commit()

print("\nAll migrations done.")
