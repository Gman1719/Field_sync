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
    'inline-flex items-center justify-center font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white shadow-md shadow-blue-900/30 focus:ring-blue-500 font-bold border border-blue-400/30',
    secondary:
      'bg-white hover:bg-slate-50 dark:bg-[#221813] dark:hover:bg-[#2F211A] text-slate-800 dark:text-[#FFF8F0] border border-slate-200 dark:border-[#422E23] shadow-sm focus:ring-amber-500 font-semibold',
    success:
      'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-md shadow-emerald-900/30 focus:ring-green-600 font-bold border border-emerald-400/30',
    danger:
      'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-md shadow-rose-900/30 focus:ring-red-600 font-bold border border-rose-400/30',
    ghost:
      'bg-transparent hover:bg-slate-100 dark:hover:bg-[#251A15] text-slate-700 hover:text-slate-900 dark:text-[#E0D4CA] dark:hover:text-white focus:ring-amber-300 font-semibold',
    outline:
      'bg-transparent border-2 border-[#2563EB] text-[#2563EB] hover:bg-blue-50 dark:border-[#D4A373] dark:text-[#F3C293] dark:hover:bg-[#D4A373]/15 focus:ring-amber-800 font-bold',
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
