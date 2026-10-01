import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, ExternalLink, Eye, EyeOff } from 'lucide-react'
import SeverityBadge from '../components/SeverityBadge'
import StatusBadge from '../components/StatusBadge'
import MapView from '../components/MapView'
import AuthorityAction from '../components/AuthorityAction'
import StatusTimeline from '../components/StatusTimeline'
import DetectionOverlay from '../components/DetectionOverlay'
import { useToast } from '../components/Toast'
import { LoadingState, ErrorState } from '../components/PageState'
import { issueLabel } from '../config/issueTypes'
import { STATUS_META } from '../config/statuses'
import { getAuthorityComplaint, updateComplaint } from '../services/complaintService'
import { useLoader } from '../lib/useLoader'
import { formatDateTime, percent } from '../lib/format'

function Section({ title, children, action }) {
  return (
    <section className="rounded-2xl border border-ink-300/60 bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold text-ink-900">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Field({ label, children, wide }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-ink-900">{children}</dd>
    </div>
  )
}

function Details({ id }) {
  const toast = useToast()
  const [showBoxes, setShowBoxes] = useState(true)
  const { data: complaint, loading, error, reload } = useLoader(() => getAuthorityComplaint(id), [id])

  if (loading) return <LoadingState label="Loading complaint…" />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!complaint) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-ink-500">No complaint found with ID “{id}”.</p>
        <Link to="/authority" className="mt-3 inline-block text-sm font-medium text-civic-700 hover:underline">Back to dashboard</Link>
      </div>
    )
  }
  // No department check here any more: the server refuses to return
  // another department's complaint at all, and mock mode does the same,
  // so reaching this point means it is ours. (`error` above carries the
  // "belongs to another department" message in both modes.)
  const det = complaint.detection || {}
  const primary = det.detections?.[0]

  const handleAction = async ({ status, note, afterImageDataUrl }) => {
    // No officer or department passed: the server reads both from the token.
    await updateComplaint(complaint.id, { status, note, afterImageDataUrl })
    toast.show(
      status === complaint.status ? 'Note added to the complaint.' : `Complaint marked as ${STATUS_META[status].authority}. The citizen can now see this update.`,
      'success'
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Link to="/authority" className="focus-ring inline-flex items-center gap-1.5 rounded text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{complaint.id}</h1>
        <StatusBadge status={complaint.status} audience="authority" />
        <SeverityBadge severity={complaint.severity} size="sm" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Section title="Complaint information">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Complaint ID">{complaint.id}</Field>
              <Field label="Issue type">{issueLabel(complaint.issue)}</Field>
              <Field label="Severity">
                {complaint.severity} <span className="font-normal text-ink-400">({complaint.severity_source === 'citizen' ? 'rated by citizen' : 'severity engine'})</span>
              </Field>
              <Field label="Date & time">{formatDateTime(complaint.created_at)}</Field>
              <Field label="Location" wide>{complaint.address}</Field>
              <Field label="Citizen description" wide>
                <span className="font-normal text-ink-700">{complaint.description || 'No description provided.'}</span>
              </Field>
            </dl>
          </Section>

          <Section
            title="Evidence"
            action={det.detections?.length > 0 && (
              <button type="button" onClick={() => setShowBoxes((v) => !v)} aria-pressed={showBoxes}
                className="focus-ring flex items-center gap-1.5 rounded text-xs font-medium text-ink-500 hover:text-ink-900">
                {showBoxes ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                {showBoxes ? 'Hide boxes' : 'Show boxes'}
              </button>
            )}
          >
            <div className={`grid gap-4 ${complaint.after_image_url ? 'sm:grid-cols-2' : ''}`}>
              <figure>
                <figcaption className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-400">
                  {complaint.after_image_url ? 'Before · original citizen image' : 'Original citizen image'}
                </figcaption>
                <div className="overflow-hidden rounded-xl">
                  <DetectionOverlay src={complaint.image_url} detections={det.detections} showBoxes={showBoxes}
                    imageWidth={det.image_width} imageHeight={det.image_height} maxHeight="max-h-80" />
                </div>
              </figure>
              {complaint.after_image_url && (
                <figure>
                  <figcaption className="mb-2 text-xs font-medium uppercase tracking-wide text-signal-green">After · resolution evidence</figcaption>
                  <img src={complaint.after_image_url} alt="After action" className="max-h-80 w-full rounded-xl bg-ink-100 object-cover" />
                </figure>
              )}
            </div>

            <div className="mt-5 rounded-xl bg-ink-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                AI detection result {det.source === 'mock' && <span className="ml-1 rounded bg-signal-amberLight px-1.5 py-0.5 normal-case text-signal-amber">simulated</span>}
              </p>
              {det.ai_issue ? (
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <Field label="Detected issue">{issueLabel(det.ai_issue)}</Field>
                  <Field label="Confidence">{percent(det.ai_confidence)}</Field>
                  <Field label="Severity">{complaint.severity_source === 'model' ? complaint.severity : '—'}</Field>
                  <Field label="Detections">{det.detections?.length || 0}</Field>
                  {primary && (
                    <Field label="Bounding box (x1, y1, x2, y2)" wide>
                      <span className="font-mono text-xs font-normal text-ink-700">[{primary.bbox.map(Math.round).join(', ')}] px of {det.image_width}×{det.image_height}</span>
                    </Field>
                  )}
                  {det.severity_reason && <Field label="Severity reason" wide><span className="font-normal text-ink-700">{det.severity_reason}</span></Field>}
                </dl>
              ) : (
                <p className="mt-2 text-sm text-ink-600">The model found no supported issue; the citizen selected the issue type manually.</p>
              )}
              {det.corrected_by_citizen && (
                <p className="mt-3 text-sm text-signal-amber">
                  Citizen changed the issue from {issueLabel(det.ai_issue)} to {issueLabel(complaint.issue)}.
                </p>
              )}
            </div>
          </Section>

          <Section
            title="Location"
            action={
              <a href={`https://www.google.com/maps/search/?api=1&query=${complaint.latitude},${complaint.longitude}`} target="_blank" rel="noreferrer"
                className="focus-ring flex items-center gap-1 rounded text-xs font-medium text-civic-700 hover:underline">
                Open in Google Maps <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            }
          >
            <p className="flex items-start gap-2 font-display text-lg font-semibold text-ink-900">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-civic-700" aria-hidden="true" /> {complaint.address}
            </p>
            <div className="mt-4"><MapView complaints={[complaint]} height="h-64" zoom={17} /></div>
            <p className="mt-3 font-mono text-xs text-ink-500">
              {complaint.latitude.toFixed(6)}, {complaint.longitude.toFixed(6)} · source: {complaint.location_source}
            </p>
          </Section>

          <AuthorityAction complaint={complaint} onSubmit={handleAction} />
        </div>

        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-24"><StatusTimeline complaint={complaint} audience="authority" /></div>
        </div>
      </div>
    </div>
  )
}

export default function AuthorityComplaintDetails() {
  // RequireAuth guarantees a signed-in officer by the time we render.
  const { id } = useParams()
  return <Details id={id} />
}
