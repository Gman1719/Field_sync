import React, { forwardRef, type InputHTMLAttributes, type ElementType } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  icon?: ElementType;
  className?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    helperText,
    required = false,
    icon: Icon,
    className = '',
    id,
    type = 'text',
    ...props
  },
  ref
) {
  const inputId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight"
        >
          {label} {required && <span className="text-rose-600 dark:text-rose-400 font-bold">*</span>}
        </label>
      )}
      <div className="relative rounded-xl shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`block w-full rounded-xl border text-sm transition-all duration-150 py-2.5 px-3.5 text-slate-900 dark:text-white bg-white dark:bg-slate-800/80 placeholder:text-slate-400 dark:placeholder:text-slate-500 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/20 ${
            Icon ? 'pl-10' : ''
          } ${
            error
              ? 'border-rose-400 dark:border-rose-600 focus:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-950/50'
              : ''
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>}
    </div>
  );
});

export default Input;
