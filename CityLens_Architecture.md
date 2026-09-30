# CityLens — PBL System Architecture

## 1. Project Overview

**CityLens** is a Computer Vision-based web application for reporting urban infrastructure problems.

Citizens upload a **photo or video** of a civic issue. The Computer Vision pipeline detects the issue, estimates its severity, and shows the result to the citizen for confirmation or correction. After confirmation, a complaint is created and sent to the responsible department/officer.

### Target Issue Classes

1. Pothole
2. Illegal Parking
3. Garbage Overflow
4. Broken Streetlight
5. Tree Branch Obstruction

> **Core focus:** Computer Vision.  
> The web application, database, GPS, department assignment, and complaint tracking are supporting modules.

---

## 2. Core Architecture

```text
Citizen
   |
   | Photo / Video + GPS
   v
React Frontend
   |
   v
FastAPI Backend
   |
   +----------------------+
   |                      |
   v                      v
OpenCV                  PostgreSQL
   |
   | Image preprocessing
   | Video frame extraction
   v
YOLO
   |
   | Detection
   | Classification
   | Confidence
   v
Severity Engine
   |
   v
AI Result Preview
   |
   | Citizen confirms / edits
   v
Complaint Created
   |
   v
Department / Officer
   |
   v
Status Tracking
   |
   v
Resolved
```

---

## 3. Computer Vision Pipeline

The Computer Vision pipeline is the **main technical component** of CityLens.

```text
Photo / Video
      |
      v
   OpenCV
      |
      +--> Image preprocessing
      |
      +--> Video frame extraction
      |
      v
    YOLO
      |
      +--> Issue class
      +--> Confidence
      +--> Bounding box
      |
      v
Severity Engine
      |
      v
Final AI Result
```

### YOLO Classes

```text
YOLO
 |
 +-- Pothole
 +-- Illegal Parking
 +-- Garbage Overflow
 +-- Broken Streetlight
 +-- Tree Branch Obstruction
```

YOLO is responsible for:

- Detecting the problem
- Identifying the issue class
- Providing confidence
- Providing bounding boxes

YOLO should **not directly determine severity**.

---

## 4. Severity Engine

Severity is handled separately from YOLO.

```text
YOLO Detection
      |
      v
Issue Type + Bounding Box + Confidence
      |
      v
Severity Rules
      |
      v
Low / Medium / High
```

Example:

```text
Pothole size:
Small  -> Low
Medium -> Medium
Large  -> High
```

The exact rules will be finalized after examining the dataset and model results.

---

## 5. Human-in-the-Loop Confirmation

CityLens does not automatically create a complaint immediately after AI detection.

The citizen first reviews the AI result.

```text
YOLO
  |
  v
AI Result
  |
  v
Citizen Reviews
  |
  +---- Correct ----> Confirm
  |
  +---- Incorrect --> Edit
                         |
                         v
                   Confirm
                         |
                         v
                 Create Complaint
```

### Example

```text
Detected Issue: Pothole
Confidence: 94%
Severity: High

[ Edit ]   [ Confirm Complaint ]
```

If the AI incorrectly detects a pothole, the citizen can change the issue type before submitting.

This creates a **Human-in-the-Loop (HITL)** system.

---

## 6. Image Processing

For images:

```text
Image
  |
  v
OpenCV
  |
  v
Preprocessing
  |
  v
YOLO
  |
  v
Detection
```

Possible preprocessing includes:

- Resize
- Format conversion
- Basic image normalization

Only preprocessing that is actually useful for the model should be implemented.

---

## 7. Video Processing

For videos:

```text
Video
  |
  v
OpenCV
  |
  v
Extract Frames
  |
  +--> Frame 1 --> YOLO
  +--> Frame 2 --> YOLO
  +--> Frame 3 --> YOLO
  +--> ...
  |
  v
Combine Results
  |
  v
Final Detection
```

### Development priority

Implement in this order:

1. Image detection
2. Model evaluation
3. Video frame extraction
4. YOLO detection on video frames
5. Result aggregation

Image detection should be stable before video processing is added.

---

## 8. Citizen Application

The citizen interface is intentionally simple.

### Main Flow

```text
Login
  |
  v
Home
  |
  v
Report Issue
  |
  v
Upload Photo / Video
  |
  v
Capture GPS
  |
  v
AI Analysis
  |
  v
AI Result
  |
  v
Confirm / Edit
  |
  v
Complaint Created
  |
  v
My Complaints
  |
  v
Track Status
```

### Citizen Features

- Register / Login
- Upload photo or video
- Capture GPS location
- View AI detection
- View confidence
- View severity
- Edit AI result
- Confirm complaint
- View submitted complaints
- Track complaint status

### Not included

- Citizen resolution verification
- Before/after photos
- Expected resolution time
- Notifications

---

## 9. Officer Application

The officer interface is also intentionally simple.

```text
Login
  |
  v
Officer Dashboard
  |
  v
Complaints
  |
  v
Complaint Details
```

### Officer can view

- Complaint information
- Photo / video
- AI classification
- Confidence
- Severity
- GPS coordinates
- Citizen information

### Officer actions

- Verify complaint
- Update status
- Add remarks
- Mark complaint as resolved

### Not included

- Officer resolution photo upload

---

## 10. Complaint Status

The complaint lifecycle is:

```text
Submitted
    |
    v
Verified
    |
    v
Assigned
    |
    v
In Progress
    |
    v
Resolved
```

The citizen can view the current status.

---

## 11. Backend — FastAPI

FastAPI connects the frontend, Computer Vision pipeline, and database.

```text
React
  |
  | HTTP / REST
  v
FastAPI
  |
  +--> Authentication
  +--> AI Analysis
  +--> Complaint Creation
  +--> Complaint Tracking
  +--> Officer Operations
  +--> Database Operations
```

### Example API Endpoints

```text
POST /api/auth/login

POST /api/complaints/analyze

POST /api/complaints

GET  /api/complaints/my

GET  /api/complaints/{id}

GET  /api/officer/complaints

PATCH /api/complaints/{id}/status
```

---

## 12. Database — PostgreSQL

PostgreSQL stores the application's structured data.

### User

```text
USER
- user_id
- name
- email
- password_hash
- role
```

### Complaint

```text
COMPLAINT
- complaint_id
- user_id
- issue_type
- severity
- confidence
- latitude
- longitude
- media_url
- department
- assigned_officer
- status
- created_at
- updated_at
- resolved_at
```

### Status History

```text
STATUS_HISTORY
- history_id
- complaint_id
- status
- changed_by
- remarks
- timestamp
```

The database is supporting infrastructure; it is not the main technical contribution.

---

## 13. Location

Keep location handling simple.

The device provides:

```text
Latitude
Longitude
```

These coordinates are stored with the complaint.

```text
Phone GPS
   |
   v
Latitude + Longitude
   |
   v
Complaint
   |
   v
Officer
```

No PostGIS, ward polygons, GIS routing, or automatic jurisdiction detection is required.

The responsible office can use the exact coordinates to identify the location.

---

## 14. Department Assignment

Department assignment can use a simple predefined mapping.

```text
Pothole
    -> MCC Engineering

Illegal Parking
    -> Traffic Police

Garbage Overflow
    -> MCC / Solid Waste

Broken Streetlight
    -> MCC Electrical

Tree Branch Obstruction
    -> Relevant Municipal / Forest Authority
```

This does not require AI or GIS.

---

## 15. Media Storage

Photos and videos should be stored outside PostgreSQL.

```text
Photo / Video
      |
      v
Media Storage
      |
      v
Media URL
      |
      v
PostgreSQL
```

The database stores the URL/reference rather than the actual media file.

---

## 16. Technology Stack

| Layer | Technology | Main Purpose |
|---|---|---|
| Computer Vision | **YOLO** | Issue detection and classification |
| Image/Video Processing | **OpenCV** | Preprocessing and frame extraction |
| Programming | **Python** | AI and backend development |
| Backend | **FastAPI** | API and application logic |
| Frontend | **React.js** | Citizen and officer interfaces |
| Styling | **Tailwind CSS** | UI styling |
| Database | **PostgreSQL** | Application data |
| Location | **Device GPS** | Exact complaint location |
| Maps | **Leaflet + OpenStreetMap** | Optional map display |
| Authentication | **JWT** | Login/session security |
| Media Storage | **Cloud/File Storage** | Photos and videos |

---

## 17. Development Priority

Because this is primarily a **Computer Vision PBL**, development effort should be prioritized as follows:

```text
1. Dataset Collection              ★★★★★
2. Data Cleaning                  ★★★★★
3. Image Annotation               ★★★★★
4. YOLO Training                  ★★★★★
5. Model Evaluation               ★★★★★
6. OpenCV Image/Video Pipeline    ★★★★★
7. Severity Rules                 ★★★★
8. FastAPI Integration            ★★★
9. Citizen Confirmation UI        ★★★
10. Database                      ★★
11. Officer Dashboard             ★★
12. Maps / Other UI               ★
```

---

## 18. AI Training Pipeline

The model development process is:

```text
Data Collection
      |
      v
Data Cleaning
      |
      v
Annotation
      |
      v
Train / Validation / Test Split
      |
      v
YOLO Training
      |
      v
Model Evaluation
      |
      v
Error Analysis
      |
      v
Improve Dataset / Model
      |
      v
Final YOLO Model
      |
      v
CityLens Application
```

### Important evaluation metrics

The PBL should discuss:

- Precision
- Recall
- mAP
- F1-score
- Confusion matrix
- Per-class performance

Also analyze:

- False positives
- False negatives
- Difficult lighting
- Occlusion
- Different camera angles
- Different road conditions
- Small or partially visible objects

---

## 19. Final End-to-End Flow

```text
                    CITYLENS
                       |
                       v
                Citizen Uploads
                 Photo / Video
                       |
                       +---- GPS
                       |
                       v
                    FastAPI
                       |
                       v
                    OpenCV
                       |
                       | Image preprocessing
                       | Video frame extraction
                       v
                     YOLO
                       |
              +--------+--------+
              |                 |
          Issue Type        Confidence
              |                 |
              +--------+--------+
                       |
                       v
                 Severity Engine
                       |
                       v
                AI Result Preview
                       |
                       v
              Citizen Confirmation
                  /                        Correct        Edit
                  \          /
                   \        /
                     Confirm
                       |
                       v
                Create Complaint
                       |
                       v
                Department/Officer
                       |
                       v
                  Verification
                       |
                       v
                    Assigned
                       |
                       v
                  In Progress
                       |
                       v
                    Resolved
```

---

## 20. Core Concept

The complete CityLens concept can be summarized as:

> **Detect → Verify → Confirm → Submit → Assign → Track → Resolve**

The most important part is:

> **YOLO + OpenCV + Dataset + Model Evaluation + Human-in-the-Loop Confirmation**

The remaining modules exist to demonstrate how the Computer Vision model can be integrated into a practical civic reporting application.
