import React, { useMemo, useState } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isBefore, isSameDay, startOfDay, startOfMonth, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function CalendarWidget({
  selectedDates = [],
  onToggleDate,
  minDate,
  maxDate,
  className = '',
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const today = startOfDay(new Date())
  const monthStart = startOfMonth(currentMonth)
  const dates = useMemo(() => eachDayOfInterval({ start: monthStart, end: endOfMonth(currentMonth) }), [currentMonth])
  const firstOffset = getDay(monthStart)
  const selectedSet = new Set(selectedDates)

  const isDisabled = (date) => {
    const start = minDate ? startOfDay(minDate) : today
    const end = maxDate ? startOfDay(maxDate) : null
    const day = startOfDay(date)
    if (isBefore(day, start)) return true
    if (end && isBefore(end, day)) return true
    return false
  }

  return (
    <div className={`border border-gray-200 rounded-xl overflow-hidden select-none ${className}`}>
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#F4E3C8]/60 border-b border-gray-100">
        <button type="button" onClick={() => setCurrentMonth((value) => subMonths(value, 1))} className="p-1 rounded hover:bg-[#C76B4F]/10 transition-colors">
          <ChevronLeft className="w-4 h-4 text-[#2B2B2B]" />
        </button>
        <span className="text-sm font-semibold text-[#2B2B2B]" style={{ fontFamily: 'Poppins, sans-serif' }}>
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button type="button" onClick={() => setCurrentMonth((value) => addMonths(value, 1))} className="p-1 rounded hover:bg-[#C76B4F]/10 transition-colors">
          <ChevronRight className="w-4 h-4 text-[#2B2B2B]" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-100 bg-[#F4E3C8]/20">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="text-center text-[11px] font-semibold text-[#5A5A5A] py-1.5">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 p-2">
        {Array.from({ length: firstOffset }).map((_, index) => <div key={`empty-${index}`} />)}
        {dates.map((date) => {
          const key = format(date, 'yyyy-MM-dd')
          const selected = selectedSet.has(key)
          const todayCell = isSameDay(date, today)
          const disabled = isDisabled(date)

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => !disabled && onToggleDate?.(date)}
              disabled={disabled}
              className={`aspect-square flex items-center justify-center rounded-md text-xs font-medium transition-all ${disabled ? 'text-gray-300 cursor-default' : selected ? 'bg-[#C76B4F] text-white shadow-sm' : todayCell ? 'ring-2 ring-[#C76B4F] text-[#C76B4F] hover:bg-[#F4E3C8]' : 'text-[#2B2B2B] hover:bg-[#F4E3C8]'}`}
            >
              {format(date, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
