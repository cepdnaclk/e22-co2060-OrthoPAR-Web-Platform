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

### 4. ML Model Readiness

The `landmarks` table now has an `is_ai_predicted` boolean flag. In the future, once the ML model is trained (e.g., `model.pth`), you can easily add an endpoint in this FastAPI app that receives an `.stl` file, runs an inference script directly against the model weights to extract the 3D points, and saves them to the database as "AI predicted" points before showing them on the frontend.

## Testing Setup

We highly recommend running your integration tests locally without having to tear down and rebuild Docker databases constantly.
Therefore, `tests/test_api.py` uses an **in-memory SQLite database** mapping instead of the Dockerized PostgreSQL database. This allows Pytest to execute lightning-fast and run fully isolated on any developer's machine, validating the API application logic strictly without relying on heavy external infrastructure dependencies.

To run the tests locally, ensure you have the dev dependencies installed and execute `pytest`:

```bash
# Install testing dependencies
pip install -r requirements-dev.txt

# Run the test suite from the backend directory
pytest tests/
```

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
