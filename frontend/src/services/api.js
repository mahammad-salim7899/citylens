// ─────────────────────────────────────────────────────────────
// api.js — the single place that knows how to talk to the backend.
//
//   MOCK MODE  → services use simulated detection + browser storage
//   REAL MODE  → services call the FastAPI backend (backend/ folder)
//
// Switch with an env variable — no code changes:
//   frontend/.env  →  VITE_API_MODE=real
//                     VITE_API_BASE_URL=http://localhost:8000
//
// Components never check the mode; they only call services.
//
// This file also owns the JWT: every request carries it, and a 401 from
// the server clears it and announces that the session is gone, which
// AuthContext listens for. Keeping the token here means no other module
// has to remember to attach it.
// ─────────────────────────────────────────────────────────────

export const MOCK_MODE = (import.meta.env.VITE_API_MODE || 'mock') !== 'real'

export const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')

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
