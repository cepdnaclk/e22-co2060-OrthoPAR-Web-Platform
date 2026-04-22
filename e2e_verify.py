import requests
import os

BASE_URL = "http://127.0.0.1:8000"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0QGNsaW5pYy5jb20iLCJleHAiOjE3NzY4Njg0MDh9.EhWcpohuInE5qa9Rp2mN3vASlhWR-G_UZ9cfXSVtkS8"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}

def verify():
    # Step 5: Create Patient
    print("\n--- Step 5: Create Patient ---")
    patient_data = {"name": "John Doe", "treatment_status": "in_progress"}
    resp = requests.post(f"{BASE_URL}/api/analysis/patients", json=patient_data, headers=HEADERS)
    if resp.status_code != 200:
        print(f"FAILED: {resp.status_code} {resp.text}")
        return
    patient_id = resp.json()["id"]
    print(f"SUCCESS: Patient ID = {patient_id}")

    # Step 6: Upload Scan
    print("\n--- Step 6: Upload Scan ---")
    stl_path = "test_files/test_upper.stl"
    with open(stl_path, "rb") as f:
        files = {"file": (os.path.basename(stl_path), f, "application/octet-stream")}
        params = {"patient_id": patient_id, "file_type": "Upper Arch Segment"}
        resp = requests.post(f"{BASE_URL}/api/analysis/scans", files=files, params=params, headers=HEADERS)
    
    if resp.status_code != 200:
        print(f"FAILED: {resp.status_code} {resp.text}")
        return
    scan_id = resp.json()["id"]
    print(f"SUCCESS: Scan ID = {scan_id}")

    # Step 7: ML Extraction
    print("\n--- Step 7: ML Extraction ---")
    resp = requests.post(f"{BASE_URL}/api/analysis/landmarks/extract/{scan_id}", headers=HEADERS)
    if resp.status_code != 200:
        print(f"FAILED Step 7: {resp.status_code} {resp.text}")
        print("Skipping Step 8 (Calculation) as it depends on landmarks.")
    else:
        landmarks = resp.json()
        print(f"SUCCESS: Extracted {len(landmarks)} landmarks")
        bm_bd = [lm["point_name"] for lm in landmarks if "BM" in lm["point_name"] or "BD" in lm["point_name"]]
        print(f"Confirmed naming convention check (BM/BD found): {len(bm_bd) > 0}")

        # Step 8: Calculate PAR Score
        print("\n--- Step 8: Calculate PAR Score ---")
        resp = requests.post(f"{BASE_URL}/api/landmarks/calculate/{patient_id}", headers=HEADERS)
        if resp.status_code != 200:
            print(f"FAILED Step 8: {resp.status_code} {resp.text}")
        else:
            result = resp.json()
            print(f"SUCCESS: Final Score = {result['final_score']}")
            print(f"Is Partial: {result.get('is_partial', False)}")

    # Step 9: Security Check
    print("\n--- Step 9: Security Check ---")
    # Register test2
    requests.post(f"{BASE_URL}/register", json={"email": "test2@clinic.com", "full_name": "Test2", "password": "TestPass456!"})
    # Login test2
    login_data = {"username": "test2@clinic.com", "password": "TestPass456!"}
    resp = requests.post(f"{BASE_URL}/login", data=login_data)
    token2 = resp.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # Attempt to access Patient 1
    resp = requests.get(f"{BASE_URL}/api/analysis/patients/{patient_id}", headers=headers2)
    print(f"Status Code for unauthorized access: {resp.status_code}")
    print(f"Response Body: {resp.text}")
    if resp.status_code == 404:
        print("SECURITY VERIFIED: Unauthorized access returned 404.")
    else:
        print("SECURITY FAILURE: Unauthorized access did not return 404.")

if __name__ == "__main__":
    verify()
