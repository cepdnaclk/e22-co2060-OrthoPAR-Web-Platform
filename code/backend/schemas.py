from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime
from uuid import UUID

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str

class User(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class ModelResponse(BaseModel):
    model_id: UUID
    file_name: str
    status: str
    model_config = ConfigDict(from_attributes=True)

# --- Clinical Schemas ---

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
    is_partial: bool = False
    missing_segments: List[str] = []
    model_config = ConfigDict(
        from_attributes=True,
        protected_namespaces=()
    )

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

class MLModelBase(BaseModel):
    name: str
    version: str
    is_active: bool = False

class MLModelResponse(MLModelBase):
    id: UUID
    file_path: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
