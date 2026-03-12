from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import os

def seed_ml_models():
    db = SessionLocal()
    try:
        # Create tables if they don't exist
        models.Base.metadata.create_all(bind=engine)
        
        # Check if already seeded
        if db.query(models.MLModel).count() > 0:
            print("ML Models already seeded.")
            return

        # Seed the legacy model
        legacy_model = models.MLModel(
            name="Legacy OrthoPAR Model",
            version="v1.0-legacy",
            file_path="ml_models", # Relative to code/e22_backend
            is_active=True
        )
        db.add(legacy_model)
        db.commit()
        print("Successfully seeded legacy ML model.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_ml_models()
