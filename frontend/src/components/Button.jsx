import React from 'react'
import { Loader2 } from 'lucide-react'

// Hover lifts the solid buttons a pixel and deepens their shadow; press
// sinks them back. Disabled buttons don't move at all.
const variants = {
  primary: 'bg-civic-700 text-white shadow-card hover:bg-civic-800 hover:shadow-lift hover:-translate-y-px',
  secondary: 'bg-white text-civic-800 border border-ink-300 hover:border-civic-500 hover:text-civic-700 hover:shadow-card hover:-translate-y-px',
  ghost: 'text-civic-700 hover:bg-civic-100',
  danger: 'bg-signal-red text-white shadow-card hover:bg-red-800 hover:-translate-y-px',
  subtle: 'bg-civic-100 text-civic-800 hover:bg-civic-200',
  success: 'bg-signal-greenLight text-signal-green',
}

const sizes = {
  sm: 'text-sm px-3.5 py-2',
  md: 'text-sm px-5 py-2.5',
  lg: 'text-base px-6 py-3.5',
}

export default function Button({
  as: Comp = 'button',
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  className = '',
  children,
  disabled,
  type,
  ...rest
}) {
  const isButton = Comp === 'button'
  const LeadIcon = loading ? Loader2 : Icon
  return (
    <Comp
      type={isButton ? type || 'button' : undefined}
      disabled={isButton ? disabled || loading : undefined}
      aria-disabled={!isButton && disabled ? true : undefined}
      aria-busy={loading || undefined}
      className={`focus-ring group inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out-expo active:translate-y-0 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 disabled:active:scale-100 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {LeadIcon && (iconPosition === 'left' || loading) && (
        <LeadIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={2.25} aria-hidden="true" />
      )}
      {children}
      {Icon && iconPosition === 'right' && !loading && (
        <Icon className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-0.5 group-disabled:translate-x-0" strokeWidth={2.25} aria-hidden="true" />
      )}
    </Comp>
  )
}
