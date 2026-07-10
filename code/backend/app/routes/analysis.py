from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from datetime import datetime
import boto3
from botocore.exceptions import NoCredentialsError, ClientError
import os

import schemas, models, auth, audit
from database import get_db
from config import settings
from storage import storage_manager
from app.ml_inference import MLService
from app.calculator import calculate_par_score

router = APIRouter(prefix="/analysis", tags=["Analysis"])

# ---------------- PATIENTS ----------------

@router.post("/patients", response_model=schemas.PatientResponse)
def create_patient(
    patient: schemas.PatientCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_approved_user)
):
    db_patient = models.Patient(clinician_id=current_user.id, **patient.model_dump())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)

    audit.record(
        db, audit.PATIENT_CREATED,
        user_id=current_user.id,
        user_email=current_user.email,
        entity_type="patient",
        entity_id=str(db_patient.id),
        summary=f"Patient created: {db_patient.name}",
        details={
            "patient_id": str(db_patient.id),
            "name": db_patient.name,
            "hospital_patient_id": db_patient.hospital_patient_id,
        },
        request=request,
    )

    return db_patient

@router.get("/patients", response_model=List[schemas.PatientResponse])
def get_patients(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_approved_user)
):
    # Only return patients for the current clinician
    patients = db.query(models.Patient).filter(models.Patient.clinician_id == current_user.id).offset(skip).limit(limit).all()
    return patients

@router.get("/patients/{patient_id}", response_model=schemas.PatientResponse)
def get_patient(
    patient_id: UUID, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_approved_user)
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
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_approved_user)
):
    # Verify patient ownership
    patient = db.query(models.Patient).filter(
        models.Patient.id == visit.patient_id,
        models.Patient.clinician_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found or unauthorized")

    db_visit = models.Visit(**visit.model_dump(exclude_unset=True))
    db.add(db_visit)
    db.commit()
    db.refresh(db_visit)

    audit.record(
        db, audit.VISIT_CREATED,
        user_id=current_user.id,
        user_email=current_user.email,
        entity_type="visit",
        entity_id=str(db_visit.id),
        summary=f"Visit created for patient {visit.patient_id}",
        details={
            "visit_id": str(db_visit.id),
            "patient_id": str(visit.patient_id),
            "status": db_visit.status,
        },
        request=request,
    )

    return db_visit

@router.get("/visits/{visit_id}", response_model=schemas.VisitResponse)
def get_visit(
    visit_id: UUID, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_approved_user)
):
    visit = db.query(models.Visit).join(models.Patient).filter(
        models.Visit.id == visit_id,
        models.Patient.clinician_id == current_user.id
    ).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found or unauthorized")
    return visit

# ---------------- SCANS ----------------

@router.post("/scans", response_model=schemas.ScanResponse)
async def upload_scan(
    visit_id: UUID,
    file_type: str,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_approved_user)
):
    # 1. Verify visit exists and patient belongs to user
    visit = db.query(models.Visit).join(models.Patient).filter(
        models.Visit.id == visit_id,
        models.Patient.clinician_id == current_user.id
    ).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found or unauthorized")

    patient_id_folder = str(visit.patient_id)

    # 2. Save file via the unified storage manager to the temporary folder
    file_content = await file.read()
    object_key = await storage_manager.save_temp_file(file_content, file.filename, str(visit_id))

    # 3. Purge any existing scan record of this specific file_type for this visit
    db.query(models.Scan).filter(
        models.Scan.visit_id == visit_id,
        models.Scan.file_type == file_type
    ).delete()
    db.commit()

    # 4. Save new reference in DB linked to visit as "temp"
    db_scan = models.Scan(visit_id=visit_id, file_type=file_type, object_key=object_key, status="temp")
    db.add(db_scan)
    db.commit()
    db.refresh(db_scan)

    audit.record(
        db, audit.SCAN_UPLOADED,
        user_id=current_user.id,
        user_email=current_user.email,
        entity_type="scan",
        entity_id=str(db_scan.id),
        summary=f"Scan uploaded ({file_type}) for visit {visit_id}",
        details={
            "scan_id": str(db_scan.id),
            "visit_id": str(visit_id),
            "file_type": file_type,
        },
        request=request,
    )

    return db_scan

@router.post("/scans/persist/{visit_id}", response_model=List[schemas.ScanResponse])
async def persist_scans(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Verify visit belongs to user
    visit = db.query(models.Visit).join(models.Patient).filter(
        models.Visit.id == visit_id,
        models.Patient.clinician_id == current_user.id
    ).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found or unauthorized")

    # Find all temp scans for this visit
    temp_scans = db.query(models.Scan).filter(
        models.Scan.visit_id == visit_id,
        models.Scan.status == "temp"
    ).all()

    patient_id_folder = str(visit.patient_id)
    persisted_scans = []

    for scan in temp_scans:
        filename = os.path.basename(scan.object_key)
        # Move file to permanent storage
        new_key = await storage_manager.persist_file(scan.object_key, filename, patient_id_folder)
        # Update scan record
        scan.object_key = new_key
        scan.status = "saved"
        persisted_scans.append(scan)

    db.commit()
    for scan in persisted_scans:
        db.refresh(scan)
        
    return persisted_scans

@router.get("/scans/file/{scan_id}")
def get_scan_file(
    scan_id: UUID, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_approved_user)
):
    scan = db.query(models.Scan).join(models.Visit).join(models.Patient).filter(
        models.Scan.id == scan_id,
        models.Patient.clinician_id == current_user.id
    ).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found or unauthorized")
    
    object_key = scan.object_key
    filename = os.path.basename(object_key)

    # Use the unified storage manager to retrieve the file
    file_data, is_stream = storage_manager.get_file(object_key)

    if is_stream:
        # S3 StreamingBody — stream directly to the client
        return StreamingResponse(
            file_data,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    else:
        # Local file path — serve via FileResponse
        return FileResponse(
            path=file_data,
            media_type="application/octet-stream",
            filename=filename
        )

# ---------------- LANDMARKS & ANALYSIS ----------------

@router.post("/landmarks/extract/{scan_id}", response_model=List[schemas.LandmarkResponse])
def extract_landmarks(
    scan_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_approved_user)
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
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        audit.record(
            db, audit.LANDMARK_EXTRACTION_FAILED,
            user_id=current_user.id,
            user_email=current_user.email,
            entity_type="scan",
            entity_id=str(scan_id),
            status=audit.AuditStatus.FAILURE,
            summary=f"Landmark extraction failed for scan {scan_id}: {e}",
            details={"scan_id": str(scan_id), "error": str(e)},
            request=request,
        )
        raise HTTPException(status_code=500, detail=str(e))

    # Lock the scan row explicitly to prevent race conditions during concurrent recalculations
    db.query(models.Scan).filter(models.Scan.id == scan_id).with_for_update().first()
    db.query(models.Landmark).filter(models.Landmark.scan_id == scan_id).delete()
    
    db_landmarks = []
    for lm in predicted_landmarks:
        db_lm = models.Landmark(scan_id=scan_id, **lm)
        db.add(db_lm)
        db_landmarks.append(db_lm)
        
    db.commit()

    audit.record(
        db, audit.LANDMARK_EXTRACTED,
        user_id=current_user.id,
        user_email=current_user.email,
        entity_type="scan",
        entity_id=str(scan_id),
        summary=f"Landmarks extracted for scan {scan_id}",
        details={
            "scan_id": str(scan_id),
            "landmark_count": len(db_landmarks),
            "model_version": model_version,
        },
        request=request,
    )

    return db_landmarks

@router.post("/landmarks/calculate/{visit_id}", response_model=schemas.ParScoreResponse)
def calculate_score_for_visit(
    visit_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_approved_user)
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
        audit.record(
            db, audit.PAR_SCORE_FAILED,
            user_id=current_user.id,
            user_email=current_user.email,
            entity_type="visit",
            entity_id=str(visit_id),
            status=audit.AuditStatus.FAILURE,
            summary=f"PAR score calculation failed: missing upper/lower landmarks for visit {visit_id}",
            details={"visit_id": str(visit_id), "reason": "missing_landmarks"},
            request=request,
        )
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

    audit.record(
        db, audit.PAR_SCORE_CALCULATED,
        user_id=current_user.id,
        user_email=current_user.email,
        entity_type="par_score",
        entity_id=str(db_score.id),
        summary=f"PAR score {db_score.final_score} calculated for visit {visit_id}",
        details={
            "visit_id": str(visit_id),
            "par_score_id": str(db_score.id),
            "final_score": db_score.final_score,
            "model_version": active_version,
            "is_partial": response.is_partial,
            "missing_segments": missing_segments,
        },
        request=request,
    )

    return response

@router.post("/scores/manual/{visit_id}", response_model=schemas.ParScoreResponse)
def save_manual_score(
    visit_id: UUID,
    score_data: schemas.ParScoreBase,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_approved_user)
):
    visit = db.query(models.Visit).join(models.Patient).filter(
        models.Visit.id == visit_id,
        models.Patient.clinician_id == current_user.id
    ).first()
    
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found or unauthorized")

    # Create new score record marked as 'manual'
    db_score = models.ParScore(
        visit_id=visit_id,
        model_version="manual",
        **score_data.model_dump()
    )
    db.add(db_score)
    
    # Sync with patient global cache
    visit.patient.par_score = score_data.final_score
    
    db.commit()
    db.refresh(db_score)

    audit.record(
        db, audit.MANUAL_SCORE_SAVED,
        user_id=current_user.id,
        user_email=current_user.email,
        entity_type="par_score",
        entity_id=str(db_score.id),
        summary=f"Manual PAR score {score_data.final_score} saved for visit {visit_id}",
        details={
            "visit_id": str(visit_id),
            "par_score_id": str(db_score.id),
            "final_score": score_data.final_score,
        },
        request=request,
    )

    return db_score

# ---------------- PATIENT TREND REPORT ----------------

@router.get("/patients/{patient_id}/report")
def get_patient_report(
    patient_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_approved_user)
):
    """
    Returns a full patient report including:
    - Patient demographics
    - Clinician info
    - All visits with PAR scores (chronological)
    - Trend analytics: delta, direction, % improvement, rolling average
    """
    patient = db.query(models.Patient).filter(
        models.Patient.id == patient_id,
        models.Patient.clinician_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found or unauthorized")

    audit.record(
        db, audit.REPORT_VIEWED,
        user_id=current_user.id,
        user_email=current_user.email,
        entity_type="patient",
        entity_id=str(patient_id),
        summary=f"Report viewed for patient {patient.name} ({patient_id})",
        request=request,
    )

    # Build chronological visit list with scores
    visits_data = []
    for visit in sorted(patient.visits, key=lambda v: v.visit_date):
        latest_score = None
        score_details = None
        if visit.par_scores:
            ps = sorted(visit.par_scores, key=lambda s: s.calculated_at)[-1]
            latest_score = ps.final_score
            score_details = {
                "id": str(ps.id),
                "upper_anterior_score": ps.upper_anterior_score,
                "lower_anterior_score": ps.lower_anterior_score,
                "buccal_occlusion_antero_posterior_score": ps.buccal_occlusion_antero_posterior_score,
                "buccal_occlusion_transverse_score": ps.buccal_occlusion_transverse_score,
                "buccal_occlusion_vertical_score": ps.buccal_occlusion_vertical_score,
                "overjet_score": ps.overjet_score,
                "overbite_score": ps.overbite_score,
                "centreline_score": ps.centreline_score,
                "final_score": ps.final_score,
                "calculated_at": ps.calculated_at.isoformat(),
                "model_version": ps.model_version,
            }
        visits_data.append({
            "id": str(visit.id),
            "visit_date": visit.visit_date.isoformat(),
            "status": visit.status,
            "notes": visit.notes,
            "scan_count": len(visit.scans),
            "par_score": latest_score,
            "score_details": score_details,
        })

    # Compute trend analytics only on visits that have a PAR score
    scored = [v for v in visits_data if v["par_score"] is not None]
    trend_entries = []
    window = 3  # rolling average window size

    for i, v in enumerate(scored):
        score = v["par_score"]
        delta = None
        direction = None
        pct_improvement = None

        if i > 0:
            prev_score = scored[i - 1]["par_score"]
            delta = score - prev_score  # negative = improving (lower PAR = better)
            if delta < 0:
                direction = "improving"
            elif delta > 0:
                direction = "worsening"
            else:
                direction = "stable"

            if prev_score != 0:
                # Positive pct = score went DOWN = improvement
                pct_improvement = round(((prev_score - score) / prev_score) * 100, 1)

        # Rolling average (up to last `window` entries)
        window_scores = [scored[j]["par_score"] for j in range(max(0, i - window + 1), i + 1)]
        rolling_avg = round(sum(window_scores) / len(window_scores), 1)

        trend_entries.append({
            "visit_id": v["id"],
            "visit_date": v["visit_date"],
            "visit_status": v["status"],
            "par_score": score,
            "delta": round(delta, 1) if delta is not None else None,
            "direction": direction,
            "pct_improvement": pct_improvement,
            "rolling_avg": rolling_avg,
        })

    # Overall improvement
    overall_delta = None
    overall_pct = None
    if len(scored) >= 2:
        first = scored[0]["par_score"]
        last = scored[-1]["par_score"]
        overall_delta = round(last - first, 1)
        if first != 0:
            overall_pct = round(((first - last) / first) * 100, 1)

    return {
        "patient": {
            "id": str(patient.id),
            "name": patient.name,
            "hospital_patient_id": patient.hospital_patient_id,
            "date_of_birth": patient.date_of_birth,
            "gender": patient.gender,
            "treatment_status": patient.treatment_status,
            "created_at": patient.created_at.isoformat(),
        },
        "clinician": {
            "full_name": current_user.full_name,
            "email": current_user.email,
            "hospital_name": current_user.hospital_name,
            "specialty": current_user.specialty,
            "slmc_registration_number": current_user.slmc_registration_number,
        },
        "visits": visits_data,
        "trend": {
            "entries": trend_entries,
            "overall_delta": overall_delta,
            "overall_pct_improvement": overall_pct,
            "total_visits": len(visits_data),
            "scored_visits": len(scored),
        }
    }

# ---------------- REPORTS ----------------

@router.get("/reports", response_model=List[schemas.ReportResponse])
def get_reports(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_approved_user)
):
    results = db.query(
        models.ParScore, 
        models.Patient.name.label("patient_name"),
        models.Patient.id.label("patient_id"),
        models.Patient.hospital_patient_id.label("hospital_patient_id"),
        models.Visit.notes.label("visit_notes"),
        models.Visit.visit_date.label("visit_date")
    ).join(
        models.Visit, models.ParScore.visit_id == models.Visit.id
    ).join(
        models.Patient, models.Visit.patient_id == models.Patient.id
    ).filter(
        models.Patient.clinician_id == current_user.id
    ).order_by(models.ParScore.calculated_at.desc()).all()
    
    reports = []
    for row in results:
        par_score = row[0]
        report = schemas.ReportResponse.model_validate(par_score)
        report.patient_name = row.patient_name
        report.patient_id = row.patient_id
        report.hospital_patient_id = row.hospital_patient_id
        report.visit_notes = row.visit_notes
        report.visit_date = row.visit_date
        reports.append(report)
        
    return reports


# ---------------- AUDIT LOGS ----------------

@router.get("/audit-logs", response_model=List[schemas.AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_approved_user),
):
    """
    Returns audit log entries for the authenticated user only.
    Entries are returned newest-first.

    Query params:
      - action     (optional) filter by action string, e.g. PATIENT_CREATED
      - from_date  (optional) ISO 8601 datetime lower bound (inclusive)
      - to_date    (optional) ISO 8601 datetime upper bound (inclusive)
      - skip       pagination offset (default 0)
      - limit      page size, max recommended 100 (default 50)
    """
    query = db.query(models.AuditLog).filter(
        models.AuditLog.user_id == current_user.id
    )
    if action:
        query = query.filter(models.AuditLog.action.ilike(f"%{action}%"))
    if from_date:
        query = query.filter(models.AuditLog.timestamp >= from_date)
    if to_date:
        query = query.filter(models.AuditLog.timestamp <= to_date)

    return (
        query
        .order_by(models.AuditLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
