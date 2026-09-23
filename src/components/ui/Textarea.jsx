import React, { forwardRef } from 'react';

const Textarea = forwardRef(function Textarea({
  label,
  error,
  helperText,
  required = false,
  rows = 3,
  className = '',
  id,
  ...props
}, ref) {
  const textareaId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          {label} {required && <span className="text-[#DC2626] font-bold">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={`block w-full rounded-lg border text-sm transition-colors duration-150 py-2.5 px-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
            : 'border-slate-200 hover:border-slate-300 focus:border-[#1E3A8A] focus:ring-blue-100'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-[#DC2626] font-medium mt-1">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}
    </div>
  );
});

export default Textarea;
