import requests
import os

# Configuration
BASE_URL = "http://127.0.0.1:8000"  # Adjust if port is different
REGISTER_URL = f"{BASE_URL}/register"
LOGIN_URL = f"{BASE_URL}/login"
UPLOAD_URL = f"{BASE_URL}/models/upload"

TEST_USER = {
    "email": "testuser_upload@example.com",
    "full_name": "Test User",
    "password": "testpassword123"
}

def run_test():
    # 1. Register User
    print("Registering user...")
    resp = requests.post(REGISTER_URL, json=TEST_USER)
    if resp.status_code != 200 and "already registered" not in resp.text:
        print(f"Registration failed: {resp.text}")
        return

    # 2. Login to get token
    print("Logging in...")
    resp = requests.post(LOGIN_URL, data={"username": TEST_USER["email"], "password": TEST_USER["password"]})
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create a dummy .stl file
    test_file_name = "test_model.stl"
    with open(test_file_name, "w") as f:
        f.write("solid dummy_model\nendsolid dummy_model")

    # 4. Upload file
    print("Uploading file...")
    with open(test_file_name, "rb") as f:
        files = {"file": (test_file_name, f, "application/sla")}
        resp = requests.post(UPLOAD_URL, headers=headers, files=files)
    
    print(f"Upload Status: {resp.status_code}")
    print(f"Upload Response: {resp.json()}")

    # Cleanup local test file
    if os.path.exists(test_file_name):
        os.remove(test_file_name)

if __name__ == "__main__":
    print("Note: Ensure the FastAPI server is running before executing this test.")
    try:
        run_test()
    except Exception as e:
        print(f"Test failed: {e}")
