import React from 'react'

const styles = {
  Low: 'bg-signal-greenLight text-signal-green',
  Medium: 'bg-signal-amberLight text-signal-amber',
  High: 'bg-signal-redLight text-signal-red',
}

export default function SeverityBadge({ severity, size = 'md' }) {
  if (!severity) return null
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ${pad} ${styles[severity] || 'bg-ink-100 text-ink-700'}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {severity} severity
    </span>
  )
}
