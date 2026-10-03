"""
Severity engine — separate from YOLO on purpose.

YOLO tells us WHAT and WHERE. How serious it is comes from simple,
explainable rules on the detections (thresholds live in config.py):

  Garbage Dumping : total area covered by garbage + number of piles
  Pothole         : size of the largest pothole + number of potholes
  Illegal Parking : how much of the frame the vehicle blocks + count,
                    raised one level inside a no-parking zone, one level
                    when a no-parking sign is visible, and one level when
                    the vehicle stands on the footpath

Area is measured from the segmentation MASK when the model provides one
(YOLOv8-seg), otherwise from the bounding box. Boxes overstate irregular
shapes: a crescent-shaped pothole or a spread-out pile can fill well
under half of its box, which used to push severity a level too high.
"""
from __future__ import annotations

import cv2
import numpy as np

from . import config
from .detector import Box
from .signs import SignHit

LEVELS = ["Low", "Medium", "High"]

# Masks are rasterised on a canvas this wide to compute their union. Area
# is a ratio, so this resolution is plenty and keeps it fast.
_UNION_CANVAS_W = 400


def _union_fraction(boxes: list[Box], width: int, height: int) -> float:
    """Share of the image covered by the union of the boxes' masks."""
    scale = _UNION_CANVAS_W / max(1, width)
    h = max(1, round(height * scale))
    canvas = np.zeros((h, _UNION_CANVAS_W), dtype=np.uint8)
    for b in boxes:
        pts = (np.asarray(b.polygon, dtype=float) * scale).round().astype(np.int32)
        cv2.fillPoly(canvas, [pts], 1)
    return float(canvas.mean())


def _raise(level: str) -> str:
    return LEVELS[min(2, LEVELS.index(level) + 1)]


def estimate(issue: str, boxes: list[Box], width: int, height: int, zone: dict | None = None,
             sign: SignHit | None = None) -> tuple[str, str]:
    rules = config.SEVERITY_RULES[issue]
    image_area = float(width * height) or 1.0
    count = len(boxes)
    masked = bool(boxes) and all(b.polygon for b in boxes)

    if issue == "garbage_dumping":
        # total covered area; with masks, overlapping piles count once
        area = _union_fraction(boxes, width, height) if masked else min(1.0, sum(b.area() for b in boxes) / image_area)
    else:
        area = max((b.area() for b in boxes), default=0.0) / image_area

    if area >= rules["high_area"] or count >= rules["high_count"]:
        level = "High"
    elif area >= rules["medium_area"] or count >= rules["medium_count"]:
        level = "Medium"
    else:
        level = "Low"

    pct = round(area * 100)
    plural = lambda n, word: f"{n} {word}{'s' if n != 1 else ''}"  # noqa: E731
    if issue == "garbage_dumping":
        reason = f"Garbage covers about {pct}% of the photo across {plural(count, 'pile')}."
    elif issue == "pothole":
        reason = f"Largest pothole covers about {pct}% of the photo; {plural(count, 'pothole')} detected."
    else:
        reason = f"Vehicle occupies about {pct}% of the frame; {plural(count, 'vehicle')} detected."
    if masked:
        reason += " Measured from the segmentation mask."

    if issue == "illegal_parking":
        on_footpath = [b for b in boxes if (b.footpath or 0) >= config.FOOTPATH_MIN_SHARE]
        if on_footpath:
            level = _raise(level)
            reason += f" Parked on the footpath ({round(on_footpath[0].footpath * 100)}% of its ground contact is sidewalk)."
        if zone:
            level = _raise(level)
            reason += f" Inside no-parking zone: {zone['name']}."
        if sign:
            level = _raise(level)
            what = "A no-parking sign" if sign.source == "symbol" else f'A sign reading "{sign.text}"'
            reason += f" {what} is visible in the photo."

    return level, reason
