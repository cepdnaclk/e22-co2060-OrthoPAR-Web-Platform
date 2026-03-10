from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID

# --- Landmarks ---
class LandmarkBase(BaseModel):
    point_name: str
    x: float
    y: float
    z: float
    is_ai_predicted: bool = False

class LandmarkCreate(LandmarkBase):
    scan_id: UUID

class LandmarkResponse(LandmarkBase):
    id: UUID
    scan_id: UUID

    class Config:
        from_attributes = True

# --- Scans ---
class ScanBase(BaseModel):
    file_type: str
    object_key: str

class ScanCreate(ScanBase):
    patient_id: UUID

class ScanResponse(ScanBase):
    id: UUID
    patient_id: UUID
    uploaded_at: datetime
    landmarks: List[LandmarkResponse] = []

    class Config:
        from_attributes = True

# --- Par Scores ---
class ParScoreBase(BaseModel):
    upper_anterior_score: int
    lower_anterior_score: int
    buccal_occlusion_antero_posterior_score: int
    buccal_occlusion_transverse_score: int
    buccal_occlusion_vertical_score: int
    overjet_score: int
    overbite_score: int
    centreline_score: int
    final_score: int

class ParScoreCreate(ParScoreBase):
    patient_id: UUID

class ParScoreResponse(ParScoreBase):
    id: UUID
    patient_id: UUID
    calculated_at: datetime

    class Config:
        from_attributes = True

# --- Patients ---
class PatientBase(BaseModel):
    name: str
    treatment_status: str

class PatientCreate(PatientBase):
    pass

class PatientResponse(PatientBase):
    id: UUID
    par_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    scans: List[ScanResponse] = []
    par_scores: List[ParScoreResponse] = []

    class Config:
        from_attributes = True
