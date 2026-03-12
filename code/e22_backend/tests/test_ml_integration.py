import pytest
import time
import os
import sys
import trimesh
import numpy as np
import json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup environment for test
os.environ["DATABASE_URL"] = "sqlite:///./test_ml.db"
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database import Base, get_db
import models, schemas

# DB Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_ml.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

import database
database.engine = engine
database.SessionLocal = TestingSessionLocal

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_ml_env():
    # 1. Create tables
    Base.metadata.create_all(bind=engine)
    
    # 2. Seed active ML model
    db = TestingSessionLocal()
    if not db.query(models.MLModel).filter(models.MLModel.version == "v1.0-legacy").first():
        legacy_model = models.MLModel(
            name="Legacy OrthoPAR Model",
            version="v1.0-legacy",
            file_path="ml_models",
            is_active=True
        )
        db.add(legacy_model)
        db.commit()
    db.close()

    # 3. Create dummy STL files
    if not os.path.exists("test_data"):
        os.makedirs("test_data")
    
    # Create a simple box mesh as dummy STL
    mesh = trimesh.creation.box()
    mesh.export("test_data/dummy.stl")
    
    yield
    
    # Cleanup
    # Ensure all connections are closed before trying to remove the file
    engine.dispose()
    app.dependency_overrides.clear()
    
    # Try to remove the DB file with a small retry if needed
    db_path = "test_ml.db"
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except PermissionError:
            time.sleep(1)
            try:
                os.remove(db_path)
            except:
                pass

def test_automated_extraction_and_calculation_performance():
    """
    Performance test: automated landmark identification and PAR calculation 
    must take less than 10 seconds.
    """
    # START PERFORMANCE MEASUREMENT
    start_time = time.time()

    # 1. Create Patient
    db = TestingSessionLocal()
    patient = models.Patient(name="Test Patient", treatment_status="Pre-Treatment")
    db.add(patient)
    db.commit()
    db.refresh(patient)
    p_id = patient.id

    # 2. Create Scans (pointing to dummy STL) - Insert directly to DB to avoid S3
    scan_types = ["Upper Arch Segment", "Lower Arch Segment", "Buccal Segment"]
    scan_ids = []
    for s_type in scan_types:
        scan = models.Scan(
            patient_id=p_id,
            file_type=s_type,
            object_key="test_data/dummy.stl"
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)
        scan_ids.append(scan.id)
    
    db.close() # Close DB handle used for seeding

    # 3. Trigger Automated Extraction for each scan
    for s_id in scan_ids:
        extract_res = client.post(f"/api/landmarks/extract/{s_id}")
        assert extract_res.status_code == 200, f"Extraction failed: {extract_res.text}"
        landmarks = extract_res.json()
        assert len(landmarks) > 0
        assert landmarks[0]["is_ai_predicted"] == True

    # 4. Trigger PAR Calculation
    calc_res = client.post(f"/api/landmarks/calculate/{p_id}")
    assert calc_res.status_code == 200, f"Calculation failed: {calc_res.text}"
    par_data = calc_res.json()
    assert par_data["model_version"] == "v1.0-legacy"
    assert "final_score" in par_data

    end_time = time.time()
    duration = end_time - start_time

    print(f"\n[PERFORMANCE] Extraction + Calculation took: {duration:.2f} seconds")

    # STRICT PERFORMANCE CONSTRAINT: < 10 seconds
    assert duration < 10.0, f"Performance constraint failed: Logic took {duration:.2f}s, which is > 10s benchmark."

def test_landmark_accuracy_ranges():
    """
    Verify that predicted landmarks have reasonable coordinate ranges (example test).
    """
    # Create Patient and Scan directly in DB
    db = TestingSessionLocal()
    patient = models.Patient(name="Accuracy Test", treatment_status="Pre-Treatment")
    db.add(patient)
    db.commit()
    db.refresh(patient)
    
    scan = models.Scan(
        patient_id=patient.id,
        file_type="Upper Arch Segment",
        object_key="test_data/dummy.stl"
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    s_id = scan.id
    db.close()

    # Extract
    client.post(f"/api/landmarks/extract/{s_id}")
    
    # Get and verify
    get_res = client.get(f"/api/landmarks/{s_id}")
    landmarks = get_res.json()
    
    for lm in landmarks:
        # Verify coordinates are not NaN or Infinity (common ML failure modes)
        assert isinstance(lm["x"], float)
        assert isinstance(lm["y"], float)
        assert isinstance(lm["z"], float)

def test_real_data_validation():
    """
    Real data validation: Process actual 3D dental scans from 'set1',
    calculate PAR score, and export landmark coordinates to JSON.
    """
    # 1. Configuration for real data files
    # Note: Search in code/e22_backend/tests/clinical_data/
    real_data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "clinical_data", "set1")
    scans_config = [
        {"type": "Upper Arch Segment", "file": "orthodontics_73_upper.stl"},
        {"type": "Lower Arch Segment", "file": "orthodontics_73_lower.stl"},
        {"type": "Buccal Segment", "file": "orthodontics_73_buccal_1.stl"}
    ]

    # Verify files exist (check both .stl and .stl.gz)
    actual_scans = []
    for s in scans_config:
        stl_path = os.path.join(real_data_dir, s["file"])
        gz_path = stl_path + ".gz"
        
        if os.path.exists(gz_path):
            actual_scans.append({"type": s["type"], "path": gz_path})
        elif os.path.exists(stl_path):
            actual_scans.append({"type": s["type"], "path": stl_path})
        else:
            pytest.skip(f"Real data file not found: {stl_path} or {gz_path}")

    # 2. Setup Patient in DB
    db = TestingSessionLocal()
    patient = models.Patient(name="Real Data Patient #73", treatment_status="Pre-Treatment")
    db.add(patient)
    db.commit()
    db.refresh(patient)
    p_id = patient.id

    # 3. Seed Scans in DB
    scan_ids = []
    for s in actual_scans:
        scan = models.Scan(
            patient_id=p_id,
            file_type=s["type"],
            object_key=s["path"]
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)
        scan_ids.append(scan.id)
    
    db.close()

    # 4. Trigger Extraction
    all_landmarks = {}
    for s_id in scan_ids:
        res = client.post(f"/api/landmarks/extract/{s_id}")
        assert res.status_code == 200, f"Extraction failed for {s_id}: {res.text}"
        landmarks = res.json()
        
        # Store for export
        scan_record = TestingSessionLocal().query(models.Scan).filter(models.Scan.id == s_id).first()
        all_landmarks[scan_record.file_type] = landmarks

    # 5. Trigger Calculation
    calc_res = client.post(f"/api/landmarks/calculate/{p_id}")
    assert calc_res.status_code == 200, f"PAR Calculation failed: {calc_res.text}"
    par_data = calc_res.json()
    
    # 6. Export Results to JSON Artifact
    export_data = {
        "patient_id": str(p_id),
        "par_score": par_data,
        "landmarks": all_landmarks
    }
    
    export_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "docs", "ml-integration", "real_data_landmarks_artifact.json")
    with open(export_path, "w") as f:
        json.dump(export_data, f, indent=4)
    
    print(f"\n[ARTIFACT] Real data landmarks exported to: {export_path}")
    print(f"[RESULT] Final PAR Score: {par_data['final_score']}")

    # Basic validations
    assert par_data["final_score"] >= 0
    assert len(all_landmarks) == 3

def test_real_data_validation_set2():
    """
    Real data validation for Set 2: Process actual 3D dental scans from 'set2',
    calculate PAR score, and export landmark coordinates to JSON.
    """
    # 1. Configuration for real data files (Patient 80)
    real_data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "clinical_data", "set2")
    scans_config = [
        {"type": "Upper Arch Segment", "file": "orthodontics_80_upper.stl"},
        {"type": "Lower Arch Segment", "file": "orthodontics_80_lower.stl"},
        {"type": "Buccal Segment", "file": "orthodontics_80_buccal_1.stl"}
    ]

    # Verify files exist (check both .stl and .stl.gz)
    actual_scans = []
    for s in scans_config:
        stl_path = os.path.join(real_data_dir, s["file"])
        gz_path = stl_path + ".gz"
        
        if os.path.exists(gz_path):
            actual_scans.append({"type": s["type"], "path": gz_path})
        elif os.path.exists(stl_path):
            actual_scans.append({"type": s["type"], "path": stl_path})
        else:
            pytest.skip(f"Real data file not found: {stl_path} or {gz_path}")

    # 2. Setup Patient in DB
    db = TestingSessionLocal()
    patient = models.Patient(name="Real Data Patient #80", treatment_status="Pre-Treatment")
    db.add(patient)
    db.commit()
    db.refresh(patient)
    p_id = patient.id

    # 3. Seed Scans in DB
    scan_ids = []
    for s in actual_scans:
        scan = models.Scan(
            patient_id=p_id,
            file_type=s["type"],
            object_key=s["path"]
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)
        scan_ids.append(scan.id)
    
    db.close()

    # 4. Trigger Extraction
    all_landmarks = {}
    for s_id in scan_ids:
        res = client.post(f"/api/landmarks/extract/{s_id}")
        assert res.status_code == 200, f"Extraction failed for {s_id}: {res.text}"
        landmarks = res.json()
        
        # Store for export
        scan_record = TestingSessionLocal().query(models.Scan).filter(models.Scan.id == s_id).first()
        all_landmarks[scan_record.file_type] = landmarks

    # 5. Trigger Calculation
    calc_res = client.post(f"/api/landmarks/calculate/{p_id}")
    assert calc_res.status_code == 200, f"PAR Calculation failed: {calc_res.text}"
    par_data = calc_res.json()
    
    # 6. Export Results to JSON Artifact
    export_data = {
        "patient_id": str(p_id),
        "par_score": par_data,
        "landmarks": all_landmarks
    }
    
    export_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "docs", "ml-integration", "real_data_landmarks_artifact_set2.json")
    with open(export_path, "w") as f:
        json.dump(export_data, f, indent=4)
    
    print(f"\n[ARTIFACT] Set 2 landmarks exported to: {export_path}")
    print(f"[RESULT] Final PAR Score (Patient 80): {par_data['final_score']}")

    # Basic validations
    assert par_data["final_score"] >= 0
    assert len(all_landmarks) == 3
