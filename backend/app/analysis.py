"""
Turns raw detections into one CityLens result:

  detections → parking rule → pick the issue → severity → routing

Response shape (consumed by frontend/src/services/detectionService.js):
{
  "issue": "garbage_dumping" | "pothole" | "illegal_parking" | null,
  "confidence": 0.91,
  "severity": "High", "severity_reason": "...",
  "detections": [{"class": "garbage", "issue": "garbage_dumping", "confidence": 0.91, "bbox": [x1,y1,x2,y2]}],
  "image_width": 1280, "image_height": 960,
  "department": "sanitation", "department_name": "...",
  "no_parking_zone": null | "Hampankatta Junction",
  "models_used": ["garbage", "vehicle"], "model": "garbage",
  "mock": false
}
"""
from __future__ import annotations

from . import config, severity
from .detector import Box
from .zones import find_no_parking_zone


def analyze(boxes: list[Box], width: int, height: int, lat: float | None, lon: float | None, models_used: list[str]) -> dict:
    image_area = float(width * height) or 1.0
    zone = find_no_parking_zone(lat, lon)

    # Illegal-parking rule: a detected vehicle only counts if it's in a
    # no-parking zone, or it dominates the frame (the thing being reported).
    kept: list[Box] = []
    for b in boxes:
        if b.issue == "illegal_parking" and b.model == "vehicle":
            if not zone and b.area() / image_area < config.PARKING_MIN_AREA_OUTSIDE_ZONE:
                continue
        kept.append(b)

    by_issue: dict[str, list[Box]] = {}
    for b in kept:
        by_issue.setdefault(b.issue, []).append(b)

    base = {
        "image_width": width,
        "image_height": height,
        "no_parking_zone": zone["name"] if zone else None,
        "models_used": models_used,
        "mock": False,
    }

    if not by_issue:
        return {**base, "issue": None, "confidence": None, "severity": None, "severity_reason": None,
                "detections": [], "department": None, "department_name": None, "model": None}

    # Pick the issue with the most confident detection.
    issue = max(by_issue, key=lambda k: max(b.confidence for b in by_issue[k]))
    chosen = sorted(by_issue[issue], key=lambda b: b.confidence, reverse=True)
    level, reason = severity.estimate(issue, chosen, width, height, zone if issue == "illegal_parking" else None)
    dept = config.ISSUE_ROUTING[issue]

    return {
        **base,
        "issue": issue,
        "confidence": round(chosen[0].confidence, 4),
        "severity": level,
        "severity_reason": reason,
        "detections": [
            {"class": b.class_name, "issue": b.issue, "confidence": round(b.confidence, 4),
             "bbox": [round(v, 1) for v in b.bbox]}
            for b in chosen
        ],
        "department": dept,
        "department_name": config.DEPARTMENTS[dept],
        "model": chosen[0].model,
    }
