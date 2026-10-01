"""
Authentication: password hashing, JWT issue/verify, and the dependency
that turns an Authorization header into a verified identity.

The rule this module exists to enforce:

    identity NEVER comes from the request body, the query string or a
    form field — only from a signed token.

So a citizen's complaints are scoped to the user id inside their token,
and an officer's name and department come from theirs. A client that
claims to be the roads department is simply ignored.

Password hashing uses stdlib PBKDF2-HMAC-SHA256 on purpose: no bcrypt
wheel to install, which keeps `pip install -r requirements.txt` painless
on Windows.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
from dataclasses import dataclass

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from . import config

# ── password hashing ──────────────────────────────────────────────────
_SCHEME = "pbkdf2_sha256"


def hash_password(password: str) -> str:
    """Return 'pbkdf2_sha256$rounds$salt$hex' — self-describing, so the
    round count can be raised later without breaking old hashes."""
    if len(password) < config.MIN_PASSWORD_LENGTH:
        raise ValueError(f"Password must be at least {config.MIN_PASSWORD_LENGTH} characters.")
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), config.PBKDF2_ROUNDS)
    return f"{_SCHEME}${config.PBKDF2_ROUNDS}${salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, rounds, salt, digest = stored.split("$")
        if scheme != _SCHEME:
            return False
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), int(rounds))
    except (ValueError, AttributeError):
        return False
    # constant-time: don't leak how much of the hash matched
    return hmac.compare_digest(candidate.hex(), digest)


# ── tokens ────────────────────────────────────────────────────────────
@dataclass(frozen=True)
class Identity:
    """What the token claims. Still has to be matched against a real
    user row before it is trusted (see main._current_user)."""
    id: str
    role: str
    name: str
    department: str | None


def create_token(user: dict) -> tuple[str, int]:
    """Returns (token, seconds_until_expiry)."""
    import time

    ttl = config.JWT_TTL_HOURS * 3600
    now = int(time.time())
    payload = {
        "sub": user["id"],
        "role": user["role"],
        "name": user["name"],
        "dept": user.get("department"),
        "iat": now,
        "exp": now + ttl,
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM), ttl


def decode_token(token: str) -> Identity:
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as e:
        raise HTTPException(401, "Your session has expired. Please sign in again.") from e
    except jwt.InvalidTokenError as e:
        raise HTTPException(401, "Invalid sign-in token.") from e
    if payload.get("role") not in config.ROLES or not payload.get("sub"):
        raise HTTPException(401, "Invalid sign-in token.")
    return Identity(
        id=str(payload["sub"]),
        role=str(payload["role"]),
        name=str(payload.get("name") or ""),
        department=payload.get("dept"),
    )


# ── dependency ────────────────────────────────────────────────────────
# auto_error=False so a missing header gives our own message rather than
# FastAPI's bare "Not authenticated".
_bearer = HTTPBearer(auto_error=False, description="JWT from /api/auth/login")


def bearer_identity(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> Identity:
    if creds is None or not creds.credentials:
        raise HTTPException(401, "Sign in to continue.")
    return decode_token(creds.credentials)
