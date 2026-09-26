import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, ChevronRight } from 'lucide-react'
import { issueLabel } from '../config/issueTypes'
import { shortAddress, formatDate } from '../lib/format'
import SeverityBadge from './SeverityBadge'
import StatusBadge from './StatusBadge'

export default function ComplaintCard({ complaint, to, audience = 'citizen' }) {
  return (
    <Link
      to={to || `/track/${complaint.id}`}
      className="focus-ring group flex items-center gap-4 rounded-2xl border border-ink-300/60 bg-white p-4 transition-shadow hover:shadow-card"
    >
      <img src={complaint.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-ink-100 object-cover" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-display text-sm font-bold text-ink-900">{complaint.id}</p>
          <StatusBadge status={complaint.status} audience={audience} />
        </div>
        <p className="mt-1 text-sm font-medium text-ink-900">{issueLabel(complaint.issue)}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-500">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" /> {shortAddress(complaint.address)} · {formatDate(complaint.created_at)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden sm:inline-flex"><SeverityBadge severity={complaint.severity} size="sm" /></span>
        <ChevronRight className="h-4 w-4 text-ink-300 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </Link>
  )
}
