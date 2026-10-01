// ─────────────────────────────────────────────────────────────
// Motion.jsx — reusable animation building blocks.
//
//   <Reveal>     fades/slides content in when it scrolls into view
//   <CountUp>    animates a number from 0 when it scrolls into view
//   <Skeleton>   shimmering placeholder block for loading states
// ─────────────────────────────────────────────────────────────

import React from 'react'
import { useCountUp, useInView } from '../lib/motion'

/**
 * @param {'up'|'scale'|'fade'} [variant]
 * @param {number} [delay] ms, for staggering siblings
 */
export function Reveal({ as: Tag = 'div', variant = 'up', delay = 0, className = '', style, children, ...rest }) {
  const [ref, inView] = useInView()
  return (
    <Tag
      ref={ref}
      className={`reveal reveal-${variant} ${inView ? 'is-visible' : ''} ${className}`}
      style={{ '--d': `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function CountUp({ value, duration, className = '' }) {
  const [ref, inView] = useInView()
  const shown = useCountUp(value, { start: inView, duration })
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {shown}
    </span>
  )
}

export function Skeleton({ className = '' }) {
  return <span aria-hidden="true" className={`skeleton block rounded-lg ${className}`} />
}
