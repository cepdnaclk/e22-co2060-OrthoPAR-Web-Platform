from database import get_db
import models

db = next(get_db())
try:
    models_in_db = db.query(models.MLModel).all()
    print(f"Total models in DB: {len(models_in_db)}")
    for m in models_in_db:
        print(f"ID: {m.id}, Name: {m.name}, Active: {m.is_active}")
finally:
    db.close()
