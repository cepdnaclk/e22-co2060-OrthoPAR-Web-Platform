from sqlalchemy import Column, String, Float, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import datetime
from database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, index=True)
    treatment_status = Column(String)
    par_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    scans = relationship("Scan", back_populates="patient", cascade="all, delete")
    par_scores = relationship("ParScore", back_populates="patient", cascade="all, delete")

class Scan(Base):
    __tablename__ = "scans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"))
    file_type = Column(String)
    object_key = Column(String)  # AWS S3 Path
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="scans")
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
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"))
    upper_anterior_score = Column(Integer)
    lower_anterior_score = Column(Integer)
    buccal_occlusion_antero_posterior_score = Column(Integer)
    buccal_occlusion_transverse_score = Column(Integer)
    buccal_occlusion_vertical_score = Column(Integer)
    overjet_score = Column(Integer)
    overbite_score = Column(Integer)
    centreline_score = Column(Integer)
    final_score = Column(Integer)
    calculated_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="par_scores")
