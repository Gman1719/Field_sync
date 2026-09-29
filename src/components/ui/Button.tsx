import React, { type ButtonHTMLAttributes, type ReactNode, type ElementType } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: ElementType;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  type = 'button',
  onClick,
  ...props
}: ButtonProps) {
  const isSpinning = isLoading || loading;
  const baseStyles =
    'inline-flex items-center justify-center font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer';

  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-blue-600 hover:bg-blue-700 text-white shadow-sm focus:ring-blue-500 font-bold border border-blue-500/30 dark:border-blue-400/20',
    secondary:
      'bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 dark:hover:border-slate-600 shadow-sm focus:ring-slate-400 font-semibold',
    success:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm focus:ring-emerald-500 font-bold border border-emerald-500/30 dark:border-emerald-400/20',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500 font-bold border border-rose-500/30 dark:border-rose-400/20',
    ghost:
      'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white focus:ring-slate-300 font-semibold',
    outline:
      'bg-transparent border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-300 focus:ring-blue-500 font-bold',
  };

  const sizes: Record<ButtonSize, string> = {
    xs: 'text-sm font-semibold px-3 py-1.5 rounded-lg gap-1.5',
    sm: 'text-sm font-semibold px-3.5 py-2 rounded-xl gap-2',
    md: 'text-base font-bold px-4 py-2.5 rounded-xl gap-2',
    lg: 'text-lg font-bold px-5 py-3 rounded-xl gap-2.5',
  };

  const cleanedClassName = className
    .replace(/\btext-xs\b/g, 'text-sm')
    .replace(/\btext-\[10px\]\b/g, 'text-sm')
    .replace(/\btext-\[11px\]\b/g, 'text-sm');

  return (
    <button
      type={type}
      disabled={disabled || isSpinning}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${cleanedClassName}`}
      {...props}
    >
      {isSpinning ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className={size === 'xs' || size === 'sm' ? 'w-4 h-4' : 'w-4.5 h-4.5'} />
      ) : null}
      {children}
    </button>
  );
}
