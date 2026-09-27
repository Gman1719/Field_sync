import React, { forwardRef, type TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  rows?: number;
  className?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    error,
    helperText,
    required = false,
    rows = 3,
    className = '',
    id,
    ...props
  },
  ref
) {
  const textareaId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-[#F5EBE1] tracking-tight"
        >
          {label} {required && <span className="text-[#DC2626] dark:text-[#F43F5E] font-bold">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={`block w-full rounded-xl border-[1.5px] text-sm leading-relaxed transition-all duration-150 p-3.5 text-slate-900 dark:text-[#FFFFFF] bg-white dark:bg-[#231914] placeholder:text-slate-500 dark:placeholder:text-[#BFA89B] border-slate-300 dark:border-[#5A4032] hover:border-slate-400 dark:hover:border-[#9E7254] dark:hover:bg-[#281D17] focus:border-[#2563EB] dark:focus:border-[#3B82F6] focus:outline-none focus:ring-3 focus:ring-blue-500/20 dark:focus:ring-blue-500/30 min-h-[110px] resize-y ${
          error
            ? 'border-red-400 dark:border-rose-500 focus:border-red-500 focus:ring-red-200 dark:focus:ring-rose-950/50'
            : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-[#DC2626] dark:text-rose-400 font-medium mt-1">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500 dark:text-[#BFA89B] mt-1">{helperText}</p>}
    </div>
  );
});

export default Textarea;
