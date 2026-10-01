// ─────────────────────────────────────────────────────────────
// authService.js — sign in, register, sign out.
//
// REAL MODE   POST /api/auth/register  {name, email, password}
//             POST /api/auth/login     {email, password}
//             GET  /api/auth/me
//   The backend returns a JWT. api.js stores it and attaches it to every
//   later request, so nothing else has to think about tokens.
//
// MOCK MODE   the same shapes, backed by localStorage, so the whole
//   citizen → authority → citizen loop still demos with no server. The
//   demo credentials match the backend's seeded accounts.
//
// Registration always produces a citizen. Officer accounts are created
// server-side only — see backend/README.md.
// ─────────────────────────────────────────────────────────────

import { MOCK_MODE, apiGet, apiPostJson, clearToken, getToken, setToken } from './api'
import { AUTHORITY_ACCOUNTS, DEMO_CITIZEN, MOCK_PASSWORD } from '../data/mockData'

const USER_KEY = 'citylens_user'          // cached so the first paint isn't a flash of the login page
const MOCK_USERS_KEY = 'citylens_mock_users'
const MOCK_SESSION_KEY = 'citylens_mock_session'

export const DEMO_CREDENTIALS = {
  citizen: { email: DEMO_CITIZEN.email, password: MOCK_PASSWORD },
  officerPassword: MOCK_PASSWORD,
}

// ── cached user ───────────────────────────────────────────────────
function readCachedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function cacheUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch { /* storage blocked — the session just won't survive a reload */ }
}

// ── MOCK user store ───────────────────────────────────────────────
function loadMockUsers() {
  try {
    const raw = localStorage.getItem(MOCK_USERS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* fall through to the seed */ }
  const seeded = [
    { ...DEMO_CITIZEN, password: MOCK_PASSWORD },
    ...AUTHORITY_ACCOUNTS.map((a) => ({ ...a, password: MOCK_PASSWORD })),
  ]
  saveMockUsers(seeded)
  return seeded
}

function saveMockUsers(users) {
  try {
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users))
  } catch { /* ignore */ }
}

/** Strip the password before anything outside this module sees a user. */
const publicUser = ({ password, ...rest }) => rest  // eslint-disable-line no-unused-vars

function setMockSession(user) {
  try {
    if (user) localStorage.setItem(MOCK_SESSION_KEY, user.id)
    else localStorage.removeItem(MOCK_SESSION_KEY)
  } catch { /* ignore */ }
}

function mockSessionUser() {
  try {
    const id = localStorage.getItem(MOCK_SESSION_KEY)
    if (!id) return null
    const found = loadMockUsers().find((u) => u.id === id)
    return found ? publicUser(found) : null
  } catch {
    return null
  }
}

// ── public API ────────────────────────────────────────────────────

/**
 * The signed-in user as far as this browser knows, without asking the
 * server. Use restoreSession() to confirm it's still valid.
 */
export function getCurrentUser() {
  return MOCK_MODE ? mockSessionUser() : (getToken() ? readCachedUser() : null)
}

/**
 * Called once on startup. In real mode this asks the backend whether the
 * stored token still works, so an expired or revoked session is cleared
 * instead of showing a signed-in UI that fails on first use.
 */
export async function restoreSession() {
  if (MOCK_MODE) return mockSessionUser()
  if (!getToken()) return null
  try {
    const user = await apiGet('/api/auth/me')
    cacheUser(user)
    return user
  } catch {
    // 401 already cleared the token in api.js; anything else (server down)
    // we also treat as "not signed in" rather than guessing.
    clearToken()
    cacheUser(null)
    return null
  }
}

/** Create a citizen account and sign in. */
export async function registerCitizen({ name, email, password }) {
  if (!MOCK_MODE) {
    const session = await apiPostJson('/api/auth/register',
      { name: name.trim(), email: email.trim(), password }, { anonymous: true })
    setToken(session.token)
    cacheUser(session.user)
    return session.user
  }

  const users = loadMockUsers()
  const normalized = email.trim().toLowerCase()
  if (users.some((u) => u.email.toLowerCase() === normalized)) {
    throw new Error('An account with this email already exists.')
  }
  if (password.length < 8) throw new Error('Password must be at least 8 characters.')
  const user = {
    id: `citizen-${Date.now().toString(36)}`,
    email: normalized,
    name: name.trim(),
    role: 'citizen',
    department: null,
    designation: null,
    password,
  }
  saveMockUsers([...users, user])
  setMockSession(user)
  return publicUser(user)
}

/** Sign in. Works for citizens and officers — check `role` on the result. */
export async function signIn({ email, password }) {
  if (!MOCK_MODE) {
    const session = await apiPostJson('/api/auth/login',
      { email: email.trim(), password }, { anonymous: true })
    setToken(session.token)
    cacheUser(session.user)
    return session.user
  }

  const normalized = email.trim().toLowerCase()
  const found = loadMockUsers().find((u) => u.email.toLowerCase() === normalized && u.password === password)
  // One message for both cases, so it can't be used to discover which
  // emails have accounts — same as the backend.
  if (!found) throw new Error('Incorrect email or password.')
  setMockSession(found)
  return publicUser(found)
}

/**
 * MOCK MODE only: one-click sign-in as a demo officer, so the authority
 * side can be shown without typing credentials. In real mode there is no
 * such shortcut — use signIn().
 */
export async function signInDemoAuthority(accountId) {
  if (!MOCK_MODE) throw new Error('Demo accounts are only available without a backend.')
  const account = loadMockUsers().find((u) => u.id === accountId)
  if (!account) throw new Error('Unknown demo account.')
  setMockSession(account)
  return publicUser(account)
}

export function signOut() {
  if (MOCK_MODE) setMockSession(null)
  else {
    // Nothing to call: the token is stateless, so signing out means
    // forgetting it. A stolen token stays valid until it expires —
    // that's the trade-off noted in backend/README.md.
    clearToken()
    cacheUser(null)
  }
}

export const listDemoAuthorityAccounts = () => (MOCK_MODE ? AUTHORITY_ACCOUNTS : [])
