import React, { useEffect, useState } from 'react'
import { UploadCloud, X, Lock } from 'lucide-react'
import Button from './Button'
import { useToast } from './Toast'
import { allowedNextStatuses, NOTE_REQUIRED, STATUS_META } from '../config/statuses'
import { prepareImage, ACCEPTED_TYPES } from '../lib/image'

const KEEP = '__keep__'

const PLACEHOLDERS = {
  garbage_dumping: 'e.g. Garbage was cleared from the reported location.',
  pothole: 'e.g. Pothole repair was assigned to the road maintenance team.',
  illegal_parking: 'e.g. Vehicle was removed and enforcement action was taken.',
}

export default function AuthorityAction({ complaint, onSubmit }) {
  const toast = useToast()
  const options = allowedNextStatuses(complaint.status)
  const [status, setStatus] = useState(options[0] || KEEP)
  const [note, setNote] = useState('')
  const [after, setAfter] = useState(null) // { dataUrl, name }
  const [preparing, setPreparing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Reset the form when the complaint moves to a new status.
  useEffect(() => {
    setStatus(allowedNextStatuses(complaint.status)[0] || KEEP)
    setError(null)
  }, [complaint.status])

  if (options.length === 0) {
    return (
      <div className="rounded-2xl border border-ink-300/60 bg-white p-6">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900">
          <Lock className="h-4 w-4 text-ink-400" aria-hidden="true" /> Complaint closed
        </h3>
        <p className="mt-1 text-sm text-ink-500">
          This complaint is {STATUS_META[complaint.status].authority.toLowerCase()}. No further actions can be recorded.
        </p>
      </div>
    )
  }

  const targetStatus = status === KEEP ? complaint.status : status
  const noteRequired = status === KEEP || NOTE_REQUIRED.includes(status)

  const handleAfterImage = async (file) => {
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.show('Please choose a JPG, JPEG or PNG image.', 'error')
      return
    }
    setPreparing(true)
    try {
      const img = await prepareImage(file)
      setAfter({ dataUrl: img.dataUrl, name: file.name })
    } catch {
      toast.show('Could not read that image.', 'error')
    } finally {
      setPreparing(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (noteRequired && !note.trim()) {
      setError(status === 'resolved'
        ? 'Describe the action taken before marking this complaint resolved.'
        : 'Please describe the action taken.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSubmit({ status: targetStatus, note, afterImageDataUrl: after?.dataUrl || null })
      setNote('')
      setAfter(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-ink-300/60 bg-white p-6" noValidate>
      <h3 className="font-display text-base font-semibold text-ink-900">Take Action</h3>
      <p className="mt-1 text-sm text-ink-500">
        Move the complaint forward and record what was done. It cannot be marked resolved without an action note.
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="action-status" className="text-sm font-medium text-ink-900">Update status</label>
          <select
            id="action-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="focus-ring mt-1.5 w-full rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-sm text-ink-900"
          >
            {options.map((s) => <option key={s} value={s}>{STATUS_META[s].authority}</option>)}
            <option value={KEEP}>Keep as “{STATUS_META[complaint.status].authority}” — add a note only</option>
          </select>
        </div>

        <div>
          <span className="text-sm font-medium text-ink-900">After-action photo <span className="font-normal text-ink-400">(optional)</span></span>
          {after ? (
            <div className="mt-1.5 flex items-center gap-3 rounded-lg border border-ink-300 p-2">
              <img src={after.dataUrl} alt="After-action preview" className="h-10 w-10 rounded-md object-cover" />
              <span className="flex-1 truncate text-xs text-ink-500">{after.name}</span>
              <button type="button" onClick={() => setAfter(null)} className="focus-ring rounded text-ink-400 hover:text-signal-red" aria-label="Remove after-action photo">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="focus-within:ring-2 focus-within:ring-civic-500 mt-1.5 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-ink-300 px-3 py-2.5 text-sm text-ink-500 hover:border-civic-500">
              <UploadCloud className="h-4 w-4" aria-hidden="true" /> {preparing ? 'Preparing…' : 'Upload resolution photo'}
              <input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(e) => { handleAfterImage(e.target.files?.[0]); e.target.value = '' }} />
            </label>
          )}
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="action-note" className="text-sm font-medium text-ink-900">
          Action taken {noteRequired ? <span className="text-signal-red">*</span> : <span className="font-normal text-ink-400">(recommended)</span>}
        </label>
        <textarea
          id="action-note"
          value={note}
          onChange={(e) => { setNote(e.target.value); if (error) setError(null) }}
          rows={3}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'action-error' : undefined}
          placeholder={PLACEHOLDERS[complaint.issue]}
          className={`focus-ring mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 ${error ? 'border-signal-red' : 'border-ink-300'}`}
        />
        {error && <p id="action-error" className="mt-1.5 text-sm text-signal-red" role="alert">{error}</p>}
      </div>

      <Button type="submit" className="mt-5" loading={saving}>
        {status === KEEP ? 'Add Note' : `Mark as ${STATUS_META[status].authority}`}
      </Button>
    </form>
  )
}
