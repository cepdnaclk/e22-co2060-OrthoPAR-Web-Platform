from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
import boto3
from botocore.exceptions import NoCredentialsError
import os
import io

import schemas, models, auth
from database import get_db
from config import settings
from app.ml_inference import MLService
from app.calculator import calculate_par_score

router = APIRouter(prefix="/analysis", tags=["Analysis"])

# ---------------- PATIENTS ----------------

@router.post("/patients", response_model=schemas.PatientResponse)
def create_patient(
    patient: schemas.PatientCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_patient = models.Patient(clinician_id=current_user.id, **patient.model_dump())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

@router.get("/patients", response_model=List[schemas.PatientResponse])
def get_patients(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Only return patients for the current clinician
    patients = db.query(models.Patient).filter(models.Patient.clinician_id == current_user.id).offset(skip).limit(limit).all()
    return patients

@router.get("/patients/{patient_id}", response_model=schemas.PatientResponse)
def get_patient(
    patient_id: UUID, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    patient = db.query(models.Patient).filter(
        models.Patient.id == patient_id,
        models.Patient.clinician_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found or unauthorized")
    return patient

# ---------------- VISITS ----------------

@router.post("/visits", response_model=schemas.VisitResponse)
def create_visit(
    visit: schemas.VisitCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Verify patient ownership
    patient = db.query(models.Patient).filter(
        models.Patient.id == visit.patient_id,
        models.Patient.clinician_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found or unauthorized")

    db_visit = models.Visit(**visit.model_dump())
    db.add(db_visit)
    db.commit()
    db.refresh(db_visit)
    return db_visit

@router.get("/visits/{visit_id}", response_model=schemas.VisitResponse)
def get_visit(
    visit_id: UUID, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    visit = db.query(models.Visit).join(models.Patient).filter(
        models.Visit.id == visit_id,
        models.Patient.clinician_id == current_user.id
    ).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found or unauthorized")
    return visit

# ---------------- SCANS ----------------

s3_client = boto3.client(
    's3',
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION
)

@router.post("/scans", response_model=schemas.ScanResponse)
async def upload_scan(
    visit_id: UUID, 
    file_type: str, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # 1. Verify visit exists and patient belongs to user
    visit = db.query(models.Visit).join(models.Patient).filter(
        models.Visit.id == visit_id,
        models.Patient.clinician_id == current_user.id
    ).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found or unauthorized")

    patient_id_folder = str(visit.patient_id)
    # 2. Try S3 first, fall back to local storage
    object_key = ""
    file_content = await file.read()

    try:
        s3_key = f"scans/{patient_id_folder}/{file.filename}"
        s3_client.upload_fileobj(io.BytesIO(file_content), settings.S3_BUCKET_NAME, s3_key)
        object_key = s3_key
    except Exception:
        # S3 unavailable — save locally instead
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        uploads_dir = os.path.join(base_dir, "uploads", patient_id_folder)
        os.makedirs(uploads_dir, exist_ok=True)
        local_path = os.path.join(uploads_dir, file.filename)
        with open(local_path, "wb") as f:
            f.write(file_content)
        object_key = local_path

    # 3. Purge any existing scan record of this specific file_type for this visit
    db.query(models.Scan).filter(
        models.Scan.visit_id == visit_id,
        models.Scan.file_type == file_type
    ).delete()
    db.commit()

    # 4. Save new reference in DB linked to visit
    db_scan = models.Scan(visit_id=visit_id, file_type=file_type, object_key=object_key)
    db.add(db_scan)
    db.commit()
    db.refresh(db_scan)
    return db_scan

@router.get("/scans/file/{scan_id}")
def get_scan_file(
    scan_id: UUID, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    scan = db.query(models.Scan).join(models.Visit).join(models.Patient).filter(
        models.Scan.id == scan_id,
        models.Patient.clinician_id == current_user.id
    ).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found or unauthorized")
    
    file_path = scan.object_key
    if not os.path.isabs(file_path):
        file_path = os.path.join(os.getcwd(), file_path)

    if os.path.exists(file_path):
        return FileResponse(
            path=file_path,
            media_type="application/octet-stream",
            filename=os.path.basename(file_path)
        )
    
    raise HTTPException(status_code=404, detail=f"STL file not found on disk")

# ---------------- LANDMARKS & ANALYSIS ----------------

@router.post("/landmarks/extract/{scan_id}", response_model=List[schemas.LandmarkResponse])
def extract_landmarks(
    scan_id: UUID, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    scan = db.query(models.Scan).join(models.Visit).join(models.Patient).filter(
        models.Scan.id == scan_id,
        models.Patient.clinician_id == current_user.id
    ).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found or unauthorized")
        
    ml_service = MLService(db)
    try:
        predicted_landmarks, model_version = ml_service.predict_landmarks(scan.object_key, scan.file_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    db.query(models.Landmark).filter(models.Landmark.scan_id == scan_id).delete()
    
    db_landmarks = []
    for lm in predicted_landmarks:
        db_lm = models.Landmark(scan_id=scan_id, **lm)
        db.add(db_lm)
        db_landmarks.append(db_lm)
        
    db.commit()
    return db_landmarks

@router.post("/landmarks/calculate/{visit_id}", response_model=schemas.ParScoreResponse)
def calculate_score_for_visit(
    visit_id: UUID, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    visit = db.query(models.Visit).join(models.Patient).filter(
        models.Visit.id == visit_id,
        models.Patient.clinician_id == current_user.id
    ).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found or unauthorized")

    upper_points = []
    lower_points = []
    buccal_points = []
    
    for scan in visit.scans:
        if scan.file_type == "Upper Arch Segment":
            upper_points.extend(scan.landmarks)
        elif scan.file_type == "Lower Arch Segment":
            lower_points.extend(scan.landmarks)
        elif scan.file_type == "Buccal Segment":
            buccal_points.extend(scan.landmarks)
            
    ml_service = MLService(db)
    active_version = ml_service.active_model_record.version if ml_service.active_model_record else "manual"

    if not upper_points or not lower_points:
         raise HTTPException(status_code=400, detail="Missing landmarks for upper or lower arch segments.")

    missing_segments = []
    if not buccal_points:
        missing_segments.append("buccal")

    scores = calculate_par_score(upper_points, lower_points, buccal_points)

    db_score = models.ParScore(
        visit_id=visit_id,
        model_version=active_version,
        **scores
    )
    db.add(db_score)
    
    # Store most recent score globally on Patient cache
    visit.patient.par_score = scores['final_score']
    
    db.commit()
    db.refresh(db_score)

    response = schemas.ParScoreResponse.model_validate(db_score)
    response.is_partial = len(missing_segments) > 0
    response.missing_segments = missing_segments
    return response
