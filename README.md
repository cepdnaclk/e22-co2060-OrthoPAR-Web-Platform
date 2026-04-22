# Clinical Automated PAR Index System

The **Clinical Automated PAR Index System** is a robust, web based software platform designed to automate the calculation of the Peer Assessment Rating (PAR) Index for orthodontic treatment. It replaces the conventional manual scoring process,which is time consuming, labor intensive, and subject to examiner variability with an objective, machine-learning powered solution suitable for real world clinical environments.

The platform supports the complete assessment workflow, including:

* student registration
* supervisor assignment
* research proposal submission and approvals
* periodic progress reviews
* ethics clearance tracking
* thesis submission and examination management

Role based access ensures clear separation of views and responsibilities for postgraduate students, supervisors, coordinators, and faculty administrators.

## Key features

* **Secure 3D Visualization:** Clinician friendly user interface for interacting with 3D dental models.
* **Automated MLOps:** Pipelines for continuous model retraining, versioning, and validation.
* **Clinical Data Security:** Secure patient data storage with industry standard encryption and authentication.
* **Scalable Architecture:** Built to support multi institution use and high volume clinical data.
* **Rigorous Testing:** Comprehensive unit testing and automated regression testing suites for production readiness.


Built to transition existing research prototypes into a production ready system, this platform aims to significantly improve diagnostic consistency and objectivity while enabling large scale outcome analysis for the international orthodontic community.

## Setup & Installation

### Prerequisites
- **Python 3.10+**
- **PostgreSQL** (running locally or accessible via network)
- **Git LFS** (Large File Storage) installed on your machine

> [!IMPORTANT]
> **Git LFS Required:** The ML model files (`.h5`) are stored in Git LFS. Run `git lfs pull` after cloning the repository to download the actual model weights. The server will start without them, but ML landmark extraction will fail.

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd OrthoPAR-Web-Platform
   ```

2. **Set up Virtual Environment:**
   ```bash
   python -m venv venv
   .\venv\Scripts\activate  # Windows
   source venv/bin/activate  # Linux/Mac
   ```

3. **Install Dependencies:**
   ```bash
   pip install -r code/backend/requirements.txt
   ```

4. **Configure Environment:**
   - Copy `code/backend/.env.example` to `code/backend/.env`.
   - Update the variables (especially `DATABASE_URL` and `SECRET_KEY`) with your local credentials.

5. **Run the Server:**
   ```bash
   uvicorn main:app --reload --app-dir code/backend
   ```

### Running Tests
To verify the math and clinical logic:
```bash
pytest code/backend/tests/ -v -s
```