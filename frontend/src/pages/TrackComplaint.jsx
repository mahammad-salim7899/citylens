import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Search, MapPin, Landmark, CheckCircle2, XCircle, ScanEye, UserRound } from 'lucide-react'
import Button from '../components/Button'
import SeverityBadge from '../components/SeverityBadge'
import StatusBadge from '../components/StatusBadge'
import StatusTimeline from '../components/StatusTimeline'
import MapView from '../components/MapView'
import DetectionOverlay from '../components/DetectionOverlay'
import IssueIcon from '../components/IssueIcon'
import { LoadingState, ErrorState } from '../components/PageState'
import { issueLabel } from '../config/issueTypes'
import { departmentName } from '../config/departments'
import { getComplaint, listComplaints } from '../services/complaintService'
import { useLoader } from '../lib/useLoader'
import { formatDateTime, percent } from '../lib/format'

// Latest note written by the authority (not the citizen / system).
const latestAuthorityNote = (history = []) =>
  [...history].reverse().find((h) => (h.kind === 'status' || h.kind === 'action') && h.note)

function TrackSearch({ id }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState(id || '')
  const { data: recent } = useLoader(listComplaints)

  const handleSearch = (e) => {
    e.preventDefault()
    const q = query.trim().toUpperCase()
    if (q) navigate(`/track/${q}`)
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">Track your complaint</h1>
      <p className="mt-2 text-ink-500">Enter your complaint ID to see its current status.</p>
      <form onSubmit={handleSearch} className="mt-6 flex gap-2">
        <label htmlFor="track-id" className="sr-only">Complaint ID</label>
        <input
          id="track-id"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. CL-2026-00123"
          autoComplete="off"
          className="focus-ring min-w-0 flex-1 rounded-xl border border-ink-300 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400"
        />
        <Button type="submit" icon={Search}>Track</Button>
      </form>

      {id && <p className="mt-4 text-sm text-signal-red" role="alert">We couldn't find a complaint with ID “{id}”. Check the ID and try again.</p>}

      {recent?.length > 0 && (
        <div className="mt-10">
          <p className="text-sm font-medium text-ink-900">Or pick one of your recent reports</p>
          <div className="mt-3 space-y-2">
            {recent.slice(0, 4).map((c) => (
              <Link key={c.id} to={`/track/${c.id}`}
                className="focus-ring flex items-center gap-3 rounded-xl border border-ink-300/60 bg-white px-4 py-3 text-sm transition-colors hover:border-civic-500">
                <IssueIcon issue={c.issue} size="sm" />
                <span className="font-medium text-ink-900">{c.id}</span>
                <span className="truncate text-ink-500">{issueLabel(c.issue)}</span>
                <span className="ml-auto"><StatusBadge status={c.status} /></span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function TrackComplaint() {
  const { id } = useParams()
  const { data: complaint, loading, error, reload } = useLoader(() => (id ? getComplaint(id) : Promise.resolve(null)), [id])

  if (!id) return <TrackSearch />
  if (loading) return <LoadingState label="Loading complaint…" />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!complaint) return <TrackSearch id={id} />

  const authorityNote = latestAuthorityNote(complaint.history)
  const resolved = complaint.status === 'resolved'
  const rejected = complaint.status === 'rejected'
  const det = complaint.detection || {}

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <Link to="/dashboard" className="focus-ring rounded text-sm font-medium text-ink-500 hover:text-ink-900">← My reports</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{complaint.id}</h1>
        <StatusBadge status={complaint.status} />
        <SeverityBadge severity={complaint.severity} size="sm" />
      </div>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-ink-500">
        <span className="font-medium text-ink-700">{issueLabel(complaint.issue)}</span> ·
        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{complaint.address}</span>
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-400">
        <Landmark className="h-3.5 w-3.5" aria-hidden="true" /> {departmentName(complaint.department)} · Reported {formatDateTime(complaint.created_at)}
      </p>

      {/* Authority outcome — the part of the loop the citizen cares about most */}
      {authorityNote && (
        <div className={`mt-8 rounded-2xl border p-5 ${resolved ? 'border-signal-green/30 bg-signal-greenLight/50' : rejected ? 'border-signal-red/25 bg-signal-redLight/50' : 'border-civic-200 bg-civic-50'}`}>
          <div className="flex items-start gap-3">
            {resolved ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-signal-green" aria-hidden="true" />
              : rejected ? <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-signal-red" aria-hidden="true" />
              : <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-civic-700" aria-hidden="true" />}
            <div>
              <h2 className="font-display text-base font-semibold text-ink-900">
                {resolved ? 'Resolved — action taken by authority' : rejected ? 'Complaint closed by authority' : 'Action taken by authority'}
              </h2>
              <p className="mt-1 text-[15px] text-ink-700">“{authorityNote.note}”</p>
              <p className="mt-1.5 text-xs text-ink-500">{departmentName(authorityNote.department)} · {formatDateTime(authorityNote.at)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {complaint.after_image_url ? (
            <div className="rounded-2xl border border-ink-300/60 bg-white p-5">
              <h2 className="font-display text-base font-semibold text-ink-900">Resolution evidence</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[['Before', complaint.image_url], ['After', complaint.after_image_url]].map(([label, src]) => (
                  <figure key={label}>
                    <img src={src} alt={`${label} action`} className="aspect-[4/3] w-full rounded-xl bg-ink-100 object-cover" />
                    <figcaption className={`mt-2 text-center text-xs font-semibold uppercase tracking-wide ${label === 'After' ? 'text-signal-green' : 'text-ink-500'}`}>{label}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-ink-300/60 bg-white">
              <DetectionOverlay src={complaint.image_url} detections={det.corrected_by_citizen ? [] : det.detections}
                imageWidth={det.image_width} imageHeight={det.image_height} maxHeight="max-h-80" />
            </div>
          )}

          <div className="rounded-2xl border border-ink-300/60 bg-white p-5">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Your description</dt>
                <dd className="mt-1 text-ink-700">{complaint.description || 'No description provided.'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Identified by</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-ink-700">
                  <ScanEye className="h-4 w-4 text-civic-600" aria-hidden="true" />
                  {det.corrected_by_citizen
                    ? `You (AI suggested ${issueLabel(det.ai_issue)})`
                    : det.ai_issue
                      ? `AI · ${percent(det.ai_confidence)} confidence${det.source === 'mock' ? ' (simulated)' : ''}`
                      : 'You'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Location source</dt>
                <dd className="mt-1 text-ink-700">{complaint.location_source === 'image_exif' ? 'From your photo' : 'From your device'}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-ink-300/60 bg-white p-5">
            <h2 className="font-display text-base font-semibold text-ink-900">Location</h2>
            <div className="mt-3"><MapView complaints={[complaint]} height="h-56" /></div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-24"><StatusTimeline complaint={complaint} /></div>
        </div>
      </div>
    </div>
  )
}
