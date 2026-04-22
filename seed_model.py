import sys, os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import uuid

# Add the backend directory to sys.path
backend_path = os.path.join(os.getcwd(), "code", "backend")
sys.path.append(backend_path)

from models import MLModel, Base

# Connect to the test database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./merged_test.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def seed():
    db = SessionLocal()
    try:
        # Check if already seeded
        existing = db.query(MLModel).filter(MLModel.version == "v1.0").first()
        if existing:
            print("ML Model v1.0 already exists.")
            return

        new_model = MLModel(
            id=uuid.uuid4(),
            name="Clinical Landmark Predictor",
            version="v1.0",
            file_path="ml_models", # Relative to code/backend/
            is_active=True
        )
        db.add(new_model)
        db.commit()
        print("Successfully seeded ML Model v1.0")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
