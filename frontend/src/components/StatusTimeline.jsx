import React from 'react'
import { Check, X } from 'lucide-react'
import { STATUS_FLOW, STATUS_META } from '../config/statuses'
import { departmentShort } from '../config/departments'
import { formatDateTime } from '../lib/format'

// First time the complaint reached each status → shown under the step.
function reachedAt(history, status) {
  return history.find((h) => h.status === status)?.at || null
}

export default function StatusTimeline({ complaint, audience = 'citizen', showHistory = true }) {
  const history = complaint.history || []
  const rejected = complaint.status === 'rejected'
  // For a rejected complaint, show progress up to the last status it reached.
  const lastReached = rejected
    ? Math.max(0, ...history.map((h) => STATUS_FLOW.indexOf(h.status)).filter((i) => i >= 0))
    : STATUS_FLOW.indexOf(complaint.status)

  const steps = STATUS_FLOW.map((status, i) => {
    let state
    if (rejected) state = i <= lastReached ? 'done' : 'skipped'
    // "Reported" is complete the moment it's filed; "Resolved" is complete when reached.
    else if (i < lastReached || (i === lastReached && (status === 'resolved' || status === 'new'))) state = 'done'
    else state = i === lastReached ? 'active' : 'todo'
    return { status, label: STATUS_META[status].step, state, at: reachedAt(history, status) }
  })
  if (rejected) {
    steps.splice(lastReached + 1, 0, { status: 'rejected', label: STATUS_META.rejected.step, state: 'rejected', at: reachedAt(history, 'rejected') })
  }

  return (
    <div className="rounded-2xl border border-ink-300/60 bg-white p-6">
      <h3 className="font-display text-base font-semibold text-ink-900">Progress</h3>

      <ol className="mt-5">
        {steps.map((s, i) => {
          const isLast = i === steps.length - 1
          const delay = { '--d': `${i * 90}ms` }
          return (
            <li key={s.status} className="relative flex animate-rise gap-3 pb-6 last:pb-0" style={delay}>
              {!isLast && (
                <>
                  <span className="absolute left-[11px] top-7 h-[calc(100%-1.25rem)] w-px bg-ink-300" aria-hidden="true" />
                  {/* The completed part of the track draws itself downward, step by step. */}
                  {s.state === 'done' && (
                    <span
                      className="absolute left-[11px] top-7 h-[calc(100%-1.25rem)] w-px origin-top animate-grow-y bg-civic-700"
                      style={{ '--d': `${i * 90 + 220}ms` }}
                      aria-hidden="true"
                    />
                  )}
                </>
              )}
              <span className="relative z-10 mt-0.5 h-6 w-6 shrink-0" aria-hidden="true">
                {s.state === 'active' && <span className="absolute inset-0 animate-ripple rounded-full border-2 border-civic-500" style={{ animationIterationCount: 'infinite', '--d': '600ms' }} />}
                <span
                  className={`relative flex h-6 w-6 items-center justify-center rounded-full ${
                    s.state === 'done' ? 'animate-pop bg-civic-700 text-white'
                      : s.state === 'active' ? 'border-2 border-civic-700 bg-white'
                      : s.state === 'rejected' ? 'animate-pop bg-signal-red text-white'
                      : 'border border-ink-300 bg-white'
                  }`}
                  style={delay}
                >
                  {s.state === 'done' && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  {s.state === 'active' && <span className="h-2 w-2 animate-pulse-soft rounded-full bg-civic-700" />}
                  {s.state === 'rejected' && <X className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
              </span>
              <div>
                <p className={`text-sm font-medium ${
                  s.state === 'todo' || s.state === 'skipped' ? 'text-ink-400' : s.state === 'rejected' ? 'text-signal-red' : 'text-ink-900'
                } ${s.state === 'skipped' ? 'line-through decoration-ink-300' : ''}`}>
                  {s.label}
                  {s.state === 'active' && <span className="sr-only"> (current)</span>}
                </p>
                {s.at && s.state !== 'todo' && s.state !== 'skipped' && (
                  <p className="text-xs text-ink-400">{formatDateTime(s.at)}</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {showHistory && (
        <div className="mt-6 border-t border-ink-200 pt-5">
          <h4 className="text-sm font-semibold text-ink-900">{audience === 'authority' ? 'Activity history' : 'Updates'}</h4>
          <ul className="mt-3 space-y-4">
            {[...history].reverse().map((h, i) => (
              <li key={i} className="grid animate-rise grid-cols-[6.5rem,1fr] gap-3 text-sm" style={{ '--d': `${Math.min(i, 8) * 60 + 300}ms` }}>
                <span className="pt-0.5 text-xs font-medium text-ink-400">{formatDateTime(h.at)}</span>
                <div>
                  <p className="text-ink-700">{h.note}</p>
                  {(h.by || h.department) && h.kind !== 'submitted' && (
                    <p className="mt-0.5 text-xs text-ink-400">
                      {audience === 'authority' && h.kind !== 'routed' ? `${h.by} · ` : ''}
                      {h.department ? departmentShort(h.department) : h.by}
                      {audience === 'authority' && (h.kind === 'status') ? ` · ${STATUS_META[h.status]?.authority}` : ''}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
