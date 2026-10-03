"""
YOLO detection layer.

Three model slots, each optional:

  garbage  – your trained model (citylens_garbage-2/weights/best.pt)
  pothole  – a pothole model trained the same way (add when ready)
  vehicle  – standard COCO-pretrained YOLOv8n; finds car / motorcycle /
             bus / truck for the Illegal Parking rule

A slot whose weights file is missing is reported as "missing" and
skipped. The API never invents detections.

Segmentation models (YOLOv8-seg, e.g. *-seg.pt) are used the same way,
but each detection also carries its instance mask as a polygon. The
severity engine then measures the real covered area instead of the
bounding box, which badly overstates irregular shapes like potholes.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from . import config
from .preprocessing import PreparedImage

log = logging.getLogger("citylens.detector")


@dataclass
class Box:
    issue: str                # CityLens issue id
    class_name: str           # raw class name from the model
    confidence: float
    bbox: list[float]         # [x1, y1, x2, y2] in ORIGINAL image pixels
    model: str
    # Instance mask outline from a segmentation model, [[x, y], ...] in
    # ORIGINAL image pixels. None for detection-only models.
    polygon: list[list[float]] | None = None
    # Set by the analysis step for vehicles: share of the vehicle's ground
    # contact strip that sits on sidewalk / road (scene segmentation).
    footpath: float | None = None

    def box_area(self) -> float:
        x1, y1, x2, y2 = self.bbox
        return max(0.0, x2 - x1) * max(0.0, y2 - y1)

    def mask_area(self) -> float | None:
        """Area enclosed by the mask outline (shoelace formula)."""
        if not self.polygon or len(self.polygon) < 3:
            return None
        pts = np.asarray(self.polygon, dtype=float)
        x, y = pts[:, 0], pts[:, 1]
        return float(0.5 * abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1))))

    def area(self) -> float:
        """Best available area: the mask if we have one, else the box."""
        m = self.mask_area()
        return m if m is not None else self.box_area()


@dataclass
class ModelSlot:
    key: str
    path: str
    kind: str                 # "issue" or "vehicle"
    model: object = None
    status: str = "not loaded"
    classes: list[str] = field(default_factory=list)
    conf: float | None = None          # per-slot threshold; None = config.CONFIDENCE_THRESHOLD
    augment: bool = False              # test-time augmentation (flips/rescales)
    open_vocab: bool = False           # YOLOE / YOLO-World built from text prompts


class Detector:
    def __init__(self) -> None:
        self.slots = [
            ModelSlot("garbage", config.GARBAGE_MODEL, "issue"),
            ModelSlot("pothole", config.POTHOLE_MODEL, "issue"),
            ModelSlot("vehicle", config.VEHICLE_MODEL, "vehicle"),
        ]

    # ── loading ─────────────────────────────────────────────────────
    def load(self) -> None:
        try:
            from ultralytics import YOLO  # heavy import, done once
        except ImportError:
            for s in self.slots:
                s.status = "ultralytics not installed"
            log.error("ultralytics is not installed — run: pip install -r requirements.txt")
            return

        for s in self.slots:
            if not s.path:
                s.status = "disabled"
                continue
            # Custom models must exist on disk; the COCO vehicle model may be
            # a bare name like "yolov8n.pt" that Ultralytics downloads itself.
            if s.kind == "issue" and not Path(s.path).is_file():
                s.status = f"missing (put weights at {s.path})"
                log.warning("%s model not found at %s — skipping", s.key, s.path)
                continue
            try:
                s.model = YOLO(s.path)
                s.classes = [str(n) for n in s.model.names.values()]
                s.open_vocab = _is_open_vocab(s.model)
                if s.open_vocab:
                    s.conf = config.OPEN_VOCAB_CONF
                elif s.kind == "vehicle":
                    s.conf = min(config.VEHICLE_VETO_CONF, config.CONFIDENCE_THRESHOLD)
                    s.augment = config.VEHICLE_TTA
                s.status = "loaded"
                log.info("%s model loaded: %s classes=%s%s", s.key, s.path, s.classes,
                         f" (open-vocabulary, conf {s.conf})" if s.open_vocab else "")
            except Exception as e:  # noqa: BLE001 — report any load failure
                s.status = f"error: {e}"
                log.exception("failed to load %s model", s.key)

    def status(self) -> dict:
        return {s.key: {"status": s.status, "path": s.path, "classes": s.classes, "open_vocab": s.open_vocab}
                for s in self.slots}

    def loaded_models(self) -> list[str]:
        return [s.key for s in self.slots if s.model is not None]

    # ── inference ───────────────────────────────────────────────────
    def detect(self, img: PreparedImage) -> list[Box]:
        boxes: list[Box] = []
        for s in self.slots:
            if s.model is None:
                continue
            conf = s.conf if s.conf is not None else config.CONFIDENCE_THRESHOLD
            result = s.model.predict(img.bgr, conf=conf, imgsz=config.IMAGE_SIZE, augment=s.augment, verbose=False)[0]
            names = result.names
            # masks.xy: one polygon per box, already in the coordinates of the
            # image we passed in (img.bgr); None for detection-only models.
            masks = getattr(result, "masks", None)
            polygons = list(masks.xy) if masks is not None else []
            for i, b in enumerate(result.boxes):
                cls_name = str(names[int(b.cls[0])]).strip()
                key = cls_name.lower().replace(" ", "_").replace("-", "_")
                if s.kind == "vehicle":
                    if key not in config.VEHICLE_CLASSES:
                        continue
                    issue = "illegal_parking"  # candidate — the parking rule decides later
                else:
                    issue = config.CLASS_ALIASES.get(key)
                    if issue is None:
                        continue
                x1, y1, x2, y2 = (float(v) / img.scale for v in b.xyxy[0].tolist())
                polygon = _to_original(polygons[i], img.scale) if i < len(polygons) else None
                boxes.append(Box(issue, cls_name, float(b.conf[0]), [x1, y1, x2, y2], s.key, polygon))
        return boxes


def _to_original(poly, scale: float, max_points: int = 80) -> list[list[float]] | None:
    """Mask polygon → original-image pixels, thinned to keep responses small."""
    pts = np.asarray(poly, dtype=float).reshape(-1, 2)
    if len(pts) < 3:
        return None
    if len(pts) > max_points:
        pts = pts[np.linspace(0, len(pts) - 1, max_points).astype(int)]
    return (pts / scale).round(1).tolist()


def _is_open_vocab(yolo) -> bool:
    """YOLOE / YOLO-World checkpoints (detected by their network type)."""
    inner = type(getattr(yolo, "model", None)).__name__
    return inner.startswith("YOLOE") or inner == "WorldModel"
