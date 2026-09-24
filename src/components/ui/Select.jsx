import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

const Select = forwardRef(function Select({
  label,
  error,
  helperText,
  required = false,
  options = [],
  children,
  className = '',
  id,
  ...props
}, ref) {
  const selectId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] uppercase tracking-wider">
          {label} {required && <span className="text-[#DC2626] font-bold">*</span>}
        </label>
      )}
      <div className="relative rounded-lg shadow-sm">
        <select
          ref={ref}
          id={selectId}
          className={`block w-full appearance-none rounded-lg border text-sm transition-colors duration-150 py-2.5 px-3.5 pr-10 text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-[#1E293B] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
            error
              ? 'border-red-300 dark:border-rose-800 focus:border-red-500 focus:ring-red-200 dark:focus:ring-rose-950'
              : 'border-[#E2E8F0] dark:border-[#334155] hover:border-slate-300 dark:hover:border-slate-500 focus:border-[#2563EB] dark:focus:border-[#3B82F6] focus:ring-blue-100 dark:focus:ring-blue-950/50'
          } ${className}`}
          {...props}
        >
          {children || options.map(opt => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lbl = typeof opt === 'object' ? opt.label : opt;
            return <option key={val} value={val} className="bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC]">{lbl}</option>;
          })}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error && <p className="text-xs text-[#DC2626] dark:text-rose-400 font-medium mt-1">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">{helperText}</p>}
    </div>
  );
});

export default Select;
