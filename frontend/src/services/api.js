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
// ─────────────────────────────────────────────────────────────

export const MOCK_MODE = (import.meta.env.VITE_API_MODE || 'mock') !== 'real'

export const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')

// Turn a backend-relative path (/uploads/abc.jpg) into a full URL.
export const assetUrl = (path) => {
  if (!path) return null
  if (/^(https?:|data:|blob:)/.test(path) || !path.startsWith('/uploads')) return path
  return `${BASE_URL}${path}`
}

async function request(method, path, { json, form } = {}) {
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: json ? { 'Content-Type': 'application/json' } : undefined,
      body: json ? JSON.stringify(json) : form,
    })
  } catch {
    throw new Error('Could not reach the CityLens server. Is the backend running?')
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

export const apiGet = (path) => request('GET', path)
export const apiPostJson = (path, json) => request('POST', path, { json })
export const apiPostForm = (path, form) => request('POST', path, { form })
export const apiPatch = (path, json) => request('PATCH', path, { json })

export const wait = (ms) => new Promise((r) => setTimeout(r, ms))
