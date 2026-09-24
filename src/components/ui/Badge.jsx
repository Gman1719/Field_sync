import React from 'react';

export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) {
  const variants = {
    success: 'bg-emerald-50 dark:bg-emerald-950/70 text-[#16A34A] dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 dark:bg-amber-950/70 text-[#D97706] dark:text-amber-300 border-amber-200 dark:border-amber-800',
    error: 'bg-rose-50 dark:bg-rose-950/70 text-[#DC2626] dark:text-rose-300 border-rose-200 dark:border-rose-800',
    info: 'bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-300 border-blue-200 dark:border-blue-800',
    neutral: 'bg-slate-50 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] border-slate-200 dark:border-[#334155]',
    primary: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
  };

  const dotColors = {
    success: 'bg-[#16A34A]',
    warning: 'bg-[#D97706]',
    error: 'bg-[#DC2626]',
    info: 'bg-[#0284C7]',
    neutral: 'bg-slate-400',
    primary: 'bg-[#1E3A8A]'
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 font-medium rounded-full',
    md: 'text-xs px-2.5 py-1 font-semibold rounded-full'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 border leading-none ${variants[variant] || variants.neutral} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant] || 'bg-slate-400'}`} />}
      {children}
    </span>
  );
}
