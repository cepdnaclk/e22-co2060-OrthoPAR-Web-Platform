# Clinical Automated PAR Index System

The **Clinical Automated PAR Index System** is a robust, web based software platform designed to automate the calculation of the Peer Assessment Rating (PAR) Index for orthodontic treatment. It replaces the conventional manual scoring process, which is time consuming, labor intensive, and subject to examiner variability with an objective, machine-learning powered solution suitable for real world clinical environments.

The platform supports the complete clinical workflow, including:

* **3D Scan Upload** — Clinicians upload STL dental scan files (upper arch, lower arch, buccal)
* **ML Landmark Extraction** — TensorFlow models automatically identify anatomical landmarks from 3D meshes
* **PAR Score Calculation** — Weighted clinical PAR scores are computed from the predicted landmarks
* **Patient Management** — Full CRUD operations for patients, scans, and historical PAR assessments
* **Secure Authentication** — JWT-based auth with role-based access for clinicians

## Key features

* **Automated ML Pipeline:** Upload an STL scan → ML extracts landmarks → PAR score is calculated automatically
* **Secure 3D Visualization:** Clinician friendly user interface for interacting with 3D dental models
* **Clinical Data Security:** Secure patient data storage with JWT authentication and password hashing
* **Scalable Architecture:** Built to support multi institution use and high volume clinical data
* **Rigorous Testing:** 16 automated tests including full ML integration tests with real clinical data

Built to transition existing research prototypes into a production ready system, this platform aims to significantly improve diagnostic consistency and objectivity while enabling large scale outcome analysis for the international orthodontic community.

---

## Setup & Installation

### Prerequisites

| Requirement | Purpose |
|---|---|
| **Python 3.10+** | Backend runtime |
| **Git LFS** | Downloads the ML model files (~120MB) and test STL scans |
| **PostgreSQL** (optional) | Production database — SQLite is used by default for development |

> [!IMPORTANT]
> **Git LFS is required.** The ML model files (`.h5`, ~40MB each) and test STL fixtures are stored using Git Large File Storage. Without Git LFS installed, you will get 136-byte pointer files instead of real models, and the ML pipeline will not work.

### Installation Steps

**Step 1: Install Git LFS** (one-time setup, skip if already installed)
```bash
# Install Git LFS (choose one method):
# Windows (with Git for Windows): Git LFS is often included. If not:
git lfs install

# macOS:
brew install git-lfs && git lfs install

# Ubuntu/Debian:
sudo apt install git-lfs && git lfs install
```

**Step 2: Clone the repository**
```bash
git clone https://github.com/cepdnaclk/e22-co2060-OrthoPAR-Web-Platform.git
cd e22-co2060-OrthoPAR-Web-Platform
```
> If Git LFS is installed, the `.h5` model files and `.stl` test fixtures will be downloaded automatically during clone.

**Step 3: Verify ML model files are real** (not LFS pointers)
```bash
# Each file should be ~40MB, NOT 136 bytes
ls -la code/backend/ml_models/

# If files are 136 bytes (LFS pointers), run:
git lfs pull
```

**Step 4: Set up Python Virtual Environment**
```bash
python -m venv venv

# Activate:
.\venv\Scripts\activate    # Windows
source venv/bin/activate   # Linux/Mac
```

**Step 5: Install Dependencies**
```bash
pip install -r code/backend/requirements.txt
```
> This installs TensorFlow, Trimesh, FastAPI, SQLAlchemy, and all other dependencies.

**Step 6: Configure Environment**
```bash
# Copy the example environment file
cp code/backend/.env.example code/backend/.env

# Edit code/backend/.env and set:
#   DATABASE_URL=sqlite:///./orthopar.db   (for local dev)
#   SECRET_KEY=your-secret-key-here
```

**Step 7: Run the Server**
```bash
uvicorn main:app --reload --app-dir code/backend
```
> On first startup, the server will:
> - Create all database tables automatically
> - Seed the ML model registry (so landmark extraction works immediately)
> - Be available at `http://127.0.0.1:8000`

---

## Running Tests

### Full Test Suite (16 tests)
```bash
pytest code/backend/tests/ -v -s
```

This runs:
- **6 unit tests** (`test_math.py`) — PAR score calculation with synthetic data
- **10 integration tests** (`test_ml_integration.py`) — Real STL → TensorFlow ML → PAR Score pipeline

> [!NOTE]
> The ML integration tests require real `.h5` model files and STL test fixtures. If these are missing (e.g., LFS not configured), the ML tests will auto-skip gracefully.

### Live E2E Test (requires running server)
```bash
# In one terminal: start the server
uvicorn main:app --app-dir code/backend

# In another terminal: run the E2E test
python code/backend/tests/live_e2e_ml_test.py
```
This runs the complete user workflow: Register → Login → Create Patient → Upload STLs → ML Extraction → PAR Score Calculation.

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Register a new clinician |
| POST | `/login` | No | Login and receive JWT token |
| GET | `/users/me` | Yes | Get current user info |
| POST | `/api/analysis/patients` | Yes | Create a patient |
| GET | `/api/analysis/patients` | Yes | List all patients |
| GET | `/api/analysis/patients/{id}` | Yes | Get patient with scans & scores |
| POST | `/api/analysis/scans` | Yes | Upload an STL scan |
| POST | `/api/analysis/landmarks/extract/{scan_id}` | Yes | Run ML landmark extraction |
| POST | `/api/analysis/landmarks/calculate/{patient_id}` | Yes | Calculate PAR score |

---

## Project Structure

```
code/backend/
├── main.py                  # FastAPI app entry point + ML model auto-seeding
├── models.py                # SQLAlchemy models (User, Patient, Scan, Landmark, ParScore, MLModel)
├── schemas.py               # Pydantic request/response schemas
├── auth.py                  # JWT authentication
├── config.py                # Environment configuration
├── database.py              # Database connection
├── storage.py               # File storage manager
├── crud.py                  # Database operations
├── app/
│   ├── ml_inference.py      # TensorFlow ML landmark prediction service
│   ├── calculator.py        # Clinical PAR score calculation logic
│   └── routes/
│       └── analysis.py      # Clinical API routes (patients, scans, landmarks, scores)
├── ml_models/               # TensorFlow .h5 model weights (Git LFS)
│   ├── upper_landmark_prediction_model.h5
│   ├── lower_landmark_prediction_model.h5
│   └── buccal_landmark_prediction_model.h5
└── tests/
    ├── test_math.py              # PAR calculation unit tests
    ├── test_ml_integration.py    # ML pipeline integration tests
    ├── live_e2e_ml_test.py       # Live API E2E test
    └── fixtures/                 # Real clinical STL scans (Git LFS)
        ├── upper.stl
        ├── lower.stl
        └── buccal.stl
```