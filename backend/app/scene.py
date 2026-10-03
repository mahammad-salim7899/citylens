"""
Scene segmentation: which pixels are ROAD and which are SIDEWALK.

Used by the Illegal Parking rule. YOLO only says "there is a car here";
it can't tell whether the car is in a lane or up on the footpath. A
semantic segmentation model pretrained on Cityscapes (street scenes)
labels every pixel, so we look at the strip where the vehicle meets the
ground and measure how much of it is sidewalk.

    vehicle box ──► ground-contact strip ──► sidewalk vs road pixels

No training needed: the default model is NVIDIA's SegFormer-B0 trained on
Cityscapes, downloaded from Hugging Face on first run (≈15 MB). Set
CITYLENS_SCENE_MODEL to an empty value to turn this off; parking then
falls back to the size + no-parking-zone rules.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

import cv2
import numpy as np

from . import config
from .preprocessing import PreparedImage

log = logging.getLogger("citylens.scene")

@dataclass
class SceneMap:
    labels: np.ndarray          # H×W class ids at the working resolution
    factor: float               # ORIGINAL image px → label-map px
    road_id: int
    sidewalk_id: int

    def coverage(self) -> dict:
        total = float(self.labels.size) or 1.0
        return {
            "road": round(float((self.labels == self.road_id).sum()) / total, 3),
            "sidewalk": round(float((self.labels == self.sidewalk_id).sum()) / total, 3),
        }

    def ground_share(self, bbox: list[float]) -> float | None:
        """Share of a box's centre region that is road or sidewalk (0–1).
        Used to reject "potholes" that aren't in the ground at all."""
        h, w = self.labels.shape
        x1, y1, x2, y2 = (v * self.factor for v in bbox)
        bw, bh = x2 - x1, y2 - y1
        if bw <= 1 or bh <= 1:
            return None
        cx1, cx2 = int(max(0, x1 + 0.25 * bw)), int(min(w, x2 - 0.25 * bw))
        cy1, cy2 = int(max(0, y1 + 0.25 * bh)), int(min(h, y2 - 0.25 * bh))
        core = self.labels[cy1:cy2, cx1:cx2]
        if core.size == 0:
            return None
        ground = int(((core == self.road_id) | (core == self.sidewalk_id)).sum())
        return round(ground / core.size, 3)

    def footpath_share(self, bbox: list[float]) -> float | None:
        """Share of a vehicle's ground contact that is sidewalk (0–1).

        Looks at a strip around the bottom edge of the box — the tyres —
        and counts only road and sidewalk pixels, so the vehicle itself
        and anything else in the strip are ignored. Returns None when too
        little ground is visible to judge (e.g. the box is cut off by the
        bottom of the photo or the strip is all car).
        """
        h, w = self.labels.shape
        x1, y1, x2, y2 = (v * self.factor for v in bbox)
        bw, bh = x2 - x1, y2 - y1
        if bw <= 1 or bh <= 1:
            return None
        cx1, cx2 = int(max(0, x1 + 0.15 * bw)), int(min(w, x2 - 0.15 * bw))
        ry1, ry2 = int(max(0, y2 - 0.12 * bh)), int(min(h, y2 + 0.08 * bh))
        strip = self.labels[ry1:ry2, cx1:cx2]
        if strip.size == 0:
            return None
        road = int((strip == self.road_id).sum())
        side = int((strip == self.sidewalk_id).sum())
        ground = road + side
        if ground < max(12, 0.15 * strip.size):
            return None
        return round(side / ground, 3)


class SceneSegmenter:
    def __init__(self) -> None:
        self.model_id = config.SCENE_MODEL
        self.status_text = "not loaded"
        self._model = None
        self._processor = None
        self._ids: tuple[int, int] | None = None

    def load(self) -> None:
        if not self.model_id:
            self.status_text = "disabled"
            return
        try:
            import torch  # noqa: F401  (ensures the backend exists)
            from transformers import AutoImageProcessor, SegformerForSemanticSegmentation
        except ImportError:
            self.status_text = "transformers not installed"
            log.warning("scene segmentation disabled — run: pip install transformers")
            return
        try:
            self._processor = AutoImageProcessor.from_pretrained(self.model_id)
            self._model = SegformerForSemanticSegmentation.from_pretrained(self.model_id).eval()
            label2id = {k.lower(): int(v) for k, v in self._model.config.label2id.items()}
            if "road" not in label2id or "sidewalk" not in label2id:
                raise ValueError(f"model has no road/sidewalk classes: {sorted(label2id)[:10]}…")
            self._ids = (label2id["road"], label2id["sidewalk"])
            self.status_text = "loaded"
            log.info("scene model loaded: %s", self.model_id)
        except Exception as e:  # noqa: BLE001 — report any load failure, keep serving
            self._model = None
            self.status_text = f"error: {e}"
            # One line, not a traceback: the usual cause is simply no internet
            # on the first run, and the app works fine without this model.
            log.warning("scene model %s unavailable (%s) — parking uses the size/zone rules",
                        self.model_id, str(e).splitlines()[0][:160])

    @property
    def loaded(self) -> bool:
        return self._model is not None

    def status(self) -> dict:
        return {"status": self.status_text, "path": self.model_id, "classes": ["road", "sidewalk"] if self.loaded else []}

    def segment(self, img: PreparedImage) -> SceneMap | None:
        if not self.loaded:
            return None
        import torch

        bgr = img.bgr
        h, w = bgr.shape[:2]
        s = min(1.0, config.SCENE_MAX_SIDE / max(h, w))
        small = cv2.resize(bgr, (round(w * s), round(h * s)), interpolation=cv2.INTER_AREA) if s < 1 else bgr
        rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
        # Keep the photo's own aspect ratio; SegFormer accepts any size.
        inputs = self._processor(images=rgb, return_tensors="pt", do_resize=False)
        with torch.no_grad():
            logits = self._model(**inputs).logits
        logits = torch.nn.functional.interpolate(logits, size=small.shape[:2], mode="bilinear", align_corners=False)
        labels = logits.argmax(1)[0].cpu().numpy().astype(np.uint8)
        road, side = self._ids
        return SceneMap(labels=labels, factor=img.scale * s, road_id=road, sidewalk_id=side)
