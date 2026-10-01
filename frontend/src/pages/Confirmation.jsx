import React, { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, RotateCcw, ArrowRight, MapPin, Landmark, ArrowLeft } from 'lucide-react'
import StepIndicator from '../components/StepIndicator'
import DetectionResult from '../components/DetectionResult'
import DemoNotice from '../components/DemoNotice'
import IssueIcon from '../components/IssueIcon'
import Button from '../components/Button'
import SeverityBadge from '../components/SeverityBadge'
import { useToast } from '../components/Toast'
import { ISSUE_TYPES, issueLabel } from '../config/issueTypes'
import { departmentFor, departmentName } from '../config/departments'
import { createComplaint } from '../services/complaintService'
import { loadDraft, clearDraft } from '../lib/draft'

const SEVERITIES = ['Low', 'Medium', 'High']
const MAX_DESC = 500

export default function Confirmation() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const draft = state?.detection ? state : loadDraft()
  const detection = draft?.detection

  // 'ask' → "Is this correct?", 'change' → pick issue, 'details' → final review
  const [mode, setMode] = useState(detection?.issue ? 'ask' : 'change')
  const [finalIssue, setFinalIssue] = useState(null)
  const [citizenSeverity, setCitizenSeverity] = useState(null)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [severityError, setSeverityError] = useState(false)

  if (!detection) return <Navigate to="/report" replace />

  // The model's severity only applies to the issue the model detected.
  const modelSeverityApplies = finalIssue === detection.issue && Boolean(detection.severity)
  const severity = modelSeverityApplies ? detection.severity : citizenSeverity

  const chooseIssue = (issueId) => {
    setFinalIssue(issueId)
    setMode('details')
  }

  const handleSubmit = async () => {
    if (!severity) { setSeverityError(true); return }
    setSubmitting(true)
    try {
      const complaint = await createComplaint({
        issue: finalIssue,
        severity,
        severity_source: modelSeverityApplies ? 'model' : 'citizen',
        detection,
        image: draft.image,
        location: draft.location,
        description,
      })
      clearDraft()
      navigate('/report/success', { state: { complaint }, replace: true })
    } catch (e) {
      toast.show(e.message, 'error', 7000)
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <StepIndicator current={mode === 'details' ? 4 : 3} />

      <h1 key={mode} className="mt-8 animate-rise font-display text-3xl font-bold tracking-tight text-ink-900">
        {mode === 'details' ? 'Review your complaint' : detection.issue ? 'Issue detected' : 'Tell us what you see'}
      </h1>
      <p key={`${mode}-sub`} className="mt-2 animate-rise text-ink-500" style={{ '--d': '60ms' }}>
        {mode === 'details' ? 'Check the details and add a short description before submitting.' : 'Review the result before we create your complaint.'}
      </p>

      {detection.source === 'mock' && <DemoNotice className="mt-6" />}

      <div className="mt-6 animate-scale-in" style={{ '--d': '120ms' }}>
        <DetectionResult image={draft.image.dataUrl} result={detection} finalIssue={finalIssue} />
      </div>

      {mode === 'ask' && (
        <div className="mt-6 animate-rise rounded-2xl border border-ink-300/60 bg-white p-6" style={{ '--d': '220ms' }}>
          <h2 className="font-display text-lg font-semibold text-ink-900">Is this the correct issue?</h2>
          <p className="mt-1 text-sm text-ink-500">AI can be wrong — nothing is filed until you confirm.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button icon={CheckCircle2} onClick={() => chooseIssue(detection.issue)}>Yes, Confirm</Button>
            <Button variant="secondary" icon={RotateCcw} onClick={() => setMode('change')}>Change Issue</Button>
          </div>
        </div>
      )}

      {mode === 'change' && (
        <div className="mt-6 animate-rise rounded-2xl border border-ink-300/60 bg-white p-6" style={{ '--d': '220ms' }}>
          <h2 className="font-display text-lg font-semibold text-ink-900">Select the correct issue</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Issue type">
            {Object.values(ISSUE_TYPES).map((t, i) => (
              <button
                key={t.id}
                style={{ '--d': `${300 + i * 70}ms` }}
                type="button"
                role="radio"
                aria-checked={finalIssue === t.id}
                onClick={() => chooseIssue(t.id)}
                className={`focus-ring group flex animate-rise items-center gap-3 rounded-xl border p-4 text-left text-sm font-medium text-ink-900 transition-[border-color,background-color,box-shadow,transform] duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-civic-600 hover:bg-civic-50 hover:shadow-card active:scale-[0.98] ${finalIssue === t.id ? 'border-civic-600 bg-civic-50' : 'border-ink-300'}`}
              >
                <span className="transition-transform duration-300 ease-out-expo group-hover:scale-110"><IssueIcon issue={t.id} size="sm" /></span>
                {t.label}
              </button>
            ))}
          </div>
          {detection.issue && (
            <button type="button" onClick={() => setMode('ask')} className="focus-ring group mt-4 flex items-center gap-1 rounded text-sm font-medium text-ink-500 transition-colors hover:text-ink-900">
              <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 ease-out-expo group-hover:-translate-x-0.5" aria-hidden="true" /> Back
            </button>
          )}
        </div>
      )}

      {mode === 'details' && (
        <div className="mt-6 animate-rise space-y-6 rounded-2xl border border-ink-300/60 bg-white p-6" style={{ '--d': '120ms' }}>
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-lg font-semibold text-ink-900">Complaint details</h2>
            <button type="button" onClick={() => setMode('change')} className="focus-ring rounded text-sm font-medium text-civic-700 hover:underline">
              Change issue
            </button>
          </div>

          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-400">Issue</dt>
              <dd className="mt-1 flex items-center gap-2 font-medium text-ink-900"><IssueIcon issue={finalIssue} size="sm" /> {issueLabel(finalIssue)}</dd>
            </div>
            <div>
              <dt className="text-ink-400">Severity</dt>
              <dd className="mt-1">
                {modelSeverityApplies ? (
                  <SeverityBadge severity={severity} />
                ) : (
                  <div>
                    <div className="inline-flex rounded-lg border border-ink-300 p-0.5" role="radiogroup" aria-label="Severity">
                      {SEVERITIES.map((s) => (
                        <button key={s} type="button" role="radio" aria-checked={citizenSeverity === s}
                          onClick={() => { setCitizenSeverity(s); setSeverityError(false) }}
                          className={`focus-ring rounded-md px-3 py-1.5 text-xs font-semibold transition-[background-color,color,box-shadow] duration-200 active:scale-95 ${citizenSeverity === s ? 'bg-civic-700 text-white shadow-sm' : 'text-ink-600 hover:bg-ink-100'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                    <p key={severityError ? 'err' : 'hint'} className={`mt-1 text-xs ${severityError ? 'animate-rise text-signal-red' : 'text-ink-400'}`}>
                      {severityError ? 'Please choose a severity.' : 'You changed the issue, so please rate how serious it is.'}
                    </p>
                  </div>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-ink-400">Detected location</dt>
              <dd className="mt-1 flex items-start gap-1.5 font-medium text-ink-900"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-civic-700" aria-hidden="true" /> {draft.location.address}</dd>
            </div>
            <div>
              <dt className="text-ink-400">Will be sent to</dt>
              <dd className="mt-1 flex items-start gap-1.5 font-medium text-ink-900"><Landmark className="mt-0.5 h-4 w-4 shrink-0 text-civic-700" aria-hidden="true" /> {departmentName(departmentFor(finalIssue))}</dd>
            </div>
          </dl>

          <div>
            <label htmlFor="description" className="text-sm font-medium text-ink-900">
              Description <span className="font-normal text-ink-400">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              maxLength={MAX_DESC}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g. Large garbage accumulation near the roadside."
              className="focus-ring mt-1.5 w-full rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-sm text-ink-900 transition-[border-color,box-shadow] duration-200 placeholder:text-ink-400 hover:border-ink-400 focus-visible:border-civic-500"
            />
            <p className={`mt-1 text-right text-xs tabular-nums transition-colors ${description.length > MAX_DESC * 0.9 ? 'text-signal-amber' : 'text-ink-400'}`}>{description.length}/{MAX_DESC}</p>
          </div>

          <Button size="lg" className="w-full sm:w-auto" icon={ArrowRight} iconPosition="right" loading={submitting} onClick={handleSubmit}>
            {submitting ? 'Submitting…' : 'Submit Complaint'}
          </Button>
        </div>
      )}
    </div>
  )
}
