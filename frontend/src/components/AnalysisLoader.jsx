import React from 'react'
import { Check, Loader2 } from 'lucide-react'

const ITEMS = ['Image uploaded', 'Location identified', 'Detecting civic issue', 'Estimating severity']

/**
 * The "AI is looking at your photo" screen.
 * stage: 0 = image uploaded, 1 = location identified, 2 = detecting, 3 = severity
 */
export default function AnalysisLoader({ previewUrl, stage, mock }) {
  const progress = Math.min(100, Math.round((stage / ITEMS.length) * 100) + 8)

  return (
    <div className="mx-auto max-w-md text-center">
      {/* Viewfinder: photo + detection grid + sweeping scan line + corner brackets */}
      <div className="relative mx-auto aspect-[4/3] w-full max-w-sm animate-scale-in overflow-hidden rounded-2xl bg-ink-950 shadow-lift">
        {previewUrl && <img src={previewUrl} alt="Your photo being analysed" className="h-full w-full object-cover opacity-75" />}
        <div className="scan-grid pointer-events-none absolute inset-0 animate-pulse-soft" aria-hidden="true" />

        <div className="pointer-events-none absolute inset-0 animate-sweep-loop" aria-hidden="true">
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-b from-transparent to-civic-400/40" />
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-civic-200 shadow-[0_0_14px_3px_rgba(163,174,230,0.85)]" />
        </div>

        {[
          'left-3 top-3 border-l-2 border-t-2 rounded-tl-lg',
          'right-3 top-3 border-r-2 border-t-2 rounded-tr-lg',
          'left-3 bottom-3 border-l-2 border-b-2 rounded-bl-lg',
          'right-3 bottom-3 border-r-2 border-b-2 rounded-br-lg',
        ].map((pos, i) => (
          <span key={pos} className={`pointer-events-none absolute h-6 w-6 animate-fade-in border-civic-200 ${pos}`} style={{ '--d': `${200 + i * 60}ms` }} aria-hidden="true" />
        ))}

        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink-950/70 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-civic-100 backdrop-blur-sm">
          {stage < 2 ? 'Preparing' : stage < 3 ? 'Detecting' : 'Rating severity'}
          <span className="animate-pulse-soft">…</span>
        </span>
      </div>

      {/* overall progress */}
      <div className="mx-auto mt-6 h-1 w-full max-w-sm overflow-hidden rounded-full bg-ink-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Analysis progress">
        <div className="h-full rounded-full bg-gradient-to-r from-civic-600 to-civic-400 transition-[width] duration-700 ease-out-expo" style={{ width: `${progress}%` }} />
      </div>

      <h2 className="mt-7 animate-rise font-display text-xl font-semibold text-ink-900" style={{ '--d': '120ms' }}>Analyzing your report…</h2>
      <p className="mt-1 animate-rise text-sm text-ink-500" style={{ '--d': '180ms' }}>
        {mock ? 'Demo mode — generating a simulated result.' : 'Sending your photo to the CityLens detection server.'}
      </p>

      <ul className="mt-6 space-y-1.5 text-left" aria-live="polite">
        {ITEMS.map((label, i) => {
          const done = i < stage
          const active = i === stage
          return (
            <li
              key={label}
              className={`flex animate-rise items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-300 ${active ? 'bg-civic-50' : ''}`}
              style={{ '--d': `${240 + i * 70}ms` }}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                  done ? 'bg-signal-green text-white' : active ? 'text-civic-700' : 'text-ink-300'
                }`}
              >
                {done
                  ? <Check key="done" className="h-3.5 w-3.5 animate-pop" strokeWidth={3} />
                  : active ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              </span>
              <span className={`transition-colors duration-300 ${done ? 'text-ink-900' : active ? 'font-medium text-ink-900' : 'text-ink-400'}`}>
                {label}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
