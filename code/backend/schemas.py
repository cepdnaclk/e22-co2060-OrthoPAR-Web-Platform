from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Optional, Any
from datetime import datetime
from uuid import UUID
from models import AuditStatus

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    hospital_name: Optional[str] = None
    slmc_registration_number: Optional[str] = None
    specialty: Optional[str] = None
    phone_number: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str

class GoogleAuthRequest(BaseModel):
    id_token: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    hospital_name: Optional[str] = None
    slmc_registration_number: Optional[str] = None
    specialty: Optional[str] = None
    phone_number: Optional[str] = None

class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str

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
    overjet_points: Optional[int] = None
    overbite_points: Optional[int] = None
    centreline_points: Optional[int] = None
    buccal_occlusion_score: Optional[int] = None
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
    visit_date: Optional[datetime] = None

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

class MLModelCreate(MLModelBase):
    file_path: str

class MLModelResponse(MLModelBase):
    id: UUID
    file_path: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class MLModelActiveResponse(BaseModel):
    name: str
    version: str

    class Config:
        from_attributes = True

class ReportResponse(ParScoreResponse):
    patient_name: str
    patient_id: UUID
    hospital_patient_id: Optional[str] = None
    visit_notes: Optional[str] = None
    visit_date: datetime


class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    status: AuditStatus
    summary: Optional[str] = None
    details: Optional[dict] = None   # JSONB -- arrives as a dict, no JSON.parse() needed
    # Request context
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    http_method: Optional[str] = None
    endpoint: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Admin schemas
# ---------------------------------------------------------------------------

class User(BaseModel):
    id: int
    # Use plain string for returned email to avoid strict RFC checks
    # (some local dev domains like `.local` are treated as reserved).
    email: str
    full_name: str
    hospital_name: Optional[str] = None
    slmc_registration_number: Optional[str] = None
    specialty: Optional[str] = None
    phone_number: Optional[str] = None
    role: Optional[str] = "clinician"
    account_status: Optional[str] = "approved"
    created_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class UserAdminSummary(BaseModel):
    """Extended user view for admin user management table."""
    id: int
    email: str
    full_name: str
    role: str
    account_status: str
    specialty: Optional[str] = None
    hospital_name: Optional[str] = None
    slmc_registration_number: Optional[str] = None
    phone_number: Optional[str] = None
    created_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    action_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class UserApprovalAction(BaseModel):
    """Body for approve/reject/role-change actions."""
    reason: Optional[str] = None  # Optional rejection reason


class RoleChangeAction(BaseModel):
    new_role: str  # "admin" or "clinician"
    reason: Optional[str] = None


class AdminStatsResponse(BaseModel):
    total_users: int
    pending_users: int
    approved_users: int
    rejected_users: int
    disabled_users: int
    total_audit_events: int
    failed_logins_24h: int
    approved_today: int


class SecurityEventResponse(BaseModel):
    email: str
    ip_address: Optional[str] = None
    failure_count: int
    last_attempt: Optional[datetime] = None
