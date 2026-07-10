# OrthoScan: ML Model Management & Safety Architecture

This document outlines the architecture, security boundaries, and concurrency handling for the Machine Learning Model Management pipeline implemented in the OrthoPAR Web Platform. Future developers should review this before altering the ML inference loop or the clinician dashboard.

## 1. Role-Based Access Control (RBAC)

The platform enforces a strict separation between **Clinicians** (standard users) and **System Administrators** (who manage ML models). 

- **UI Boundary**: The `AdminPage.jsx` component is dynamically injected into the navigation sidebar only if `user.is_admin === true`. 
- **API Boundary**: 
  - `GET /api/ml-models` and `POST /api/ml-models/upload` are strictly protected by the `require_admin` FastAPI dependency. Any non-admin request is rejected with a `403 Forbidden`.
  - `GET /api/ml-models/active` is intentionally available to all authenticated users. It deliberately returns a scoped schema (`MLModelActiveResponse` containing only `name` and `version`) rather than the full operational history. This enables the clinician dashboard to display the active scoring engine without leaking sensitive history or file paths.

> [!WARNING] 
> User accounts cannot become admins through the standard UI registration flow. The `is_admin` flag defaults to `False` in the database and must be manually elevated by a database administrator.

## 2. ML Hot-Swapping & Concurrency

Deploying new models requires zero downtime, meaning inference requests can occur simultaneously while an admin activates a new model.

- **Thread-Safe Hot-Swapping**: The `_load_model_if_needed()` function in `ml_inference.py` polls the database for the active model path on every request. If a change is detected, a `threading.Lock()` (`_cache_lock`) protects the memory swap. This prevents Race Conditions where Thread A tries to execute inference on a model that Thread B is actively clearing from memory.
- **Keras Inference**: We explicitly invoke Keras inference using `model(tensor, training=False)` rather than `model.predict()`. `predict()` leaks memory in concurrent ASGI environments by continually spawning and tearing down `tf.data.Dataset` iterators. Calling the model directly circumvents this overhead and guarantees thread-safety across FastAPI's worker pool.

## 3. Clinical Safety & Data Integrity

### The 10,000 Vertex Threshold
The pipeline relies on a strict input geometry of `(1, 10000, 3)`. 
- **Production Guardrail**: If a clinician uploads a `.stl` scan with fewer than 10,000 vertices, the `_process_stl` function immediately throws a `422 Unprocessable Entity` error. This guarantees that corrupted, truncated, or poorly-scanned inputs are explicitly rejected rather than silently zero-padded, which would result in hallucinatory PAR scores.
- **Test Environment Bypass**: For unit testing with dummy cube `.stl` files, the pipeline accepts a `ALLOW_DUMMY_STL=1` environment variable. This allows tests to traverse the pipeline by internally padding the geometry, but it is strictly disabled in production.

### Landmark Race Conditions
In `analysis.py`, concurrent clinician actions (e.g., rapidly double-clicking landmark recalculations) on the exact same patient scan could previously trigger an `ObjectDeletedError`. This occurred when two requests raced to `delete()` and `commit()` the same database row simultaneously. 
- **Fix**: The scan row is now strictly locked using SQLAlchemy's `with_for_update()`. This forces concurrent writes on the same patient scan to serialize sequentially at the database layer.

## 4. Security: Zip Path Traversal Protection

Model packages are uploaded as `.zip` archives. The extraction logic securely validates all contents to prevent malicious path traversal (e.g., a file named `../../etc/shadow`).
- We resolve the absolute path of the target directory (`os.path.abspath(target_dir)`).
- We resolve the absolute path of the extracted file.
- Crucially, we enforce that the extracted path starts with `target_dir_abs + os.sep`. This strict suffix-checking prevents sibling-directory false positives (where `/ml_models_evil/` would bypass a naive string `startswith('/ml_models')` check).

## 5. Frontend Integration Flow

1. **AdminPage.jsx**: Displays the historical log of models. Inactive models feature an `Activate` button, while the active model hides its button to prevent no-op confusion.
2. **DashboardPage.jsx**: Fetches the active model string on mount and renders a green `Scoring Engine` badge. If the backend fails (e.g. 500 error), it explicitly logs the failure rather than silently swallowing it, ensuring backend outages are visible in the console.

> [!NOTE] 
> If a new ML architecture requires a different input tensor shape (e.g. `(1, 15000, 3)`), you cannot simply upload the `.zip` file. You must first deploy a codebase update to `ml_inference.py` to handle the new preprocessing geometry constraints.
