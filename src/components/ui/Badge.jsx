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
    success: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
    warning: 'bg-amber-50 text-[#D97706] border-amber-200',
    error: 'bg-rose-50 text-[#DC2626] border-rose-200',
    info: 'bg-sky-50 text-[#0284C7] border-sky-200',
    neutral: 'bg-slate-50 text-slate-700 border-slate-200',
    primary: 'bg-blue-50 text-[#1E3A8A] border-blue-200'
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
