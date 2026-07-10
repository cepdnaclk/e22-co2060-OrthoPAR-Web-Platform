from database import engine, Base
from sqlalchemy import text, inspect

inspector = inspect(engine)

import models  # ensure all models are registered

print("=== DB Schema Validation ===\n")
all_ok = True

for table in Base.metadata.sorted_tables:
    db_cols = {col["name"] for col in inspector.get_columns(table.name)}
    model_cols = {col.name for col in table.columns}
    missing = model_cols - db_cols
    extra = db_cols - model_cols

    if missing:
        all_ok = False
        print(f"[MISSING] Table '{table.name}': {missing}")
    else:
        print(f"[OK]      Table '{table.name}' ({len(model_cols)} cols match)")

print("\n" + ("All tables match!" if all_ok else "Some columns are missing — run migrations!"))
