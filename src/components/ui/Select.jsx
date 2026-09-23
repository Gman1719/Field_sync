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
        <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          {label} {required && <span className="text-[#DC2626] font-bold">*</span>}
        </label>
      )}
      <div className="relative rounded-lg shadow-sm">
        <select
          ref={ref}
          id={selectId}
          className={`block w-full appearance-none rounded-lg border text-sm transition-colors duration-150 py-2.5 px-3.5 pr-10 text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-slate-200 hover:border-slate-300 focus:border-[#1E3A8A] focus:ring-blue-100'
          } ${className}`}
          {...props}
        >
          {children || options.map(opt => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lbl = typeof opt === 'object' ? opt.label : opt;
            return <option key={val} value={val}>{lbl}</option>;
          })}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error && <p className="text-xs text-[#DC2626] font-medium mt-1">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}
    </div>
  );
});

export default Select;
