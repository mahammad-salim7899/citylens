// ─────────────────────────────────────────────────────────────
// motion.js — tiny hooks behind the app's animations.
//
// Everything respects the OS "reduce motion" setting: values jump
// straight to their final state and nothing waits on an animation.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'

export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * true once the element has scrolled into view (stays true by default).
 * Falls back to "visible" where IntersectionObserver isn't available, so
 * content is never stuck hidden.
 */
export function useInView({ once = true, rootMargin = '0px 0px -8% 0px', threshold = 0.12 } = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
      setInView(true)
      return undefined
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        if (once) io.disconnect()
      } else if (!once) {
        setInView(false)
      }
    }, { rootMargin, threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [once, rootMargin, threshold])

  return [ref, inView]
}

/** Counts from 0 to `target` with an ease-out curve once `start` is true. */
export function useCountUp(target, { start = true, duration = 1100 } = {}) {
  const reduced = prefersReducedMotion()
  const [value, setValue] = useState(reduced ? target : 0)

  useEffect(() => {
    if (!start) return undefined
    if (reduced || !Number.isFinite(target)) {
      setValue(target)
      return undefined
    }
    let frame
    const t0 = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 4)
      setValue(Math.round(target * eased))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, start, duration, reduced])

  return value
}

/** Inline style for a staggered animation delay: stagger(i, 70) → { '--d': '140ms' } */
export const stagger = (index, step = 70, base = 0, max = 700) => ({
  '--d': `${Math.min(max, base + index * step)}ms`,
})
