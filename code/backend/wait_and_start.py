import time
import os
import sys
from sqlalchemy import create_engine
from config import DATABASE_URL


def wait_for_db(url, timeout=120, interval=2):
    engine = create_engine(url)
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            conn = engine.connect()
            conn.close()
            print("[startup] Database reachable")
            return True
        except Exception as e:
            print(f"[startup] Waiting for DB: {e}")
            time.sleep(interval)
    return False


if __name__ == "__main__":
    ok = wait_for_db(DATABASE_URL)
    if not ok:
        print("[startup] DB did not become ready within timeout; starting server anyway.")

    # Replace current process with uvicorn for proper signal handling
    os.execvp("uvicorn", ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"])
