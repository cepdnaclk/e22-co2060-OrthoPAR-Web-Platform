import os
import numpy as np
import tensorflow as tf
import trimesh
import gzip
import threading
from sqlalchemy.orm import Session
import models
from config import settings
from storage import storage_manager, StorageBase

# Names of landmarks as defined in the legacy ML training scripts
NAMES_LOWER = ['L1D', 'L1M', 'L1Mid', 'L2D', 'L2M', 'L2Mid', 'L3M', 'L3Mid', 'L4BT', 'L4PT',
         'L5BT', 'L5PT', 'L6BD', 'L6BM', 'L6PD', 'L6PM', 'L7BD', 'L7BM', 'L7PD', 'L7PM',
         'R1D', 'R1Lower', 'R1M', 'R1Mid', 'R2D', 'R2M', 'R2Mid', 'R3M', 'R3Mid', 'R4BT',
         'R4PT', 'R5BT', 'R5PT', 'R6BD', 'R6BM', 'R6PD', 'R6PM', 'R7BD', 'R7BM', 'R7PD', 'R7PM']

NAMES_UPPER = ['L1D', 'L1M', 'L1Mid', 'L2D', 'L2M', 'L2Mid', 'L3M', 'L3Mid', 'L4BT', 'L4PT', 
               'L5BT', 'L5PT', 'L6BD', 'L6BM', 'L6PD', 'L6PM', 'L7BD', 'L7BM', 'L7PD', 'L7PM', 
               'R1D', 'R1M', 'R1Mid', 'R2D', 'R2M', 'R2Mid', 'R3M', 'R3Mid', 'R4BT', 'R4PT', 
               'R5BT', 'R5PT', 'R6BD', 'R6BM', 'R6PD', 'R6PM', 'R7BD', 'R7BM', 'R7PD', 'R7PM']

NAMES_BUCCAL = ['LCover', 'OJ_LCP', 'OJ_UCP']

# In-memory cache for loaded Keras models. 
# NOTE: In a multi-worker ASGI deployment (e.g. Gunicorn with multiple uvicorn workers), 
# this cache and lock are per-process. A model activation in one worker will NOT 
# immediately invalidate the cache in other workers.
_loaded_models_cache = {}
_cached_model_dir = None
_cache_lock = threading.Lock()

class MLService:
    def __init__(self, db: Session):
        self.db = db
        self.active_model_record = self._get_active_model_record()
        
    def _get_active_model_record(self):
        """Query the database for the currently active ML model."""
        return self.db.query(models.MLModel).filter(models.MLModel.is_active == True).first()

    def _process_stl(self, file_path):
        """Load and sample 10,000 points from the STL file (supports .gz)."""
        if file_path.endswith('.gz'):
            with gzip.open(file_path, 'rb') as f:
                mesh = trimesh.load(f, file_type='stl')
        else:
            mesh = trimesh.load(file_path, file_type='stl')
            
        if isinstance(mesh, trimesh.Scene):
            # Flatten scenes into a single mesh
            dumped = mesh.dump(concatenate=True)
            mesh = dumped[0] if (isinstance(dumped, (list, np.ndarray)) and len(dumped) > 0) else (dumped if not isinstance(dumped, (list, np.ndarray)) else trimesh.Trimesh())

            
        if len(mesh.vertices) < 10000:
            import os
            if os.environ.get("ALLOW_DUMMY_STL") == "1":
                # Pad small dummy meshes with zeros for testing ONLY
                features = np.zeros((10000, 3))
                features[:len(mesh.vertices)] = mesh.vertices
            else:
                raise ValueError(f"Insufficient mesh geometry: {len(mesh.vertices)} vertices found, minimum 10000 required for clinical accuracy.")
        else:
            features = mesh.sample(10000)
            
        features = features.reshape(1, 10000, 3)
        return features

    def _format_prediction(self, prediction, names):
        """Map the numerical ML output back to named landmark objects."""
        formatted = []
        for i, name in enumerate(names):
            # Extract x, y, z coordinates
            x, y, z = prediction[i*3:(i+1)*3].tolist()
            formatted.append({
                "point_name": name,
                "x": x,
                "y": y,
                "z": z,
                "is_ai_predicted": True
            })
        return formatted

    def predict_landmarks(self, scan_path, file_type):
        """
        Run ML inference on a given scan based on its type.
        Supports both local file paths and S3 object keys — S3 files are
        downloaded to a temp location automatically.
        """
        if not self.active_model_record:
            raise Exception("No active ML model found in database.")

        # Determine which specific model file to load based on scan type
        # Use absolute path to avoid ambiguity in different execution contexts
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        model_dir = os.path.join(base_dir, self.active_model_record.file_path)
        
        model_filename = ""
        names = []
        
        if file_type == "Upper Arch Segment":
            model_filename = "upper_landmark_prediction_model.h5"
            names = NAMES_UPPER
        elif file_type == "Lower Arch Segment":
            model_filename = "lower_landmark_prediction_model.h5"
            names = NAMES_LOWER
        elif file_type == "Buccal Segment":
            model_filename = "buccal_landmark_prediction_model.h5"
            names = NAMES_BUCCAL
        else:
            raise ValueError(f"Unsupported scan type for ML prediction: {file_type}")

        full_model_path = os.path.join(model_dir, model_filename)
        if not os.path.exists(full_model_path):
            raise FileNotFoundError(f"Model file not found: {full_model_path}")

        # Resolve scan file: download from S3 to temp if needed, otherwise use local path
        is_s3 = StorageBase.is_s3_key(scan_path)
        local_scan_path = storage_manager.download_to_temp(scan_path)

        try:
            # Use in-memory cache to avoid slow reloading
            global _loaded_models_cache, _cached_model_dir, _cache_lock
            with _cache_lock:
                if _cached_model_dir != model_dir:
                    _loaded_models_cache.clear()
                    _cached_model_dir = model_dir
                    
                if file_type not in _loaded_models_cache:
                    _loaded_models_cache[file_type] = tf.keras.models.load_model(full_model_path)
                    
                model = _loaded_models_cache[file_type]

            features = self._process_stl(local_scan_path)
            # Use model() instead of model.predict() for better thread-safety and performance 
            # on small batches when sharing a single Keras model instance across threads.
            prediction = model(features, training=False).numpy()
            
            # Return formatted landmarks and the model version used
            return self._format_prediction(prediction[0], names), self.active_model_record.version
        finally:
            # Clean up temp file only if we downloaded from S3
            if is_s3 and os.path.exists(local_scan_path):
                os.unlink(local_scan_path)

