import React, { useEffect } from 'react'
import { Routes, Route, useLocation, Link } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Button from './components/Button'

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
      <p className="font-display text-6xl font-bold text-civic-200">404</p>
      <h1 className="mt-3 font-display text-xl font-semibold text-ink-900">Page not found</h1>
      <p className="mt-2 text-sm text-ink-500">The page you're looking for doesn't exist.</p>
      <Button as={Link} to="/" className="mt-6">Back to home</Button>
    </div>
  )
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1000] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-card">
        Skip to content
      </a>
      <ScrollToTop />
      <Navbar />
      <main id="main" className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />

          <Route path="/report" element={<ReportIssue />} />
          <Route path="/report/analyze" element={<Analysis />} />
          <Route path="/report/confirm" element={<Confirmation />} />
          <Route path="/report/success" element={<ComplaintSuccess />} />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/track" element={<TrackComplaint />} />
          <Route path="/track/:id" element={<TrackComplaint />} />

          <Route path="/authority" element={<AuthorityDashboard />} />
          <Route path="/authority/complaints/:id" element={<AuthorityComplaintDetails />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
