#Coded by Team Nai Miris

from database import SessionLocal
from models import Patient, Assessment

#function to check if patient exists and is recorded
def check():
    db = SessionLocal()

    print("Checking Database")

    #quering for the first patient created in test_db.py
    #.first() returns the first match if exists or None if not

    patient = db.query(Patient).filter(Patient.clinic_id == "TEST-PATIENT-001").first()

    if patient:
        print(f"Found Patient: {patient.clinic_id} (ID: {patient.id})")

        for scan in patient.assessments:
            print(f"    Found Scan: {scan.file_path}")
            print(f"    Par Score: {scan.par_score}")
            print(f"    Landmarks: {scan.landmarks}")
    
    else:
        print("No patient test data found. Run test_db.py")
    
    db.close()

#function to delete a patient record
def clean():
    print("Cleaning up")

    db = SessionLocal()

    print("Checking Database")

    patient = db.query(Patient).filter(Patient.clinic_id == "TEST-PATIENT-001").first()

    if patient:
        #Deleting assessments first
        num_scans = db.query(Assessment).filter(Assessment.patient_id == patient.id).delete()
        print(f"    Deleyed {num_scans} assesments.")

        #delete the patient
        db.delete(patient)
        db.commit()
        print(f"    Deleted Patient: {patient.clinic_id}")
    
    else:
        print("No patient test data found. Run test_db.py")

    db.close()

if __name__ == "__main__":
    check()
    #clean()

