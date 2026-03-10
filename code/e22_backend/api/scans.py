from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
import boto3
from botocore.exceptions import NoCredentialsError

from .. import schemas, models
from ..database import get_db
from ..config import settings

router = APIRouter()
s3_client = boto3.client(
    's3',
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION
)

@router.post("/", response_model=schemas.ScanResponse)
async def upload_scan(patient_id: UUID, file_type: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    # 1. Verify patient exists
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # 2. Upload to S3
    object_key = f"scans/{patient_id}/{file.filename}"
    try:
        s3_client.upload_fileobj(file.file, settings.S3_BUCKET_NAME, object_key)
    except NoCredentialsError:
        raise HTTPException(status_code=500, detail="AWS credentials not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # 3. Save reference in DB
    db_scan = models.Scan(patient_id=patient_id, file_type=file_type, object_key=object_key)
    db.add(db_scan)
    db.commit()
    db.refresh(db_scan)
    return db_scan

@router.get("/{patient_id}", response_model=List[schemas.ScanResponse])
def get_patient_scans(patient_id: UUID, db: Session = Depends(get_db)):
    scans = db.query(models.Scan).filter(models.Scan.patient_id == patient_id).all()
    return scans
