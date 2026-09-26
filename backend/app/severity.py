"""
Severity engine — separate from YOLO on purpose.

YOLO tells us WHAT and WHERE. How serious it is comes from simple,
explainable rules on the detections (thresholds live in config.py):

  Garbage Dumping : total area covered by garbage + number of piles
  Pothole         : size of the largest pothole + number of potholes
  Illegal Parking : how much of the frame the vehicle blocks + count,
                    raised one level inside a no-parking zone
"""
from __future__ import annotations

from . import config
from .detector import Box

LEVELS = ["Low", "Medium", "High"]


def estimate(issue: str, boxes: list[Box], width: int, height: int, zone: dict | None = None) -> tuple[str, str]:
    rules = config.SEVERITY_RULES[issue]
    image_area = float(width * height) or 1.0
    count = len(boxes)
    largest = max((b.area() for b in boxes), default=0.0) / image_area
    total = min(1.0, sum(b.area() for b in boxes) / image_area)

    area = total if issue == "garbage_dumping" else largest

    if area >= rules["high_area"] or count >= rules["high_count"]:
        level = "High"
    elif area >= rules["medium_area"] or count >= rules["medium_count"]:
        level = "Medium"
    else:
        level = "Low"

    pct = round(area * 100)
    if issue == "garbage_dumping":
        reason = f"Garbage covers about {pct}% of the photo across {count} pile{'s' if count != 1 else ''}."
    elif issue == "pothole":
        reason = f"Largest pothole covers about {pct}% of the photo; {count} pothole{'s' if count != 1 else ''} detected."
    else:
        reason = f"Vehicle occupies about {pct}% of the frame; {count} vehicle{'s' if count != 1 else ''} detected."

    if issue == "illegal_parking" and zone:
        level = LEVELS[min(2, LEVELS.index(level) + 1)]
        reason += f" Inside no-parking zone: {zone['name']}."

    return level, reason
