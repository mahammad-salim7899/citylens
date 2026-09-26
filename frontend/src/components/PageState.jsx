import React from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import Button from './Button'

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-ink-500" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {label}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center text-center" role="alert">
      <AlertCircle className="h-8 w-8 text-signal-red" aria-hidden="true" />
      <p className="mt-3 font-display text-lg font-semibold text-ink-900">Something went wrong</p>
      <p className="mt-1 text-sm text-ink-500">{message}</p>
      {onRetry && <Button className="mt-5" variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  )
}
