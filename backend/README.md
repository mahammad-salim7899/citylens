# CityLens backend (FastAPI)

```
React → FastAPI → OpenCV preprocessing → YOLO → severity engine → department routing → complaints
```

| File | What it does |
|---|---|
| `app/config.py` | **Everything tunable**: model paths, class-name aliases, severity thresholds, routing, no-parking zones, auth settings |
| `app/auth.py` | JWT issue/verify, PBKDF2 password hashing, the bearer-token dependency |
| `app/preprocessing.py` | OpenCV: decode, fix phone rotation (EXIF), downscale, optional CLAHE |
| `app/detector.py` | Loads the three YOLO models (garbage, pothole, vehicle) and runs them; reads instance masks from segmentation models |
| `app/scene.py` | Semantic segmentation of the street (road vs sidewalk) with a Cityscapes SegFormer, for the parking rule |
| `app/signs.py` | Reads parking signs: OCR (EasyOCR) for NO PARKING text, OpenCV for the no-parking symbol |
| `app/analysis.py` | Parking rule → picks the issue → severity → routing → response JSON |
| `app/severity.py` | Rule-based Low / Medium / High with a human-readable reason; measures area from masks when available |
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
| garbage | `models/citylens_garbage.pt` | build one with no training: `python training/make_garbage_model.py` (see below), or drop in your own trained `best.pt` |
| pothole | `models/citylens_pothole.pt` | train with `training/train_pothole.py` |
| vehicle | `yolov8s.pt` | COCO model, auto-downloaded on first run (~22 MB). `yolov8n` missed most cars in top-down street photos |
| scene | `nvidia/segformer-b0-finetuned-cityscapes-1024-1024` | road/sidewalk segmentation, auto-downloaded from Hugging Face on first run (~15 MB) |
| signs | EasyOCR `en` + `kn` | sign text reading, auto-downloaded on first run (~100 MB, into `~/.EasyOCR`) |

Your model's class names can be anything in `CLASS_ALIASES` (e.g. `garbage`, `trash`, `waste`).
If `/api/health` shows a class name that isn't mapped, add it there.

```bash
uvicorn app.main:app --reload --port 8000
# --host 0.0.0.0 to reach it from a phone on the same Wi-Fi
```

## Segmentation

CityLens combines object detection with two kinds of segmentation.

**Instance segmentation → severity.** If a pothole or garbage model is a YOLOv8
*segmentation* model (`*-seg.pt`), every detection also carries its mask. Severity is
then measured from the mask's real area instead of the bounding box, which overstates
irregular shapes — a crescent-shaped pothole can fill well under half of its box. For
garbage, overlapping masks are merged first so one pile isn't counted twice. Plain
detection models still work; severity falls back to box area. The API returns each
mask as `polygon` and the frontend draws it.

Ready-made pothole segmentation weights, no training needed:

```bash
pip install huggingface_hub
python -c "from huggingface_hub import hf_hub_download; import shutil; shutil.copy(hf_hub_download('keremberke/yolov8s-pothole-segmentation', 'best.pt'), 'models/citylens_pothole.pt')"
```

To train your own: `YOLO("yolov8n-seg.pt").train(data=...)` on a dataset with polygon labels.

**Semantic segmentation → illegal parking.** YOLO finds the vehicle but can't tell a lane
from a footpath. `app/scene.py` labels every pixel as road, sidewalk, etc. with a
SegFormer pretrained on Cityscapes, then checks the strip where the vehicle meets the
ground. If at least half of it is sidewalk (`CITYLENS_FOOTPATH_SHARE`), the vehicle is
reported as parked on the footpath and severity goes up a level — even if it's too small
in the frame for the size rule. It only runs when a vehicle was detected. If the model
can't load, parking falls back to the size + no-parking-zone rules and `/api/health`
says why.

## No-parking signs (OCR + symbol detection)

A car parked under a NO PARKING board is illegal even when it's on the road and outside the
listed no-parking zones. When a vehicle is detected, `app/signs.py` looks for the board in
the same photo in two independent ways:

1. **Text (OCR).** EasyOCR reads all text in the photo, English and Kannada by default. Lines
   that sit together on one board ("NO" above "PARKING") are grouped first. Then each board is
   matched against phrases like NO PARKING, DO NOT PARK, NO STOPPING, TOW AWAY ZONE, and
   ವಾಹನ ನಿಲುಗಡೆ ನಿಷೇಧ. One OCR slip is tolerated, so `N0 IPARKINGI` (the red border read as
   "I") still counts. Plain `PARKING` never does: it is only 2 edits from `NOPARKING`, and the
   matcher allows 1.
2. **Symbol (OpenCV, no model).** The standard Indian sign has no words: a blue disc, red ring
   and red diagonal slash. Candidate circles come from the blue and red colour masks. Each is
   scored on all three parts, so a red car or a blue shop board doesn't trigger it. On 49
   photos and app screenshots without the sign, it found nothing.

If either finds a no-parking sign, every detected vehicle counts as illegal parking and severity
goes up a level, with the reason *A sign reading "NO PARKING" is visible in the photo.* The
response carries `no_parking_sign` and `signs` (with boxes), and the frontend outlines the board
on the photo. Officers see the sign text on the complaint.

A board saying parking *is* allowed (PARKING, PAY AND PARK, PAYANT) is reported too. It is
added to the "looks legally parked" note.

Results on the street photo `tests/street-parking.jpg`, using the real models:

| Photo | Result |
|---|---|
| as is (cars in paid bays) | no issue + note |
| + a NO PARKING board | Illegal Parking, High: *A sign reading "NO PARKING" is visible* |
| + the no-parking symbol | Illegal Parking, High: *A no-parking sign is visible* |
| + a PARKING board | no issue; note starts *A parking sign is visible ("PARKING")* |

OCR adds ~2 s per photo on CPU, and only runs when a vehicle was found. The test photos above
had a board pasted in; try real ones from your area.

Limits:

- A time-restricted board ("No parking 8 AM–8 PM") is treated as always on.
- The sign isn't matched to a specific car: any car in the photo counts, and the citizen confirms.

## Cross-checks between models

Each model only knows its own class, so they can disagree in ways a person never would.
`analysis.py` resolves that before picking an issue:

- **A pothole can't be on a car.** Seen from above, a dark car roof is a dark oval blob — exactly
  what a pothole model looks for. On a top-down street photo of parked cars the pothole model
  fired on car roofs and the whole photo was reported as a pothole. Now a pothole box that is
  ≥30% inside a detected vehicle is dropped, and (when the scene model ran) a pothole must sit
  on road or pavement pixels.
- **The vehicle model runs at 0.2**, lower than the usual 0.35, so cars it is less sure of can still
  veto a pothole on their roof. Those low-confidence vehicles are never reported as parking.
- **The vehicle model uses test-time augmentation** (it also checks flipped and rescaled copies). On a
  top-down photo of 10 parked cars, `yolov8s` found 7 without it and all 10 with it. Turn off with
  `CITYLENS_VEHICLE_TTA=0` if detection is too slow on CPU.
- **Legally parked cars aren't a complaint.** If vehicles are found but none is on the footpath, in
  a no-parking zone, or blocking the frame, the result is "no issue" with a `note` saying so; the
  citizen can still choose Illegal Parking themselves.

## Garbage detection without training (open-vocabulary)

There's no ready-made model that recognises *dumped or overflowing* garbage, so CityLens
builds one from text prompts with **YOLOE** — a YOLO segmentation network paired with a
text encoder, which detects whatever you describe in words:

```bash
pip install openai-clip "setuptools<81"     # one time; only this script needs them
python training/make_garbage_model.py --test tests/some-garbage-photo.jpg
# restart uvicorn → "garbage model loaded … (open-vocabulary, conf 0.2)"
```

The first run downloads ~600 MB into `models/.cache/` (git-ignored). The result is a normal
`models/citylens_garbage.pt`: the server loads it like any model and needs no text encoder.

**Decoy prompts are the important trick.** With garbage prompts only, an *empty* bin came back
as "pile of garbage" (0.59). Adding "dumpster" and "garbage bin" as extra classes gives bins
somewhere better to go (0.84–0.86 as "dumpster"); those names are deliberately left out of
`CLASS_ALIASES`, so the backend drops them — an empty bin is not a complaint, an overflowing
one is. On a test photo of an empty bin next to an overflowing one, the result was *Garbage,
High severity*: six masks over the bags and the overflowing bin, the empty bin ignored.

Open-vocabulary models score lower even when right, so they automatically use
`CITYLENS_OPEN_VOCAB_CONF` (0.2) instead of the normal 0.35. A model you train yourself on
labelled photos replaces this one with no code changes — and a "zero-shot vs. fine-tuned"
comparison is good material for the report.

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
