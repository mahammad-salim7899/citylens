import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserRound, ChevronRight } from 'lucide-react'
import AuthoritySignIn from '../components/AuthoritySignIn'
import { LogoMark } from '../components/Logo'

export default function Login() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto grid max-w-5xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:py-10">
      <div className="mx-auto w-full max-w-lg pt-8 sm:pt-14 lg:pt-20">
        <LogoMark className="h-11 w-11" />
        <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink-900">Welcome to CityLens</h1>
        <p className="mt-2 text-ink-500">Citizens can report and track issues without an account.</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="focus-ring group mt-8 flex w-full items-center gap-4 rounded-2xl border border-ink-300/60 bg-white p-4 text-left transition-shadow hover:shadow-card"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-civic-100 text-civic-700"><UserRound className="h-5 w-5" aria-hidden="true" /></span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink-900">Continue as Citizen</p>
            <p className="text-xs text-ink-500">See your reports and their progress</p>
          </div>
          <ChevronRight className="h-4 w-4 text-ink-300 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
        <p className="mt-6 text-sm text-ink-500">
          New here? <Link to="/report" className="font-medium text-civic-700 hover:underline">Report an issue</Link> right away.
        </p>
      </div>
      <div className="lg:border-l lg:border-ink-200">
        <AuthoritySignIn onSignedIn={() => navigate('/authority')} />
      </div>
    </div>
  )
}
