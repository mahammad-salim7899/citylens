import React from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import Button from './Button'
import { Skeleton } from './Motion'

/**
 * Loading placeholder.
 *   variant="page"   skeleton of a dashboard (stat tiles + list) — what
 *                    most data pages look like, so the layout doesn't jump
 *   variant="detail" skeleton of a single complaint (photo + side panel)
 *   variant="inline" small spinner + label, for brief checks
 *
 * Both fade in after a short delay, so a fast load never flashes a
 * placeholder at all.
 */
export function LoadingState({ label = 'Loading…', variant = 'page' }) {
  if (variant === 'inline') {
    return (
      <div className="flex min-h-[40vh] animate-fade-in items-center justify-center gap-2 text-sm text-ink-500" style={{ '--d': '200ms' }} role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {label}
      </div>
    )
  }
  if (variant === 'detail') {
    return (
      <div className="mx-auto w-full max-w-6xl animate-fade-in px-4 py-10 sm:px-6 sm:py-14" style={{ '--d': '150ms' }} role="status" aria-live="polite">
        <span className="sr-only">{label}</span>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-8 w-64" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr,1fr]">
          <div className="space-y-6">
            <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
            <div className="rounded-2xl border border-ink-300/50 bg-white p-6">
              <Skeleton className="h-4 w-32" />
              <div className="mt-5 grid grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-ink-300/50 bg-white p-6">
            <Skeleton className="h-4 w-20" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="mt-5 flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="mx-auto w-full max-w-6xl animate-fade-in py-8" style={{ '--d': '150ms' }} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-ink-300/50 bg-white p-5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="mt-4 h-6 w-12" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl border border-ink-300/50 bg-white p-4">
            <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="hidden h-6 w-16 rounded-full sm:block" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-md animate-rise flex-col items-center justify-center text-center" role="alert">
      <span className="flex h-12 w-12 animate-pop items-center justify-center rounded-full bg-signal-redLight" style={{ '--d': '120ms' }}>
        <AlertCircle className="h-6 w-6 text-signal-red" aria-hidden="true" />
      </span>
      <p className="mt-4 font-display text-lg font-semibold text-ink-900">Something went wrong</p>
      <p className="mt-1 text-sm text-ink-500">{message}</p>
      {onRetry && <Button className="mt-5" variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  )
}
