import React, { useEffect } from 'react'
import { Routes, Route, useLocation, Link } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Button from './components/Button'
import RequireAuth from './components/RequireAuth'

import Home from './pages/Home'
import About from './pages/About'
import Login from './pages/Login'
import ReportIssue from './pages/ReportIssue'
import Analysis from './pages/Analysis'
import Confirmation from './pages/Confirmation'
import ComplaintSuccess from './pages/ComplaintSuccess'
import Dashboard from './pages/Dashboard'
import TrackComplaint from './pages/TrackComplaint'
import AuthorityDashboard from './pages/AuthorityDashboard'
import AuthorityComplaintDetails from './pages/AuthorityComplaintDetails'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="animate-pop font-display text-6xl font-bold text-civic-200">404</p>
      <h1 className="mt-3 animate-rise font-display text-xl font-semibold text-ink-900" style={{ '--d': '80ms' }}>Page not found</h1>
      <p className="mt-2 animate-rise text-sm text-ink-500" style={{ '--d': '140ms' }}>The page you're looking for doesn't exist.</p>
      <div className="mt-6 animate-rise" style={{ '--d': '200ms' }}><Button as={Link} to="/">Back to home</Button></div>
    </div>
  )
}

export default function App() {
  // Keying the wrapper on the path replays a short fade-in on every
  // navigation. It ends at `transform: none`, so sticky/fixed children
  // behave normally once it has played.
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1000] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-card">
        Skip to content
      </a>
      <ScrollToTop />
      <Navbar />
      <main id="main" className="flex-1">
        <div key={pathname} className="animate-page-in">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />

          {/* Citizen pages. Detection, filing and tracking all hit
              endpoints that require a citizen token. */}
          <Route path="/report" element={<RequireAuth role="citizen"><ReportIssue /></RequireAuth>} />
          <Route path="/report/analyze" element={<RequireAuth role="citizen"><Analysis /></RequireAuth>} />
          <Route path="/report/confirm" element={<RequireAuth role="citizen"><Confirmation /></RequireAuth>} />
          <Route path="/report/success" element={<RequireAuth role="citizen"><ComplaintSuccess /></RequireAuth>} />

          <Route path="/dashboard" element={<RequireAuth role="citizen"><Dashboard /></RequireAuth>} />
          <Route path="/track" element={<RequireAuth role="citizen"><TrackComplaint /></RequireAuth>} />
          <Route path="/track/:id" element={<RequireAuth role="citizen"><TrackComplaint /></RequireAuth>} />

          {/* Authority pages. */}
          <Route path="/authority" element={<RequireAuth role="officer"><AuthorityDashboard /></RequireAuth>} />
          <Route path="/authority/complaints/:id" element={<RequireAuth role="officer"><AuthorityComplaintDetails /></RequireAuth>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        </div>
      </main>
      <Footer />
    </div>
  )
}
