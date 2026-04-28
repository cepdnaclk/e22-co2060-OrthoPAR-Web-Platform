from database import engine, Base
import models
import schemas
import auth
import storage
import crud
from sqlalchemy import text

print("Dropping all tables and schema with cascade...")
with engine.connect() as conn:
    conn.execute(text("DROP SCHEMA public CASCADE;"))
    conn.execute(text("CREATE SCHEMA public;"))
    conn.execute(text("GRANT ALL ON SCHEMA public TO postgres;"))
    conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
    conn.commit()

print("Creating all tables from current models...")
Base.metadata.create_all(bind=engine)
print("Done!")
