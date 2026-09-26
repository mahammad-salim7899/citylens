# CityLens

**See it → Report it → AI detects it → Confirm it → Authority acts → Track the resolution.**

A computer-vision civic issue reporting platform (college PBL project).
Citizens report **Potholes**, **Illegal Parking** and **Garbage Dumping** with a
photo; CityLens finds the issue, rates its severity, reads the location from the
photo, and routes a complaint to the responsible department, which acts on it
while the citizen tracks progress.

```
citylens/
├── frontend/   React + Vite + Tailwind (runs alone in demo mode)
└── backend/    FastAPI + OpenCV + YOLO + SQLite
```

---

## 1. Run the frontend only (demo mode — no backend needed)

```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173.

In demo mode:
- Detection is **simulated** and every simulated result is labelled "Demo mode" in the UI.
  The issue is guessed from the file name (`pothole.jpg`, `car.jpg`, anything else → garbage).
- **Location is real**: GPS is read from the photo's EXIF data, with a device-location fallback.
- Complaints are stored in the browser. Open the citizen and authority pages in **two tabs** —
  they update each other live. "Reset demo data" in the footer restores the sample complaints.

## 2. Run with the real backend (YOLO)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate           # Windows   (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt

# put your trained garbage model where the backend expects it:
copy ..\..\runs\detect\citylens_garbage-2\weights\best.pt models\citylens_garbage.pt
#   (or set CITYLENS_GARBAGE_MODEL to its full path — see .env.example)

uvicorn app.main:app --reload --port 8000
```
Check http://localhost:8000/api/health — it lists which models loaded.
API docs: http://localhost:8000/docs

Then switch the frontend to real mode:
```bash
cd frontend
copy .env.example .env           # sets VITE_API_MODE=real
npm run dev
```
No UI code changes — only the service layer switches.

## 3. Demo script

1. **Home** → *Report an Issue* → upload a garbage photo (one taken on a phone with location on, so GPS is in the photo)
2. Location appears as a readable address → *Confirm Location* → *Analyze Image*
3. *Garbage Dumping · 91% · High* → *Yes, Confirm* → add a description → *Submit* → **CL-2026-00123**
4. Footer → *Authority portal* → sign in as **Ravi Shenoy (Sanitation)** → open CL-2026-00123
5. Move it through *Under Review → Action Assigned → Action in Progress*, then write
   “Garbage was cleared from the reported location.”, upload an after photo, *Mark as Resolved*
6. *Track Complaint* → CL-2026-00123 → full timeline, the authority's note, before/after photos

Tip: phone photos keep GPS only if the camera's location setting is on, and apps like WhatsApp
strip it. Share the original file (or use Google Photos "download original").

## 4. How each issue is detected

| Issue | Detection | Severity from |
|---|---|---|
| Garbage Dumping | Your trained YOLO model (`citylens_garbage-2`) | Area covered by garbage + number of piles |
| Pothole | A second YOLO model trained the same way on a pothole dataset (see `backend/training/`) | Size of largest pothole + count |
| Illegal Parking | Pre-trained COCO YOLO finds vehicles → **rule**: inside a configured no-parking zone (by GPS) or the vehicle dominates the frame | Frame blocked by the vehicle + count, raised one level inside a no-parking zone |

Severity is a separate rule engine (`backend/app/severity.py`), not YOLO. Thresholds, class-name
mapping, department routing and no-parking zones are all in `backend/app/config.py`.

## 5. Replace the sample images

`frontend/public/samples/*.svg` are illustrations used for sample complaints and the landing page.
Drop real photos in the same folder and update `SAMPLE_IMAGES` in `frontend/src/data/mockData.js`.
