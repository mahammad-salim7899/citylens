import React from 'react'
import { FlaskConical } from 'lucide-react'

// Shown wherever a result is simulated, so the prototype never claims
// that YOLO analyzed an image when it didn't.
export default function DemoNotice({ children, className = '' }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border border-signal-amber/25 bg-signal-amberLight/60 px-4 py-3 text-sm text-ink-700 ${className}`}>
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-signal-amber" aria-hidden="true" />
      <p>
        {children || (
          <>
            <span className="font-semibold text-ink-900">Demo mode — simulated result.</span>{' '}
            This image was not analyzed by the YOLO model. Connect the FastAPI backend to get real detections.
          </>
        )}
      </p>
    </div>
  )
}
