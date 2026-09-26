import React from 'react'

// Custom mark: a location pin whose head is a camera lens —
// "see it" + "where it is" in one shape.
export function LogoMark({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#152052" />
      <path d="M16 26.5s7.5-7.1 7.5-13a7.5 7.5 0 1 0-15 0c0 5.9 7.5 13 7.5 13z" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx="16" cy="13.5" r="3.6" fill="none" stroke="#A3AEE6" strokeWidth="2" />
      <circle cx="16" cy="13.5" r="1.1" fill="#fff" />
    </svg>
  )
}

export default function Logo({ light = false }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className={`font-display text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-ink-900'}`}>
        City<span className={light ? 'text-civic-300' : 'text-civic-600'}>Lens</span>
      </span>
    </span>
  )
}
