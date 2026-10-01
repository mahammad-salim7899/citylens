"""
Storage — SQLite (a single file, no database server needed).

Two tables:

  users       citizens and officers, with PBKDF2 password hashes
  complaints  one JSON document per complaint, plus indexed columns
              (user_id, department, status) for the two queues:
              "my complaints" for a citizen and the department queue
              for an officer

Uploaded photos are saved under data/uploads/ and served at /uploads/<file>.
"""
from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from . import auth, config

_lock = threading.Lock()

# Columns that never leave the server.
_PRIVATE_USER_FIELDS = ("password_hash",)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def public_user(row: dict | None) -> dict | None:
    """A user as the API is allowed to return it."""
    if row is None:
        return None
    return {k: v for k, v in row.items() if k not in _PRIVATE_USER_FIELDS}


class EmailTakenError(ValueError):
    pass


class Store:
    def __init__(self, db_path: Path = config.DB_PATH, upload_dir: Path = config.UPLOAD_DIR) -> None:
        self.db_path = Path(db_path)
        self.upload_dir = Path(upload_dir)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        # Order matters: a database created before accounts existed has a
        # complaints table without user_id, so the column has to be added
        # before anything indexes it.
        self._create_schema()
        self._migrate()
        self._create_indexes()

    # ── schema ──────────────────────────────────────────────────────
    def _create_schema(self) -> None:
        self._conn.execute(
            """CREATE TABLE IF NOT EXISTS users (
                   id            TEXT PRIMARY KEY,
                   email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
                   password_hash TEXT NOT NULL,
                   name          TEXT NOT NULL,
                   role          TEXT NOT NULL,
                   department    TEXT,
                   designation   TEXT,
                   created_at    TEXT NOT NULL)"""
        )
        self._conn.execute(
            """CREATE TABLE IF NOT EXISTS complaints (
                   id         TEXT PRIMARY KEY,
                   seq        INTEGER NOT NULL,
                   user_id    TEXT,
                   department TEXT NOT NULL,
                   status     TEXT NOT NULL,
                   created_at TEXT NOT NULL,
                   doc        TEXT NOT NULL)"""
        )
        self._conn.commit()

    def _create_indexes(self) -> None:
        self._conn.execute("CREATE INDEX IF NOT EXISTS idx_dept ON complaints(department)")
        self._conn.execute("CREATE INDEX IF NOT EXISTS idx_user ON complaints(user_id)")
        self._conn.commit()

    def _migrate(self) -> None:
        """Add user_id to a complaints table created before accounts existed.

        Pre-existing complaints keep user_id = NULL. They stay visible in
        the department queue but belong to no citizen, so no citizen can
        read them — inventing an owner would be worse than leaving them
        unclaimed.
        """
        columns = {r["name"] for r in self._conn.execute("PRAGMA table_info(complaints)")}
        if "user_id" not in columns:
            self._conn.execute("ALTER TABLE complaints ADD COLUMN user_id TEXT")
            self._conn.commit()

    # ── users ───────────────────────────────────────────────────────
    def seed_officers(self) -> int:
        """Create the demo officer accounts, but only on a fresh database."""
        if self._conn.execute("SELECT 1 FROM users LIMIT 1").fetchone():
            return 0
        created = 0
        for o in config.SEED_OFFICERS:
            self.create_user(
                email=o["email"],
                password=config.SEED_OFFICER_PASSWORD,
                name=o["name"],
                role="officer",
                department=o["department"],
                designation=o["designation"],
            )
            created += 1
        return created

    def create_user(self, *, email: str, password: str, name: str, role: str,
                    department: str | None = None, designation: str | None = None) -> dict:
        email = email.strip().lower()
        row = {
            "id": f"u_{uuid.uuid4().hex[:16]}",
            "email": email,
            "password_hash": auth.hash_password(password),
            "name": name.strip(),
            "role": role,
            "department": department,
            "designation": designation,
            "created_at": now_iso(),
        }
        with _lock:
            try:
                self._conn.execute(
                    """INSERT INTO users (id, email, password_hash, name, role, department, designation, created_at)
                       VALUES (:id, :email, :password_hash, :name, :role, :department, :designation, :created_at)""",
                    row,
                )
            except sqlite3.IntegrityError as e:
                raise EmailTakenError("An account with this email already exists.") from e
            self._conn.commit()
        return row

    def get_user_by_email(self, email: str) -> dict | None:
        row = self._conn.execute(
            "SELECT * FROM users WHERE email = ?", (email.strip().lower(),)
        ).fetchone()
        return dict(row) if row else None

    def get_user(self, user_id: str) -> dict | None:
        row = self._conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None

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
                """INSERT INTO complaints (id, seq, user_id, department, status, created_at, doc)
                   VALUES (?,?,?,?,?,?,?)""",
                (cid, seq, doc.get("user_id"), doc["department"], doc["status"],
                 doc["created_at"], json.dumps(doc)),
            )
            self._conn.commit()
        return doc

    def get(self, cid: str) -> dict | None:
        row = self._conn.execute("SELECT doc FROM complaints WHERE id = ?", (cid,)).fetchone()
        return json.loads(row["doc"]) if row else None

    def list(self, department: str | None = None, user_id: str | None = None) -> list[dict]:
        """Filter by department (officer queue) and/or user_id (a citizen's
        own complaints). Called with neither only by admin-style tooling —
        no API route does that any more."""
        where, params = [], []
        if department:
            where.append("department = ?")
            params.append(department)
        if user_id:
            where.append("user_id = ?")
            params.append(user_id)
        sql = "SELECT doc FROM complaints"
        if where:
            sql += " WHERE " + " AND ".join(where)
        sql += " ORDER BY seq DESC"
        return [json.loads(r["doc"]) for r in self._conn.execute(sql, params).fetchall()]

    def save(self, doc: dict) -> dict:
        with _lock:
            self._conn.execute(
                "UPDATE complaints SET status = ?, doc = ? WHERE id = ?",
                (doc["status"], json.dumps(doc), doc["id"]),
            )
            self._conn.commit()
        return doc
