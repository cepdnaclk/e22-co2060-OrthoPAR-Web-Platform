from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import DATABASE_URL

# pool_pre_ping: test stale connections before reuse (fixes Neon SSL drops)
# pool_recycle: refresh connections every 5 minutes to avoid idle timeouts
engine_kwargs = {
    "pool_pre_ping": True,
    "pool_recycle": 300,
}
# SQLite doesn't support pool_size/max_overflow
if not DATABASE_URL.startswith("sqlite"):
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
