import os
import gc
import gzip
import threading

import numpy as np
import tensorflow as tf
import trimesh
from sqlalchemy.orm import Session

import models
from storage import storage_manager, StorageBase

# ---------------------------------------------------------------------------
# TensorFlow thread limits — must be set BEFORE any model is loaded.
# Setting them inside a request handler is too late; TF initialises its
# thread pools on first use and ignores later calls.
# ---------------------------------------------------------------------------
_LOW_MEMORY_MODE: bool = os.getenv("LOW_MEMORY_MODE", "False").lower() in (
    "true", "1", "t", "y", "yes"
)

print(f"[ML Startup] LOW_MEMORY_MODE environment variable is: {_LOW_MEMORY_MODE}")

if _LOW_MEMORY_MODE:
    print("[ML Startup] Restricting TensorFlow internal thread pools to 1 thread.")
    try:
        tf.config.threading.set_intra_op_parallelism_threads(1)
        tf.config.threading.set_inter_op_parallelism_threads(1)
    except RuntimeError as e:
        print(f"[ML Startup] Failed to set thread limits: {e}")
        pass

# ---------------------------------------------------------------------------
# Landmark names as defined in the legacy ML training scripts
# ---------------------------------------------------------------------------
NAMES_LOWER = [
    'L1D', 'L1M', 'L1Mid', 'L2D', 'L2M', 'L2Mid', 'L3M', 'L3Mid', 'L4BT', 'L4PT',
    'L5BT', 'L5PT', 'L6BD', 'L6BM', 'L6PD', 'L6PM', 'L7BD', 'L7BM', 'L7PD', 'L7PM',
    'R1D', 'R1Lower', 'R1M', 'R1Mid', 'R2D', 'R2M', 'R2Mid', 'R3M', 'R3Mid', 'R4BT',
    'R4PT', 'R5BT', 'R5PT', 'R6BD', 'R6BM', 'R6PD', 'R6PM', 'R7BD', 'R7BM', 'R7PD', 'R7PM',
]

NAMES_UPPER = [
    'L1D', 'L1M', 'L1Mid', 'L2D', 'L2M', 'L2Mid', 'L3M', 'L3Mid', 'L4BT', 'L4PT',
    'L5BT', 'L5PT', 'L6BD', 'L6BM', 'L6PD', 'L6PM', 'L7BD', 'L7BM', 'L7PD', 'L7PM',
    'R1D', 'R1M', 'R1Mid', 'R2D', 'R2M', 'R2Mid', 'R3M', 'R3Mid', 'R4BT', 'R4PT',
    'R5BT', 'R5PT', 'R6BD', 'R6BM', 'R6PD', 'R6PM', 'R7BD', 'R7BM', 'R7PD', 'R7PM',
]

NAMES_BUCCAL = ['LCover', 'OJ_LCP', 'OJ_UCP']

# Map scan-type strings to (model filename, landmark names list)
_SCAN_TYPE_MAP: dict = {
    "Upper Arch Segment": ("upper_landmark_prediction_model.h5",  NAMES_UPPER),
    "Lower Arch Segment": ("lower_landmark_prediction_model.h5",  NAMES_LOWER),
    "Buccal Segment":     ("buccal_landmark_prediction_model.h5", NAMES_BUCCAL),
}

# ---------------------------------------------------------------------------
# Module-level model cache (TFLite Interpreters)
#
# Models are loaded as TFLite Interpreters ONCE (lazily, on first request for
# each scan type) and reused for every subsequent call.
#
# If a TFLite flatbuffer file (.tflite) does not exist in the active directory,
# we dynamically convert the Keras (.h5) model on-the-fly, write it to disk, 
# free Keras's memory, and load the TFLite Interpreter.
# ---------------------------------------------------------------------------
_model_cache: dict = {}
_model_cache_lock = threading.Lock()
_cached_model_dir: str | None = None


def _get_or_load_tflite_interpreter(model_dir: str, scan_type: str):
    """
    Return the cached TFLite Interpreter for scan_type, loading from disk on first call.
    If the .tflite file is missing, converts the corresponding .h5 model on-the-fly.
    """
    global _model_cache, _cached_model_dir

    filename_h5, _ = _SCAN_TYPE_MAP[scan_type]
    filename_tflite = filename_h5.replace(".h5", ".tflite")
    
    full_path_h5 = os.path.join(model_dir, filename_h5)
    full_path_tflite = os.path.join(model_dir, filename_tflite)

    with _model_cache_lock:
        # If the active model directory changed, evict the stale cache.
        if _cached_model_dir != model_dir:
            _model_cache.clear()
            _cached_model_dir = model_dir

        if scan_type not in _model_cache:
            # If the TFLite model file doesn't exist, convert from H5 on-the-fly
            if not os.path.exists(full_path_tflite):
                if not os.path.exists(full_path_h5):
                    raise FileNotFoundError(f"Neither TFLite nor H5 model file found: {full_path_h5}")
                
                print(f"[ML] Converting {filename_h5} to TFLite on-the-fly...")
                model = tf.keras.models.load_model(full_path_h5, compile=False)
                converter = tf.lite.TFLiteConverter.from_keras_model(model)
                tflite_model = converter.convert()
                with open(full_path_tflite, "wb") as f:
                    f.write(tflite_model)
                print(f"[ML] Dynamic conversion complete. Saved as {filename_tflite}")
                
                # Immediately release Keras resources
                tf.keras.backend.clear_session()
                del model
                gc.collect()

            # Load lightweight TFLite Interpreter (uses ~15MB of RAM instead of ~200MB+ for Keras)
            interpreter = tf.lite.Interpreter(model_path=full_path_tflite)
            interpreter.allocate_tensors()
            _model_cache[scan_type] = interpreter

        return _model_cache[scan_type]


# ---------------------------------------------------------------------------
# MLService
# ---------------------------------------------------------------------------

class MLService:
    def __init__(self, db: Session):
        self.db = db
        self.active_model_record = self._get_active_model_record()

    def _get_active_model_record(self):
        """Query the database for the currently active ML model."""
        return (
            self.db.query(models.MLModel)
            .filter(models.MLModel.is_active == True)
            .first()
        )

    def _load_binary_stl_vertices(self, file_path: str) -> np.ndarray | None:
        """Lightweight parser to load vertices from a binary STL file without trimesh overhead."""
        if file_path.endswith(".gz"):
            f = gzip.open(file_path, "rb")
        else:
            f = open(file_path, "rb")
            
        try:
            header = f.read(80)
            if len(header) < 80:
                return None
                
            num_triangles_bytes = f.read(4)
            if len(num_triangles_bytes) < 4:
                return None
            num_triangles = np.frombuffer(num_triangles_bytes, dtype=np.uint32)[0]
            
            # Read remainder of the file
            content = f.read()
            total_size = 84 + len(content)
            expected_size = 84 + 50 * num_triangles
            
            if total_size != expected_size:
                # If size doesn't match, it is either ASCII or corrupted. Fall back to trimesh.
                return None
            
            # Structured dtype for binary STL records (50 bytes each)
            dt = np.dtype([
                ('normal', np.float32, (3,)),
                ('vertices', np.float32, (3, 3)),
                ('attr', np.uint16)
            ])
            
            data = np.frombuffer(content, dtype=dt, count=num_triangles)
            vertices = data['vertices'].reshape(-1, 3)
            return vertices
        except Exception:
            return None
        finally:
            f.close()

    def _process_stl(self, file_path: str) -> np.ndarray:
        """Load an STL file (optionally gzip-compressed) and sample 10,000 points."""
        print(f"[ML] Processing STL file: {file_path}")
        # Try our custom fast binary loader first to save memory
        vertices = self._load_binary_stl_vertices(file_path)
        
        if vertices is not None:
            print(f"[ML] Custom binary parser succeeded. Loaded {len(vertices)} vertices.")
            if len(vertices) < 10_000:
                if os.environ.get("ALLOW_DUMMY_STL") == "1":
                    features = np.zeros((10_000, 3))
                    features[: len(vertices)] = vertices
                else:
                    raise ValueError(
                        f"Insufficient mesh geometry: {len(vertices)} vertices found, "
                        "minimum 10,000 required for clinical accuracy."
                    )
            else:
                # Randomly sample 10,000 vertices from the mesh vertices
                idx = np.random.choice(len(vertices), 10_000, replace=False)
                features = vertices[idx]
            return features.reshape(1, 10_000, 3)

        # Fallback to trimesh if it is ASCII STL or parsing failed
        print("[ML] Custom binary parser failed or file is ASCII. Falling back to trimesh.load()...")
        if file_path.endswith(".gz"):
            with gzip.open(file_path, "rb") as f:
                mesh = trimesh.load(f, file_type="stl")
        else:
            mesh = trimesh.load(file_path, file_type="stl")

        if isinstance(mesh, trimesh.Scene):
            dumped = mesh.dump(concatenate=True)
            if isinstance(dumped, (list, np.ndarray)):
                mesh = dumped[0] if len(dumped) > 0 else trimesh.Trimesh()
            else:
                mesh = dumped

        if len(mesh.vertices) < 10_000:
            if os.environ.get("ALLOW_DUMMY_STL") == "1":
                # Pad with zeros — for unit-testing ONLY, never in production.
                features = np.zeros((10_000, 3))
                features[: len(mesh.vertices)] = mesh.vertices
            else:
                raise ValueError(
                    f"Insufficient mesh geometry: {len(mesh.vertices)} vertices found, "
                    "minimum 10,000 required for clinical accuracy."
                )
        else:
            features = mesh.sample(10_000)

        return features.reshape(1, 10_000, 3)

    def _format_prediction(self, prediction: np.ndarray, names: list) -> list:
        """Map flat ML output to a list of named landmark dicts."""
        return [
            {
                "point_name": name,
                "x": float(prediction[i * 3]),
                "y": float(prediction[i * 3 + 1]),
                "z": float(prediction[i * 3 + 2]),
                "is_ai_predicted": True,
            }
            for i, name in enumerate(names)
        ]

    def predict_landmarks(self, scan_path: str, file_type: str):
        """
        Run ML inference on scan_path for the given file_type.

        Accepts both local file paths and S3 object keys; S3 files are
        downloaded to a temporary location and cleaned up after inference
        regardless of success or failure.

        Returns (formatted_landmarks, model_version).
        """
        if not self.active_model_record:
            raise RuntimeError("No active ML model found in database.")

        if file_type not in _SCAN_TYPE_MAP:
            raise ValueError(f"Unsupported scan type for ML prediction: {file_type!r}")

        # Resolve the directory containing the model files.
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        model_dir = os.path.join(base_dir, self.active_model_record.file_path)

        _, names = _SCAN_TYPE_MAP[file_type]

        # Download from S3 to a local temp file if necessary.
        is_s3 = StorageBase.is_s3_key(scan_path)
        local_scan_path = storage_manager.download_to_temp(scan_path)

        try:
            interpreter = _get_or_load_tflite_interpreter(model_dir, file_type)
            features = self._process_stl(local_scan_path)

            input_details = interpreter.get_input_details()
            output_details = interpreter.get_output_details()

            # Set input tensor (cast to float32 for TFLite)
            interpreter.set_tensor(input_details[0]['index'], features.astype(np.float32))

            # Run inference
            interpreter.invoke()

            # Get output tensor
            prediction = interpreter.get_tensor(output_details[0]['index'])

            return (
                self._format_prediction(prediction[0], names),
                self.active_model_record.version,
            )

        finally:
            # Always remove the temp file we downloaded, even on error.
            if is_s3 and os.path.exists(local_scan_path):
                os.unlink(local_scan_path)
            # Force garbage collection to free numpy arrays and temporary allocations
            import gc
            gc.collect()
