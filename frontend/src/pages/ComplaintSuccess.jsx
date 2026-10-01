import React from 'react'
import { useLocation, Link, Navigate } from 'react-router-dom'
import Button from '../components/Button'
import StatusBadge from '../components/StatusBadge'
import { issueLabel } from '../config/issueTypes'
import { departmentName } from '../config/departments'
import { shortAddress } from '../lib/format'

export default function ComplaintSuccess() {
  const { state } = useLocation()
  const complaint = state?.complaint
  if (!complaint) return <Navigate to="/report" replace />

  const rows = [
    ['Issue', issueLabel(complaint.issue)],
    ['Location', shortAddress(complaint.address)],
    ['Sent to', departmentName(complaint.department)],
  ]

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      {/* Circle draws, then the tick, then a ripple — about one second. */}
      <span className="relative flex h-20 w-20 items-center justify-center" aria-hidden="true">
        <span className="absolute inset-0 animate-scale-in rounded-full bg-signal-greenLight" />
        <span className="absolute inset-0 animate-ripple rounded-full border-2 border-signal-green/50" style={{ '--d': '900ms' }} />
        <svg viewBox="0 0 52 52" className="relative h-20 w-20 text-signal-green" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="26" cy="26" r="17" strokeWidth="2.5" pathLength="1" className="svg-draw" style={{ '--d': '150ms' }} />
          <path d="M18.5 26.5l5 5 10-11" strokeWidth="3" pathLength="1" className="svg-draw" style={{ '--d': '600ms' }} />
        </svg>
      </span>
      <h1 className="mt-6 animate-rise font-display text-2xl font-bold text-ink-900" style={{ '--d': '350ms' }}>Complaint submitted successfully</h1>
      <p className="mt-2 animate-rise text-ink-500" style={{ '--d': '420ms' }}>Your report has been sent to the concerned authority.</p>

      <div className="mt-8 w-full animate-rise rounded-2xl border border-ink-300/60 bg-white text-left shadow-card" style={{ '--d': '520ms' }}>
        <div className="flex items-center justify-between border-b border-ink-200 px-6 py-5">
          <span className="text-sm text-ink-400">Complaint ID</span>
          <span className="font-display text-xl font-bold tracking-tight text-civic-800">{complaint.id}</span>
        </div>
        <dl className="space-y-3 px-6 py-5">
          {rows.map(([k, v], i) => (
            <div key={k} className="flex animate-fade-in items-start justify-between gap-6" style={{ '--d': `${650 + i * 80}ms` }}>
              <dt className="text-sm text-ink-400">{k}</dt>
              <dd className="text-right text-sm font-medium text-ink-900">{v}</dd>
            </div>
          ))}
          <div className="flex animate-fade-in items-center justify-between" style={{ '--d': `${650 + rows.length * 80}ms` }}>
            <dt className="text-sm text-ink-400">Status</dt>
            <dd><StatusBadge status={complaint.status} /></dd>
          </div>
        </dl>
      </div>
      <p className="mt-3 animate-fade-in text-xs text-ink-400" style={{ '--d': '900ms' }}>Save your complaint ID to check progress anytime.</p>

      <div className="mt-8 flex w-full animate-rise flex-col gap-3 sm:w-auto sm:flex-row" style={{ '--d': '950ms' }}>
        <Button as={Link} to={`/track/${complaint.id}`}>Track Complaint</Button>
        <Button as={Link} to="/report" variant="secondary">Report Another Issue</Button>
      </div>
    </div>
  )
}
