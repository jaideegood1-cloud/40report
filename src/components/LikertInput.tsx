import React from 'react';
import { LIKERT_OPTIONS } from '../types/survey';

interface LikertInputProps {
  id: string;
  title: string;
  description?: string;
  code?: string;
  value: number | undefined;
  onChange: (val: number) => void;
  required?: boolean;
}

export const LikertInput: React.FC<LikertInputProps> = ({
  id,
  title,
  description,
  code,
  value,
  onChange,
  required = true,
}) => {
  const getSelectedColor = (optValue: number) => {
    switch (optValue) {
      case 5:
        return 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200';
      case 4:
        return 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-200';
      case 3:
        return 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-200';
      case 2:
        return 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-200';
      case 1:
        return 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-200';
      default:
        return 'bg-blue-600 text-white border-blue-600';
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm transition-all hover:border-slate-300">
      <div className="flex items-start gap-3 mb-3">
        {code && (
          <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200 mt-0.5">
            {code}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <label className="block text-slate-800 font-medium text-base leading-snug">
            {title}
            {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
          </label>
          {description && (
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* 5-Point Likert Radio Grid */}
      <div className="mt-3">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
          {LIKERT_OPTIONS.map((opt) => {
            const isSelected = value === opt.value;
            const inputId = `${id}_${opt.value}`;

            return (
              <div key={opt.value} className="relative">
                <input
                  type="radio"
                  id={inputId}
                  name={id}
                  value={opt.value}
                  checked={isSelected}
                  onChange={() => onChange(opt.value)}
                  className="sr-only"
                  required={required}
                />
                <label
                  htmlFor={inputId}
                  className={`flex flex-col items-center justify-center py-2.5 px-1 sm:py-3.5 sm:px-2 rounded-lg border-2 cursor-pointer transition-all text-center select-none ${
                    isSelected
                      ? getSelectedColor(opt.value)
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <span className="text-base sm:text-lg font-bold leading-none mb-1">
                    {opt.value}
                  </span>
                  <span
                    className={`text-[10px] sm:text-xs font-medium line-clamp-1 ${
                      isSelected ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    {opt.label}
                  </span>
                </label>
              </div>
            );
          })}
        </div>

        {/* Legend hints below scale */}
        <div className="flex justify-between items-center text-[10px] sm:text-xs text-slate-400 mt-2 px-1">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            1 = น้อยที่สุด
          </span>
          <span className="hidden sm:inline-block text-slate-300">•</span>
          <span className="hidden sm:inline-block">3 = ปานกลาง</span>
          <span className="hidden sm:inline-block text-slate-300">•</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            5 = มากที่สุด
          </span>
        </div>
      </div>
    </div>
  );
};
