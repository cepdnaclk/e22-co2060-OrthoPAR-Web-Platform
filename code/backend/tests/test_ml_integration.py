"""
ML Integration Tests — OrthoPAR
================================
These tests validate the REAL ML pipeline end-to-end:
  STL file → TensorFlow model → Landmark coordinates → PAR Score

Prerequisites:
  - Real .h5 model files in code/backend/ml_models/ (not LFS pointers)
  - Real .stl test fixtures in code/backend/tests/fixtures/
  - TensorFlow, trimesh, numpy installed

Run with:
  pytest code/backend/tests/test_ml_integration.py -v -s
"""

import pytest
import sys
import os
import math

# Add backend dir to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.ml_inference import MLService, NAMES_UPPER, NAMES_LOWER, NAMES_BUCCAL
from app.calculator import calculate_par_score, Point3D

# --- Paths ---
ML_MODELS_DIR = os.path.join(backend_dir, "ml_models")
FIXTURES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")

UPPER_STL = os.path.join(FIXTURES_DIR, "upper.stl")
LOWER_STL = os.path.join(FIXTURES_DIR, "lower.stl")
BUCCAL_STL = os.path.join(FIXTURES_DIR, "buccal.stl")

UPPER_MODEL = os.path.join(ML_MODELS_DIR, "upper_landmark_prediction_model.h5")
LOWER_MODEL = os.path.join(ML_MODELS_DIR, "lower_landmark_prediction_model.h5")
BUCCAL_MODEL = os.path.join(ML_MODELS_DIR, "buccal_landmark_prediction_model.h5")


def _is_lfs_pointer(filepath):
    """Check if a file is a Git LFS pointer (136 bytes, starts with 'version')."""
    if not os.path.exists(filepath):
        return True
    if os.path.getsize(filepath) < 1000:
        with open(filepath, 'r', errors='ignore') as f:
            first_line = f.readline()
            return first_line.startswith('version https://git-lfs')
    return False


def _models_are_real():
    """Check that all three .h5 files are real TensorFlow models, not LFS pointers."""
    for model_path in [UPPER_MODEL, LOWER_MODEL, BUCCAL_MODEL]:
        if _is_lfs_pointer(model_path):
            return False
    return True


def _fixtures_exist():
    """Check that all three STL test fixtures exist and are non-trivial."""
    for stl_path in [UPPER_STL, LOWER_STL, BUCCAL_STL]:
        if not os.path.exists(stl_path) or os.path.getsize(stl_path) < 1000:
            return False
    return True


# Skip entire module if models or fixtures are missing
pytestmark = pytest.mark.skipif(
    not _models_are_real() or not _fixtures_exist(),
    reason="Real .h5 models or STL fixtures not available. Run `git lfs pull` first."
)


# ========================
# Mock DB session for MLService (it queries ml_models table)
# ========================
class MockMLModelRecord:
    """Mimics the SQLAlchemy MLModel row that MLService expects."""
    def __init__(self):
        self.file_path = "ml_models"
        self.version = "v1.0.0-test"
        self.is_active = True


class MockMLService(MLService):
    """MLService subclass that bypasses the database query."""
    def __init__(self):
        # Skip the parent __init__ which requires a DB session
        self.db = None
        self.active_model_record = MockMLModelRecord()


# ========================
# TEST 1: STL Processing
# ========================
class TestSTLProcessing:
    """Verify that trimesh can load and sample the test STL files."""

    def test_process_upper_stl(self):
        service = MockMLService()
        features = service._process_stl(UPPER_STL)
        assert features.shape == (1, 10000, 3), f"Expected (1, 10000, 3), got {features.shape}"
        print(f"\n[PASS] Upper STL processed: shape={features.shape}, "
              f"min={features.min():.2f}, max={features.max():.2f}")

    def test_process_lower_stl(self):
        service = MockMLService()
        features = service._process_stl(LOWER_STL)
        assert features.shape == (1, 10000, 3), f"Expected (1, 10000, 3), got {features.shape}"
        print(f"\n[PASS] Lower STL processed: shape={features.shape}")

    def test_process_buccal_stl(self):
        service = MockMLService()
        features = service._process_stl(BUCCAL_STL)
        assert features.shape == (1, 10000, 3), f"Expected (1, 10000, 3), got {features.shape}"
        print(f"\n[PASS] Buccal STL processed: shape={features.shape}")


# ========================
# TEST 2: ML Model Loading & Prediction
# ========================
class TestMLPrediction:
    """Verify that TensorFlow models load and produce landmark predictions."""

    def test_predict_upper_landmarks(self):
        service = MockMLService()
        landmarks, version = service.predict_landmarks(UPPER_STL, "Upper Arch Segment")

        assert version == "v1.0.0-test"
        assert len(landmarks) == len(NAMES_UPPER), \
            f"Expected {len(NAMES_UPPER)} landmarks, got {len(landmarks)}"

        # Verify each landmark has required fields
        for lm in landmarks:
            assert "point_name" in lm, f"Missing 'point_name' in landmark"
            assert "x" in lm and "y" in lm and "z" in lm, f"Missing coordinates in {lm['point_name']}"
            assert isinstance(lm["x"], float), f"x is not float for {lm['point_name']}"
            assert lm["is_ai_predicted"] == True

        # Verify all expected landmark names are present
        predicted_names = {lm["point_name"] for lm in landmarks}
        expected_names = set(NAMES_UPPER)
        assert predicted_names == expected_names, \
            f"Landmark name mismatch. Missing: {expected_names - predicted_names}"

        print(f"\n[PASS] Upper arch: {len(landmarks)} landmarks predicted")
        print(f"  Sample — {landmarks[0]['point_name']}: "
              f"({landmarks[0]['x']:.3f}, {landmarks[0]['y']:.3f}, {landmarks[0]['z']:.3f})")

    def test_predict_lower_landmarks(self):
        service = MockMLService()
        landmarks, version = service.predict_landmarks(LOWER_STL, "Lower Arch Segment")

        assert len(landmarks) == len(NAMES_LOWER), \
            f"Expected {len(NAMES_LOWER)} landmarks, got {len(landmarks)}"

        predicted_names = {lm["point_name"] for lm in landmarks}
        expected_names = set(NAMES_LOWER)
        assert predicted_names == expected_names, \
            f"Landmark name mismatch. Missing: {expected_names - predicted_names}"

        print(f"\n[PASS] Lower arch: {len(landmarks)} landmarks predicted")

    def test_predict_buccal_landmarks(self):
        service = MockMLService()
        landmarks, version = service.predict_landmarks(BUCCAL_STL, "Buccal Segment")

        assert len(landmarks) == len(NAMES_BUCCAL), \
            f"Expected {len(NAMES_BUCCAL)} landmarks, got {len(landmarks)}"

        predicted_names = {lm["point_name"] for lm in landmarks}
        expected_names = set(NAMES_BUCCAL)
        assert predicted_names == expected_names, \
            f"Landmark name mismatch. Missing: {expected_names - predicted_names}"

        print(f"\n[PASS] Buccal: {len(landmarks)} landmarks predicted")

    def test_invalid_scan_type_raises(self):
        service = MockMLService()
        with pytest.raises(ValueError, match="Unsupported scan type"):
            service.predict_landmarks(UPPER_STL, "Invalid Type")


# ========================
# TEST 3: Landmark → Calculator Compatibility
# ========================
class TestLandmarkCalculatorBridge:
    """Verify ML output feeds correctly into the PAR calculator."""

    def test_ml_landmarks_have_calculator_keys(self):
        """Check that ML output contains the landmark names the calculator needs."""
        service = MockMLService()
        upper_lms, _ = service.predict_landmarks(UPPER_STL, "Upper Arch Segment")
        lower_lms, _ = service.predict_landmarks(LOWER_STL, "Lower Arch Segment")
        buccal_lms, _ = service.predict_landmarks(BUCCAL_STL, "Buccal Segment")

        upper_names = {lm["point_name"] for lm in upper_lms}
        lower_names = {lm["point_name"] for lm in lower_lms}
        buccal_names = {lm["point_name"] for lm in buccal_lms}

        # Keys the calculator actually looks up
        required_upper = {"R3M", "R2D", "R2M", "R1D", "R1M", "L1M", "L1D", "L2M", "L2D", "L3M",
                          "R1Mid", "L1M", "R1M"}
        required_lower = {"R3M", "R2D", "R2M", "R1D", "R1M", "L1M", "L1D", "L2M", "L2D", "L3M",
                          "R1Mid", "R1Lower", "L1M", "R1M", "R1D"}
        required_buccal = {"LCover"}

        missing_upper = required_upper - upper_names
        missing_lower = required_lower - lower_names
        missing_buccal = required_buccal - buccal_names

        assert not missing_upper, f"Upper landmarks missing for calculator: {missing_upper}"
        assert not missing_lower, f"Lower landmarks missing for calculator: {missing_lower}"
        assert not missing_buccal, f"Buccal landmarks missing for calculator: {missing_buccal}"

        print(f"\n[PASS] All calculator-required landmark names present in ML output")


# ========================
# TEST 4: Full End-to-End Pipeline
# ========================
class LandmarkObj:
    """Simple object with .point_name, .x, .y, .z attributes — 
    mimics both Pydantic schemas and SQLAlchemy ORM objects."""
    def __init__(self, point_name, x, y, z):
        self.point_name = point_name
        self.x = x
        self.y = y
        self.z = z


class TestFullPipeline:
    """The ultimate test: STL → ML Model → Landmarks → PAR Score."""

    def test_end_to_end_par_score(self):
        """Run all 3 STLs through ML models and compute the PAR score."""
        service = MockMLService()

        # Step 1: ML Prediction
        upper_lms, _ = service.predict_landmarks(UPPER_STL, "Upper Arch Segment")
        lower_lms, _ = service.predict_landmarks(LOWER_STL, "Lower Arch Segment")
        buccal_lms, _ = service.predict_landmarks(BUCCAL_STL, "Buccal Segment")

        print(f"\n--- ML Prediction Complete ---")
        print(f"  Upper landmarks: {len(upper_lms)}")
        print(f"  Lower landmarks: {len(lower_lms)}")
        print(f"  Buccal landmarks: {len(buccal_lms)}")

        # Step 2: Convert to objects the calculator understands
        upper_objs = [LandmarkObj(lm["point_name"], lm["x"], lm["y"], lm["z"]) for lm in upper_lms]
        lower_objs = [LandmarkObj(lm["point_name"], lm["x"], lm["y"], lm["z"]) for lm in lower_lms]
        buccal_objs = [LandmarkObj(lm["point_name"], lm["x"], lm["y"], lm["z"]) for lm in buccal_lms]

        # Step 3: Calculate PAR Score
        scores = calculate_par_score(upper_objs, lower_objs, buccal_objs)

        print(f"\n--- PAR Score Results ---")
        for key, value in scores.items():
            print(f"  {key}: {value}")

        # Step 4: Validate output structure and sanity
        assert "final_score" in scores, "Missing 'final_score' in output"
        assert isinstance(scores["final_score"], (int, float)), "final_score is not numeric"

        # All component scores should be non-negative integers
        component_keys = [
            "upper_anterior_score", "lower_anterior_score",
            "buccal_occlusion_antero_posterior_score",
            "buccal_occlusion_transverse_score",
            "buccal_occlusion_vertical_score",
            "overjet_score", "overbite_score", "centreline_score"
        ]
        for key in component_keys:
            assert key in scores, f"Missing '{key}' in output"
            assert scores[key] >= 0, f"'{key}' is negative: {scores[key]}"

        # Final score should be the weighted sum
        expected_final = (
            scores["upper_anterior_score"] +
            scores["lower_anterior_score"] +
            scores["buccal_occlusion_antero_posterior_score"] +
            scores["buccal_occlusion_transverse_score"] +
            scores["buccal_occlusion_vertical_score"] +
            scores["overjet_score"] +
            scores["overbite_score"] +
            scores["centreline_score"]
        )
        assert scores["final_score"] == expected_final, \
            f"Final score {scores['final_score']} != sum of components {expected_final}"

        print(f"\n[SUCCESS] FULL PIPELINE VERIFIED: PAR Score = {scores['final_score']}")

    def test_partial_score_without_buccal(self):
        """Verify the calculator handles missing buccal data gracefully."""
        service = MockMLService()

        upper_lms, _ = service.predict_landmarks(UPPER_STL, "Upper Arch Segment")
        lower_lms, _ = service.predict_landmarks(LOWER_STL, "Lower Arch Segment")

        upper_objs = [LandmarkObj(lm["point_name"], lm["x"], lm["y"], lm["z"]) for lm in upper_lms]
        lower_objs = [LandmarkObj(lm["point_name"], lm["x"], lm["y"], lm["z"]) for lm in lower_lms]

        # Empty buccal — should still produce a partial score
        scores = calculate_par_score(upper_objs, lower_objs, [])

        assert "final_score" in scores
        assert scores["final_score"] >= 0
        print(f"\n[PASS] Partial PAR score (no buccal): {scores['final_score']}")
