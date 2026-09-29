import React, { type ElementType } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export type StatCardVariant = 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error' | 'neutral' | 'danger';

export interface StatCardProps {
  title?: string;
  label?: string;
  value: string | number;
  subtitle?: string;
  icon?: ElementType;
  iconColor?: string;
  iconBg?: string;
  color?: string;
  variant?: StatCardVariant;
  trend?: number;
  trendLabel?: string;
  badge?: string;
  badgeColor?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  [key: string]: any;
}

export default function StatCard({
  title,
  label,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
  color,
  variant = 'default',
  trend,
  trendLabel,
  active = false,
  onClick,
  className = '',
}: StatCardProps) {
  const displayTitle = title || label || '';
  const isPositive = typeof trend === 'number' && trend > 0;
  const isNegative = typeof trend === 'number' && trend < 0;

  const variantStyles: Record<StatCardVariant, { border: string; iconColor: string; iconBg: string }> = {
    default: {
      border: 'border-slate-200 dark:border-slate-700',
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-900/50',
    },
    primary: {
      border: 'border-blue-200/80 dark:border-blue-700/70',
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-900/50',
    },
    info: {
      border: 'border-indigo-200/80 dark:border-indigo-700/70',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-50 dark:bg-indigo-900/50',
    },
    success: {
      border: 'border-emerald-200/80 dark:border-emerald-700/70',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-900/50',
    },
    warning: {
      border: 'border-amber-200/80 dark:border-amber-700/70',
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-900/50',
    },
    error: {
      border: 'border-rose-200/80 dark:border-rose-700/70',
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-50 dark:bg-rose-900/50',
    },
    danger: {
      border: 'border-rose-200/80 dark:border-rose-700/70',
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-50 dark:bg-rose-900/50',
    },
    neutral: {
      border: 'border-teal-200/80 dark:border-teal-700/70',
      iconColor: 'text-teal-600 dark:text-teal-400',
      iconBg: 'bg-teal-50 dark:bg-teal-900/50',
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.default;
  const finalIconColor = iconColor || currentVariant.iconColor;
  const finalIconBg = iconBg || currentVariant.iconBg;

  return (
    <div
      onClick={onClick}
      className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border transition-all duration-200 select-none shadow-sm dark:shadow-md dark:shadow-slate-950/30 ${
        active
          ? 'ring-2 ring-blue-500 dark:ring-blue-500 border-blue-500 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/40'
          : `${currentVariant.border} ${
              onClick ? 'hover:border-blue-300 dark:hover:border-slate-600 hover:shadow-md dark:hover:shadow-slate-950/40' : ''
            }`
      } ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''} ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider truncate">
          {displayTitle}
        </span>
        {active && <span className="w-2.5 h-2.5 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0" />}
        {Icon && (
          <div className={`w-8 h-8 rounded-xl ${finalIconBg} ${finalIconColor} flex items-center justify-center shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {value}
        </span>
        {trend !== undefined && (
          <span
            className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
              isPositive
                ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50'
                : isNegative
                ? 'text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/50'
                : 'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-700/50'
            }`}
          >
            {isPositive && <TrendingUp className="w-3.5 h-3.5 mr-0.5" />}
            {isNegative && <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
            {trend > 0 ? `+${trend}%` : `${trend}%`}
          </span>
        )}
      </div>

      {(subtitle || trendLabel) && (
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
          {trendLabel && <span className="font-semibold text-slate-900 dark:text-white">{trendLabel}</span>}
          <span>{subtitle}</span>
        </p>
      )}
    </div>
  );
}
