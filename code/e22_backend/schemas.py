from pydantic import BaseModel, ConfigDict
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
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)

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
    model_version: Optional[str] = None
    model_config = ConfigDict(
        from_attributes=True,
        protected_namespaces=() # Fix "model_" conflict in model_version
    )

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
    model_config = ConfigDict(from_attributes=True)

# --- ML Models ---
class MLModelBase(BaseModel):
    name: str
    version: str
    is_active: bool = False

class MLModelResponse(MLModelBase):
    id: UUID
    file_path: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
