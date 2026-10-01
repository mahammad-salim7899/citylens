import React from 'react'
import { STATUS_META, statusLabel } from '../config/statuses'

const tones = {
  civic: 'bg-civic-100 text-civic-700',
  amber: 'bg-signal-amberLight text-signal-amber',
  green: 'bg-signal-greenLight text-signal-green',
  red: 'bg-signal-redLight text-signal-red',
}

/** audience: 'citizen' shows "Submitted", 'authority' shows "New" for the same status. */
export default function StatusBadge({ status, audience = 'citizen' }) {
  const tone = tones[STATUS_META[status]?.tone] || 'bg-ink-100 text-ink-700'
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-300 ${tone}`}>
      {statusLabel(status, audience)}
    </span>
  )
}
