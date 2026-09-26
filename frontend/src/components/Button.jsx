import React from 'react'
import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-civic-700 text-white hover:bg-civic-800 shadow-card',
  secondary: 'bg-white text-civic-800 border border-ink-300 hover:border-civic-500 hover:text-civic-700',
  ghost: 'text-civic-700 hover:bg-civic-100',
  danger: 'bg-signal-red text-white hover:bg-red-800',
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
      className={`focus-ring inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {LeadIcon && (iconPosition === 'left' || loading) && (
        <LeadIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={2.25} aria-hidden="true" />
      )}
      {children}
      {Icon && iconPosition === 'right' && !loading && <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />}
    </Comp>
  )
}
