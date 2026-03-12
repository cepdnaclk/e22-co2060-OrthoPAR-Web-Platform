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
* **Automated MLOps:** Database-driven pipelines for model versioning and GZIP-compatible data ingestion.
* **Clinical Data Validation**: Successfully validated against real clinical scans (`set1`, `set2`) with an average performance of **4.35s** (Benchmark: <10s).
* **Anatomical landmarking**: Support for anatomical landmark identification for PAR Score calculation.
* **Clinical Data Security:** Secure patient data storage with industry standard encryption and authentication.


Built to transition existing research prototypes into a production ready system, this platform aims to significantly improve diagnostic consistency and objectivity while enabling large scale outcome analysis for the international orthodontic community.


## Getting Started

To set up the project and run tests, please refer to the specific documentation for each component:

*   **Backend:** [e22_backend Setup & Testing Guide](code/e22_backend/README.md#setup-and-testing-guide-for-new-users)
*   **Frontend:** (Coming soon)

### Prerequisites

*   **PostgreSQL:** Required for the production/development database.
*   **Python:** Recommended **3.10, 3.11, or 3.12**. (Python 3.14+ may require extra setup like Rust).

Have the following packages and softwares installed inorder to run the program- Postgress, Relevant Python Packages,

Python Packages used- python-dotenv, sqlalchemy,