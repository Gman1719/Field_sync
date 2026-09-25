import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

  const variants = {
    primary: 'bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] text-white shadow-sm focus:ring-blue-500',
    secondary: 'bg-white hover:bg-slate-50 dark:bg-[#1E293B] dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#334155] shadow-sm focus:ring-slate-400',
    success: 'bg-[#16A34A] hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white shadow-sm focus:ring-green-600',
    danger: 'bg-[#DC2626] hover:bg-red-700 dark:bg-rose-600 dark:hover:bg-rose-700 text-white shadow-sm focus:ring-red-600',
    ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white focus:ring-slate-300',
    outline: 'bg-transparent border border-[#2563EB] text-[#2563EB] hover:bg-blue-50 dark:border-[#60A5FA] dark:text-[#60A5FA] dark:hover:bg-blue-950/40 focus:ring-blue-800'
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 rounded-md gap-1.5',
    md: 'text-sm px-4 py-2 rounded-lg gap-2',
    lg: 'text-base px-5 py-2.5 rounded-xl gap-2.5'
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      ) : null}
      {children}
    </button>
  );
}
