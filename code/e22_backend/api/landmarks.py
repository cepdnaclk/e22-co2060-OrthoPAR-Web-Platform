from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

import schemas, models
from database import get_db
from services.par_score_service import calculate_par_score
from services.ml_service import MLService

router = APIRouter()

@router.post("/extract/{scan_id}", response_model=List[schemas.LandmarkResponse])
def extract_landmarks(scan_id: UUID, db: Session = Depends(get_db)):
    # 1. Get scan from DB
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    # 2. Setup ML Service and predict
    # Note: In a real app, scan.object_key would be used to fetch from S3.
    # For this implementation, we assume the file is locally available or mocked.
    # We will pass the object_key as the local path for now to match the test setup.
    ml_service = MLService(db)
    try:
        predicted_landmarks, model_version = ml_service.predict_landmarks(scan.object_key, scan.file_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # 3. Save predicted landmarks
    db.query(models.Landmark).filter(models.Landmark.scan_id == scan_id).delete()
    
    db_landmarks = []
    for lm in predicted_landmarks:
        db_lm = models.Landmark(scan_id=scan_id, **lm)
        db.add(db_lm)
        db_landmarks.append(db_lm)
        
    db.commit()
    return db_landmarks

@router.post("/", response_model=List[schemas.LandmarkResponse])
def save_landmarks(landmarks: List[schemas.LandmarkCreate], db: Session = Depends(get_db)):
    db_landmarks = []
    
    # Simple clear and replace strategy for simplicity
    if landmarks:
        db.query(models.Landmark).filter(models.Landmark.scan_id == landmarks[0].scan_id).delete()

    for lm in landmarks:
        db_lm = models.Landmark(**lm.model_dump())
        db.add(db_lm)
        db_landmarks.append(db_lm)
        
    db.commit()
    return db_landmarks

@router.get("/{scan_id}", response_model=List[schemas.LandmarkResponse])
def get_landmarks(scan_id: UUID, db: Session = Depends(get_db)):
    return db.query(models.Landmark).filter(models.Landmark.scan_id == scan_id).all()

@router.post("/calculate/{patient_id}", response_model=schemas.ParScoreResponse)
def calculate_score_for_patient(patient_id: UUID, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Gather points from all scans for this patient
    upper_points = []
    lower_points = []
    buccal_points = []
    
    # Track model versions used (if any were AI predicted)
    model_versions = set()

    for scan in patient.scans:
        if scan.file_type == "Upper Arch Segment":
            upper_points.extend(scan.landmarks)
        elif scan.file_type == "Lower Arch Segment":
            lower_points.extend(scan.landmarks)
        elif scan.file_type == "Buccal Segment":
            buccal_points.extend(scan.landmarks)
            
    # Simple logic: if any point was AI predicted, we should ideally track which version.
    # For now, we'll fetch the active model version to record against the score session.
    ml_service = MLService(db)
    active_version = ml_service.active_model_record.version if ml_service.active_model_record else "manual"

    if not upper_points or not lower_points or not buccal_points:
         raise HTTPException(status_code=400, detail="Missing landmarks for one or more segments.")

    scores = calculate_par_score(upper_points, lower_points, buccal_points)

    db_score = models.ParScore(
        patient_id=patient_id,
        model_version=active_version,
        **scores
    )
    db.add(db_score)
    
    # Update Patient object
    patient.par_score = scores['final_score']
    
    db.commit()
    db.refresh(db_score)
    return db_score
