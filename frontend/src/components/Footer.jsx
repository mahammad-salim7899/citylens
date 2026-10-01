import React from 'react'
import { Link } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'
import { resetDemoData } from '../services/complaintService'
import { useToast } from './Toast'

export default function Footer() {
  const toast = useToast()
  const { mockMode } = useAuth()

  const handleReset = async () => {
    await resetDemoData()
    toast.show('Demo data reset. Sample complaints restored.', 'success')
  }

  return (
    <footer className="border-t border-ink-300/60 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-ink-500">
              A computer-vision civic reporting platform built as a college PBL project — connecting citizens and civic authorities through faster, evidence-based reporting.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:gap-16">
            <div>
              <p className="font-semibold text-ink-900">Citizens</p>
              <ul className="mt-3 space-y-2 text-ink-500">
                <li><Link to="/report" className="hover:text-civic-700">Report an issue</Link></li>
                <li><Link to="/track" className="hover:text-civic-700">Track a complaint</Link></li>
                <li><Link to="/dashboard" className="hover:text-civic-700">My reports</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-ink-900">Project</p>
              <ul className="mt-3 space-y-2 text-ink-500">
                <li><Link to="/about" className="hover:text-civic-700">About CityLens</Link></li>
                <li><Link to="/authority" className="hover:text-civic-700">Authority portal</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-ink-200 pt-6 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>Detecting: Pothole · Illegal Parking · Garbage Dumping</p>
          {mockMode ? (
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-signal-amberLight px-2 py-0.5 font-semibold text-signal-amber">Demo mode</span>
              <button type="button" onClick={handleReset} className="focus-ring flex items-center gap-1 rounded font-medium text-ink-500 hover:text-civic-700">
                <RotateCcw className="h-3 w-3" aria-hidden="true" /> Reset demo data
              </button>
            </div>
          ) : (
            <span className="rounded-full bg-signal-greenLight px-2 py-0.5 font-semibold text-signal-green">Connected to CityLens server</span>
          )}
        </div>
      </div>
    </footer>
  )
}
