from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("UPDATE users SET auth_provider = 'local' WHERE auth_provider IS NULL"))
    conn.execute(text("UPDATE users SET role = 'clinician' WHERE role IS NULL"))
    conn.execute(text("UPDATE users SET account_status = 'approved' WHERE account_status IS NULL"))
    conn.execute(text("UPDATE users SET is_admin = FALSE WHERE is_admin IS NULL"))
    conn.commit()

    result = conn.execute(text("SELECT id, email, role, account_status, auth_provider FROM users"))
    print("\nCurrent users:")
    for row in result:
        print(f"  id={row[0]}, email={row[1]}, role={row[2]}, status={row[3]}, provider={row[4]}")

print("\nUsers patched successfully.")
