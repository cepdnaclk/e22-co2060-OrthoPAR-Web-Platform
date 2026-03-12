# e22_backend: FastAPI Migration

This repository contains the newly migrated backend architecture for the **Machine-Learning-Based Automated PAR Index Calculation Tool**.

## Why We Re-Architected

The original backend was built with Java and Spring Boot. Because this project's primary goal is to eventually integrate a Machine Learning model (which are predominantly developed in Python using frameworks like PyTorch or TensorFlow), maintaining a Java backend added unnecessary communication layers and environment complexity.

By rebuilding the backend in **Python via FastAPI**, we can deploy and run the ML models natively matching the server language, making the application horizontally scalable and significantly easier to maintain.

## What Changed?

### 1. The API Framework (FastAPI)

The backend is now an asynchronous Python web server using FastAPI. All previous Spring Boot endpoints have been mapped correctly.

- `api/patients.py`: CRUD endpoints for patient records.
- `api/scans.py`: Endpoints for uploading and fetching `.stl` jaw scans.
- `api/landmarks.py`: Endpoints for saving the coordinate points (landmarks) and triggering the PAR score calculation.

### 2. Database Paradigm (PostgreSQL + S3)

The old architecture stored the large, GZip compressed, base64-encoded `.stl` 3D files directly into the SQL Database. This is a common anti-pattern that causes relational databases to bloat in size quickly, destroying query performance.
We have split the storage strategy:

- **Relational Data**: Patient details, PAR scores, and (x, y, z) coordinate point locations are stored in a clean **PostgreSQL** database (see `models.py` and `schemas.py`).
- **Binary Data (Files)**: The heavy 3D `.stl` files uploaded by the frontend are seamlessly streamed into an **AWS S3 Bucket** via `boto3`. The PostgreSQL database only saves the S3 object key/link to find the file later.

### 3. Euclidean Geometric Math Translation

The Euclidean geometry algorithms responsible for calculating the PAR Index score (measuring Overjet distance, clipping boundaries for crossbites, finding occlusal midpoints, etc.) were deeply embedded in the Java `ParScoreService`. These have been fully translated into modular python functions inside `services/par_score_service.py`.

### 4. ML Model Integration
The backend now features a fully integrated ML pipeline for landmark extraction and PAR calculation:
- **Database-Driven Selection**: Active models are queried from the `ml_models` table, allowing for dynamic updates without code changes.
- **Transparent GZIP Loading**: Support for `.stl.gz` clinical scans via a streaming decompression pipeline.
- **Inference Performance**: Validated at **4.35s** per patient (Upper + Lower + Buccal), significantly outperforming the 10s clinical requirement.
- **Reproducibility**: Every PAR score record is linked to a specific `model_version` for audit trails.
- **Infrastructure Resilience**: Uses `sqlalchemy.Uuid` for PostgreSQL parity and in-memory SQLite for high-velocity testing.

## Setup and Testing Guide (for New Users)

### Prerequisites
- **Python 3.10 - 3.12 (Recommended)**: Using a stable version ensures pre-compiled wheels are available.
- **Python 3.14+ (Experimental)**: May require a Rust compiler (Cargo) to build some dependencies from source.

### 1. Pull the Refactored Branch
Ensure you have the latest changes and pull the large files:
```bash
git checkout refactored-backend-with-ml
git pull origin refactored-backend-with-ml
git lfs pull
```

### 2. Environment Setup
From the project root, activate the virtual environment and install all necessary dependencies:
```bash
# Activate the virtual environment (Windows)
.\venv\Scripts\activate

# Install backend and dev dependencies
pip install -r code/e22_backend/requirements.txt -r code/e22_backend/requirements-dev.txt
```

#### Troubleshooting "Rust" or "pydantic-core" errors:
If you see an error mentioning `pydantic-core` or `Rust`, it means your Python version is too new for the pinned versions in `requirements.txt`. You can fix this by installing the latest versions instead:
```bash
# Install the latest versions (ignores pins)
pip install fastapi uvicorn sqlalchemy pydantic pydantic-settings alembic python-multipart boto3 pytest pytest-asyncio httpx
```

### 3. Run the Tests
You can run all tests or specify a particular test file. The `-v` flag provides verbose output, and `-s` allows print statements to show in the console.

```bash
# Run all backend tests
pytest code/e22_backend/tests/ -v -s

# Run only math-specific tests
pytest code/e22_backend/tests/test_math.py -v -s

# Run ML Integration & Real Data Validation (Set 1 & Set 2)
# Ensure you are using the ML-capable virtual environment
$env:DATABASE_URL="sqlite:///./test_ml.db"; pytest code/e22_backend/tests/test_ml_integration.py -v -s
```

### 4. Clinical Validation Results
When running the ML integration tests, the system generates JSON artifacts in the project root:
- `real_data_landmarks_artifact.json`: Coordinate results for Set 1 (Patient 73).
- `real_data_landmarks_artifact_set2.json`: Coordinate results for Set 2 (Patient 80).

These artifacts contain extracted 3D landmarks that can be used for visual anatomical verification.

## How to Run

We use Docker Compose to orchestrate both the PostgreSQL database container and the FastAPI app container.

```bash
# Build and start the environment
docker-compose up -d --build

# View logs
docker-compose logs -f backend
```

Once running, you can access the interactive API Swagger Documentation at:
`http://localhost:8000/docs`
