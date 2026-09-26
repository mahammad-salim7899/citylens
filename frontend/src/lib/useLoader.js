import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribeToComplaints } from '../services/complaintService'

/**
 * Runs an async loader, exposes {data, loading, error, reload}, and
 * re-runs whenever complaints change (including in another tab —
 * handy for demoing citizen and authority side by side).
 */
export function useLoader(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const alive = useRef(true)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await loader()
      if (alive.current) setState({ data, loading: false, error: null })
    } catch (e) {
      if (alive.current) setState({ data: null, loading: false, error: e.message || 'Something went wrong.' })
    }
  }, deps)

  useEffect(() => {
    alive.current = true
    load()
    const unsubscribe = subscribeToComplaints(() => load({ silent: true }))
    return () => { alive.current = false; unsubscribe() }
  }, [load])

  return { ...state, reload: load }
}
