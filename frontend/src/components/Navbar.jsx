import React, { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Button from './Button'
import Logo from './Logo'

const links = [
  { to: '/', label: 'Home' },
  { to: '/report', label: 'Report Issue' },
  { to: '/track', label: 'Track Complaint' },
  { to: '/about', label: 'About' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])

  return (
    <header className="sticky top-0 z-[900] border-b border-ink-300/60 bg-ink-50/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="focus-ring rounded-md" aria-label="CityLens home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `focus-ring relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'text-civic-800 after:absolute after:inset-x-3.5 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-civic-700' : 'text-ink-500 hover:text-ink-900'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button as={Link} to="/login" variant="ghost" size="sm">Login</Button>
          <Button as={Link} to="/report" variant="primary" size="sm">Get Started</Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="focus-ring rounded-lg p-2 text-ink-700 md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-ink-300/60 bg-ink-50 px-4 pb-4 pt-2 md:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) => `focus-ring rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-civic-100 ${isActive ? 'bg-civic-100 text-civic-800' : 'text-ink-700'}`}
              >
                {l.label}
              </NavLink>
            ))}
            <div className="mt-2 flex gap-2">
              <Button as={Link} to="/login" variant="secondary" size="sm" className="flex-1">Login</Button>
              <Button as={Link} to="/report" variant="primary" size="sm" className="flex-1">Get Started</Button>
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
