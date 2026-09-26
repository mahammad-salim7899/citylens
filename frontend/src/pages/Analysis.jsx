import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import AnalysisLoader from '../components/AnalysisLoader'
import Button from '../components/Button'
import { detectImage } from '../services/detectionService'
import { MOCK_MODE } from '../services/api'
import { loadDraft, saveDraft } from '../lib/draft'

export default function Analysis() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const draft = state?.image ? state : loadDraft()
  const [stage, setStage] = useState(1)
  const [error, setError] = useState(null)
  const cancelled = useRef(false)

  const run = useCallback(async () => {
    setError(null)
    setStage(2) // image uploaded ✓, location identified ✓, detecting…
    try {
      const detection = await detectImage(draft.image, draft.location)
      if (cancelled.current) return
      setStage(3) // estimating severity
      await new Promise((r) => setTimeout(r, 450))
      if (cancelled.current) return
      const next = { ...draft, detection }
      saveDraft(next)
      navigate('/report/confirm', { state: next, replace: true })
    } catch (e) {
      if (!cancelled.current) setError(e.message)
    }
  }, [draft, navigate])

  const started = useRef(false)
  useEffect(() => {
    cancelled.current = false
    // Guard so React StrictMode's double-mount doesn't call the API twice.
    if (draft?.image && !started.current) { started.current = true; run() }
    return () => { cancelled.current = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!draft?.image) return <Navigate to="/report" replace />

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4 py-16">
      {error ? (
        <div className="max-w-md text-center" role="alert">
          <AlertCircle className="mx-auto h-9 w-9 text-signal-red" aria-hidden="true" />
          <h1 className="mt-4 font-display text-xl font-semibold text-ink-900">Analysis failed</h1>
          <p className="mt-2 text-sm text-ink-500">{error}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={run}>Try again</Button>
            <Button as={Link} to="/report" variant="secondary">Start over</Button>
          </div>
        </div>
      ) : (
        <AnalysisLoader previewUrl={draft.image.dataUrl} stage={stage} mock={MOCK_MODE} />
      )}
    </div>
  )
}
