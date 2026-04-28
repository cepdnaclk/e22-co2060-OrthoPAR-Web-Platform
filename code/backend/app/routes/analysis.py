from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
import boto3
from botocore.exceptions import NoCredentialsError, ClientError
import os
import io
import tempfile

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

# ---------------- SCANS ----------------

s3_client = boto3.client(
    's3',
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION
)

@router.post("/scans", response_model=schemas.ScanResponse)
async def upload_scan(
    patient_id: UUID, 
    file_type: str, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # 1. Verify patient exists and belongs to user
    patient = db.query(models.Patient).filter(
        models.Patient.id == patient_id,
        models.Patient.clinician_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found or unauthorized")

    # 2. Try S3 first, fall back to local storage
    object_key = ""
    file_content = await file.read()

    try:
        s3_key = f"scans/{patient_id}/{file.filename}"
        s3_client.upload_fileobj(io.BytesIO(file_content), settings.S3_BUCKET_NAME, s3_key)
        object_key = s3_key
    except Exception:
        # S3 unavailable — save locally instead
        # Path relative to backend root
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        uploads_dir = os.path.join(base_dir, "uploads", str(patient_id))
        os.makedirs(uploads_dir, exist_ok=True)
        local_path = os.path.join(uploads_dir, file.filename)
        with open(local_path, "wb") as f:
            f.write(file_content)
        object_key = local_path

    # 3. Save reference in DB
    db_scan = models.Scan(patient_id=patient_id, file_type=file_type, object_key=object_key)
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
    scan = db.query(models.Scan).join(models.Patient).filter(
        models.Scan.id == scan_id,
        models.Patient.clinician_id == current_user.id
    ).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found or unauthorized")
    
    object_key = scan.object_key

    # --- S3 path: stream the file directly from the bucket ---
    if object_key.startswith("scans/"):
        try:
            s3_response = s3_client.get_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=object_key
            )
            filename = os.path.basename(object_key)
            return StreamingResponse(
                s3_response["Body"],
                media_type="application/octet-stream",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'}
            )
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "NoSuchKey":
                raise HTTPException(status_code=404, detail="STL file not found in S3")
            raise HTTPException(status_code=500, detail=f"S3 error: {error_code}")
        except NoCredentialsError:
            raise HTTPException(status_code=500, detail="AWS credentials not configured")

    # --- Local path fallback ---
    file_path = object_key
    if not os.path.isabs(file_path):
        file_path = os.path.join(os.getcwd(), file_path)

    if os.path.exists(file_path):
        return FileResponse(
            path=file_path,
            media_type="application/octet-stream",
            filename=os.path.basename(file_path)
        )
    
    raise HTTPException(status_code=404, detail="STL file not found on disk or in S3")

# ---------------- LANDMARKS & ANALYSIS ----------------

@router.post("/landmarks/extract/{scan_id}", response_model=List[schemas.LandmarkResponse])
def extract_landmarks(
    scan_id: UUID, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    scan = db.query(models.Scan).join(models.Patient).filter(
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

@router.post("/landmarks/calculate/{patient_id}", response_model=schemas.ParScoreResponse)
def calculate_score_for_patient(
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
            
    ml_service = MLService(db)
    active_version = ml_service.active_model_record.version if ml_service.active_model_record else "manual"

    if not upper_points or not lower_points:
         raise HTTPException(status_code=400, detail="Missing landmarks for upper or lower arch segments.")

    missing_segments = []
    if not buccal_points:
        missing_segments.append("buccal")

    scores = calculate_par_score(upper_points, lower_points, buccal_points)

    db_score = models.ParScore(
        patient_id=patient_id,
        model_version=active_version,
        **scores
    )
    db.add(db_score)
    patient.par_score = scores['final_score']
    
    db.commit()
    db.refresh(db_score)

    response = schemas.ParScoreResponse.model_validate(db_score)
    response.is_partial = len(missing_segments) > 0
    response.missing_segments = missing_segments
    return response
