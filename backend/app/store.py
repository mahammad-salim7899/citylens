"""
Complaint storage — SQLite (a single file, no database server needed).

Each complaint is stored as a JSON document plus a few indexed columns
(department, status) for the authority queue. Uploaded photos are saved
under data/uploads/ and served at /uploads/<file>.
"""
from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from . import config

_lock = threading.Lock()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class Store:
    def __init__(self, db_path: Path = config.DB_PATH, upload_dir: Path = config.UPLOAD_DIR) -> None:
        self.db_path = Path(db_path)
        self.upload_dir = Path(upload_dir)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.execute(
            """CREATE TABLE IF NOT EXISTS complaints (
                   id TEXT PRIMARY KEY,
                   seq INTEGER NOT NULL,
                   department TEXT NOT NULL,
                   status TEXT NOT NULL,
                   created_at TEXT NOT NULL,
                   doc TEXT NOT NULL)"""
        )
        self._conn.execute("CREATE INDEX IF NOT EXISTS idx_dept ON complaints(department)")
        self._conn.commit()

    # ── images ──────────────────────────────────────────────────────
    def save_image(self, data: bytes, prefix: str) -> str:
        name = f"{prefix}-{uuid.uuid4().hex[:12]}.jpg"
        (self.upload_dir / name).write_bytes(data)
        return f"/uploads/{name}"

    # ── complaints ──────────────────────────────────────────────────
    def _next_id(self) -> tuple[str, int]:
        row = self._conn.execute("SELECT MAX(seq) FROM complaints").fetchone()
        seq = (row[0] or config.ID_START_SEQUENCE) + 1
        return f"CL-{datetime.now().year}-{seq:05d}", seq

    def create(self, doc: dict) -> dict:
        with _lock:
            cid, seq = self._next_id()
            doc = {**doc, "id": cid}
            self._conn.execute(
                "INSERT INTO complaints (id, seq, department, status, created_at, doc) VALUES (?,?,?,?,?,?)",
                (cid, seq, doc["department"], doc["status"], doc["created_at"], json.dumps(doc)),
            )
            self._conn.commit()
        return doc

    def get(self, cid: str) -> dict | None:
        row = self._conn.execute("SELECT doc FROM complaints WHERE id = ?", (cid,)).fetchone()
        return json.loads(row[0]) if row else None

    def list(self, department: str | None = None) -> list[dict]:
        if department:
            rows = self._conn.execute("SELECT doc FROM complaints WHERE department = ? ORDER BY seq DESC", (department,))
        else:
            rows = self._conn.execute("SELECT doc FROM complaints ORDER BY seq DESC")
        return [json.loads(r[0]) for r in rows.fetchall()]

    def save(self, doc: dict) -> dict:
        with _lock:
            self._conn.execute(
                "UPDATE complaints SET status = ?, doc = ? WHERE id = ?",
                (doc["status"], json.dumps(doc), doc["id"]),
            )
            self._conn.commit()
        return doc
