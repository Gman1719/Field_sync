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
          className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight"
        >
          {label} {required && <span className="text-rose-600 dark:text-rose-400 font-bold">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={`block w-full rounded-xl border text-sm leading-relaxed transition-all duration-150 p-3.5 text-slate-900 dark:text-white bg-white dark:bg-slate-800/80 placeholder:text-slate-400 dark:placeholder:text-slate-500 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/20 min-h-[110px] resize-y ${
          error
            ? 'border-rose-400 dark:border-rose-600 focus:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-950/50'
            : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>}
    </div>
  );
});

export default Textarea;
