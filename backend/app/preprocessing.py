"""
OpenCV preprocessing: bytes → clean BGR image ready for YOLO.

1. Decode the upload (JPG/PNG) with OpenCV.
2. Apply EXIF orientation (phones store portrait photos rotated).
3. Downscale very large photos (keeps inference fast; YOLO resizes to
   640 internally anyway).
4. Optional CLAHE contrast boost for dark photos (off by default).

Returns the image plus the scale factor so detections can be mapped
back to the ORIGINAL image's pixel coordinates for the frontend overlay.
"""
from __future__ import annotations

import io
from dataclasses import dataclass

import cv2
import numpy as np
from PIL import Image, ImageOps

from . import config


class InvalidImageError(ValueError):
    pass


@dataclass
class PreparedImage:
    bgr: np.ndarray          # image fed to the models
    original_width: int      # size of the image the client sent (after orientation fix)
    original_height: int
    scale: float             # bgr size / original size


def _exif_upright(data: bytes) -> np.ndarray | None:
    """Use Pillow only to honour EXIF orientation; returns BGR or None."""
    try:
        with Image.open(io.BytesIO(data)) as im:
            im = ImageOps.exif_transpose(im).convert("RGB")
            return cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR)
    except Exception:
        return None


def prepare(data: bytes) -> PreparedImage:
    if not data:
        raise InvalidImageError("Empty upload.")
    if len(data) > config.MAX_UPLOAD_MB * 1024 * 1024:
        raise InvalidImageError(f"Image is larger than {config.MAX_UPLOAD_MB} MB.")

    img = _exif_upright(data)
    if img is None:
        img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise InvalidImageError("Could not read the image. Please upload a JPG or PNG photo.")

    h, w = img.shape[:2]
    scale = min(1.0, config.MAX_IMAGE_SIDE / max(h, w))
    if scale < 1.0:
        img = cv2.resize(img, (round(w * scale), round(h * scale)), interpolation=cv2.INTER_AREA)

    if config.ENABLE_CLAHE:
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        l = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(l)
        img = cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)

    return PreparedImage(bgr=img, original_width=w, original_height=h, scale=scale)
