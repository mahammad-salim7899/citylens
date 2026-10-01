# CityLens backend (FastAPI)

```
React → FastAPI → OpenCV preprocessing → YOLO → severity engine → department routing → complaints
```

| File | What it does |
|---|---|
| `app/config.py` | **Everything tunable**: model paths, class-name aliases, severity thresholds, routing, no-parking zones, auth settings |
| `app/auth.py` | JWT issue/verify, PBKDF2 password hashing, the bearer-token dependency |
| `app/preprocessing.py` | OpenCV: decode, fix phone rotation (EXIF), downscale, optional CLAHE |
| `app/detector.py` | Loads the three YOLO models (garbage, pothole, vehicle) and runs them |
| `app/analysis.py` | Parking rule → picks the issue → severity → routing → response JSON |
| `app/severity.py` | Rule-based Low / Medium / High with a human-readable reason |
| `app/zones.py` | No-parking zone check by GPS distance |
| `app/store.py` | SQLite users + complaints, uploaded photos (`data/`) |
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

## Authentication

Every route except `/api/health` and `/uploads/...` needs a JWT:

```
Authorization: Bearer <token from /api/auth/login>
```

**Identity is never read from the request.** The owner of a new complaint is the
user id in the token; an officer's name and department come from their token. The
old `?department=` parameter and the `officer`/`department` body fields are gone,
because a client that could set them could act as any department and sign status
changes with anyone's name.

Citizens register themselves. Officer accounts cannot be created through the API —
`/api/auth/register` always produces a citizen, so nobody can sign themselves up as
the traffic department. Three officers are seeded **only on a brand-new database**:

| Email | Department | Officer |
|---|---|---|
| `ravi.shenoy@citylens.local` | sanitation | Ravi Shenoy, Health Inspector |
| `anitha.kamath@citylens.local` | roads | Anitha Kamath, Assistant Executive Engineer |
| `divya.poojary@citylens.local` | traffic | Divya Poojary, Traffic Sub-Inspector |

Their password is `CITYLENS_SEED_OFFICER_PASSWORD` (default `citylens-demo`).

Passwords are stored as PBKDF2-HMAC-SHA256 with a per-user salt — stdlib only, so
there's no bcrypt wheel to install on Windows. Tokens are HS256 and expire after
`CITYLENS_JWT_TTL_HOURS` (default 12).

**Before deploying anywhere**, set `CITYLENS_JWT_SECRET` and
`CITYLENS_SEED_OFFICER_PASSWORD`; the server logs a warning at startup while
either is left at its development default. Unset, the secret is generated once and
kept in `data/.jwt_secret` so restarting `uvicorn --reload` doesn't sign you out.
Keep that file out of git.

Still missing for production: refresh tokens and logout-everywhere (a stolen token
is valid until it expires), password reset, email verification, and rate limiting on
`/api/auth/login`.

## Endpoints

🔓 = no token needed.

| Method | Path | |
|---|---|---|
| GET | `/api/health` | 🔓 model status |
| POST | `/api/auth/register` | 🔓 `{name, email, password}` → token + user (always a citizen) |
| POST | `/api/auth/login` | 🔓 `{email, password}` → token + user |
| GET | `/api/auth/me` | the signed-in user |
| POST | `/api/detect` | multipart `image` (+ optional `latitude`, `longitude`) |
| GET | `/api/geocode/reverse?lat=&lon=` | readable address |
| POST | `/api/complaints` | citizen only — multipart `image` + `data` (JSON) |
| GET | `/api/complaints` | citizen only — **their own** complaints |
| GET | `/api/complaints/{id}` | citizen only — their own; 404 otherwise |
| GET | `/api/authority/complaints` | officer only — their department's queue |
| GET | `/api/authority/complaints/{id}` | officer only, same department |
| PATCH | `/api/authority/complaints/{id}/status` | `{status, note}` |
| POST | `/api/authority/complaints/{id}/action` | `{note}` — no status change |
| POST | `/api/authority/complaints/{id}/evidence` | multipart `image` — after-action photo |

Rules enforced on the server: only the three issue types; routing is decided
server-side; a citizen can only read their own complaints; an officer can only read
and act on their own department's; status only moves forward (or to rejected);
resolving/rejecting requires a note; closed complaints are locked.

Complaints created before accounts existed have no owner. They stay in the
department queue but no citizen can read them — inventing an owner would be worse
than leaving them unclaimed.

## Tests

```bash
pip install -r requirements-dev.txt
pytest -q
```
The tests use a stand-in model shaped like Ultralytics results, so they run without
torch. They cover the authorisation rules directly: cross-citizen and
cross-department access, forged and expired tokens, a deleted account losing access,
spoofed `officer` fields being ignored, and opening a pre-auth database.
