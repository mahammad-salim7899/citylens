# CityLens authentication — what was built (2026-10-01)

JWT authentication added to close three authorization holes. All 47 backend
tests plus a 24-check live integration pass are green.

## The holes that were closed

1. **Department came from the client.** `GET /api/authority/complaints?department=…`
   and `officer`/`department` fields in every status, action and evidence request.
   Anyone could act as any department and sign a status change with any officer's
   name.
2. **`GET /api/complaints` returned every complaint**, because there was no citizen
   identity to filter by.
3. **`GET /api/authority/complaints/{id}` skipped its department check entirely** —
   it called the internal helper without the department argument, so any department
   could read any complaint's full detail. This was a latent bug, not just a weak
   design.

## Design decisions

- **Identity comes only from the signed token.** No endpoint reads an owner,
  department or officer name from the body, query string or form. That is the single
  rule the whole change is built around.
- **PyJWT + stdlib PBKDF2-HMAC-SHA256** (240k rounds, per-user salt, constant-time
  compare). PBKDF2 over bcrypt specifically to avoid a bcrypt wheel on Windows;
  PyJWT is the one new dependency.
- **JWT secret**: `CITYLENS_JWT_SECRET` in production. Unset, the server generates
  one and keeps it in `data/.jwt_secret` so `uvicorn --reload` doesn't sign you out.
  Deliberately not a hardcoded default, since a shipped default lets anyone forge an
  officer token. `data/` is already gitignored. Startup logs a warning while the dev
  default is in use.
- **Citizens register themselves; officers cannot.** `/api/auth/register` always
  produces a citizen regardless of what the client sends, so nobody can sign up as
  the traffic department. Three officers are seeded only on a brand-new database,
  password from `CITYLENS_SEED_OFFICER_PASSWORD` (demo default `citylens-demo`).
- **404, not 403, for another citizen's complaint**, so IDs can't be enumerated.
- **The token is re-checked against a real user row** on every request, so a deleted
  account loses access immediately rather than when its token expires.
- **Mock mode kept working** with the same rules applied locally, so the demo still
  runs with no server. Demo credentials match the backend seeds.
- **Citizens now need an account to report.** This was a deliberate choice (the
  architecture doc specifies Register/Login under Citizen Features) and it changed
  the previous "report without an account" flow.

## Still missing before any real deployment

Refresh tokens and logout-everywhere (a stolen token stays valid until it expires),
password reset, email verification, and rate limiting on `/api/auth/login`.

## Note on the existing database

Complaints in `backend/data/citylens.db` created before this change have
`user_id = NULL`. A guarded `ALTER TABLE` migrates the schema on first open. Those
rows stay in the department queue but belong to no citizen, so no citizen can read
them — inventing an owner would have been worse. Delete the db file for a clean
start.

## Known remaining inconsistency

`CityLens_Architecture.md` still describes 5 issue classes, PostgreSQL and video
frame extraction; the code has 3 issues, SQLite and images only. The doc's JWT claim
is now accurate. Worth syncing the rest before the PBL review.