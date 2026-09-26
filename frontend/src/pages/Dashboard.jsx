import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FileText, Clock, Wrench, CheckCircle2 } from 'lucide-react'
import Button from '../components/Button'
import ComplaintCard from '../components/ComplaintCard'
import MapView from '../components/MapView'
import { LoadingState, ErrorState } from '../components/PageState'
import { listComplaints } from '../services/complaintService'
import { useLoader } from '../lib/useLoader'

export default function Dashboard() {
  const { data: complaints, loading, error, reload } = useLoader(listComplaints)

  const stats = useMemo(() => {
    const list = complaints || []
    const count = (pred) => list.filter(pred).length
    return [
      { label: 'Total Reports', value: list.length, icon: FileText, color: 'text-civic-700 bg-civic-100' },
      { label: 'Submitted', value: count((c) => c.status === 'new'), icon: Clock, color: 'text-signal-amber bg-signal-amberLight' },
      { label: 'In Progress', value: count((c) => ['under_review', 'action_assigned', 'action_in_progress'].includes(c.status)), icon: Wrench, color: 'text-civic-700 bg-civic-100' },
      { label: 'Resolved', value: count((c) => c.status === 'resolved'), icon: CheckCircle2, color: 'text-signal-green bg-signal-greenLight' },
    ]
  }, [complaints])

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">Your reports</h1>
          <p className="mt-1 text-ink-500">Track every civic issue you've reported through CityLens.</p>
        </div>
        <Button as={Link} to="/report" icon={Plus}>Report an Issue</Button>
      </div>

      {loading ? <LoadingState label="Loading your reports…" /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-ink-300/60 bg-white p-5">
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.color}`}>
                  <s.icon className="h-4.5 w-4.5" strokeWidth={2.25} aria-hidden="true" />
                </span>
                <p className="mt-3 font-display text-2xl font-bold text-ink-900">{s.value}</p>
                <p className="text-sm text-ink-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <h2 className="font-display text-lg font-semibold text-ink-900">Recent complaints</h2>
              {complaints.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-ink-300 bg-white p-10 text-center text-sm text-ink-500">
                  You haven't reported anything yet.{' '}
                  <Link to="/report" className="font-medium text-civic-700 hover:underline">Report your first issue.</Link>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {complaints.map((c) => <ComplaintCard key={c.id} complaint={c} />)}
                </div>
              )}
            </div>
            <div className="lg:col-span-2">
              <h2 className="font-display text-lg font-semibold text-ink-900">On the map</h2>
              <div className="mt-4">
                <MapView complaints={complaints} height="h-80" linkFor={(c) => `/track/${c.id}`} showLegend />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
