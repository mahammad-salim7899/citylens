// ─────────────────────────────────────────────────────────────
// api.js — the single place that knows how to talk to the backend.
//
//   MOCK MODE  → services use simulated detection + browser storage
//   REAL MODE  → services call the FastAPI backend (backend/ folder)
//
// The mode is AUTO-DETECTED by default: on startup the app probes
// GET /api/health. If the backend answers, real mode. If it doesn't
// (no server, wrong URL, CORS blocked), mock mode — no flag to remember,
// no stale .env file silently hiding a running backend or the reverse.
//
// VITE_API_MODE overrides the probe when you want to force one mode:
//   VITE_API_MODE=mock   → always the offline demo, even if a backend
//                           happens to be running (a guaranteed demo
//                           with zero network calls)
//   VITE_API_MODE=real   → always real, with NO fallback — a backend
//                           problem surfaces as a real error instead of
//                           silently switching to demo data
//   (unset)              → auto-detect (the default)
//
// Components never check the mode directly; they only call services,
// which call isMockMode(). It's a function, not a constant, because the
// answer isn't known until the probe resolves — see detectBackendMode().
//
// This file also owns the JWT: every request carries it, and a 401 from
// the server clears it and announces that the session is gone, which
// AuthContext listens for. Keeping the token here means no other module
// has to remember to attach it.
// ─────────────────────────────────────────────────────────────

export const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')

const FORCED = (import.meta.env.VITE_API_MODE || '').trim().toLowerCase() // '', 'mock', 'real'

// Safe default before detection finishes: mock, unless real was forced.
// (Forcing real with no backend up is meant to fail loudly, not fall
// back silently.)
let _mockMode = FORCED !== 'real'
let _detected = FORCED === 'mock' || FORCED === 'real'
let _detectPromise = null

/** Current answer. Synchronous — always returns the best guess so far. */
export function isMockMode() {
  return _mockMode
}

/** Has detectBackendMode() finished (or was the mode forced)? */
export function isModeDetected() {
  return _detected
}

/**
 * Probe the backend once per page load and settle isMockMode(). Safe to
 * call multiple times — later calls just await the same result. A forced
 * mode (VITE_API_MODE=mock|real) skips the network call entirely.
 */
export function detectBackendMode() {
  if (_detected) return Promise.resolve(_mockMode)
  if (_detectPromise) return _detectPromise

  _detectPromise = (async () => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 1500)
      const res = await fetch(`${BASE_URL}/api/health`, { signal: controller.signal })
      clearTimeout(timeout)
      _mockMode = !res.ok
    } catch {
      _mockMode = true // no server, wrong URL, CORS blocked, timed out — treat all the same
    } finally {
      _detected = true
    }
    return _mockMode
  })()
  return _detectPromise
}

// ── session token ────────────────────────────────────────────────
const TOKEN_KEY = 'citylens_token'

/** Fired when the server rejects our token. AuthContext signs the user out. */
export const UNAUTHORIZED_EVENT = 'citylens:unauthorized'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null // private mode / storage blocked
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* nothing we can do; the session just won't survive a reload */ }
}

export const clearToken = () => setToken(null)

// Turn a backend-relative path (/uploads/abc.jpg) into a full URL.
export const assetUrl = (path) => {
  if (!path) return null
  if (/^(https?:|data:|blob:)/.test(path) || !path.startsWith('/uploads')) return path
  return `${BASE_URL}${path}`
}

/**
 * @param {object} [opts]
 * @param {object} [opts.json]      JSON body
 * @param {FormData} [opts.form]    multipart body
 * @param {boolean} [opts.anonymous] skip the token, and don't treat a 401
 *   as "session expired" — used by login/register, where 401 just means
 *   the password was wrong.
 */
async function request(method, path, { json, form, anonymous } = {}) {
  const headers = {}
  if (json) headers['Content-Type'] = 'application/json'
  if (!anonymous) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: Object.keys(headers).length ? headers : undefined,
      body: json ? JSON.stringify(json) : form,
    })
  } catch {
    throw new Error('Could not reach the CityLens server. Is the backend running?')
  }

  if (res.status === 401 && !anonymous) {
    clearToken()
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }

  if (!res.ok) {
    let detail = `Server error ${res.status}`
    try {
      const body = await res.json()
      if (body?.detail) detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
    } catch { /* ignore */ }
    throw new Error(detail)
  }
  return res.json()
}

export const apiGet = (path, opts) => request('GET', path, opts)
export const apiPostJson = (path, json, opts) => request('POST', path, { ...opts, json })
export const apiPostForm = (path, form, opts) => request('POST', path, { ...opts, form })
export const apiPatch = (path, json, opts) => request('PATCH', path, { ...opts, json })

export const wait = (ms) => new Promise((r) => setTimeout(r, ms))
