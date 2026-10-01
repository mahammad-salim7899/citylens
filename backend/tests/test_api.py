"""
API tests. Run:  cd backend && pytest -q

YOLO itself isn't needed: FakeYOLO returns objects shaped exactly like
Ultralytics results (result.names, result.boxes[i].xyxy/conf/cls), so
the real detector.detect() code path is exercised.

PBKDF2 rounds are turned down to keep the suite fast — this must happen
before app.config is imported.
"""
import io
import json
import os
import sqlite3
import sys
import tempfile
from pathlib import Path

import numpy as np
import pytest

os.environ["CITYLENS_DATA_DIR"] = tempfile.mkdtemp(prefix="citylens-test-")
os.environ["CITYLENS_PBKDF2_ROUNDS"] = "1000"
os.environ["CITYLENS_JWT_SECRET"] = "test-secret-not-used-anywhere-real"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402

from app import main  # noqa: E402
from app.detector import ModelSlot  # noqa: E402
from app.store import Store  # noqa: E402

OFFICER_PASSWORD = main.config.SEED_OFFICER_PASSWORD
SANITATION_OFFICER = "ravi.shenoy@citylens.local"
ROADS_OFFICER = "anitha.kamath@citylens.local"


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
    with TestClient(main.app) as c:   # lifespan seeds the officer accounts
        yield c


def set_boxes(slot_key, boxes):
    next(s for s in main.detector.slots if s.key == slot_key).model._boxes = boxes


# ── auth helpers ──────────────────────────────────────────────────────
def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def register(client, email="citizen@example.com", name="Test Citizen", password="password123"):
    r = client.post("/api/auth/register", json={"name": name, "email": email, "password": password})
    assert r.status_code == 201, r.text
    return r.json()


def login(client, email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture()
def citizen(client):
    return register(client)


@pytest.fixture()
def sanitation(client):
    return login(client, SANITATION_OFFICER, OFFICER_PASSWORD)


@pytest.fixture()
def roads(client):
    return login(client, ROADS_OFFICER, OFFICER_PASSWORD)


def new_complaint(client, token, issue="garbage_dumping"):
    data = {
        "issue": issue, "severity": "High", "severity_source": "model", "description": "Pile near road",
        "latitude": 12.9187, "longitude": 74.856, "address": "Kottara, Mangaluru, Karnataka",
        "location_source": "image_exif",
        "detection": {"ai_issue": issue, "ai_confidence": 0.91, "detections": [], "corrected_by_citizen": False},
    }
    r = client.post("/api/complaints", files={"image": ("g.jpg", jpeg(), "image/jpeg")},
                    data={"data": json.dumps(data)}, headers=bearer(token))
    assert r.status_code == 201, r.text
    return r.json()


# ── health / detection ────────────────────────────────────────────────
def test_health_reports_models(client):
    r = client.get("/api/health").json()
    assert r["models"]["garbage"]["status"] == "loaded"
    assert r["models"]["pothole"]["status"] == "missing"


def test_detect_garbage_scales_boxes_to_original_image(client, citizen):
    # 1600x1200 upload → preprocessed to 1280x960 (scale 0.8)
    set_boxes("garbage", [(0, 0.91, [256, 240, 896, 720])])
    r = client.post("/api/detect", files={"image": ("g.jpg", jpeg(), "image/jpeg")},
                    headers=bearer(citizen["token"])).json()
    assert r["issue"] == "garbage_dumping"
    assert r["confidence"] == 0.91
    assert r["image_width"] == 1600 and r["image_height"] == 1200
    assert r["detections"][0]["bbox"] == [320.0, 300.0, 1120.0, 900.0]   # divided by 0.8
    assert r["severity"] == "High"  # 800*600 / 1600*1200 = 25% ≥ 20%
    assert r["department"] == "sanitation"
    assert r["mock"] is False


def test_small_background_car_does_not_hijack_garbage(client, citizen):
    set_boxes("garbage", [(0, 0.62, [100, 100, 300, 300])])
    set_boxes("vehicle", [(2, 0.95, [1000, 50, 1100, 120])])  # tiny car, confident
    r = client.post("/api/detect", files={"image": ("g.jpg", jpeg(), "image/jpeg")},
                    headers=bearer(citizen["token"])).json()
    assert r["issue"] == "garbage_dumping"


def test_large_vehicle_is_parking_and_zone_raises_severity(client, citizen):
    set_boxes("vehicle", [(2, 0.88, [100, 200, 700, 700])])  # ~24% of 1280x960
    img, h = jpeg(), bearer(citizen["token"])
    outside = client.post("/api/detect", files={"image": ("c.jpg", img, "image/jpeg")},
                          data={"latitude": "12.95", "longitude": "74.90"}, headers=h).json()
    inside = client.post("/api/detect", files={"image": ("c.jpg", img, "image/jpeg")},
                         data={"latitude": "12.8657", "longitude": "74.8427"}, headers=h).json()
    assert outside["issue"] == inside["issue"] == "illegal_parking"
    assert outside["severity"] == "Medium" and outside["no_parking_zone"] is None
    assert inside["severity"] == "High" and inside["no_parking_zone"] == "Hampankatta Junction"


def test_nothing_detected_returns_null_issue(client, citizen):
    r = client.post("/api/detect", files={"image": ("x.jpg", jpeg(), "image/jpeg")},
                    headers=bearer(citizen["token"])).json()
    assert r["issue"] is None and r["detections"] == []


def test_rejects_non_image(client, citizen):
    r = client.post("/api/detect", files={"image": ("x.txt", b"hello", "text/plain")},
                    headers=bearer(citizen["token"]))
    assert r.status_code == 415


# ── registration and login ────────────────────────────────────────────
def test_register_returns_a_usable_token_and_hides_the_hash(client):
    session = register(client)
    assert session["token_type"] == "bearer" and session["expires_in"] > 0
    assert session["user"]["role"] == "citizen"
    assert "password_hash" not in session["user"]

    me = client.get("/api/auth/me", headers=bearer(session["token"]))
    assert me.status_code == 200
    assert me.json()["email"] == "citizen@example.com"
    assert "password_hash" not in me.json()


def test_login_is_case_insensitive_on_email(client):
    register(client, email="Mixed.Case@Example.com")
    assert login(client, "mixed.case@example.com", "password123")["user"]["role"] == "citizen"


def test_register_rejects_duplicate_email(client):
    register(client)
    r = client.post("/api/auth/register",
                    json={"name": "Someone Else", "email": "citizen@example.com", "password": "password123"})
    assert r.status_code == 409


def test_register_rejects_short_password_and_bad_email(client):
    assert client.post("/api/auth/register",
                       json={"name": "A Citizen", "email": "a@b.com", "password": "short"}).status_code == 422
    assert client.post("/api/auth/register",
                       json={"name": "A Citizen", "email": "not-an-email", "password": "password123"}).status_code == 422


def test_login_failures_do_not_reveal_whether_the_email_exists(client):
    register(client)
    wrong_password = client.post("/api/auth/login", json={"email": "citizen@example.com", "password": "nope-nope"})
    no_such_user = client.post("/api/auth/login", json={"email": "ghost@example.com", "password": "nope-nope"})
    assert wrong_password.status_code == no_such_user.status_code == 401
    assert wrong_password.json()["detail"] == no_such_user.json()["detail"]


def test_officer_accounts_cannot_be_created_through_the_api(client):
    """Registration always produces a citizen, whatever the client sends."""
    r = client.post("/api/auth/register", json={
        "name": "Fake Officer", "email": "fake@example.com", "password": "password123",
        "role": "officer", "department": "roads",   # extra fields must be ignored
    })
    assert r.status_code == 201
    assert r.json()["user"]["role"] == "citizen"
    assert r.json()["user"]["department"] is None


def test_seeded_officers_can_log_in(client):
    session = login(client, SANITATION_OFFICER, OFFICER_PASSWORD)
    assert session["user"]["role"] == "officer"
    assert session["user"]["department"] == "sanitation"


# ── everything is behind a token ──────────────────────────────────────
PROTECTED = [
    ("get", "/api/complaints"),
    ("get", "/api/complaints/CL-2026-00123"),
    ("post", "/api/complaints"),
    ("post", "/api/detect"),
    ("get", "/api/geocode/reverse?lat=12.9&lon=74.8"),
    ("get", "/api/authority/complaints"),
    ("get", "/api/authority/complaints/CL-2026-00123"),
    ("patch", "/api/authority/complaints/CL-2026-00123/status"),
    ("post", "/api/authority/complaints/CL-2026-00123/action"),
    ("post", "/api/authority/complaints/CL-2026-00123/evidence"),
]


@pytest.mark.parametrize("method,path", PROTECTED)
def test_every_data_route_requires_a_token(client, method, path):
    assert getattr(client, method)(path).status_code == 401


@pytest.mark.parametrize("method,path", PROTECTED)
def test_garbage_token_is_rejected(client, method, path):
    r = getattr(client, method)(path, headers=bearer("not.a.real.token"))
    assert r.status_code == 401


def test_token_signed_with_the_wrong_secret_is_rejected(client, citizen):
    import jwt as pyjwt
    forged = pyjwt.encode({"sub": citizen["user"]["id"], "role": "officer", "name": "Hacker",
                           "dept": "roads", "exp": 9999999999},
                          "a-different-secret-of-a-respectable-length", algorithm="HS256")
    assert client.get("/api/authority/complaints", headers=bearer(forged)).status_code == 401


def test_deleted_account_loses_access_immediately(client, citizen):
    token = citizen["token"]
    assert client.get("/api/complaints", headers=bearer(token)).status_code == 200
    main.store._conn.execute("DELETE FROM users WHERE id = ?", (citizen["user"]["id"],))
    main.store._conn.commit()
    assert client.get("/api/complaints", headers=bearer(token)).status_code == 401


# ── citizens only see their own complaints ────────────────────────────
def test_citizen_list_is_scoped_to_the_owner(client):
    alice = register(client, email="alice@example.com", name="Alice A")
    bob = register(client, email="bob@example.com", name="Bob B")
    a = new_complaint(client, alice["token"])
    b = new_complaint(client, bob["token"], "pothole")

    alice_ids = [c["id"] for c in client.get("/api/complaints", headers=bearer(alice["token"])).json()]
    bob_ids = [c["id"] for c in client.get("/api/complaints", headers=bearer(bob["token"])).json()]
    assert alice_ids == [a["id"]]
    assert bob_ids == [b["id"]]


def test_citizen_cannot_read_another_citizens_complaint(client):
    alice = register(client, email="alice@example.com", name="Alice A")
    bob = register(client, email="bob@example.com", name="Bob B")
    a = new_complaint(client, alice["token"])
    # 404, not 403 — a 403 would confirm the ID exists
    r = client.get(f"/api/complaints/{a['id']}", headers=bearer(bob["token"]))
    assert r.status_code == 404


def test_complaint_records_the_signed_in_citizen_as_owner(client, citizen):
    c = new_complaint(client, citizen["token"])
    assert c["user_id"] == citizen["user"]["id"]
    assert c["history"][0]["by"] == citizen["user"]["name"]


def test_legacy_complaints_without_an_owner_belong_to_nobody(client, citizen):
    """Rows created before accounts existed stay in the department queue
    but must not leak into any citizen's list."""
    c = new_complaint(client, citizen["token"])
    main.store._conn.execute("UPDATE complaints SET user_id = NULL WHERE id = ?", (c["id"],))
    doc = json.loads(main.store._conn.execute(
        "SELECT doc FROM complaints WHERE id = ?", (c["id"],)).fetchone()["doc"])
    doc.pop("user_id")
    main.store._conn.execute("UPDATE complaints SET doc = ? WHERE id = ?", (json.dumps(doc), c["id"]))
    main.store._conn.commit()

    assert client.get("/api/complaints", headers=bearer(citizen["token"])).json() == []
    assert client.get(f"/api/complaints/{c['id']}", headers=bearer(citizen["token"])).status_code == 404


def test_role_separation(client, citizen, sanitation):
    citizen_h, officer_h = bearer(citizen["token"]), bearer(sanitation["token"])
    # a citizen cannot reach the authority side
    assert client.get("/api/authority/complaints", headers=citizen_h).status_code == 403
    # an officer cannot file complaints or read the citizen list
    assert client.get("/api/complaints", headers=officer_h).status_code == 403
    assert client.post("/api/complaints", files={"image": ("g.jpg", jpeg(), "image/jpeg")},
                       data={"data": json.dumps({})}, headers=officer_h).status_code == 403


# ── officers are confined to their own department ──────────────────────
def test_officer_queue_only_shows_their_department(client, citizen, sanitation, roads):
    garbage = new_complaint(client, citizen["token"], "garbage_dumping")
    pothole = new_complaint(client, citizen["token"], "pothole")

    sanitation_ids = [c["id"] for c in client.get("/api/authority/complaints", headers=bearer(sanitation["token"])).json()]
    roads_ids = [c["id"] for c in client.get("/api/authority/complaints", headers=bearer(roads["token"])).json()]
    assert sanitation_ids == [garbage["id"]]
    assert roads_ids == [pothole["id"]]


def test_officer_cannot_read_or_touch_another_department(client, citizen, roads):
    c = new_complaint(client, citizen["token"], "garbage_dumping")  # → sanitation
    h = bearer(roads["token"])
    # this detail route used to skip the department check entirely
    assert client.get(f"/api/authority/complaints/{c['id']}", headers=h).status_code == 403
    assert client.patch(f"/api/authority/complaints/{c['id']}/status",
                        json={"status": "under_review"}, headers=h).status_code == 403
    assert client.post(f"/api/authority/complaints/{c['id']}/action",
                       json={"note": "meddling"}, headers=h).status_code == 403
    assert client.post(f"/api/authority/complaints/{c['id']}/evidence",
                       files={"image": ("a.jpg", jpeg(800, 600), "image/jpeg")}, headers=h).status_code == 403


def test_officer_identity_in_the_request_body_is_ignored(client, citizen, sanitation):
    """The old API took `officer` and `department` from the client, so a
    status change could be signed with anyone's name."""
    c = new_complaint(client, citizen["token"], "garbage_dumping")
    r = client.patch(f"/api/authority/complaints/{c['id']}/status",
                     json={"status": "under_review", "officer": "Someone Else", "department": "roads"},
                     headers=bearer(sanitation["token"]))
    assert r.status_code == 200
    last = r.json()["history"][-1]
    assert last["by"] == "Ravi Shenoy"        # from the token
    assert last["department"] == "sanitation"  # not the "roads" the body asked for


# ── full loop ─────────────────────────────────────────────────────────
def test_full_citizen_authority_loop(client, citizen, sanitation, roads):
    c = new_complaint(client, citizen["token"])
    assert c["id"].endswith("-00123")
    assert c["department"] == "sanitation" and c["status"] == "new"
    assert client.get(c["image_url"]).status_code == 200

    # other department can't see it
    assert client.get("/api/authority/complaints", headers=bearer(roads["token"])).json() == []

    officer = bearer(sanitation["token"])
    for s in ["under_review", "action_assigned", "action_in_progress"]:
        r = client.patch(f"/api/authority/complaints/{c['id']}/status", json={"status": s}, headers=officer)
        assert r.status_code == 200, r.text

    # can't go backwards, can't resolve without a note
    assert client.patch(f"/api/authority/complaints/{c['id']}/status",
                        json={"status": "under_review"}, headers=officer).status_code == 409
    assert client.patch(f"/api/authority/complaints/{c['id']}/status",
                        json={"status": "resolved"}, headers=officer).status_code == 422

    r = client.post(f"/api/authority/complaints/{c['id']}/evidence",
                    files={"image": ("after.jpg", jpeg(800, 600), "image/jpeg")}, headers=officer)
    assert r.status_code == 200 and r.json()["after_image_url"]

    r = client.patch(f"/api/authority/complaints/{c['id']}/status",
                     json={"status": "resolved", "note": "Garbage was cleared from the reported location."},
                     headers=officer)
    assert r.status_code == 200

    tracked = client.get(f"/api/complaints/{c['id']}", headers=bearer(citizen["token"])).json()
    assert tracked["status"] == "resolved"
    assert tracked["history"][-1]["note"] == "Garbage was cleared from the reported location."
    assert tracked["history"][-1]["by"] == "Ravi Shenoy"
    assert client.get(tracked["after_image_url"]).status_code == 200

    # closed complaints are locked
    assert client.post(f"/api/authority/complaints/{c['id']}/action",
                       json={"note": "x"}, headers=officer).status_code == 409


def test_create_rejects_unsupported_issue(client, citizen):
    data = {"issue": "streetlight", "severity": "High", "latitude": 12.9, "longitude": 74.8,
            "location_source": "device_gps"}
    r = client.post("/api/complaints", files={"image": ("g.jpg", jpeg(), "image/jpeg")},
                    data={"data": json.dumps(data)}, headers=bearer(citizen["token"]))
    assert r.status_code == 422


def test_ids_increment(client, citizen):
    a = new_complaint(client, citizen["token"])
    b = new_complaint(client, citizen["token"], "pothole")
    assert int(b["id"][-5:]) == int(a["id"][-5:]) + 1
    assert b["department"] == "roads"


# ── migration of a pre-auth database ──────────────────────────────────
def test_opens_a_database_created_before_accounts_existed(tmp_path):
    """The old schema had no users table and no complaints.user_id."""
    db = tmp_path / "old.db"
    conn = sqlite3.connect(db)
    conn.execute("""CREATE TABLE complaints (
                        id TEXT PRIMARY KEY, seq INTEGER NOT NULL, department TEXT NOT NULL,
                        status TEXT NOT NULL, created_at TEXT NOT NULL, doc TEXT NOT NULL)""")
    conn.execute("INSERT INTO complaints VALUES (?,?,?,?,?,?)",
                 ("CL-2026-00001", 1, "roads", "new", "2026-01-01T00:00:00+00:00",
                  json.dumps({"id": "CL-2026-00001", "department": "roads", "status": "new"})))
    conn.commit()
    conn.close()

    store = Store(db, tmp_path / "uploads")
    columns = {r["name"] for r in store._conn.execute("PRAGMA table_info(complaints)")}
    assert "user_id" in columns
    # the old row survives, unowned, and still reaches its department queue
    assert len(store.list(department="roads")) == 1
    assert store.list(user_id="u_anybody") == []
