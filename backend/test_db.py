#Coded by Team Nai Miris

from database import SessionLocal, engine
from models import Base, Patient, Assessment

#Initialising tables
print("Creating Tables")
Base.metadata.create_all(bind=engine)

#Starting a session
db = SessionLocal()

#Creating a fake patient
new_patient = Patient(clinic_id="TEST-PATIENT-001")
db.add(new_patient)
db.commit()
db.refresh(new_patient)

print(f"Created Patient with ID: {new_patient.id}")

#Adding a fake assesment with JSON data
fake_landmarks = {
    "UR1": [10.5, 20.2, 5.0],
    "UL1": [12.5, 20.1, 5.1]
}

new_scan = Assessment(
    patient_id =new_patient.id,
    file_path="/tmp/scan.obj",
    par_score=14.5,
    landmarks=fake_landmarks,
    is_verified=False
)

db.add(new_scan)
db.commit()

print("Sucessfully saved Patient and Assessment to the DB")
db.close()
