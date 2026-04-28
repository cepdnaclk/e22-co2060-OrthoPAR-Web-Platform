# Clinical Automated PAR Index System

The **Clinical Automated PAR Index System** is a robust, web based software platform designed to automate the calculation of the Peer Assessment Rating (PAR) Index for orthodontic treatment. It replaces the conventional manual scoring process, which is time consuming, labor intensive, and subject to examiner variability with an objective, machine-learning powered solution suitable for real world clinical environments.

The platform supports the complete clinical workflow, including:

- **3D Scan Upload** — Clinicians upload STL dental scan files (upper arch, lower arch, buccal)
- **ML Landmark Extraction** — TensorFlow models automatically identify anatomical landmarks from 3D meshes
- **PAR Score Calculation** — Weighted clinical PAR scores are computed from the predicted landmarks
- **Patient Management** — Full CRUD operations for patients, scans, and historical PAR assessments
- **Secure Authentication** — JWT-based auth with role-based access for clinicians

## Key features

- **Automated ML Pipeline:** Upload an STL scan → ML extracts landmarks → PAR score is calculated automatically
- **Secure 3D Visualization:** Clinician friendly user interface for interacting with 3D dental models
- **Clinical Data Security:** Secure patient data storage with JWT authentication and password hashing
- **Scalable Architecture:** Built to support multi institution use and high volume clinical data
- **Rigorous Testing:** 16 automated tests including full ML integration tests with real clinical data

Built to transition existing research prototypes into a production ready system, this platform aims to significantly improve diagnostic consistency and objectivity while enabling large scale outcome analysis for the international orthodontic community.

---

## 🚀 Docker Deployment (Recommended)

The platform is fully containerized across three isolated networks to eliminate OS and Python version discrepancies. This is the **strongly recommended** approach for both local visualization and production mapping.

### Quick Start with Docker

Ensure you have [Docker Desktop](https://www.docker.com/) running locally.

```bash
# 1. Clone the repository natively
git clone https://github.com/cepdnaclk/e22-co2060-OrthoPAR-Web-Platform.git
cd e22-co2060-OrthoPAR-Web-Platform

# 2. Build and launch the full ecosystem in the background
docker compose up -d --build
```

> The React Dashboard is now securely available at `http://localhost:5173`.
> The backend runs internally via Uvicorn, and PostgreSQL initializes natively inside an attached Docker volume!

---

## 💻 Manual Setup & Installation (Local Development)

### Prerequisites

| Requirement        | Purpose                                                                             |
| ------------------ | ----------------------------------------------------------------------------------- |
| **Python 3.12**    | Backend runtime (**Strictly 3.12**; TensorFlow ML dependencies will crash on 3.14+) |
| **Node 18+ (npm)** | Frontend React Native UI architecture compilation                                   |
| **Git LFS**        | Downloads the ML model files (~120MB) and test STL scans                            |
| **PostgreSQL**     | Docker handles this dynamically, but required if running bare-metal                 |

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

**Step 4: Set up Python Virtual Environment (Python 3.12 Required)**

```bash
python -m venv venv_ml

# Activate:
.\venv_ml\Scripts\activate    # Windows
source venv_ml/bin/activate   # Linux/Mac
```

**Step 5: Install Dependencies**

```bash
pip install -r code/backend/requirements.txt
```

> This installs TensorFlow, Trimesh, FastAPI, SQLAlchemy, and Authentication packages.

**Step 6: Configure Environment**

```bash
# Copy the example environment file
cp code/backend/.env.example code/backend/.env

# Create the root .env file
echo "DATABASE_URL=sqlite:///./orthopar.db" > .env
```

**Step 7: Run the Backend Server**

```bash
uvicorn main:app --reload --app-dir code/backend
```

**Step 8: Run the React Frontend (Separate Terminal)**

```bash
cd code/frontend
npm install
npm run dev
```

> The full UI Dashboard will load at `http://localhost:5173`.

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

| Method | Endpoint                                         | Auth | Description                     |
| ------ | ------------------------------------------------ | ---- | ------------------------------- |
| POST   | `/register`                                      | No   | Register a new clinician        |
| POST   | `/login`                                         | No   | Login and receive JWT token     |
| GET    | `/users/me`                                      | Yes  | Get current user info           |
| POST   | `/api/analysis/patients`                         | Yes  | Create a patient                |
| GET    | `/api/analysis/patients`                         | Yes  | List all patients               |
| GET    | `/api/analysis/patients/{id}`                    | Yes  | Get patient with scans & scores |
| POST   | `/api/analysis/scans`                            | Yes  | Upload an STL scan              |
| POST   | `/api/analysis/landmarks/extract/{scan_id}`      | Yes  | Run ML landmark extraction      |
| POST   | `/api/analysis/landmarks/calculate/{patient_id}` | Yes  | Calculate PAR score             |

---

## Project Structure

```
.
├── docker-compose.yml       # Global Multi-Container Orchestration definition
├── code/backend/
│   ├── Dockerfile           # Python 3.12-slim FastAPI specifications
│   ├── main.py              # FastAPI app entry point + ML model auto-seeding
│   ├── models.py            # SQLAlchemy models (User, Patient, Scan, Landmark, ParScore)
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── auth.py              # JWT authentication & password hashing
│   ├── database.py          # PostgreSQL/SQLite hybrid connection
│   ├── app/
│   │   ├── ml_inference.py  # TensorFlow ML landmark prediction layer
│   │   ├── calculator.py    # Clinical PAR score calculation logic
│   │   └── routes/          # RESTful feature API bindings
│   ├── ml_models/           # TensorFlow .h5 model weights (Git LFS)
│   └── tests/               # Pytest suite testing Math invariants & API mocking
└── code/frontend/
    ├── Dockerfile           # Node compilation -> NGINX Alpine routing deployment
    ├── package.json         # React Vite Dependency Ledger
    └── src/
        ├── App.jsx          # React Router centralized navigation hierarchy
        ├── components/
        │   └── ThreeViewer.jsx  # Complex Auto-Scaling Three.js STL & Pointcloud grid
        ├── pages/           # Dedicated analytical workflows (Dashboard, Studio, Auth)
        └── utils/api.js     # Axios/Fetch bindings synchronizing UI to backend
```
