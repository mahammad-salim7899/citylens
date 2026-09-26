# CityLens backend (FastAPI)

```
React → FastAPI → OpenCV preprocessing → YOLO → severity engine → department routing → complaints
```

| File | What it does |
|---|---|
| `app/config.py` | **Everything tunable**: model paths, class-name aliases, severity thresholds, routing, no-parking zones |
| `app/preprocessing.py` | OpenCV: decode, fix phone rotation (EXIF), downscale, optional CLAHE |
| `app/detector.py` | Loads the three YOLO models (garbage, pothole, vehicle) and runs them |
| `app/analysis.py` | Parking rule → picks the issue → severity → routing → response JSON |
| `app/severity.py` | Rule-based Low / Medium / High with a human-readable reason |
| `app/zones.py` | No-parking zone check by GPS distance |
| `app/store.py` | SQLite complaints + uploaded photos (`data/`) |
| `app/geocode.py` | Reverse geocoding (OpenStreetMap Nominatim, free) |
| `app/main.py` | API endpoints |

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

Models (a missing model is skipped and shown in `/api/health`, never faked):

| Slot | Default path | Notes |
|---|---|---|
| garbage | `models/citylens_garbage.pt` | copy `runs/detect/citylens_garbage-2/weights/best.pt` here |
| pothole | `models/citylens_pothole.pt` | train with `training/train_pothole.py` |
| vehicle | `yolov8n.pt` | COCO model, auto-downloaded on first run (needs internet once) |

Your model's class names can be anything in `CLASS_ALIASES` (e.g. `garbage`, `trash`, `waste`).
If `/api/health` shows a class name that isn't mapped, add it there.

```bash
uvicorn app.main:app --reload --port 8000
# --host 0.0.0.0 to reach it from a phone on the same Wi-Fi
```

## Endpoints

| Method | Path | |
|---|---|---|
| GET | `/api/health` | model status |
| POST | `/api/detect` | multipart `image` (+ optional `latitude`, `longitude`) |
| GET | `/api/geocode/reverse?lat=&lon=` | readable address |
| POST | `/api/complaints` | multipart `image` + `data` (JSON) |
| GET | `/api/complaints` · `/api/complaints/{id}` | citizen view |
| GET | `/api/authority/complaints?department=` · `/{id}` | authority queue |
| PATCH | `/api/authority/complaints/{id}/status` | `{status, note, officer, department}` |
| POST | `/api/authority/complaints/{id}/action` | note without status change |
| POST | `/api/authority/complaints/{id}/evidence` | after-action photo |

Rules enforced on the server: only the three issue types; routing is decided server-side;
status only moves forward (or to rejected); resolving/rejecting requires a note; closed
complaints are locked; a department can't act on another department's complaint.

Authentication is not implemented yet. The department is passed with each request. Add real
login (JWT) before any public deployment.

## Tests

```bash
pip install -r requirements-dev.txt
pytest -q
```
The tests use a stand-in model shaped like Ultralytics results, so they run without torch.
