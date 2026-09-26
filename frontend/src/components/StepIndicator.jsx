import React from 'react'
import { Check } from 'lucide-react'

const STEPS = ['Upload', 'Analyze', 'Review', 'Submit']

export default function StepIndicator({ current }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label="Report progress">
      {STEPS.map((label, i) => {
        const idx = i + 1
        const state = idx < current ? 'done' : idx === current ? 'active' : 'todo'
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3" aria-current={state === 'active' ? 'step' : undefined}>
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold ${
                  state === 'done' ? 'bg-civic-700 text-white'
                    : state === 'active' ? 'border-2 border-civic-700 text-civic-700'
                    : 'border border-ink-300 text-ink-400'
                }`}
              >
                {state === 'done' ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : `0${idx}`}
              </span>
              <span className={`text-sm font-medium ${state === 'active' ? 'inline text-ink-900' : 'hidden sm:inline'} ${state === 'todo' ? 'text-ink-400' : 'text-ink-900'}`}>
                {label}
              </span>
            </div>
            {idx !== STEPS.length && <span className={`h-px w-4 sm:w-10 ${state === 'done' ? 'bg-civic-700' : 'bg-ink-300'}`} aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}
