from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime
from uuid import UUID

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    hospital_name: Optional[str] = None
    slmc_registration_number: Optional[str] = None
    specialty: Optional[str] = None
    phone_number: Optional[str] = None

class User(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    hospital_name: Optional[str] = None
    slmc_registration_number: Optional[str] = None
    specialty: Optional[str] = None
    phone_number: Optional[str] = None
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
    visit_id: UUID

class ScanResponse(ScanBase):
    id: UUID
    visit_id: UUID
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
    visit_id: UUID

class ParScoreResponse(ParScoreBase):
    id: UUID
    visit_id: UUID
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
    hospital_patient_id: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    treatment_status: str

class PatientCreate(PatientBase):
    pass

class VisitBase(BaseModel):
    notes: Optional[str] = None
    status: str = "Pre-Treatment"

class VisitCreate(VisitBase):
    patient_id: UUID

class VisitResponse(VisitBase):
    id: UUID
    patient_id: UUID
    visit_date: datetime
    scans: List[ScanResponse] = []
    par_scores: List[ParScoreResponse] = []
    model_config = ConfigDict(from_attributes=True)

class PatientResponse(PatientBase):
    id: UUID
    par_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    visits: List[VisitResponse] = []
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

class ReportResponse(ParScoreResponse):
    patient_name: str
    patient_id: UUID
    hospital_patient_id: Optional[str] = None
    visit_notes: Optional[str] = None
    visit_date: datetime
