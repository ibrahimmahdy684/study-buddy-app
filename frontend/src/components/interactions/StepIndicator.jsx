import React from 'react'
import { ArrowRight, Check } from 'lucide-react'

export function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {steps.map(({ label, number }, index) => (
        <div key={number} className="flex items-center gap-2">
          {index > 0 && <ArrowRight className="w-4 h-4 text-gray-300" />}
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${currentStep > number ? 'bg-[#4CAF50] text-white' : currentStep === number ? 'bg-[#C76B4F] text-white' : 'bg-gray-200 text-[#5A5A5A]'}`}>
              {currentStep > number ? <Check className="w-3.5 h-3.5" /> : number}
            </div>
            <span className={`text-sm font-medium ${currentStep === number ? 'text-[#C76B4F]' : 'text-[#5A5A5A]'}`}>{label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
