"""
Live E2E ML Test — OrthoPAR
============================
Tests the COMPLETE user workflow through the running API server:
  Register -> Login -> Create Patient -> Upload 3 STLs -> 
  Extract Landmarks (ML) -> Calculate PAR Score

This is not a pytest — it's a standalone script that hits the live server.
Requires: server running at http://127.0.0.1:8000
"""

import requests
import os
import sys
import uuid
import time

BASE_URL = "http://127.0.0.1:8000"
FIXTURES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")

def separator(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def run():
    results = {}
    
    # ============================================
    # STEP 1: Register a user
    # ============================================
    separator("STEP 1: Register User")
    email = f"ml_test_{uuid.uuid4().hex[:6]}@clinic.com"
    password = "MLTestPass123!"
    
    resp = requests.post(f"{BASE_URL}/register", json={
        "email": email,
        "full_name": "ML Test Clinician",
        "password": password
    })
    print(f"  Status: {resp.status_code}")
    print(f"  Email: {email}")
    results["register"] = resp.status_code == 200
    assert resp.status_code == 200, f"Registration failed: {resp.text}"

    # ============================================
    # STEP 2: Login and get JWT token
    # ============================================
    separator("STEP 2: Login")
    resp = requests.post(f"{BASE_URL}/login", data={
        "username": email,
        "password": password
    })
    print(f"  Status: {resp.status_code}")
    token = resp.json()["access_token"]
    print(f"  Token: {token[:30]}...")
    headers = {"Authorization": f"Bearer {token}"}
    results["login"] = resp.status_code == 200

    # ============================================
    # STEP 3: Create a patient
    # ============================================
    separator("STEP 3: Create Patient")
    resp = requests.post(f"{BASE_URL}/api/analysis/patients", json={
        "name": "Patient 73 (Real Clinical Data)",
        "treatment_status": "Pre-treatment"
    }, headers=headers)
    print(f"  Status: {resp.status_code}")
    patient = resp.json()
    patient_id = patient["id"]
    print(f"  Patient ID: {patient_id}")
    print(f"  Name: {patient['name']}")
    results["create_patient"] = resp.status_code == 200

    # ============================================
    # STEP 4: Upload 3 real STL scans
    # ============================================
    scan_ids = {}
    scan_types = [
        ("Upper Arch Segment", "upper.stl"),
        ("Lower Arch Segment", "lower.stl"),
        ("Buccal Segment", "buccal.stl")
    ]
    
    for file_type, filename in scan_types:
        separator(f"STEP 4: Upload {file_type}")
        filepath = os.path.join(FIXTURES_DIR, filename)
        filesize_mb = os.path.getsize(filepath) / (1024*1024)
        print(f"  File: {filename} ({filesize_mb:.1f} MB)")
        
        with open(filepath, "rb") as f:
            resp = requests.post(
                f"{BASE_URL}/api/analysis/scans",
                params={"patient_id": patient_id, "file_type": file_type},
                files={"file": (filename, f, "application/octet-stream")},
                headers=headers
            )
        print(f"  Status: {resp.status_code}")
        scan = resp.json()
        scan_ids[file_type] = scan["id"]
        print(f"  Scan ID: {scan['id']}")
        results[f"upload_{filename}"] = resp.status_code == 200

    # ============================================
    # STEP 5: Extract landmarks via ML for each scan
    # ============================================
    all_landmarks = {}
    for file_type, scan_id in scan_ids.items():
        separator(f"STEP 5: ML Landmark Extraction - {file_type}")
        print(f"  Scan ID: {scan_id}")
        print(f"  Running TensorFlow inference... (this takes a few seconds)")
        
        start = time.time()
        resp = requests.post(
            f"{BASE_URL}/api/analysis/landmarks/extract/{scan_id}",
            headers=headers
        )
        elapsed = time.time() - start
        
        print(f"  Status: {resp.status_code}")
        print(f"  Time: {elapsed:.1f}s")
        
        if resp.status_code == 200:
            landmarks = resp.json()
            all_landmarks[file_type] = landmarks
            print(f"  Landmarks extracted: {len(landmarks)}")
            
            # Print first 3 landmarks as sample
            for lm in landmarks[:3]:
                print(f"    - {lm['point_name']}: ({lm['x']:.3f}, {lm['y']:.3f}, {lm['z']:.3f})"
                      f" [AI={lm['is_ai_predicted']}]")
            if len(landmarks) > 3:
                print(f"    ... and {len(landmarks)-3} more")
        else:
            print(f"  ERROR: {resp.text}")
        
        results[f"extract_{file_type}"] = resp.status_code == 200

    # ============================================
    # STEP 6: Calculate PAR Score
    # ============================================
    separator("STEP 6: Calculate PAR Score")
    print(f"  Patient ID: {patient_id}")
    print(f"  Computing weighted PAR score from all landmarks...")
    
    resp = requests.post(
        f"{BASE_URL}/api/analysis/landmarks/calculate/{patient_id}",
        headers=headers
    )
    print(f"  Status: {resp.status_code}")
    
    if resp.status_code == 200:
        scores = resp.json()
        print(f"\n  {'Component':<45} {'Score':>5}")
        print(f"  {'-'*50}")
        print(f"  {'Upper Anterior Score':<45} {scores['upper_anterior_score']:>5}")
        print(f"  {'Lower Anterior Score':<45} {scores['lower_anterior_score']:>5}")
        print(f"  {'Buccal Occlusion AP Score':<45} {scores['buccal_occlusion_antero_posterior_score']:>5}")
        print(f"  {'Buccal Occlusion Transverse Score':<45} {scores['buccal_occlusion_transverse_score']:>5}")
        print(f"  {'Buccal Occlusion Vertical Score':<45} {scores['buccal_occlusion_vertical_score']:>5}")
        print(f"  {'Overjet Score (x6 weight)':<45} {scores['overjet_score']:>5}")
        print(f"  {'Overbite Score (x2 weight)':<45} {scores['overbite_score']:>5}")
        print(f"  {'Centreline Score (x4 weight)':<45} {scores['centreline_score']:>5}")
        print(f"  {'='*50}")
        print(f"  {'FINAL PAR SCORE':<45} {scores['final_score']:>5}")
        print(f"\n  Model Version: {scores.get('model_version', 'N/A')}")
        print(f"  Calculated At: {scores.get('calculated_at', 'N/A')}")
        print(f"  Is Partial: {scores.get('is_partial', 'N/A')}")
    else:
        print(f"  ERROR: {resp.text}")
    
    results["par_score"] = resp.status_code == 200

    # ============================================
    # STEP 7: Verify patient record was updated
    # ============================================
    separator("STEP 7: Verify Patient Record")
    resp = requests.get(
        f"{BASE_URL}/api/analysis/patients/{patient_id}",
        headers=headers
    )
    patient_final = resp.json()
    print(f"  Patient: {patient_final['name']}")
    print(f"  PAR Score on record: {patient_final['par_score']}")
    print(f"  Total scans: {len(patient_final['scans'])}")
    for scan in patient_final['scans']:
        print(f"    - {scan['file_type']}: {len(scan['landmarks'])} landmarks")
    print(f"  Total PAR assessments: {len(patient_final['par_scores'])}")
    results["verify_patient"] = patient_final['par_score'] is not None and patient_final['par_score'] > 0

    # ============================================
    # FINAL REPORT
    # ============================================
    separator("FINAL REPORT")
    all_passed = True
    for step, passed in results.items():
        status = "PASSED" if passed else "FAILED"
        if not passed:
            all_passed = False
        print(f"  [{status}] {step}")
    
    print(f"\n  {'='*50}")
    if all_passed:
        print(f"  ALL STEPS PASSED - ML PIPELINE IS FULLY OPERATIONAL")
    else:
        print(f"  SOME STEPS FAILED - SEE ABOVE FOR DETAILS")
    print(f"  {'='*50}")

if __name__ == "__main__":
    run()
