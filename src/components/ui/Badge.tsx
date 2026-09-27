import React, { type ReactNode, type HTMLAttributes } from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary' | 'default' | 'danger' | 'outline' | 'secondary';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  ...props
}: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    success: 'bg-emerald-50 dark:bg-emerald-950/70 text-[#16A34A] dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 dark:bg-amber-950/70 text-[#D97706] dark:text-amber-300 border-amber-200 dark:border-amber-800',
    error: 'bg-rose-50 dark:bg-rose-950/70 text-[#DC2626] dark:text-rose-300 border-rose-200 dark:border-rose-800',
    danger: 'bg-rose-50 dark:bg-rose-950/70 text-[#DC2626] dark:text-rose-300 border-rose-200 dark:border-rose-800',
    info: 'bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-300 border-blue-200 dark:border-blue-800',
    neutral: 'bg-slate-50 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] border-slate-200 dark:border-[#334155]',
    default: 'bg-slate-50 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] border-slate-200 dark:border-[#334155]',
    secondary: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    outline: 'bg-transparent text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600',
    primary: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  };

  const dotColors: Record<BadgeVariant, string> = {
    success: 'bg-[#16A34A]',
    warning: 'bg-[#D97706]',
    error: 'bg-[#DC2626]',
    danger: 'bg-[#DC2626]',
    info: 'bg-[#0284C7]',
    neutral: 'bg-slate-400',
    default: 'bg-slate-400',
    secondary: 'bg-slate-400',
    outline: 'bg-slate-400',
    primary: 'bg-[#1E3A8A]',
  };

  const sizes: Record<BadgeSize, string> = {
    sm: 'text-xs px-2.5 py-0.5 font-medium rounded-full',
    md: 'text-sm px-3 py-1 font-semibold rounded-full',
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
