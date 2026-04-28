from database import get_db
import models
from app.routes.analysis import get_reports
from unittest.mock import MagicMock

db = next(get_db())
try:
    # Mimic a user
    user = db.query(models.User).filter(models.User.email == "dakshayaniramanesh@gmail.com").first()
    if not user:
        print("User not found")
    else:
        # Manually run the query logic from get_reports
        results = db.query(
            models.ParScore, 
            models.Patient.name.label("patient_name"),
            models.Patient.id.label("patient_id"),
            models.Patient.hospital_patient_id.label("hospital_patient_id"),
            models.Visit.notes.label("visit_notes"),
            models.Visit.visit_date.label("visit_date")
        ).join(
            models.Visit, models.ParScore.visit_id == models.Visit.id
        ).join(
            models.Patient, models.Visit.patient_id == models.Patient.id
        ).filter(
            models.Patient.clinician_id == user.id
        ).order_by(models.ParScore.calculated_at.desc()).all()
        
        print(f"Found {len(results)} reports for user {user.email}")
        for row in results:
            par = row[0]
            print(f"- Patient: {row.patient_name}, Date: {par.calculated_at}, Score: {par.final_score}")
finally:
    db.close()
