import React from 'react'
import { Check, Loader2 } from 'lucide-react'

export default function AnalysisLoader({ previewUrl, stage, mock }) {
  // stage: 0 = image uploaded, 1 = location identified, 2 = detecting, 3 = severity
  const items = [
    { label: 'Image uploaded' },
    { label: 'Location identified' },
    { label: 'Detecting civic issue' },
    { label: 'Estimating severity' },
  ]

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="relative mx-auto h-56 w-56 overflow-hidden rounded-2xl border border-ink-300/60 bg-ink-900">
        {previewUrl && <img src={previewUrl} alt="Analyzing" className="h-full w-full object-cover opacity-70" />}
        <div className="pointer-events-none absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-civic-500/50 to-transparent animate-scanline" />
      </div>

      <h2 className="mt-8 font-display text-xl font-semibold text-ink-900">Analyzing your report…</h2>
      <p className="mt-1 text-sm text-ink-500">
        {mock ? 'Demo mode — generating a simulated result.' : 'Sending your photo to the CityLens detection server.'}
      </p>

      <ul className="mt-6 space-y-3 text-left" aria-live="polite">
        {items.map((item, i) => {
          const done = i < stage
          const active = i === stage
          return (
            <li key={item.label} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  done ? 'bg-signal-green text-white' : active ? 'text-civic-700' : 'text-ink-300'
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : active ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              </span>
              <span className={done ? 'text-ink-900' : active ? 'font-medium text-ink-900' : 'text-ink-400'}>
                {item.label}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
