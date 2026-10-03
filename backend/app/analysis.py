"""
Turns raw detections into one CityLens result:

  detections → (scene segmentation) → parking rule → pick the issue
             → severity → routing

Response shape (consumed by frontend/src/services/detectionService.js):
{
  "issue": "garbage_dumping" | "pothole" | "illegal_parking" | null,
  "confidence": 0.91,
  "severity": "High", "severity_reason": "...",
  "detections": [{"class": "garbage", "issue": "garbage_dumping", "confidence": 0.91,
                  "bbox": [x1,y1,x2,y2],
                  "polygon": [[x,y], ...] | null,      # instance mask, seg models only
                  "footpath": 0.82 | null}],           # vehicles, when the scene model ran
  "image_width": 1280, "image_height": 960,
  "department": "sanitation", "department_name": "...",
  "no_parking_zone": null | "Hampankatta Junction",
  "scene": null | {"road": 0.41, "sidewalk": 0.12},     # share of the photo
  "no_parking_sign": null | "NO PARKING",               # text read / "no-parking symbol"
  "signs": [{"kind": "no_parking"|"parking_allowed", "text": "...", "source": "ocr"|"symbol",
             "bbox": [x1,y1,x2,y2], "confidence": 0.9}],
  "note": null | "...",                                 # why nothing was reported
  "models_used": ["garbage", "vehicle"], "model": "garbage",
  "mock": false
}
"""
from __future__ import annotations

from . import config, severity
from .detector import Box
from .scene import SceneMap
from .signs import SignHit
from .zones import find_no_parking_zone


def _is_vehicle(b: Box) -> bool:
    return b.issue == "illegal_parking" and b.model == "vehicle"


def _overlap(inner: list[float], outer: list[float]) -> float:
    """Share of `inner`'s box that lies inside `outer`'s box."""
    ix1, iy1 = max(inner[0], outer[0]), max(inner[1], outer[1])
    ix2, iy2 = min(inner[2], outer[2]), min(inner[3], outer[3])
    inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
    area = max(1e-6, (inner[2] - inner[0]) * (inner[3] - inner[1]))
    return inter / area


def _drop_impossible_potholes(boxes: list[Box], scene: SceneMap | None) -> list[Box]:
    """Cross-check the pothole model against the other models.

    Seen from above, a dark car roof is a dark oval blob — exactly what a
    pothole model looks for. But a pothole can't be ON a car, and it has to
    be in the road surface. So drop a pothole that mostly overlaps a
    detected vehicle, or (when the scene model ran) that isn't on road or
    pavement pixels.
    """
    vehicles = [b.bbox for b in boxes if _is_vehicle(b)]
    out = []
    for b in boxes:
        if b.issue == "pothole":
            if any(_overlap(b.bbox, v) >= config.POTHOLE_MAX_VEHICLE_OVERLAP for v in vehicles):
                continue
            if scene is not None:
                ground = scene.ground_share(b.bbox)
                if ground is not None and ground < config.POTHOLE_MIN_GROUND_SHARE:
                    continue
        out.append(b)
    return out


def analyze(boxes: list[Box], width: int, height: int, lat: float | None, lon: float | None,
            models_used: list[str], scene: SceneMap | None = None,
            signs: list[SignHit] | None = None) -> dict:
    image_area = float(width * height) or 1.0
    zone = find_no_parking_zone(lat, lon)
    signs = signs or []
    sign = next((s for s in signs if s.kind == "no_parking"), None)
    allowed_sign = next((s for s in signs if s.kind == "parking_allowed"), None)

    # Where does each vehicle stand? (only when the scene model ran)
    if scene is not None:
        for b in boxes:
            if _is_vehicle(b):
                b.footpath = scene.footpath_share(b.bbox)

    boxes = _drop_impossible_potholes(boxes, scene)
    # Low-confidence vehicles were only needed for that cross-check.
    boxes = [b for b in boxes if not (_is_vehicle(b) and b.confidence < config.CONFIDENCE_THRESHOLD)]
    vehicles_seen = sum(1 for b in boxes if _is_vehicle(b))

    # Illegal-parking rule: a detected vehicle only counts if it's in a
    # no-parking zone, a no-parking sign is visible in the photo, it's on
    # the footpath, or it dominates the frame (the thing being reported).
    # A small car on the road in the background of a garbage photo is ignored.
    kept: list[Box] = []
    for b in boxes:
        if _is_vehicle(b):
            on_footpath = (b.footpath or 0) >= config.FOOTPATH_MIN_SHARE
            big = b.area() / image_area >= config.PARKING_MIN_AREA_OUTSIDE_ZONE
            if not (zone or sign or on_footpath or big):
                continue
        kept.append(b)

    by_issue: dict[str, list[Box]] = {}
    for b in kept:
        by_issue.setdefault(b.issue, []).append(b)

    base = {
        "image_width": width,
        "image_height": height,
        "no_parking_zone": zone["name"] if zone else None,
        "scene": scene.coverage() if scene is not None else None,
        "no_parking_sign": sign.text if sign else None,
        "signs": [s.to_json() for s in signs],
        "models_used": models_used,
        "mock": False,
    }

    if not by_issue:
        note = None
        if vehicles_seen:
            # Say what we saw and why it isn't a violation, instead of a bare
            # "nothing found" — and leave the final call to the citizen.
            n = vehicles_seen
            note = (f"{n} parked vehicle{'s' if n != 1 else ''} found, but none is on the footpath, "
                    "inside a no-parking zone, or large enough in the photo to be blocking the road — "
                    "they look legally parked. If one is parked illegally, choose Illegal Parking below.")
            if allowed_sign:
                note = f'A parking sign is visible ("{allowed_sign.text}"). ' + note
        return {**base, "issue": None, "confidence": None, "severity": None, "severity_reason": None,
                "detections": [], "department": None, "department_name": None, "model": None, "note": note}

    # Pick the issue with the most confident detection.
    issue = max(by_issue, key=lambda k: max(b.confidence for b in by_issue[k]))
    chosen = sorted(by_issue[issue], key=lambda b: b.confidence, reverse=True)
    parking = issue == "illegal_parking"
    level, reason = severity.estimate(issue, chosen, width, height, zone if parking else None,
                                      sign if parking else None)
    dept = config.ISSUE_ROUTING[issue]

    return {
        **base,
        "issue": issue,
        "confidence": round(chosen[0].confidence, 4),
        "severity": level,
        "severity_reason": reason,
        "detections": [
            {"class": b.class_name, "issue": b.issue, "confidence": round(b.confidence, 4),
             "bbox": [round(v, 1) for v in b.bbox],
             "polygon": b.polygon,
             "footpath": b.footpath}
            for b in chosen
        ],
        "department": dept,
        "department_name": config.DEPARTMENTS[dept],
        "model": chosen[0].model,
        "note": None,
    }
