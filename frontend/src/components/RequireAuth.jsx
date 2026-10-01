// ─────────────────────────────────────────────────────────────
// RequireAuth — route guard.
//
// This is convenience, not security: the backend checks the token on
// every request regardless. Its job is to send people to the right place
// instead of letting a page load and fail.
// ─────────────────────────────────────────────────────────────

import React from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { LoadingState } from './PageState'

function WrongRole({ needed }) {
  const citizenWanted = needed === 'citizen'
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <ShieldAlert className="mx-auto h-9 w-9 text-signal-amber" aria-hidden="true" />
      <h1 className="mt-3 font-display text-xl font-semibold text-ink-900">
        {citizenWanted ? 'This page is for citizen accounts' : 'This page is for authority accounts'}
      </h1>
      <p className="mt-2 text-sm text-ink-500">
        {citizenWanted
          ? "You're signed in as an authority officer. Reporting and tracking happen on a citizen account."
          : "You're signed in as a citizen. The authority portal is only for department officers."}
      </p>
      <div className="mt-5 flex items-center justify-center gap-4 text-sm font-medium">
        <Link to={citizenWanted ? '/authority' : '/dashboard'} className="text-civic-700 hover:underline">
          {citizenWanted ? 'Go to the authority portal' : 'Go to your reports'}
        </Link>
        <Link to="/login" className="text-ink-500 hover:text-ink-900">Switch account</Link>
      </div>
    </div>
  )
}

export default function RequireAuth({ role, children }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) return <LoadingState label="Checking your session…" />
  // Remember where they were headed so login can send them back.
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (role && user.role !== role) return <WrongRole needed={role} />
  return children
}
