"""
YOLO detection layer.

Three model slots, each optional:

  garbage  – your trained model (citylens_garbage-2/weights/best.pt)
  pothole  – a pothole model trained the same way (add when ready)
  vehicle  – standard COCO-pretrained YOLOv8n; finds car / motorcycle /
             bus / truck for the Illegal Parking rule

A slot whose weights file is missing is reported as "missing" and
skipped. The API never invents detections.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

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

    def area(self) -> float:
        x1, y1, x2, y2 = self.bbox
        return max(0.0, x2 - x1) * max(0.0, y2 - y1)


@dataclass
class ModelSlot:
    key: str
    path: str
    kind: str                 # "issue" or "vehicle"
    model: object = None
    status: str = "not loaded"
    classes: list[str] = field(default_factory=list)


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
                s.status = "loaded"
                log.info("%s model loaded: %s classes=%s", s.key, s.path, s.classes)
            except Exception as e:  # noqa: BLE001 — report any load failure
                s.status = f"error: {e}"
                log.exception("failed to load %s model", s.key)

    def status(self) -> dict:
        return {s.key: {"status": s.status, "path": s.path, "classes": s.classes} for s in self.slots}

    def loaded_models(self) -> list[str]:
        return [s.key for s in self.slots if s.model is not None]

    # ── inference ───────────────────────────────────────────────────
    def detect(self, img: PreparedImage) -> list[Box]:
        boxes: list[Box] = []
        for s in self.slots:
            if s.model is None:
                continue
            result = s.model.predict(img.bgr, conf=config.CONFIDENCE_THRESHOLD, imgsz=config.IMAGE_SIZE, verbose=False)[0]
            names = result.names
            for b in result.boxes:
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
                boxes.append(Box(issue, cls_name, float(b.conf[0]), [x1, y1, x2, y2], s.key))
        return boxes
