from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UUID, Float, Boolean, Index, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum


# ---------------------------------------------------------------------------
# User role & account-status enums
# ---------------------------------------------------------------------------

class UserRole(str, PyEnum):
    ADMIN     = "admin"
    CLINICIAN = "clinician"   # covers all 4 specialties (stored in specialty col)

class AccountStatus(str, PyEnum):
    PENDING  = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    DISABLED = "disabled"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String, nullable=True) # Nullable for Google users
    auth_provider = Column(String, default="local") # "local" or "google"
    google_id = Column(String, unique=True, index=True, nullable=True)
    
    # Clinical Affiliation Data
    hospital_name = Column(String, nullable=True)
    slmc_registration_number = Column(String, nullable=True)
    specialty = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False)


    # Role & Approval Workflow
    role           = Column(String, default=UserRole.CLINICIAN, nullable=False)
    account_status = Column(String, default=AccountStatus.PENDING, nullable=False)
    approved_by    = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at    = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at    = Column(DateTime(timezone=True),
                           default=lambda: datetime.now(timezone.utc))
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    models   = relationship("Model", back_populates="owner")
    patients = relationship("Patient", back_populates="clinician")

class Model(Base):
    __tablename__ = "models"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id"))
    file_name = Column(String)
    file_path = Column(String)
    file_type = Column(String)
    upload_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="uploaded")

    owner = relationship("User", back_populates="models")

# --- Clinical Models ---

class Patient(Base):
    __tablename__ = "patients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    clinician_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Link to Auth user
    
    # Clinical Demographic Variables
    hospital_patient_id = Column(String, index=True, nullable=True)  # MRN
    name = Column(String, index=True)
    date_of_birth = Column(String, nullable=True) # Stored as YYYY-MM-DD
    gender = Column(String, nullable=True)
    treatment_status = Column(String)
    
    par_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    clinician = relationship("User", back_populates="patients")
    visits = relationship("Visit", back_populates="patient", cascade="all, delete")

class Visit(Base):
    __tablename__ = "visits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"))
    visit_date = Column(DateTime, default=datetime.utcnow)
    notes = Column(String, nullable=True)
    status = Column(String, default="Pre-Treatment")

    patient = relationship("Patient", back_populates="visits")
    scans = relationship("Scan", back_populates="visit", cascade="all, delete")
    par_scores = relationship("ParScore", back_populates="visit", cascade="all, delete")

class Scan(Base):
    __tablename__ = "scans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id", ondelete="CASCADE"))
    file_type = Column(String)
    object_key = Column(String)  # AWS S3 Path or local path
    status = Column(String, default="temp")  # "temp" = not yet persisted, "saved" = permanently stored
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    visit = relationship("Visit", back_populates="scans")
    landmarks = relationship("Landmark", back_populates="scan", cascade="all, delete")

class Landmark(Base):
    __tablename__ = "landmarks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id", ondelete="CASCADE"))
    point_name = Column(String, index=True)
    x = Column(Float)
    y = Column(Float)
    z = Column(Float)
    is_ai_predicted = Column(Boolean, default=False)

    scan = relationship("Scan", back_populates="landmarks")

class ParScore(Base):
    __tablename__ = "par_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id", ondelete="CASCADE"))
    upper_anterior_score = Column(Integer)
    lower_anterior_score = Column(Integer)
    buccal_occlusion_antero_posterior_score = Column(Integer)
    buccal_occlusion_transverse_score = Column(Integer)
    buccal_occlusion_vertical_score = Column(Integer)
    overjet_score = Column(Integer)
    overbite_score = Column(Integer)
    centreline_score = Column(Integer)
    # New breakdown fields
    overjet_points = Column(Integer, nullable=True)
    overbite_points = Column(Integer, nullable=True)
    centreline_points = Column(Integer, nullable=True)
    buccal_occlusion_score = Column(Integer, nullable=True)
    final_score = Column(Integer)
    calculated_at = Column(DateTime, default=datetime.utcnow)
    model_version = Column(String, nullable=True)

    visit = relationship("Visit", back_populates="par_scores")

class MLModel(Base):
    __tablename__ = "ml_models"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, index=True)
    version = Column(String, unique=True, index=True)
    file_path = Column(String) 
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

# ---------------------------------------------------------------------------
# Audit helpers
# ---------------------------------------------------------------------------

class AuditStatus(str, PyEnum):
    """Typed status values for AuditLog rows — avoids accidental string typos."""
    SUCCESS = "success"
    FAILURE = "failure"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id          = Column(Integer, primary_key=True, index=True)
    # Stored as timezone-aware UTC so comparisons are unambiguous
    timestamp   = Column(DateTime(timezone=True),
                         default=lambda: datetime.now(timezone.utc),
                         index=True)

    # Who
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_email  = Column(String, nullable=True)

    # What
    action      = Column(String, index=True)    # e.g. "PATIENT_CREATED"
    entity_type = Column(String, nullable=True)  # e.g. "patient"
    entity_id   = Column(String, nullable=True)  # UUID or int as string

    # Outcome
    status      = Column(String, default=AuditStatus.SUCCESS)
    summary     = Column(String, nullable=True)
    # JSON/JSONB: queryable server-side in postgres, e.g. WHERE details->>'patient_id' = '15'
    details     = Column(JSON().with_variant(JSONB, 'postgresql'), nullable=True)

    # Request context
    ip_address  = Column(String, nullable=True)
    user_agent  = Column(String, nullable=True)
    http_method = Column(String, nullable=True)  # "GET" | "POST" | ...
    endpoint    = Column(String, nullable=True)   # e.g. "/api/analysis/scans"

    # Composite index: covers the dominant query pattern
    #   WHERE user_id = ? ORDER BY timestamp DESC LIMIT N
    __table_args__ = (
        Index("ix_audit_logs_user_id_timestamp", "user_id", timestamp.desc()),
    )
