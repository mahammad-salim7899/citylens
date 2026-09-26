"""
CityLens API (FastAPI)

    React → FastAPI → OpenCV preprocessing → YOLO → severity engine
          → department routing → complaint management → authority → citizen

Run:  uvicorn app.main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""
from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import analysis, config, geocode
from .detector import Detector
from .preprocessing import InvalidImageError, prepare
from .store import Store, now_iso

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

detector = Detector()
store: Store | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global store
    store = store or Store()
    if not detector.loaded_models():
        detector.load()
    yield


app = FastAPI(title="CityLens API", version="1.0", lifespan=lifespan)
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


# ── Health ────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"ok": True, "models": detector.status()}


# ── Detection ─────────────────────────────────────────────────────────
@app.post("/api/detect")
async def detect(
    image: UploadFile = File(...),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
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
def reverse_geocode(lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)):
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
async def create_complaint(image: UploadFile = File(...), data: str = Form(...)):
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
            {"status": "new", "at": now, "by": "Citizen", "department": None, "note": "Complaint submitted.", "kind": "submitted"},
            {"status": "new", "at": now, "by": "CityLens", "department": dept,
             "note": f"Routed to {config.DEPARTMENTS[dept]}.", "kind": "routed"},
        ],
    }
    return s.create(doc)


@app.get("/api/complaints")
def list_complaints():
    # Prototype has one citizen; with auth this filters by the logged-in user.
    return _store().list()


@app.get("/api/complaints/{complaint_id}")
def get_complaint(complaint_id: str):
    c = _store().get(complaint_id.upper())
    if not c:
        raise HTTPException(404, "Complaint not found.")
    return c


# ── Authority ─────────────────────────────────────────────────────────
# Until real login exists, the department is passed explicitly and the
# server refuses to act on another department's complaint.
@app.get("/api/authority/complaints")
def authority_list(department: str = Query(...)):
    if department not in config.DEPARTMENTS:
        raise HTTPException(400, "Unknown department.")
    return _store().list(department)


def _authority_get(complaint_id: str, department: str | None = None) -> dict:
    c = _store().get(complaint_id.upper())
    if not c:
        raise HTTPException(404, "Complaint not found.")
    if department and c["department"] != department:
        raise HTTPException(403, "This complaint belongs to another department.")
    return c


@app.get("/api/authority/complaints/{complaint_id}")
def authority_get(complaint_id: str):
    return _authority_get(complaint_id)


class StatusUpdate(BaseModel):
    status: str
    note: str | None = Field(None, max_length=1000)
    officer: str
    department: str


@app.patch("/api/authority/complaints/{complaint_id}/status")
def update_status(complaint_id: str, body: StatusUpdate):
    c = _authority_get(complaint_id, body.department)
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
    c["history"].append({"status": body.status, "at": now_iso(), "by": body.officer, "department": body.department,
                         "note": note or f"Status updated to {label}.", "kind": "status"})
    return _store().save(c)


class ActionNote(BaseModel):
    note: str = Field(..., min_length=1, max_length=1000)
    officer: str
    department: str


@app.post("/api/authority/complaints/{complaint_id}/action")
def add_action(complaint_id: str, body: ActionNote):
    c = _authority_get(complaint_id, body.department)
    if c["status"] in config.CLOSED_STATUSES:
        raise HTTPException(409, "This complaint is already closed.")
    c["history"].append({"status": c["status"], "at": now_iso(), "by": body.officer, "department": body.department,
                         "note": body.note.strip(), "kind": "action"})
    return _store().save(c)


@app.post("/api/authority/complaints/{complaint_id}/evidence")
async def add_evidence(
    complaint_id: str,
    image: UploadFile = File(...),
    officer: str = Form(...),
    department: str | None = Form(None),
):
    c = _authority_get(complaint_id, department)
    if c["status"] in config.CLOSED_STATUSES:
        raise HTTPException(409, "This complaint is already closed.")
    data = await _read_image(image)
    try:
        prepare(data)
    except InvalidImageError as e:
        raise HTTPException(400, str(e)) from e
    c["after_image_url"] = _store().save_image(data, "after")
    c["history"].append({"status": c["status"], "at": now_iso(), "by": officer, "department": c["department"],
                         "note": "Resolution photo uploaded.", "kind": "evidence"})
    return _store().save(c)
