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
          className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-[#F5EBE1] tracking-tight"
        >
          {label} {required && <span className="text-[#DC2626] dark:text-[#F43F5E] font-bold">*</span>}
        </label>
      )}
      <div className="relative rounded-xl shadow-xs">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#BFA89B]">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`block w-full rounded-xl border-[1.5px] text-sm transition-all duration-150 py-2.5 px-3.5 text-slate-900 dark:text-[#FFFFFF] bg-white dark:bg-[#231914] placeholder:text-slate-500 dark:placeholder:text-[#BFA89B] border-slate-300 dark:border-[#5A4032] hover:border-slate-400 dark:hover:border-[#9E7254] dark:hover:bg-[#281D17] focus:border-[#2563EB] dark:focus:border-[#3B82F6] focus:outline-none focus:ring-3 focus:ring-blue-500/20 dark:focus:ring-blue-500/30 ${
            Icon ? 'pl-10' : ''
          } ${
            error
              ? 'border-red-400 dark:border-rose-500 focus:border-red-500 focus:ring-red-200 dark:focus:ring-rose-950/50'
              : ''
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-[#DC2626] dark:text-rose-400 font-medium mt-1">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500 dark:text-[#BFA89B] mt-1">{helperText}</p>}
    </div>
  );
});

export default Input;
