"""
CityLens backend configuration.

Everything you might want to tune lives here: model paths, class-name
mapping, severity thresholds, department routing and no-parking zones.
Values can be overridden with environment variables (see .env.example).
"""
from __future__ import annotations

import os
import secrets
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("CITYLENS_DATA_DIR", BASE_DIR / "data"))
UPLOAD_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "citylens.db"

# ── YOLO models ───────────────────────────────────────────────────────
# Copy your trained weights into backend/models/ or point the env vars
# at them. A model whose file is missing is simply skipped (the API
# reports it in /api/health) — nothing is faked.
GARBAGE_MODEL = os.getenv(
    "CITYLENS_GARBAGE_MODEL",
    str(BASE_DIR / "models" / "citylens_garbage.pt"),  # = runs/detect/citylens_garbage-2/weights/best.pt
)
POTHOLE_MODEL = os.getenv("CITYLENS_POTHOLE_MODEL", str(BASE_DIR / "models" / "citylens_pothole.pt"))
# Standard COCO-pretrained YOLO, downloaded automatically
# by Ultralytics the first time (needs internet once).
# yolov8s, not yolov8n: on a top-down street photo the nano model found
# 3 of ~10 parked cars, the small one 6 (still downloaded automatically).
VEHICLE_MODEL = os.getenv("CITYLENS_VEHICLE_MODEL", "yolov8s.pt")

# Semantic segmentation of the street (road vs sidewalk) for the Illegal
# Parking rule. Cityscapes-pretrained SegFormer, downloaded on first run.
# Set to an empty value to disable.
SCENE_MODEL = os.getenv("CITYLENS_SCENE_MODEL", "nvidia/segformer-b0-finetuned-cityscapes-1024-1024")
SCENE_MAX_SIDE = int(os.getenv("CITYLENS_SCENE_SIDE", "640"))   # resolution the scene model runs at
# A vehicle counts as "on the footpath" when at least this share of its
# ground contact is sidewalk.
FOOTPATH_MIN_SHARE = float(os.getenv("CITYLENS_FOOTPATH_SHARE", "0.5"))

CONFIDENCE_THRESHOLD = float(os.getenv("CITYLENS_CONF", "0.35"))
# Open-vocabulary models (YOLOE / YOLO-World, built from text prompts by
# training/make_garbage_model.py) score lower than trained models even
# when right, so they get their own threshold. Applied automatically.
OPEN_VOCAB_CONF = float(os.getenv("CITYLENS_OPEN_VOCAB_CONF", "0.2"))
IMAGE_SIZE = int(os.getenv("CITYLENS_IMGSZ", "640"))

# ── OpenCV preprocessing ──────────────────────────────────────────────
MAX_IMAGE_SIDE = 1280        # larger uploads are downscaled before inference
ENABLE_CLAHE = os.getenv("CITYLENS_CLAHE", "0") == "1"   # contrast boost for dark photos; off by default
                                                         # because your model was trained on normal photos
MAX_UPLOAD_MB = 15

# ── Class names → CityLens issue ids ─────────────────────────────────
# Whatever names your models use ("garbage", "trash", "Pothole"…) are
# lower-cased and looked up here. Same table as frontend/src/config/issueTypes.js.
CLASS_ALIASES = {
    "garbage_dumping": "garbage_dumping", "garbage": "garbage_dumping", "trash": "garbage_dumping",
    "waste": "garbage_dumping", "litter": "garbage_dumping", "rubbish": "garbage_dumping", "dump": "garbage_dumping",
    # text prompts used by training/make_garbage_model.py
    "overflowing_garbage": "garbage_dumping", "garbage_bag": "garbage_dumping", "trash_bag": "garbage_dumping",
    "pile_of_garbage": "garbage_dumping",
    # NOT mapped on purpose: "dumpster", "garbage_bin". They are decoy prompts
    # that soak up bins, so an empty bin isn't reported as garbage.
    "pothole": "pothole", "potholes": "pothole",
    "illegal_parking": "illegal_parking", "parked_vehicle": "illegal_parking",
}
# COCO classes from the vehicle model that count as a parked vehicle.
VEHICLE_CLASSES = {"car", "motorcycle", "bus", "truck"}

SUPPORTED_ISSUES = ("pothole", "illegal_parking", "garbage_dumping")

# ── Department routing (same as frontend/src/config/departments.js) ──
DEPARTMENTS = {
    "roads": "Road / Public Works Department",
    "traffic": "Traffic / Municipal Enforcement Department",
    "sanitation": "Municipal Solid Waste / Sanitation Department",
}
ISSUE_ROUTING = {
    "pothole": "roads",
    "illegal_parking": "traffic",
    "garbage_dumping": "sanitation",
}

# ── Severity thresholds (fraction of the image area) ─────────────────
SEVERITY_RULES = {
    # garbage: total area covered by garbage boxes, and number of piles
    "garbage_dumping": {"high_area": 0.20, "medium_area": 0.07, "high_count": 4, "medium_count": 2},
    # pothole: area of the LARGEST pothole, and number of potholes
    "pothole": {"high_area": 0.12, "medium_area": 0.04, "high_count": 3, "medium_count": 2},
    # parking: area of the largest vehicle (how much road it blocks), and vehicle count
    "illegal_parking": {"high_area": 0.25, "medium_area": 0.10, "high_count": 3, "medium_count": 2},
}

# A vehicle is only proposed as "illegal parking" if it is inside a
# no-parking zone, OR a no-parking sign is visible in the photo (OCR or
# symbol), OR parked on the footpath (scene segmentation), OR it
# is large in the frame (clearly the subject of the photo, likely
# obstructing). Otherwise a car in the background of a garbage photo
# would hijack the result.
PARKING_MIN_AREA_OUTSIDE_ZONE = 0.12

# Cross-checks that reject impossible potholes (see analysis.py). From
# above, a dark car roof looks just like a pothole.
POTHOLE_MAX_VEHICLE_OVERLAP = 0.3   # pothole box this much inside a car box → it's the car
POTHOLE_MIN_GROUND_SHARE = 0.3      # pothole must be on road/pavement pixels (scene model)
# The vehicle model runs at this lower threshold so that cars it is less
# sure about can still veto a "pothole" on their roof. Vehicles below
# CONFIDENCE_THRESHOLD are used ONLY for that — never reported as parking.
VEHICLE_VETO_CONF = float(os.getenv("CITYLENS_VEHICLE_VETO_CONF", "0.2"))
# Test-time augmentation for the vehicle model: it also looks at flipped and
# rescaled copies of the photo. On a top-down shot of 10 parked cars,
# yolov8s found 7 without it and all 10 with it (~0.7 s on CPU, less on GPU).
VEHICLE_TTA = os.getenv("CITYLENS_VEHICLE_TTA", "1") == "1"

# ── No-parking signs in the photo (app/signs.py) ─────────────────────
# OCR languages for EasyOCR (English + Kannada for Mangaluru). Kannada and
# Hindi can't share one EasyOCR reader; use "en,hi" for Hindi boards.
# Empty value turns OCR off; the no-parking SYMBOL is still detected.
OCR_LANGS = os.getenv("CITYLENS_OCR_LANGS", "en,kn")
SIGN_OCR_MIN_CONF = float(os.getenv("CITYLENS_SIGN_OCR_CONF", "0.3"))   # ignore OCR text below this
SIGN_SYMBOL_MIN_RADIUS = 10   # px in the prepared image; smaller red rings are ignored

# ── No-parking zones (name, latitude, longitude, radius in metres) ───
# Example Mangaluru locations — replace with real notified zones.
NO_PARKING_ZONES = [
    {"name": "Hampankatta Junction", "lat": 12.8657, "lon": 74.8427, "radius_m": 150},
    {"name": "State Bank Bus Stand", "lat": 12.8631, "lon": 74.8364, "radius_m": 200},
    {"name": "Kottara Chowki Junction", "lat": 12.9168, "lon": 74.8551, "radius_m": 120},
    {"name": "Lalbagh Bus Stop", "lat": 12.8801, "lon": 74.8393, "radius_m": 100},
]

# ── Complaint IDs ─────────────────────────────────────────────────────
# First complaint becomes CL-<year>-00123 (matches the demo script).
ID_START_SEQUENCE = int(os.getenv("CITYLENS_ID_START", "122"))

# ── Reverse geocoding (OpenStreetMap Nominatim, free) ────────────────
NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
NOMINATIM_USER_AGENT = os.getenv("CITYLENS_GEOCODER_UA", "CityLens-PBL-Project/1.0 (student project)")

# ── CORS (frontend dev server) ────────────────────────────────────────
CORS_ORIGINS = os.getenv("CITYLENS_CORS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

# ── Status workflow ───────────────────────────────────────────────────
STATUS_FLOW = ["new", "under_review", "action_assigned", "action_in_progress", "resolved"]
ALL_STATUSES = STATUS_FLOW + ["rejected"]
CLOSED_STATUSES = {"resolved", "rejected"}
NOTE_REQUIRED = {"resolved", "rejected"}

# ── Authentication ────────────────────────────────────────────────────
ROLES = ("citizen", "officer")

JWT_ALGORITHM = "HS256"
JWT_TTL_HOURS = int(os.getenv("CITYLENS_JWT_TTL_HOURS", "12"))

MIN_PASSWORD_LENGTH = 8
# PBKDF2 iterations. Higher = slower to crack and slower to log in.
PBKDF2_ROUNDS = int(os.getenv("CITYLENS_PBKDF2_ROUNDS", "240000"))


def _resolve_jwt_secret() -> tuple[str, bool]:
    """(secret, came_from_env).

    In production set CITYLENS_JWT_SECRET. For development we generate a
    random secret once and keep it in data/.jwt_secret so that restarting
    uvicorn doesn't sign everyone out. It is deliberately NOT a hardcoded
    default: a shipped default secret lets anyone forge an officer token.
    """
    from_env = os.getenv("CITYLENS_JWT_SECRET", "").strip()
    if from_env:
        return from_env, True

    path = DATA_DIR / ".jwt_secret"
    try:
        if path.is_file():
            existing = path.read_text(encoding="utf-8").strip()
            if existing:
                return existing, False
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        generated = secrets.token_urlsafe(48)
        path.write_text(generated, encoding="utf-8")
        try:
            path.chmod(0o600)  # best effort; a no-op on most Windows setups
        except OSError:
            pass
        return generated, False
    except OSError:
        # Read-only data dir: fall back to a per-process secret. Tokens
        # then stop working on restart, which is safe, just inconvenient.
        return secrets.token_urlsafe(48), False


JWT_SECRET, JWT_SECRET_FROM_ENV = _resolve_jwt_secret()

# ── Seeded officer accounts ───────────────────────────────────────────
# Created once, only if the users table is empty. One officer per
# department so the authority side is demoable immediately. Names match
# the frontend's demo accounts so screenshots stay consistent.
SEED_OFFICERS = [
    {"email": "ravi.shenoy@citylens.local", "name": "Ravi Shenoy",
     "designation": "Health Inspector", "department": "sanitation"},
    {"email": "anitha.kamath@citylens.local", "name": "Anitha Kamath",
     "designation": "Assistant Executive Engineer", "department": "roads"},
    {"email": "divya.poojary@citylens.local", "name": "Divya Poojary",
     "designation": "Traffic Sub-Inspector", "department": "traffic"},
]
# Demo password for the seeded officers. Override it — and read the
# warning the server logs at startup if you don't.
SEED_OFFICER_PASSWORD = os.getenv("CITYLENS_SEED_OFFICER_PASSWORD", "citylens-demo")
SEED_PASSWORD_IS_DEFAULT = "CITYLENS_SEED_OFFICER_PASSWORD" not in os.environ
