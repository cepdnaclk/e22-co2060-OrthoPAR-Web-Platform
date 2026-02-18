#Coded by Team Nai Miris

#sqlalchemy acts as the interface between us and postgres
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime, Boolean
#ML Landmarks are stored in JSONB
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

#Patient Model
class Patient(Base):
    #Name of the table inside Postgres
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.now)

    #Creates a link between Patient object and their assesssments(scans)
    assessments = relationship("Assessment", back_populates="patient")


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    #links to the patients table
    patient_id = Column(Integer, ForeignKey("patients.id"))

    file_path = Column(String, nullable=False)
    par_score =  Column(Float)
    landmarks = Column(JSONB)

    #Records if manual override occured
    is_verified = Column(Boolean, default=False)

    patient = relationship("Patient", back_populates="assessments")