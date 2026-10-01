import React from 'react'
import { ArrowUpRight } from 'lucide-react'
import IssueIcon from './IssueIcon'
import { ISSUE_TYPES } from '../config/issueTypes'
import { departmentShort, departmentFor } from '../config/departments'

export default function IssueCard({ issue, image }) {
  const t = ISSUE_TYPES[issue]
  return (
    <div className="group h-full overflow-hidden rounded-2xl border border-ink-300/60 bg-white transition-[transform,box-shadow,border-color] duration-300 ease-out-expo hover:-translate-y-1 hover:border-civic-200 hover:shadow-lift">
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-100">
        <img src={image} alt="" className="h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.05]" />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/25 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
      </div>
      <div className="p-6">
        <div className="flex items-center gap-3">
          <span className="transition-transform duration-300 ease-out-expo group-hover:-rotate-6 group-hover:scale-110">
            <IssueIcon issue={issue} />
          </span>
          <h3 className="font-display text-lg font-semibold text-ink-900">{t.label}</h3>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-500">{t.description}</p>
        <p className="mt-4 flex items-center gap-1 text-xs font-medium text-ink-400 transition-colors group-hover:text-civic-700">
          Routed to {departmentShort(departmentFor(issue))}
          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" aria-hidden="true" />
        </p>
      </div>
    </div>
  )
}
