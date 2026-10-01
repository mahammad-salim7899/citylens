import React, { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import Button from './Button'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'

const CITIZEN_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/report', label: 'Report Issue' },
  { to: '/track', label: 'Track Complaint' },
  { to: '/about', label: 'About' },
]

// An officer has no use for the citizen reporting flow.
const OFFICER_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/authority', label: 'Authority Portal' },
  { to: '/about', label: 'About' },
]

const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, isOfficer, signOut } = useAuth()
  useEffect(() => setOpen(false), [pathname])

  // Once the page scrolls, the bar turns glassier and gains a soft shadow
  // so it reads as floating above the content.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = isOfficer ? OFFICER_LINKS : CITIZEN_LINKS
  const handleSignOut = () => {
    signOut()
    navigate('/', { replace: true })
  }

  return (
    <header
      className={`sticky top-0 z-[900] border-b transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled
          ? 'border-ink-300/40 bg-white/80 shadow-[0_8px_24px_-12px_rgba(16,26,61,0.18)] backdrop-blur-md'
          : 'border-ink-300/60 bg-ink-50/90 backdrop-blur-sm'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="focus-ring rounded-md transition-opacity hover:opacity-80" aria-label="CityLens home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                // The underline always exists; it grows from the centre
                // when the link becomes active.
                `focus-ring relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-200
                 after:absolute after:inset-x-3.5 after:-bottom-[13px] after:h-0.5 after:origin-center after:rounded-full after:bg-civic-700
                 after:transition-transform after:duration-300 after:ease-out-expo ${
                  isActive ? 'text-civic-800 after:scale-x-100' : 'text-ink-500 after:scale-x-0 hover:bg-ink-100/70 hover:text-ink-900'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link
                to={isOfficer ? '/authority' : '/dashboard'}
                className="focus-ring group flex max-w-[15rem] items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm text-ink-500 transition-colors hover:bg-ink-100/80 hover:text-ink-900"
                title={user.email}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold text-white transition-transform duration-300 group-hover:scale-105 ${isOfficer ? 'bg-civic-800' : 'bg-civic-600'}`} aria-hidden="true">
                  {initials(user.name)}
                </span>
                <span className="truncate">
                  <span className="font-medium text-ink-900">{user.name}</span>
                  {isOfficer && <span className="text-ink-400"> · Officer</span>}
                </span>
              </Link>
              <Button onClick={handleSignOut} variant="ghost" size="sm" icon={LogOut}>Sign out</Button>
            </>
          ) : (
            <>
              <Button as={Link} to="/login" variant="ghost" size="sm">Login</Button>
              <Button as={Link} to="/report" variant="primary" size="sm">Get Started</Button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="focus-ring rounded-lg p-2 text-ink-700 transition-colors hover:bg-ink-100 md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {/* Icon swaps with a quick turn so the change reads as one motion. */}
          <span key={open ? 'x' : 'menu'} className="block animate-pop">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </span>
        </button>
      </div>

      {open && (
        <nav className="animate-slide-down border-t border-ink-300/60 bg-white/95 px-4 pb-4 pt-2 shadow-lift backdrop-blur-md md:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-1">
            {links.map((l, i) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                style={{ '--d': `${40 + i * 35}ms` }}
                className={({ isActive }) => `focus-ring animate-rise rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-civic-100 ${isActive ? 'bg-civic-100 text-civic-800' : 'text-ink-700'}`}
              >
                {l.label}
              </NavLink>
            ))}
            {user ? (
              <div className="mt-2 flex animate-rise flex-col border-t border-ink-200 pt-3" style={{ '--d': '180ms' }}>
                <div className="flex items-center gap-3 px-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold text-white ${isOfficer ? 'bg-civic-800' : 'bg-civic-600'}`} aria-hidden="true">
                    {initials(user.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900">{user.name}</p>
                    <p className="truncate text-xs text-ink-400">{user.email}</p>
                  </div>
                </div>
                <Button onClick={handleSignOut} variant="secondary" size="sm" icon={LogOut} className="mt-3 w-full justify-center">
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="mt-2 flex animate-rise gap-2" style={{ '--d': '180ms' }}>
                <Button as={Link} to="/login" variant="secondary" size="sm" className="flex-1">Login</Button>
                <Button as={Link} to="/report" variant="primary" size="sm" className="flex-1">Get Started</Button>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
