// ─────────────────────────────────────────────────────────────
// AuthContext — the one source of truth for "who is signed in", and for
// "is there even a backend to sign in to".
//
// On startup it probes the backend (detectBackendMode) to decide mock vs
// real, THEN confirms the stored session, so an expired token shows the
// login page instead of a signed-in UI that fails on its first request.
// It also listens for the unauthorized event api.js fires when any
// request comes back 401, which covers a token expiring mid-session.
//
// Components read `mockMode` from here (not isMockMode() from api.js
// directly) so they re-render once the probe settles, instead of being
// stuck with whatever guess was available at their first render.
// ─────────────────────────────────────────────────────────────

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { UNAUTHORIZED_EVENT, detectBackendMode, isMockMode } from '../services/api'
import * as auth from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => auth.getCurrentUser())
  const [mockMode, setMockMode] = useState(() => isMockMode())
  // `ready` gates the route guards: until the probe + session check are
  // both done we don't know whether to show the page or the login screen.
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      const mock = await detectBackendMode()
      if (active) setMockMode(mock)
      const confirmed = await auth.restoreSession()
      if (active) setUser(confirmed)
    })().finally(() => { if (active) setReady(true) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  const signIn = useCallback(async (credentials) => {
    const signedIn = await auth.signIn(credentials)
    setUser(signedIn)
    return signedIn
  }, [])

  const register = useCallback(async (details) => {
    const created = await auth.registerCitizen(details)
    setUser(created)
    return created
  }, [])

  const signInDemoAuthority = useCallback(async (accountId) => {
    const signedIn = await auth.signInDemoAuthority(accountId)
    setUser(signedIn)
    return signedIn
  }, [])

  const signOut = useCallback(() => {
    auth.signOut()
    setUser(null)
  }, [])

  const value = useMemo(() => ({
    user,
    ready,
    mockMode,
    isCitizen: user?.role === 'citizen',
    isOfficer: user?.role === 'officer',
    signIn,
    register,
    signInDemoAuthority,
    signOut,
  }), [user, ready, mockMode, signIn, register, signInDemoAuthority, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
