"""
CityLens API (FastAPI)

    React → FastAPI → OpenCV preprocessing → YOLO → severity engine
          → department routing → complaint management → authority → citizen

Every route below the auth section requires a JWT. Identity comes from
the token and nothing else: a citizen only ever sees their own
complaints, and an officer's name and department are read from their
token rather than from the request. See app/auth.py.

Run:  uvicorn app.main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""
from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import analysis, auth, config, geocode
from .detector import Detector
from .preprocessing import InvalidImageError, prepare
from .store import EmailTakenError, Store, now_iso, public_user

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("citylens")

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

detector = Detector()
store: Store | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global store
    store = store or Store()
    created = store.seed_officers()
    if created:
        log.info("Seeded %d officer accounts (password: CITYLENS_SEED_OFFICER_PASSWORD).", created)
    if not config.JWT_SECRET_FROM_ENV:
        log.warning("CITYLENS_JWT_SECRET is not set — using the development secret in data/.jwt_secret. "
                    "Set it before deploying anywhere.")
    if config.SEED_PASSWORD_IS_DEFAULT:
        log.warning("Seeded officers use the default demo password %r. "
                    "Set CITYLENS_SEED_OFFICER_PASSWORD before deploying anywhere.",
                    config.SEED_OFFICER_PASSWORD)
    if not detector.loaded_models():
        detector.load()
    yield


app = FastAPI(title="CityLens API", version="1.1", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)
config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=config.UPLOAD_DIR), name="uploads")


def _store() -> Store:
    assert store is not None
    return store


async def _read_image(upload: UploadFile) -> bytes:
    if upload.content_type not in {"image/jpeg", "image/jpg", "image/png"}:
        raise HTTPException(415, "Please upload a JPG, JPEG or PNG image.")
    return await upload.read()


# ── Identity dependencies ─────────────────────────────────────────────
# bearer_identity verifies the signature; these then confirm the user
# still exists, so a deleted account loses access immediately instead of
# when its token happens to expire.
def current_user(identity: auth.Identity = Depends(auth.bearer_identity)) -> dict:
    user = _store().get_user(identity.id)
    if user is None:
        raise HTTPException(401, "This account no longer exists.")
    return user


def require_citizen(user: dict = Depends(current_user)) -> dict:
    if user["role"] != "citizen":
        raise HTTPException(403, "This action is for citizen accounts.")
    return user


def require_officer(user: dict = Depends(current_user)) -> dict:
    if user["role"] != "officer":
        raise HTTPException(403, "This action is for authority accounts.")
    if not user.get("department"):
        raise HTTPException(403, "This officer account has no department assigned.")
    return user


# ── Health ────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"ok": True, "models": detector.status()}


# ── Auth ──────────────────────────────────────────────────────────────
class RegisterBody(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    email: str = Field(..., pattern=EMAIL_PATTERN, max_length=160)
    password: str = Field(..., min_length=config.MIN_PASSWORD_LENGTH, max_length=200)


class LoginBody(BaseModel):
    email: str = Field(..., max_length=160)
    password: str = Field(..., max_length=200)


def _session(user: dict) -> dict:
    token, expires_in = auth.create_token(user)
    return {"token": token, "token_type": "bearer", "expires_in": expires_in, "user": public_user(user)}


@app.post("/api/auth/register", status_code=201)
def register(body: RegisterBody):
    """Citizen self-registration. Officer accounts are seeded server-side
    and cannot be created through the API — otherwise anyone could sign
    themselves up as the traffic department."""
    try:
        user = _store().create_user(
            email=body.email, password=body.password, name=body.name, role="citizen",
        )
    except EmailTakenError as e:
        raise HTTPException(409, str(e)) from e
    except ValueError as e:
        raise HTTPException(422, str(e)) from e
    return _session(user)


@app.post("/api/auth/login")
def login(body: LoginBody):
    user = _store().get_user_by_email(body.email)
    # Same message either way, so the response can't be used to find out
    # which email addresses have accounts.
    if user is None or not auth.verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Incorrect email or password.")
    return _session(user)


@app.get("/api/auth/me")
def me(user: dict = Depends(current_user)):
    return public_user(user)


# ── Detection ─────────────────────────────────────────────────────────
@app.post("/api/detect")
async def detect(
    image: UploadFile = File(...),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    user: dict = Depends(current_user),
):
    if not detector.loaded_models():
        raise HTTPException(503, "No detection model is loaded on the server. Check /api/health.")
    data = await _read_image(image)
    try:
        img = prepare(data)
    except InvalidImageError as e:
        raise HTTPException(400, str(e)) from e
    boxes = detector.detect(img)
    return analysis.analyze(boxes, img.original_width, img.original_height, latitude, longitude, detector.loaded_models())


# ── Geocoding ─────────────────────────────────────────────────────────
@app.get("/api/geocode/reverse")
def reverse_geocode(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    user: dict = Depends(current_user),
):
    result = geocode.reverse(lat, lon)
    if not result["address"]:
        raise HTTPException(502, "Address lookup unavailable.")
    return result


# ── Citizen: complaints ───────────────────────────────────────────────
class ComplaintData(BaseModel):
    issue: str
    severity: str
    severity_source: str = Field("model", pattern="^(model|citizen)$")
    description: str = Field("", max_length=500)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: str | None = None
    location_source: str = Field(..., pattern="^(image_exif|device_gps)$")
    detection: dict = Field(default_factory=dict)


@app.post("/api/complaints", status_code=201)
async def create_complaint(
    image: UploadFile = File(...),
    data: str = Form(...),
    user: dict = Depends(require_citizen),
):
    try:
        payload = ComplaintData(**json.loads(data))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(422, f"Invalid complaint data: {e}") from e
    if payload.issue not in config.SUPPORTED_ISSUES:
        raise HTTPException(422, "Issue must be pothole, illegal_parking or garbage_dumping.")
    if payload.severity not in ("Low", "Medium", "High"):
        raise HTTPException(422, "Severity must be Low, Medium or High.")

    img_bytes = await _read_image(image)
    try:
        prepare(img_bytes)  # validates it's a real image
    except InvalidImageError as e:
        raise HTTPException(400, str(e)) from e

    s = _store()
    dept = config.ISSUE_ROUTING[payload.issue]  # routing is decided by the server, not the client
    now = now_iso()
    address = payload.address or geocode.reverse(payload.latitude, payload.longitude)["address"] or "Address unavailable"
    det = payload.detection or {}
    doc = {
        "user_id": user["id"],  # owner comes from the token, never the request
        "issue": payload.issue,
        "severity": payload.severity,
        "severity_source": payload.severity_source,
        "confidence": None if det.get("corrected_by_citizen") else det.get("ai_confidence"),
        "description": payload.description.strip(),
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "address": address,
        "location_source": payload.location_source,
        "detection": det,
        "image_url": s.save_image(img_bytes, "report"),
        "after_image_url": None,
        "department": dept,
        "status": "new",
        "created_at": now,
        "history": [
            {"status": "new", "at": now, "by": user["name"], "department": None,
             "note": "Complaint submitted.", "kind": "submitted"},
            {"status": "new", "at": now, "by": "CityLens", "department": dept,
             "note": f"Routed to {config.DEPARTMENTS[dept]}.", "kind": "routed"},
        ],
    }
    return s.create(doc)


@app.get("/api/complaints")
def list_complaints(user: dict = Depends(require_citizen)):
    """Only this citizen's complaints."""
    return _store().list(user_id=user["id"])


@app.get("/api/complaints/{complaint_id}")
def get_complaint(complaint_id: str, user: dict = Depends(require_citizen)):
    c = _store().get(complaint_id.upper())
    # 404 rather than 403 when it belongs to someone else: a 403 would
    # confirm the ID exists, which is all an attacker needs to enumerate.
    if not c or c.get("user_id") != user["id"]:
        raise HTTPException(404, "Complaint not found.")
    return c


# ── Authority ─────────────────────────────────────────────────────────
@app.get("/api/authority/complaints")
def authority_list(officer: dict = Depends(require_officer)):
    """The officer's own department queue. The department is taken from the
    token — it used to be a query parameter the client chose freely."""
    return _store().list(department=officer["department"])


def _authority_get(complaint_id: str, officer: dict) -> dict:
    c = _store().get(complaint_id.upper())
    if not c:
        raise HTTPException(404, "Complaint not found.")
    if c["department"] != officer["department"]:
        raise HTTPException(403, "This complaint belongs to another department.")
    return c


@app.get("/api/authority/complaints/{complaint_id}")
def authority_get(complaint_id: str, officer: dict = Depends(require_officer)):
    return _authority_get(complaint_id, officer)


class StatusUpdate(BaseModel):
    status: str
    note: str | None = Field(None, max_length=1000)


@app.patch("/api/authority/complaints/{complaint_id}/status")
def update_status(complaint_id: str, body: StatusUpdate, officer: dict = Depends(require_officer)):
    c = _authority_get(complaint_id, officer)
    current = c["status"]
    if current in config.CLOSED_STATUSES:
        raise HTTPException(409, "This complaint is already closed.")
    if body.status not in config.ALL_STATUSES:
        raise HTTPException(422, "Unknown status.")
    allowed = config.STATUS_FLOW[config.STATUS_FLOW.index(current) + 1:] + ["rejected"]
    if body.status not in allowed:
        raise HTTPException(409, f"Cannot move from {current} to {body.status}.")
    note = (body.note or "").strip()
    if body.status in config.NOTE_REQUIRED and not note:
        raise HTTPException(422, "Describe the action taken before closing this complaint.")

    label = body.status.replace("_", " ").title().replace("In ", "in ")
    c["status"] = body.status
    c["history"].append({"status": body.status, "at": now_iso(), "by": officer["name"],
                         "department": officer["department"],
                         "note": note or f"Status updated to {label}.", "kind": "status"})
    return _store().save(c)


class ActionNote(BaseModel):
    note: str = Field(..., min_length=1, max_length=1000)


@app.post("/api/authority/complaints/{complaint_id}/action")
def add_action(complaint_id: str, body: ActionNote, officer: dict = Depends(require_officer)):
    c = _authority_get(complaint_id, officer)
    if c["status"] in config.CLOSED_STATUSES:
        raise HTTPException(409, "This complaint is already closed.")
    c["history"].append({"status": c["status"], "at": now_iso(), "by": officer["name"],
                         "department": officer["department"],
                         "note": body.note.strip(), "kind": "action"})
    return _store().save(c)


@app.post("/api/authority/complaints/{complaint_id}/evidence")
async def add_evidence(
    complaint_id: str,
    image: UploadFile = File(...),
    officer: dict = Depends(require_officer),
):
    c = _authority_get(complaint_id, officer)
    if c["status"] in config.CLOSED_STATUSES:
        raise HTTPException(409, "This complaint is already closed.")
    data = await _read_image(image)
    try:
        prepare(data)
    except InvalidImageError as e:
        raise HTTPException(400, str(e)) from e
    c["after_image_url"] = _store().save_image(data, "after")
    c["history"].append({"status": c["status"], "at": now_iso(), "by": officer["name"],
                         "department": officer["department"],
                         "note": "Resolution photo uploaded.", "kind": "evidence"})
    return _store().save(c)
