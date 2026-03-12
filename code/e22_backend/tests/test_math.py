import pytest
import sys, os
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.par_score_service import (
    Point3D, calculate_par_score, _calc_anterior_segment, _calc_buccal_ap,
    _calc_buccal_transverse, _calc_buccal_vertical, _calc_overjet, _calc_overbite, _calc_centreline
)
from schemas import LandmarkCreate
from uuid import uuid4

def test_point3d_distance():
    p1 = Point3D(0, 0, 0)
    p2 = Point3D(3, 4, 0)
    assert p1.distance(p2) == 5.0

def test_calc_anterior_segment():
    # Setup mock points map indicating a distance of 3.0 (score 2)
    upper_map = {
        "R3M": Point3D(0, 0, 0),
        "R2D": Point3D(3, 0, 0),
    }
    score = _calc_anterior_segment(upper_map)
    assert score == 2

    # Distance > 8 = score 4
    upper_map["R3M"] = Point3D(0, 0, 0)
    upper_map["R2D"] = Point3D(10, 0, 0)
    score = _calc_anterior_segment(upper_map)
    assert score == 4

def test_calc_overjet():
    upper = {"R1Mid": Point3D(0, 10, 0)}
    buccal = {"LCover": Point3D(0, 0, 0)}
    
    # Distance is 10 in Y axis. Score for > 9mm is 4
    score = _calc_overjet(upper, buccal)
    assert score == 4
    
    # Distance is 6 in Y axis. <= 7mm is 2
    upper["R1Mid"] = Point3D(0, 6, 0)
    score = _calc_overjet(upper, buccal)
    assert score == 2

def test_calc_overbite():
    upper = {"R1Mid": Point3D(0, 0, 10)} # Tip of upper at Z=10
    lower = {
        "R1Mid": Point3D(0, 0, 5),   # Tip of lower at Z=5
        "R1Low": Point3D(0, 0, 0)    # Gum of lower at Z=0
    }
    # Lower height is 5.
    # Vertical overlap: upper(10) - lower(5) = 5 (Open bite case, > 4mm = 4)
    assert _calc_overbite(upper, lower) == 4

    # Fix to coverage case
    upper["R1Mid"] = Point3D(0, 0, 2)
    # Coverage logic: |2 - 5| / 5 = 3/5 (Coverage < 2/3 = score 1)
    assert _calc_overbite(upper, lower) == 1

def test_calc_centreline():
    upper = {"L1M": Point3D(-1, 0, 0), "R1M": Point3D(1, 0, 0)} # Midpoint X = 0
    lower = {
        "L1M": Point3D(-3, 0, 0), "R1M": Point3D(-1, 0, 0), # Midpoint X = -2
        "R1D": Point3D(1, 0, 0) # Width = 2
    }
    # Discrepancy = 2. Width = 2. Discrepancy > 0.5*width (which is 1). Therefore score 2.
    assert _calc_centreline(upper, lower) == 2

def test_full_calculate_par_score():
    sid = uuid4()
    # Dummy data
    upper = [LandmarkCreate(point_name="R1Mid", x=0, y=5, z=0, scan_id=sid)]
    lower = [LandmarkCreate(point_name="R1Mid", x=0, y=0, z=0, scan_id=sid), LandmarkCreate(point_name="R1Low", x=0, y=0, z=-5, scan_id=sid)]
    buccal = [LandmarkCreate(point_name="LCover", x=0, y=0, z=0, scan_id=sid)]
    
    res = calculate_par_score(upper, lower, buccal)
    print(f"\n[Test Output] Calculated FULL PAR SCORE dictionary: {res}")
    
    # Simple check to make sure keys exist and it doesn't crash
    assert "final_score" in res
    assert "overjet_score" in res
