import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, AlertTriangle, Info, X, AlertCircle } from 'lucide-react'

const styleMap = {
  success: { icon: CheckCircle2, color: 'text-signal-green', ring: 'ring-signal-green/25', bar: 'bg-signal-green' },
  warning: { icon: AlertTriangle, color: 'text-signal-amber', ring: 'ring-signal-amber/25', bar: 'bg-signal-amber' },
  error: { icon: AlertCircle, color: 'text-signal-red', ring: 'ring-signal-red/25', bar: 'bg-signal-red' },
  info: { icon: Info, color: 'text-civic-700', ring: 'ring-civic-500/25', bar: 'bg-civic-600' },
}

const EXIT_MS = 180

const ToastContext = createContext({ show: () => {} })

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  // Mark as leaving first so the exit animation can play, then remove.
  const dismiss = useCallback((id) => {
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)))
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), EXIT_MS)
  }, [])

  const show = useCallback((message, type = 'info', duration = 4500) => {
    const id = ++idRef.current
    setToasts((t) => [...t.slice(-2), { id, message, type, duration }])
    setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[1000] flex flex-col items-center gap-2 px-4 sm:top-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const { icon: Icon, color, ring, bar } = styleMap[t.type] || styleMap.info
          return (
            <div
              key={t.id}
              className={`pointer-events-auto relative flex max-w-md items-start gap-3 overflow-hidden rounded-xl bg-white px-4 py-3 shadow-lift ring-1 ${ring} ${
                t.leaving ? 'animate-toast-out' : 'animate-scale-in'
              }`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} strokeWidth={2.25} />
              <p className="text-sm font-medium text-ink-900">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="focus-ring ml-1 rounded p-0.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700" aria-label="Dismiss notification">
                <X className="h-4 w-4" />
              </button>
              {/* Time remaining before it closes by itself. */}
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 bottom-0 h-0.5 origin-left opacity-40 ${bar}`}
                style={{ animation: `toast-timer ${t.duration}ms linear forwards` }}
              />
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
