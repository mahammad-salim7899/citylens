"""
API tests. Run:  cd backend && pytest -q

YOLO itself isn't needed: FakeYOLO returns objects shaped exactly like
Ultralytics results (result.names, result.boxes[i].xyxy/conf/cls), so
the real detector.detect() code path is exercised.
"""
import io
import json
import os
import sys
import tempfile
from pathlib import Path

import numpy as np
import pytest

os.environ["CITYLENS_DATA_DIR"] = tempfile.mkdtemp(prefix="citylens-test-")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402

from app import main  # noqa: E402
from app.detector import ModelSlot  # noqa: E402
from app.store import Store  # noqa: E402


class _Box:
    def __init__(self, cls, conf, xyxy):
        self.cls = np.array([cls])
        self.conf = np.array([conf])
        self.xyxy = np.array([xyxy], dtype=float)


class _Result:
    def __init__(self, names, boxes):
        self.names = names
        self.boxes = boxes


class FakeYOLO:
    def __init__(self, names, boxes):
        self.names = names
        self._boxes = boxes

    def predict(self, img, **kw):
        # boxes are given in the model-input image's pixels
        return [_Result(self.names, [_Box(*b) for b in self._boxes])]


def jpeg(w=1600, h=1200) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (w, h), (120, 110, 90)).save(buf, "JPEG")
    return buf.getvalue()


@pytest.fixture()
def client(tmp_path):
    main.store = Store(tmp_path / "t.db", main.config.UPLOAD_DIR)  # same folder the app serves at /uploads
    main.detector.slots = [
        ModelSlot("garbage", "fake", "issue", model=FakeYOLO({0: "garbage"}, []), status="loaded"),
        ModelSlot("pothole", "fake", "issue", model=None, status="missing"),
        ModelSlot("vehicle", "fake", "vehicle", model=FakeYOLO({2: "car", 0: "person"}, []), status="loaded"),
    ]
    with TestClient(main.app) as c:
        yield c


def set_boxes(slot_key, boxes):
    next(s for s in main.detector.slots if s.key == slot_key).model._boxes = boxes


def test_health_reports_models(client):
    r = client.get("/api/health").json()
    assert r["models"]["garbage"]["status"] == "loaded"
    assert r["models"]["pothole"]["status"] == "missing"


def test_detect_garbage_scales_boxes_to_original_image(client):
    # 1600x1200 upload → preprocessed to 1280x960 (scale 0.8)
    set_boxes("garbage", [(0, 0.91, [256, 240, 896, 720])])
    r = client.post("/api/detect", files={"image": ("g.jpg", jpeg(), "image/jpeg")}).json()
    assert r["issue"] == "garbage_dumping"
    assert r["confidence"] == 0.91
    assert r["image_width"] == 1600 and r["image_height"] == 1200
    assert r["detections"][0]["bbox"] == [320.0, 300.0, 1120.0, 900.0]   # divided by 0.8
    assert r["severity"] == "High"  # 800*600 / 1600*1200 = 25% ≥ 20%
    assert r["department"] == "sanitation"
    assert r["mock"] is False


def test_small_background_car_does_not_hijack_garbage(client):
    set_boxes("garbage", [(0, 0.62, [100, 100, 300, 300])])
    set_boxes("vehicle", [(2, 0.95, [1000, 50, 1100, 120])])  # tiny car, confident
    r = client.post("/api/detect", files={"image": ("g.jpg", jpeg(), "image/jpeg")}).json()
    assert r["issue"] == "garbage_dumping"


def test_large_vehicle_is_parking_and_zone_raises_severity(client):
    set_boxes("vehicle", [(2, 0.88, [100, 200, 700, 700])])  # ~24% of 1280x960
    img = jpeg()
    outside = client.post("/api/detect", files={"image": ("c.jpg", img, "image/jpeg")},
                          data={"latitude": "12.95", "longitude": "74.90"}).json()
    inside = client.post("/api/detect", files={"image": ("c.jpg", img, "image/jpeg")},
                         data={"latitude": "12.8657", "longitude": "74.8427"}).json()
    assert outside["issue"] == inside["issue"] == "illegal_parking"
    assert outside["severity"] == "Medium" and outside["no_parking_zone"] is None
    assert inside["severity"] == "High" and inside["no_parking_zone"] == "Hampankatta Junction"


def test_nothing_detected_returns_null_issue(client):
    r = client.post("/api/detect", files={"image": ("x.jpg", jpeg(), "image/jpeg")}).json()
    assert r["issue"] is None and r["detections"] == []


def test_rejects_non_image(client):
    r = client.post("/api/detect", files={"image": ("x.txt", b"hello", "text/plain")})
    assert r.status_code == 415


def new_complaint(client, issue="garbage_dumping"):
    data = {
        "issue": issue, "severity": "High", "severity_source": "model", "description": "Pile near road",
        "latitude": 12.9187, "longitude": 74.856, "address": "Kottara, Mangaluru, Karnataka",
        "location_source": "image_exif",
        "detection": {"ai_issue": issue, "ai_confidence": 0.91, "detections": [], "corrected_by_citizen": False},
    }
    r = client.post("/api/complaints", files={"image": ("g.jpg", jpeg(), "image/jpeg")}, data={"data": json.dumps(data)})
    assert r.status_code == 201, r.text
    return r.json()


def test_full_citizen_authority_loop(client):
    c = new_complaint(client)
    assert c["id"].endswith("-00123")
    assert c["department"] == "sanitation" and c["status"] == "new"
    assert client.get(c["image_url"]).status_code == 200

    # other department can't see or touch it
    assert client.get("/api/authority/complaints", params={"department": "roads"}).json() == []
    r = client.patch(f"/api/authority/complaints/{c['id']}/status",
                     json={"status": "under_review", "officer": "X", "department": "roads"})
    assert r.status_code == 403

    base = {"officer": "Ravi Shenoy", "department": "sanitation"}
    for s in ["under_review", "action_assigned", "action_in_progress"]:
        assert client.patch(f"/api/authority/complaints/{c['id']}/status", json={**base, "status": s}).status_code == 200

    # can't go backwards, can't resolve without a note
    assert client.patch(f"/api/authority/complaints/{c['id']}/status", json={**base, "status": "under_review"}).status_code == 409
    assert client.patch(f"/api/authority/complaints/{c['id']}/status", json={**base, "status": "resolved"}).status_code == 422

    r = client.post(f"/api/authority/complaints/{c['id']}/evidence",
                    files={"image": ("after.jpg", jpeg(800, 600), "image/jpeg")}, data=base)
    assert r.status_code == 200 and r.json()["after_image_url"]

    r = client.patch(f"/api/authority/complaints/{c['id']}/status",
                     json={**base, "status": "resolved", "note": "Garbage was cleared from the reported location."})
    assert r.status_code == 200

    tracked = client.get(f"/api/complaints/{c['id']}").json()
    assert tracked["status"] == "resolved"
    assert tracked["history"][-1]["note"] == "Garbage was cleared from the reported location."
    assert tracked["history"][-1]["by"] == "Ravi Shenoy"
    assert client.get(tracked["after_image_url"]).status_code == 200

    # closed complaints are locked
    assert client.post(f"/api/authority/complaints/{c['id']}/action", json={**base, "note": "x"}).status_code == 409


def test_create_rejects_unsupported_issue(client):
    data = {"issue": "streetlight", "severity": "High", "latitude": 12.9, "longitude": 74.8, "location_source": "device_gps"}
    r = client.post("/api/complaints", files={"image": ("g.jpg", jpeg(), "image/jpeg")}, data={"data": json.dumps(data)})
    assert r.status_code == 422


def test_ids_increment(client):
    a = new_complaint(client)
    b = new_complaint(client, "pothole")
    assert int(b["id"][-5:]) == int(a["id"][-5:]) + 1
    assert b["department"] == "roads"
