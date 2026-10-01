// ─────────────────────────────────────────────────────────────
// AuthContext — the one source of truth for "who is signed in".
//
// On startup it confirms the stored session with the backend, so an
// expired token shows the login page instead of a signed-in UI that
// fails on its first request. It also listens for the unauthorized event
// api.js fires when any request comes back 401, which covers a token
// expiring mid-session.
// ─────────────────────────────────────────────────────────────

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { UNAUTHORIZED_EVENT } from '../services/api'
import * as auth from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => auth.getCurrentUser())
  // `ready` gates the route guards: until the session is confirmed we
  // don't know whether to show the page or the login screen.
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    auth.restoreSession()
      .then((confirmed) => { if (active) setUser(confirmed) })
      .finally(() => { if (active) setReady(true) })
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
    isCitizen: user?.role === 'citizen',
    isOfficer: user?.role === 'officer',
    signIn,
    register,
    signInDemoAuthority,
    signOut,
  }), [user, ready, signIn, register, signInDemoAuthority, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
