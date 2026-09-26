import React from 'react'
import IssueIcon from './IssueIcon'
import { ISSUE_TYPES } from '../config/issueTypes'
import { departmentShort, departmentFor } from '../config/departments'

export default function IssueCard({ issue, image }) {
  const t = ISSUE_TYPES[issue]
  return (
    <div className="group overflow-hidden rounded-2xl border border-ink-300/60 bg-white transition-shadow hover:shadow-card">
      <div className="aspect-[4/3] overflow-hidden bg-ink-100">
        <img src={image} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      </div>
      <div className="p-6">
        <div className="flex items-center gap-3">
          <IssueIcon issue={issue} />
          <h3 className="font-display text-lg font-semibold text-ink-900">{t.label}</h3>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-500">{t.description}</p>
        <p className="mt-4 text-xs font-medium text-ink-400">Routed to {departmentShort(departmentFor(issue))}</p>
      </div>
    </div>
  )
}
