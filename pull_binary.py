import subprocess
import os

def pull_binary_file(branch, remote_path, local_path):
    print(f"Pulling {remote_path} to {local_path}...")
    try:
        # Use subprocess with stdout capture and write in binary mode
        cmd = ["git", "show", f"{branch}:{remote_path}"]
        result = subprocess.run(cmd, capture_output=True, check=True)
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, "wb") as f:
            f.write(result.stdout)
        print(f"Success: {local_path}")
    except Exception as e:
        print(f"Failed to pull {remote_path}: {e}")

if __name__ == "__main__":
    branch = "refactored-backend-with-ml"
    files = [
        ("code/e22_backend/ml_models/buccal_landmark_prediction_model.h5", "code/backend/ml_models/buccal_landmark_prediction_model.h5"),
        ("code/e22_backend/ml_models/lower_landmark_prediction_model.h5", "code/backend/ml_models/lower_landmark_prediction_model.h5"),
        ("code/e22_backend/ml_models/upper_landmark_prediction_model.h5", "code/backend/ml_models/upper_landmark_prediction_model.h5"),
        ("code/e22_backend/tests/clinical_data/set1/orthodontics_73_upper.stl", "test_files/test_upper.stl")
    ]
    
    for remote, local in files:
        pull_binary_file(branch, remote, local)
