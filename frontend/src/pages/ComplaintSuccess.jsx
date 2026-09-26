import React from 'react'
import { useLocation, Link, Navigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
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
      <span className="flex h-16 w-16 animate-fade-up items-center justify-center rounded-full bg-signal-greenLight text-signal-green">
        <CheckCircle2 className="h-8 w-8" strokeWidth={2} aria-hidden="true" />
      </span>
      <h1 className="mt-6 font-display text-2xl font-bold text-ink-900">Complaint submitted successfully</h1>
      <p className="mt-2 text-ink-500">Your report has been sent to the concerned authority.</p>

      <div className="mt-8 w-full rounded-2xl border border-ink-300/60 bg-white text-left">
        <div className="flex items-center justify-between border-b border-ink-200 px-6 py-5">
          <span className="text-sm text-ink-400">Complaint ID</span>
          <span className="font-display text-xl font-bold tracking-tight text-civic-800">{complaint.id}</span>
        </div>
        <dl className="space-y-3 px-6 py-5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-6">
              <dt className="text-sm text-ink-400">{k}</dt>
              <dd className="text-right text-sm font-medium text-ink-900">{v}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <dt className="text-sm text-ink-400">Status</dt>
            <dd><StatusBadge status={complaint.status} /></dd>
          </div>
        </dl>
      </div>
      <p className="mt-3 text-xs text-ink-400">Save your complaint ID to check progress anytime.</p>

      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button as={Link} to={`/track/${complaint.id}`}>Track Complaint</Button>
        <Button as={Link} to="/report" variant="secondary">Report Another Issue</Button>
      </div>
    </div>
  )
}
