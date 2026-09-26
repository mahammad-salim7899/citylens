import React from 'react'
import { ChevronRight, ShieldCheck } from 'lucide-react'
import { listAuthorityAccounts, signInAuthority } from '../services/authService'
import { departmentName, ISSUE_ROUTING } from '../config/departments'
import { issueLabel } from '../config/issueTypes'
import IssueIcon from './IssueIcon'

const issueFor = (dept) => Object.keys(ISSUE_ROUTING).find((k) => ISSUE_ROUTING[k] === dept)

export default function AuthoritySignIn({ onSignedIn }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-14 sm:px-6 sm:py-20">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-civic-800 text-white">
        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
      </span>
      <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink-900">Authority sign in</h1>
      <p className="mt-2 text-ink-500">
        Officers only see complaints routed to their own department.
      </p>
      <p className="mt-1 text-xs text-ink-400">Prototype: choose a demo account — real login comes with the backend.</p>

      <div className="mt-8 space-y-3">
        {listAuthorityAccounts().map((a) => {
          const issue = issueFor(a.department)
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSignedIn(signInAuthority(a.id))}
              className="focus-ring group flex w-full items-center gap-4 rounded-2xl border border-ink-300/60 bg-white p-4 text-left transition-shadow hover:shadow-card"
            >
              <IssueIcon issue={issue} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">{a.name} <span className="font-normal text-ink-400">· {a.designation}</span></p>
                <p className="truncate text-xs text-ink-500">{departmentName(a.department)}</p>
                <p className="mt-0.5 text-xs text-ink-400">Handles: {issueLabel(issue)}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-ink-300 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
