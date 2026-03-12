from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

import schemas, models
from database import get_db
from services.par_score_service import calculate_par_score

router = APIRouter()

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

    for scan in patient.scans:
        if scan.file_type == "Upper Arch Segment":
            upper_points.extend(scan.landmarks)
        elif scan.file_type == "Lower Arch Segment":
            lower_points.extend(scan.landmarks)
        elif scan.file_type == "Buccal Segment":
            buccal_points.extend(scan.landmarks)

    if not upper_points or not lower_points or not buccal_points:
         raise HTTPException(status_code=400, detail="Missing landmarks for one or more segments.")

    scores = calculate_par_score(upper_points, lower_points, buccal_points)

    db_score = models.ParScore(
        patient_id=patient_id,
        **scores
    )
    db.add(db_score)
    
    # Update Patient object
    patient.par_score = scores['final_score']
    
    db.commit()
    db.refresh(db_score)
    return db_score
