import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Inbox, Search as SearchIcon, Clock, Wrench, CheckCircle2, AlertOctagon, LogOut } from 'lucide-react'
import SeverityBadge from '../components/SeverityBadge'
import StatusBadge from '../components/StatusBadge'
import MapView from '../components/MapView'
import { LoadingState, ErrorState } from '../components/PageState'
import { useAuth } from '../context/AuthContext'
import { listAuthorityComplaints } from '../services/complaintService'
import { departmentName } from '../config/departments'
import { issueLabel } from '../config/issueTypes'
import { useLoader } from '../lib/useLoader'
import { formatDateTime, shortAddress } from '../lib/format'

const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'new', label: 'New', test: (c) => c.status === 'new' },
  { id: 'review', label: 'Under Review', test: (c) => c.status === 'under_review' },
  { id: 'progress', label: 'In Progress', test: (c) => ['action_assigned', 'action_in_progress'].includes(c.status) },
  { id: 'resolved', label: 'Resolved', test: (c) => c.status === 'resolved' },
  { id: 'high', label: 'High severity', test: (c) => c.severity === 'High' },
]

const SEVERITY_RANK = { High: 0, Medium: 1, Low: 2 }
const OPEN_FIRST = (c) => (['resolved', 'rejected'].includes(c.status) ? 1 : 0)

function Dashboard({ account, onSignOut }) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const { data, loading, error, reload } = useLoader(() => listAuthorityComplaints(account.department), [account.department])
  const complaints = data || []

  const stats = useMemo(() => {
    const count = (f) => complaints.filter(FILTERS.find((x) => x.id === f).test).length
    return [
      { label: 'Total Assigned', value: complaints.length, icon: Inbox, color: 'text-civic-700 bg-civic-100', filter: 'all' },
      { label: 'New', value: count('new'), icon: Clock, color: 'text-civic-700 bg-civic-100', filter: 'new' },
      { label: 'Under Review', value: count('review'), icon: SearchIcon, color: 'text-signal-amber bg-signal-amberLight', filter: 'review' },
      { label: 'Action in Progress', value: count('progress'), icon: Wrench, color: 'text-signal-amber bg-signal-amberLight', filter: 'progress' },
      { label: 'Resolved', value: count('resolved'), icon: CheckCircle2, color: 'text-signal-green bg-signal-greenLight', filter: 'resolved' },
      { label: 'High Severity', value: count('high'), icon: AlertOctagon, color: 'text-signal-red bg-signal-redLight', filter: 'high' },
    ]
  }, [complaints])

  const visible = useMemo(() => {
    const test = FILTERS.find((f) => f.id === filter).test
    return complaints
      .filter(test)
      .sort((a, b) => OPEN_FIRST(a) - OPEN_FIRST(b) || SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.created_at.localeCompare(a.created_at))
  }, [complaints, filter])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-civic-600">Authority portal</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{departmentName(account.department)}</h1>
          <p className="mt-1 text-ink-500">Signed in as {account.name} · {account.designation}</p>
        </div>
        <button type="button" onClick={onSignOut}
          className="focus-ring flex items-center gap-1.5 rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm font-medium text-ink-600 hover:border-civic-500 hover:text-civic-700">
          <LogOut className="h-4 w-4" aria-hidden="true" /> Switch account
        </button>
      </div>

      {loading ? <LoadingState label="Loading assigned complaints…" /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {stats.map((s) => (
              <button key={s.label} type="button" onClick={() => setFilter(s.filter)} aria-pressed={filter === s.filter}
                className={`focus-ring rounded-2xl border bg-white p-4 text-left transition-shadow hover:shadow-card ${filter === s.filter ? 'border-civic-500 ring-1 ring-civic-500' : 'border-ink-300/60'}`}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.color}`}>
                  <s.icon className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                </span>
                <p className="mt-3 font-display text-2xl font-bold text-ink-900">{s.value}</p>
                <p className="text-xs text-ink-500 sm:text-sm">{s.label}</p>
              </button>
            ))}
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-ink-300/60 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-5 py-4">
              <h2 className="font-display text-base font-semibold text-ink-900">
                {filter === 'all' ? 'Assigned complaints' : FILTERS.find((f) => f.id === filter).label}
              </h2>
              <span className="text-xs text-ink-400">{visible.length} shown · open and high severity first</span>
            </div>

            {visible.length === 0 ? (
              <p className="p-10 text-center text-sm text-ink-500">
                {complaints.length === 0 ? 'No complaints assigned to this department yet.' : 'No complaints match this filter.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 text-xs uppercase tracking-wide text-ink-400">
                      <th scope="col" className="px-5 py-3 font-medium">Complaint</th>
                      <th scope="col" className="px-5 py-3 font-medium">Issue</th>
                      <th scope="col" className="px-5 py-3 font-medium">Location</th>
                      <th scope="col" className="px-5 py-3 font-medium">Severity</th>
                      <th scope="col" className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((c) => (
                      <tr key={c.id} onClick={() => navigate(`/authority/complaints/${c.id}`)}
                        className="cursor-pointer border-b border-ink-200 transition-colors last:border-0 hover:bg-civic-50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <img src={c.image_url} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-ink-100 object-cover" />
                            <div>
                              <Link to={`/authority/complaints/${c.id}`} onClick={(e) => e.stopPropagation()} className="focus-ring whitespace-nowrap rounded font-semibold text-ink-900 hover:text-civic-700">{c.id}</Link>
                              <p className="whitespace-nowrap text-xs text-ink-400">{formatDateTime(c.created_at)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-ink-700">{issueLabel(c.issue)}</td>
                        <td className="px-5 py-3 text-ink-500">{shortAddress(c.address)}</td>
                        <td className="px-5 py-3"><SeverityBadge severity={c.severity} size="sm" /></td>
                        <td className="px-5 py-3"><StatusBadge status={c.status} audience="authority" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-ink-300/60 bg-white p-5">
            <h2 className="font-display text-base font-semibold text-ink-900">Complaint map</h2>
            <p className="mt-0.5 text-sm text-ink-500">Every pin is placed at the GPS position stored with the complaint.</p>
            <div className="mt-4">
              <MapView complaints={visible} height="h-80" linkFor={(c) => `/authority/complaints/${c.id}`} showLegend />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function AuthorityDashboard() {
  // RequireAuth guarantees a signed-in officer by the time we render.
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const handleSignOut = () => { signOut(); navigate('/login', { replace: true }) }
  return <Dashboard account={user} onSignOut={handleSignOut} />
}
