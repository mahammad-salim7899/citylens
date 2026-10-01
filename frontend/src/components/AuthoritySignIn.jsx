import React, { useState } from 'react'
import { ChevronRight, ShieldCheck } from 'lucide-react'
import Button from './Button'
import IssueIcon from './IssueIcon'
import { useAuth } from '../context/AuthContext'
import { MOCK_MODE } from '../services/api'
import { DEMO_CREDENTIALS, listDemoAuthorityAccounts } from '../services/authService'
import { departmentName, ISSUE_ROUTING } from '../config/departments'
import { issueLabel } from '../config/issueTypes'

const issueFor = (dept) => Object.keys(ISSUE_ROUTING).find((k) => ISSUE_ROUTING[k] === dept)

const field = 'focus-ring mt-1 w-full rounded-xl border border-ink-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400'

export default function AuthoritySignIn({ onSignedIn }) {
  const { signIn, signInDemoAuthority } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = await signIn(form)
      // The backend has one login endpoint for both roles, so a citizen
      // can land here by mistake. Say so rather than bouncing them to a
      // portal they have no access to.
      if (user.role !== 'officer') {
        setError('That is a citizen account. Use the citizen sign-in on the left.')
        return
      }
      onSignedIn(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDemo = async (accountId) => {
    setError('')
    try {
      onSignedIn(await signInDemoAuthority(accountId))
    } catch (err) {
      setError(err.message)
    }
  }

  const demoAccounts = listDemoAuthorityAccounts()

  return (
    <div className="mx-auto max-w-lg px-4 py-14 sm:px-6 sm:py-20">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-civic-800 text-white">
        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
      </span>
      <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink-900">Authority sign in</h1>
      <p className="mt-2 text-ink-500">
        Officers only see complaints routed to their own department.
      </p>
      <p className="mt-1 text-xs text-ink-400">
        Officer accounts are created by the administrator — there is no self sign-up.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <div>
          <label htmlFor="officer-email" className="text-sm font-medium text-ink-700">Official email</label>
          <input id="officer-email" type="email" className={field} value={form.email} onChange={update('email')}
            autoComplete="email" required placeholder="name@citylens.local" />
        </div>
        <div>
          <label htmlFor="officer-password" className="text-sm font-medium text-ink-700">Password</label>
          <input id="officer-password" type="password" className={field} value={form.password} onChange={update('password')}
            autoComplete="current-password" required />
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-signal-redLight px-3.5 py-2.5 text-sm text-signal-red">{error}</p>
        )}

        <Button type="submit" variant="secondary" icon={ShieldCheck} disabled={busy} className="w-full justify-center">
          {busy ? 'Signing in…' : 'Sign in to the portal'}
        </Button>
      </form>

      {MOCK_MODE && demoAccounts.length > 0 && (
        <div className="mt-8 border-t border-ink-200 pt-6">
          <p className="text-xs text-ink-400">
            Demo (no backend running): pick an officer, or sign in above with any of these emails
            and the password <span className="font-medium text-ink-600">{DEMO_CREDENTIALS.officerPassword}</span>.
          </p>
          <div className="mt-4 space-y-3">
            {demoAccounts.map((a) => {
              const issue = issueFor(a.department)
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => handleDemo(a.id)}
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
      )}
    </div>
  )
}
