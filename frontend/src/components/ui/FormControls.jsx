import React, { useMemo, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'

export function InputField({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  required = false,
  disabled = false,
  error,
  icon: Icon,
  iconPosition = 'left',
  helpText,
  className = '',
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-sm font-medium text-[#2B2B2B]">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      <div className="relative">
        {Icon && iconPosition === 'left' && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A5A]" />}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${error ? 'border-red-600' : 'border-gray-300'} ${Icon && iconPosition === 'left' ? 'pl-10' : ''} ${Icon && iconPosition === 'right' ? 'pr-10' : ''}`}
        />
        {Icon && iconPosition === 'right' && <Icon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A5A]" />}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : helpText ? <p className="text-xs text-[#5A5A5A]">{helpText}</p> : null}
    </div>
  )
}

export function Select({ label, value, onChange, options, placeholder, required = false, error, className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-sm font-medium text-[#2B2B2B]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent ${error ? 'border-red-600' : 'border-gray-300'}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength,
  required = false,
  helpText,
  className = '',
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-sm font-medium text-[#2B2B2B]">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        required={required}
        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent"
      />
      {maxLength ? <p className="text-xs text-[#5A5A5A] text-right">{value.length} / {maxLength}</p> : helpText ? <p className="text-xs text-[#5A5A5A]">{helpText}</p> : null}
    </div>
  )
}

export function ChipGroup({
  label,
  options,
  selected,
  onChange,
  multiSelect = false,
  columns = 3,
  className = '',
}) {
  const gridClass = useMemo(() => {
    if (columns === 2) return 'grid-cols-2'
    if (columns === 4) return 'grid-cols-4'
    return 'grid-cols-3'
  }, [columns])

  const handleToggle = (option) => {
    if (multiSelect) {
      const next = Array.isArray(selected) && selected.includes(option)
        ? selected.filter((item) => item !== option)
        : [...(Array.isArray(selected) ? selected : []), option]
      onChange(next)
      return
    }

    onChange(selected === option ? '' : option)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-[#2B2B2B]">
        {label}
        {multiSelect && <span className="text-xs text-[#5A5A5A] font-normal ml-1">select all that apply</span>}
      </label>
      <div className={`grid ${gridClass} gap-2`}>
        {options.map((option) => {
          const isSelected = multiSelect ? (Array.isArray(selected) && selected.includes(option)) : selected === option
          return (
            <button
              key={option}
              type="button"
              onClick={() => handleToggle(option)}
              className={`py-2 px-3 text-sm rounded-lg border-2 transition-all font-medium ${isSelected ? 'border-[#C76B4F] bg-[#C76B4F] text-white' : 'border-gray-200 bg-white text-[#2B2B2B] hover:border-[#C76B4F]'}`}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function TagInput({
  label,
  tags,
  onAdd,
  onRemove,
  placeholder = 'Add item',
  maxTags,
  className = '',
}) {
  const [inputValue, setInputValue] = useState('')
  const isFull = maxTags ? tags.length >= maxTags : false

  const handleAdd = () => {
    const next = inputValue.trim()
    if (!next || isFull) return
    onAdd(next)
    setInputValue('')
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-[#2B2B2B]">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
          placeholder={placeholder}
          disabled={isFull}
          className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C76B4F] disabled:bg-gray-50 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim() || isFull}
          className="px-4 py-2.5 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B55A3E] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <span key={`${tag}-${index}`} className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F4E3C8] text-[#2B2B2B] rounded-full text-sm">
              {tag}
              <button type="button" onClick={() => onRemove(index)} className="text-[#5A5A5A] hover:text-[#C76B4F] transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5A5A5A]" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent"
        />
      </div>
    </div>
  )
}
