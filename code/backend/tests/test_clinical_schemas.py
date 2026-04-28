import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import sys
import os

# Allow importing from backend root
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

import models
from database import Base, get_db
from main import app

# 1. Create an ephemeral in-memory SQLite database
# This ensures our tests never pollute the production PostgreSQL data!
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Rebuild the freshly updated models inside the memory DB
Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

# Pass the ephemeral DB into FastAPI's explicit dependency injection wrapper
app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def test_register_clinical_user():
    """
    Validates that the `/register` endpoint successfully absorbs
    the new clinical demographics (SLMC, Hospital Name, etc.)
    """
    response = client.post(
        "/register",
        json={
            "email": "dr.smith@test.com",
            "full_name": "Dr. Sarah Smith",
            "password": "securepassword123",
            "hospital_name": "Asiri Medical",
            "slmc_registration_number": "SLMC-5092",
            "specialty": "Orthodontist",
            "phone_number": "+94770000000"
        }
    )
    assert response.status_code == 200, response.text
    assert response.json() == {"message": "User registered successfully"}

def test_visit_longitudinal_hierarchy():
    """
    E2E Test validating MRN integration and Visit tree derivations natively
    """
    # 1. Authenticate to get Bearer
    response = client.post(
        "/login",
        data={"username": "dr.smith@test.com", "password": "securepassword123"}
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create the Patient traversing the new Longitudinal Models
    patient_data = {
        "name": "Jane Doe",
        "hospital_patient_id": "MRN-1002",
        "date_of_birth": "1995-10-15",
        "gender": "Female",
        "treatment_status": "Active"
    }
    response = client.post("/api/analysis/patients", json=patient_data, headers=headers)
    assert response.status_code == 200, response.text
    patient = response.json()
    assert patient["hospital_patient_id"] == "MRN-1002"
    assert patient["gender"] == "Female"
    patient_id = patient["id"]

    # 3. Create the initial Visit mapping attached directly to the Patient UUID
    visit_data = {
        "patient_id": patient_id,
        "notes": "Initial Consultation Auto-Generated Hook",
        "status": "Pre-Treatment"
    }
    response = client.post("/api/analysis/visits", json=visit_data, headers=headers)
    assert response.status_code == 200, response.text
    visit = response.json()
    assert visit["patient_id"] == patient_id
    assert visit["status"] == "Pre-Treatment"
    assert "id" in visit
    
    # 4. Verify we can GET the visit natively via the Clinician User hook
    visit_id = visit["id"]
    response = client.get(f"/api/analysis/visits/{visit_id}", headers=headers)
    assert response.status_code == 200, response.text
    retrieved_visit = response.json()
    assert retrieved_visit["id"] == visit_id
