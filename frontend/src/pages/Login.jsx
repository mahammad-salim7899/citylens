import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import AuthoritySignIn from '../components/AuthoritySignIn'
import Button from '../components/Button'
import { LogoMark } from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import { MOCK_MODE } from '../services/api'
import { DEMO_CREDENTIALS } from '../services/authService'

const field = 'focus-ring mt-1 w-full rounded-xl border border-ink-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, register } = useAuth()

  const [mode, setMode] = useState('signin')   // 'signin' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const registering = mode === 'register'
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  // Send people back to whatever they were trying to reach.
  const destinationFor = (user) =>
    user.role === 'officer' ? '/authority' : (location.state?.from?.pathname || '/dashboard')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = registering ? await register(form) : await signIn(form)
      navigate(destinationFor(user), { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const switchMode = () => {
    setMode(registering ? 'signin' : 'register')
    setError('')
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:py-10">
      <div className="mx-auto w-full max-w-lg pt-8 sm:pt-14">
        <LogoMark className="h-11 w-11" />
        <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink-900">
          {registering ? 'Create your account' : 'Welcome to CityLens'}
        </h1>
        <p className="mt-2 text-ink-500">
          {registering
            ? 'An account keeps your reports together so you can track what happens to each one.'
            : 'Sign in to report an issue and follow its progress.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {registering && (
            <div>
              <label htmlFor="name" className="text-sm font-medium text-ink-700">Full name</label>
              <input id="name" className={field} value={form.name} onChange={update('name')}
                autoComplete="name" required minLength={2} placeholder="Priya Rao" />
            </div>
          )}
          <div>
            <label htmlFor="email" className="text-sm font-medium text-ink-700">Email</label>
            <input id="email" type="email" className={field} value={form.email} onChange={update('email')}
              autoComplete="email" required placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-ink-700">Password</label>
            <input id="password" type="password" className={field} value={form.password} onChange={update('password')}
              autoComplete={registering ? 'new-password' : 'current-password'} required minLength={8}
              placeholder={registering ? 'At least 8 characters' : ''} />
            {registering && <p className="mt-1.5 text-xs text-ink-400">At least 8 characters.</p>}
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-signal-redLight px-3.5 py-2.5 text-sm text-signal-red">{error}</p>
          )}

          <Button type="submit" icon={UserRound} disabled={busy} className="w-full justify-center">
            {busy ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-5 text-sm text-ink-500">
          {registering ? 'Already have an account?' : 'New to CityLens?'}{' '}
          <button type="button" onClick={switchMode} className="focus-ring rounded font-medium text-civic-700 hover:underline">
            {registering ? 'Sign in instead' : 'Create an account'}
          </button>
        </p>

        {MOCK_MODE && (
          <p className="mt-6 rounded-xl border border-dashed border-ink-300 px-3.5 py-2.5 text-xs text-ink-500">
            Demo (no backend running): sign in as <span className="font-medium text-ink-700">{DEMO_CREDENTIALS.citizen.email}</span>{' '}
            with password <span className="font-medium text-ink-700">{DEMO_CREDENTIALS.citizen.password}</span> to see sample reports.
          </p>
        )}
      </div>

      <div className="lg:border-l lg:border-ink-200">
        <AuthoritySignIn onSignedIn={() => navigate('/authority', { replace: true })} />
      </div>
    </div>
  )
}
