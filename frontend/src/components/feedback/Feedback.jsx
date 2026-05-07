import React from 'react'
import { AlertTriangle, Check, Info, X } from 'lucide-react'

const alertStyles = {
  success: {
    bg: 'bg-[#4CAF50]/10',
    border: 'border-[#4CAF50]/20',
    text: 'text-[#4CAF50]',
    icon: Check,
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-600',
    icon: X,
  },
  warning: {
    bg: 'bg-[#F4A261]/10',
    border: 'border-[#F4A261]/20',
    text: 'text-[#F4A261]',
    icon: AlertTriangle,
  },
  info: {
    bg: 'bg-[#4F7CAC]/10',
    border: 'border-[#4F7CAC]/20',
    text: 'text-[#4F7CAC]',
    icon: Info,
  },
}

export function AlertBanner({ type = 'info', title, message, onClose, className = '' }) {
  const { bg, border, text, icon: Icon } = alertStyles[type]

  return (
    <div className={`${bg} border ${border} rounded-lg p-4 flex items-start gap-3 ${className}`}>
      <Icon className={`w-5 h-5 ${text} flex-shrink-0`} />
      <div className="flex-1">
        {title && <p className={`font-semibold ${text} mb-1`}>{title}</p>}
        <p className={`text-sm ${text}`}>{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className={`${text} hover:opacity-70`} aria-label="Close alert">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

const spinnerSizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

export function LoadingSpinner({ size = 'md', color = '#C76B4F', className = '' }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-full border-2 border-t-transparent animate-spin ${spinnerSizes[size]} ${className}`}
      style={{ borderColor: color }}
    />
  )
}
