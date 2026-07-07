import os
import zipfile
import tempfile
import threading
from io import BytesIO
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, get_db
import models
import auth
from config import SECRET_KEY, ALGORITHM
from jose import jwt

# Use the test database engine directly for TestClient, or just let it use the current DB since it's a test environment anyway.
# We will create an admin user and a normal user for testing.

client = TestClient(app)

def create_test_token(email: str, is_admin: bool):
    # We mock the database user creation for tests, or just insert them.
    db = next(get_db())
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = models.User(
            email=email,
            full_name="Test User",
            hashed_password="fake",
            is_admin=is_admin
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    return auth.create_access_token(data={"sub": email})

def test_rbac():
    print("Running RBAC Test...")
    admin_token = create_test_token("admin@test.com", True)
    user_token = create_test_token("user@test.com", False)
    
    # Test as admin
    resp = client.get("/api/ml-models", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200, "Admin should access /api/ml-models"
    
    # Test as normal user
    resp = client.get("/api/ml-models", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 403, "Non-admin should be rejected (403)"
    print("RBAC Test Passed!")

def create_zip_in_memory(files: dict, malicious_path=False) -> BytesIO:
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        for file_name, data in files.items():
            if malicious_path:
                zip_file.writestr(f"../../{file_name}", data)
            else:
                zip_file.writestr(file_name, data)
    zip_buffer.seek(0)
    return zip_buffer

def test_zip_path_traversal():
    print("Running Zip Path Traversal Test...")
    admin_token = create_test_token("admin@test.com", True)
    
    # Create malicious zip
    malicious_zip = create_zip_in_memory({"evil.h5": b"bad data"}, malicious_path=True)
    
    files = {"file": ("malicious.zip", malicious_zip, "application/zip")}
    data = {"name": "Malicious Model", "version": "v9.9.9"}
    
    resp = client.post(
        "/api/ml-models/upload", 
        headers={"Authorization": f"Bearer {admin_token}"},
        data=data, 
        files=files
    )
    assert resp.status_code == 400, "Should reject malicious zip"
    assert "Illegal path in zip" in resp.json()["detail"]
    print("Zip Path Traversal Test Passed!")

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    test_rbac()
    test_zip_path_traversal()
    print("All immediate tests passed!")
