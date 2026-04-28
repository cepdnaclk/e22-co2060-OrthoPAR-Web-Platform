import uuid
from database import get_db
import models
from datetime import datetime, timedelta

def seed_test_data():
    db = next(get_db())
    try:
        # Find first user
        user = db.query(models.User).first()
        if not user:
            print("No user found in DB. Please register first.")
            return
            
        # Clean up existing test data for Dakshi
        db.query(models.Patient).filter(models.Patient.name == "Dakshi").delete()
        db.commit()

        # 1. Create a Test Patient "Dakshi" linked to user
        patient = models.Patient(
            name="Dakshi",
            hospital_patient_id="D-12345",
            treatment_status="in_progress",
            clinician_id=user.id
        )
        db.add(patient)
        db.flush() 

        # 2. Create 3 Visits for Dakshi
        visit1 = models.Visit(patient_id=patient.id, visit_date=datetime.utcnow() - timedelta(days=90), notes="Initial consultation", status="Pre-Treatment")
        visit2 = models.Visit(patient_id=patient.id, visit_date=datetime.utcnow() - timedelta(days=45), notes="Mid-treatment check", status="In-Progress")
        visit3 = models.Visit(patient_id=patient.id, visit_date=datetime.utcnow(), notes="Recent follow-up", status="In-Progress")
        
        db.add_all([visit1, visit2, visit3])
        db.flush()

        # 3. Create 3 PAR Scores for these visits
        score1 = models.ParScore(
            visit_id=visit1.id,
            upper_anterior_score=2, lower_anterior_score=2,
            buccal_occlusion_antero_posterior_score=2, buccal_occlusion_transverse_score=1,
            buccal_occlusion_vertical_score=1, overjet_score=0,
            overbite_score=0, centreline_score=0,
            final_score=8, 
            model_version="v0.9.5",
            calculated_at=visit1.visit_date
        )
        
        score2 = models.ParScore(
            visit_id=visit2.id,
            upper_anterior_score=5, lower_anterior_score=5,
            buccal_occlusion_antero_posterior_score=4, buccal_occlusion_transverse_score=4,
            buccal_occlusion_vertical_score=2, overjet_score=1,
            overbite_score=1, centreline_score=0,
            final_score=22, 
            model_version="v1.0.0",
            calculated_at=visit2.visit_date
        )

        score3 = models.ParScore(
            visit_id=visit3.id,
            upper_anterior_score=8, lower_anterior_score=8,
            buccal_occlusion_antero_posterior_score=6, buccal_occlusion_transverse_score=6,
            buccal_occlusion_vertical_score=4, overjet_score=2,
            overbite_score=0, centreline_score=0,
            final_score=34, 
            model_version="v1.0.0",
            calculated_at=visit3.visit_date
        )

        db.add_all([score1, score2, score3])
        db.commit()
        print(f"Successfully seeded 3 reports for patient Dakshi linked to user {user.email}")

    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_test_data()
