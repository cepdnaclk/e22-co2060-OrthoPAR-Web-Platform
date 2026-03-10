import math
from typing import Dict, Tuple

class Point3D:
    def __init__(self, x: float, y: float, z: float):
        self.x = x
        self.y = y
        self.z = z

    def distance(self, other: 'Point3D') -> float:
        return math.sqrt(
            (self.x - other.x) ** 2 +
            (self.y - other.y) ** 2 +
            (self.z - other.z) ** 2
        )

def calculate_par_score(upper_points: list, lower_points: list, buccal_points: list) -> dict:
    # 1. Map list of Pydantic models to a Point3D dictionary for easy lookup
    upper_map = {p.point_name: Point3D(p.x, p.y, p.z) for p in upper_points}
    lower_map = {p.point_name: Point3D(p.x, p.y, p.z) for p in lower_points}
    buccal_map = {p.point_name: Point3D(p.x, p.y, p.z) for p in buccal_points}

    # 2. Calculate Segments
    upper_anterior_score = _calc_anterior_segment(upper_map)
    lower_anterior_score = _calc_anterior_segment(lower_map)
    overjet_score = _calc_overjet(upper_map, buccal_map)
    overbite_score = _calc_overbite(upper_map, lower_map)
    centreline_score = _calc_centreline(upper_map, lower_map)

    buccal_ap_score = _calc_buccal_ap(upper_map, lower_map, "R") + _calc_buccal_ap(upper_map, lower_map, "L")
    buccal_transverse_score = _calc_buccal_transverse(upper_map, lower_map, "R") + _calc_buccal_transverse(upper_map, lower_map, "L")
    buccal_vertical_score = _calc_buccal_vertical(upper_map, lower_map, "R") + _calc_buccal_vertical(upper_map, lower_map, "L")

    # 3. Final Weighted Score
    final_score = (
        upper_anterior_score +
        lower_anterior_score +
        buccal_ap_score +
        buccal_transverse_score +
        buccal_vertical_score +
        (overjet_score * 6) +
        (overbite_score * 2) +
        (centreline_score * 4)
    )

    return {
        "upper_anterior_score": upper_anterior_score,
        "lower_anterior_score": lower_anterior_score,
        "buccal_occlusion_antero_posterior_score": buccal_ap_score,
        "buccal_occlusion_transverse_score": buccal_transverse_score,
        "buccal_occlusion_vertical_score": buccal_vertical_score,
        "overjet_score": overjet_score * 6,
        "overbite_score": overbite_score * 2,
        "centreline_score": centreline_score * 4,
        "final_score": final_score
    }


def _calc_anterior_segment(points_map: Dict[str, Point3D]) -> int:
    contact_pairs = [
        ("R3M", "R2D"),
        ("R2M", "R1D"),
        ("R1M", "L1M"),
        ("L1D", "L2M"),
        ("L2D", "L3M")
    ]
    total = 0
    for p1_name, p2_name in contact_pairs:
        p1 = points_map.get(p1_name)
        p2 = points_map.get(p2_name)
        if p1 and p2:
            dist = p1.distance(p2)
            if dist > 8.0: total += 4
            elif dist > 4.0: total += 3
            elif dist > 2.0: total += 2
            elif dist > 1.0: total += 1
    return total

def _calc_buccal_ap(upper: Dict[str, Point3D], lower: Dict[str, Point3D], side: str) -> int:
    upper_cusp = upper.get(f"{side}6MB")
    lower_groove = lower.get(f"{side}6GB")

    if not upper_cusp or not lower_groove: return 0

    discrepancy = abs(upper_cusp.y - lower_groove.y)
    lower_mesial = lower.get(f"{side}6M")
    
    if not lower_mesial: return 0
    
    half_unit = lower_mesial.distance(lower_groove)

    if discrepancy < (half_unit / 2.0): return 0
    if discrepancy < half_unit: return 1
    return 2

def _calc_buccal_transverse(upper: Dict[str, Point3D], lower: Dict[str, Point3D], side: str) -> int:
    u6mb = upper.get(f"{side}6MB")
    u6mp = upper.get(f"{side}6MP")
    u6db = upper.get(f"{side}6DB")
    u6dp = upper.get(f"{side}6DP")
    u6gb = upper.get(f"{side}6GB")
    l6mb = lower.get(f"{side}6MB")
    l6gb = lower.get(f"{side}6GB")

    if not all([u6mb, u6mp, u6db, u6dp, u6gb, l6mb, l6gb]): return 0

    upper_mid_x = (u6mb.x + u6mp.x + u6db.x + u6dp.x) / 4.0
    d = 0.25 * abs(upper_mid_x - u6gb.x)

    no_crossbite_lower = upper_mid_x - (3 * d)
    no_crossbite_upper = upper_mid_x + (3 * d)

    if side == "L":
        if l6mb.x < no_crossbite_lower: return 2
        if no_crossbite_lower <= l6mb.x <= no_crossbite_upper: return 0
        if no_crossbite_upper <= l6mb.x <= (l6gb.x + d): return 1
    else:
        if l6mb.x > no_crossbite_upper: return 2
        if no_crossbite_lower <= l6mb.x <= no_crossbite_upper: return 0
        if no_crossbite_lower >= l6mb.x >= (l6gb.x - d): return 1

    return 4

def _calc_buccal_vertical(upper: Dict[str, Point3D], lower: Dict[str, Point3D], side: str) -> int:
    open_bites = 0
    
    # Check 6th tooth
    u6_pts = [upper.get(f"{side}6MB"), upper.get(f"{side}6MP"), upper.get(f"{side}6DB"), upper.get(f"{side}6DP")]
    l6_pts = [lower.get(f"{side}6MB"), lower.get(f"{side}6MP"), lower.get(f"{side}6DB"), lower.get(f"{side}6DP")]
    if all(u6_pts) and all(l6_pts):
        uy = sum([p.y for p in u6_pts]) / 4
        ly = sum([p.y for p in l6_pts]) / 4
        if uy - ly > 2.0: open_bites += 1

    # Check 5th tooth
    if all([upper.get(f"{side}5BT"), upper.get(f"{side}5PT"), lower.get(f"{side}5BT"), lower.get(f"{side}5PT")]):
        uy = (upper.get(f"{side}5BT").y + upper.get(f"{side}5PT").y) / 2
        ly = (lower.get(f"{side}5BT").y + lower.get(f"{side}5PT").y) / 2
        if uy - ly > 2.0: open_bites += 1

    # Check 4th tooth
    if all([upper.get(f"{side}4BT"), upper.get(f"{side}4PT"), lower.get(f"{side}4BT"), lower.get(f"{side}4PT")]):
        uy = (upper.get(f"{side}4BT").y + upper.get(f"{side}4PT").y) / 2
        ly = (lower.get(f"{side}4BT").y + lower.get(f"{side}4PT").y) / 2
        if uy - ly > 2.0: open_bites += 1

    return 1 if open_bites >= 2 else 0

def _calc_overjet(upper: Dict[str, Point3D], buccal: Dict[str, Point3D]) -> int:
    u1 = upper.get("R1Mid")
    l1 = buccal.get("LCover")

    if not u1 or not l1: return 0

    dist = abs(u1.y - l1.y)
    if dist <= 3.0: return 0
    if dist <= 5.0: return 1
    if dist <= 7.0: return 2
    if dist <= 9.0: return 3
    return 4

def _calc_overbite(upper: Dict[str, Point3D], lower: Dict[str, Point3D]) -> int:
    u1mid = upper.get("R1Mid")
    l1mid = lower.get("R1Mid")
    llow = lower.get("R1Low")

    if not u1mid or not l1mid or not llow: return 0

    lower_height = abs(l1mid.z - llow.z)
    vert = u1mid.z - l1mid.z

    if vert > 0:
        if vert <= 1.0: return 1
        if vert <= 2.0: return 2
        if vert <= 4.0: return 3
        return 4
    
    if lower_height > 0:
        cov = abs(vert) / lower_height
        if cov < (1/3): return 0
        if cov < (2/3): return 1
        if cov < 1.0: return 2
        return 3
    
    return 0

def _calc_centreline(upper: Dict[str, Point3D], lower: Dict[str, Point3D]) -> int:
    ul = upper.get("L1M")
    ur = upper.get("R1M")
    ll = lower.get("L1M")
    lr = lower.get("R1M")
    lrd = lower.get("R1D")

    if not all([ul, ur, ll, lr, lrd]): return 0

    umidx = (ul.x + ur.x) / 2
    lmidx = (ll.x + lr.x) / 2

    discrepancy = abs(umidx - lmidx)
    width = lr.distance(lrd)

    if width == 0: return 0

    if discrepancy <= (0.25 * width): return 0
    if discrepancy <= (0.5 * width): return 1
    return 2
