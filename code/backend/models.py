from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UUID, Float, Boolean
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String)
    
    # Clinical Affiliation Data
    hospital_name = Column(String, nullable=True)
    slmc_registration_number = Column(String, nullable=True)
    specialty = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)

    models = relationship("Model", back_populates="owner")
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
