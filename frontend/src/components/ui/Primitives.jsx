import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const buttonSizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

const buttonVariants = {
  primary: 'bg-[#C76B4F] text-white hover:bg-[#B55A3E] focus:ring-[#C76B4F]',
  coral: 'bg-[#E76F51] text-white hover:bg-[#D65F41] focus:ring-[#E76F51]',
  blue: 'bg-[#4F7CAC] text-white hover:bg-[#446A96] focus:ring-[#4F7CAC]',
  green: 'bg-[#4CAF50] text-white hover:bg-[#45A049] focus:ring-[#4CAF50]',
  orange: 'bg-[#F4A261] text-white hover:bg-[#E39151] focus:ring-[#F4A261]',
  ghost: 'border-2 border-gray-200 text-[#2B2B2B] bg-transparent hover:bg-gray-50 focus:ring-[#C76B4F]',
  white: 'bg-white text-[#C76B4F] hover:bg-white/90 focus:ring-[#C76B4F]',
  'success-light': 'bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/30 hover:bg-[#4CAF50]/20 focus:ring-[#4CAF50]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  children,
  onClick,
  type = 'button',
  className = '',
  ...props
}) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${buttonSizes[size]} ${buttonVariants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />}
          {children}
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
        </>
      )}
    </button>
  )
}

const cardPaddings = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ children, hover = false, padding = 'md', className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${hover ? 'transition-shadow hover:shadow-md' : ''} ${cardPaddings[padding]} ${className}`}>
      {children}
    </div>
  )
}

const avatarSizes = {
  sm: 'w-9 h-9 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-2xl',
  xl: 'w-20 h-20 text-3xl',
}

export function Avatar({ name, size = 'md', variant = 'gradient', color = 'terracotta' }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase()

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold ${avatarSizes[size]} ${variant === 'gradient' ? 'bg-gradient-to-br from-[#C76B4F] to-[#E76F51]' : ''}`}
      style={variant === 'solid' ? { backgroundColor: color } : undefined}
      aria-hidden="true"
    >
      {initial}
    </div>
  )
}

const badgeVariants = {
  default: 'bg-[#F4E3C8] text-[#2B2B2B]',
  success: 'bg-[#4CAF50]/10 text-[#4CAF50]',
  info: 'bg-[#4F7CAC]/10 text-[#4F7CAC]',
  warning: 'bg-[#F4A261]/10 text-[#F4A261]',
}

const badgeSizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
}

export function Badge({ children, variant = 'default', size = 'md', icon: Icon, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${badgeVariants[variant]} ${badgeSizes[size]} ${className}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  )
}

const spinnerSizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-4',
}

export function Spinner({ size = 'md', color = '#C76B4F', className = '' }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-full border-current border-t-transparent animate-spin ${spinnerSizes[size]} ${className}`}
      style={{ borderColor: color }}
    />
  )
}

export function Divider({ label, orientation = 'horizontal', className = '' }) {
  if (orientation === 'vertical') {
    return <div className={`w-px h-full bg-gray-200 ${className}`} />
  }

  return (
    <div className={`flex items-center gap-2 px-1 my-4 ${className}`}>
      <div className="flex-1 h-px bg-gray-100" />
      {label && <span className="text-[9px] font-bold text-[#5A5A5A] uppercase tracking-widest">{label}</span>}
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  )
}

const containerSizes = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  full: 'max-w-7xl',
}

export function Container({ size = 'md', children, className = '' }) {
  return <div className={`${containerSizes[size]} mx-auto ${className}`}>{children}</div>
}

const gridSizes = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}

const gapSizes = {
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
}

export function Grid({ cols = { base: 1, md: 2, lg: 3 }, gap = 6, children, className = '' }) {
  const base = gridSizes[cols.base] || 'grid-cols-1'
  const md = gridSizes[cols.md] || 'grid-cols-2'
  const lg = gridSizes[cols.lg] || 'grid-cols-3'
  const gapClass = gapSizes[gap] || 'gap-6'

  return <div className={`grid ${base} ${md} ${lg} ${gapClass} ${className}`}>{children}</div>
}

export function IconToggle({ isOpen, className = '' }) {
  const Icon = isOpen ? ChevronLeft : ChevronRight
  return <Icon className={`w-4 h-4 ${className}`} />
}
