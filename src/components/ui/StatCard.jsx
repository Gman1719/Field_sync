import React from 'react';
import Card from './Card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({
  title,
  label,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
  variant = 'default',
  trend,
  trendLabel,
  active = false,
  onClick,
  className = ''
}) {
  const displayTitle = title || label || '';
  const isPositive = trend > 0;
  const isNegative = trend < 0;

  // Preset styles based on subtle accents (blue, green, amber, etc.)
  const variantStyles = {
    default: {
      border: 'border-[#E2E8F0] dark:border-[#334155]',
      iconColor: 'text-[#2563EB] dark:text-[#60A5FA]',
      iconBg: 'bg-blue-50 dark:bg-blue-950/80',
    },
    primary: {
      border: 'border-blue-200/80 dark:border-blue-900/50',
      iconColor: 'text-[#2563EB] dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-950/80',
    },
    info: {
      border: 'border-indigo-200/80 dark:border-indigo-900/50',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/80',
    },
    success: {
      border: 'border-emerald-200/80 dark:border-emerald-900/50',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/80',
    },
    warning: {
      border: 'border-amber-200/80 dark:border-amber-900/50',
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/80',
    },
    error: {
      border: 'border-rose-200/80 dark:border-rose-900/50',
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-50 dark:bg-rose-950/80',
    },
    neutral: {
      border: 'border-teal-200/80 dark:border-teal-900/50',
      iconColor: 'text-teal-600 dark:text-teal-400',
      iconBg: 'bg-teal-50 dark:bg-teal-950/80',
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.default;
  const finalIconColor = iconColor
    ? (iconColor.includes('dark:') ? iconColor : `${iconColor} dark:text-blue-300`)
    : currentVariant.iconColor;
  const finalIconBg = iconBg
    ? (iconBg.includes('dark:') ? iconBg : `${iconBg} dark:bg-slate-800`)
    : currentVariant.iconBg;

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl bg-white dark:bg-[#1E293B] border transition-all duration-150 select-none ${
        active
          ? 'ring-2 ring-[#2563EB] dark:ring-[#3B82F6] border-[#2563EB] dark:border-[#3B82F6] bg-blue-50/40 dark:bg-blue-950/30 shadow-sm'
          : `${currentVariant.border} ${onClick ? 'hover:border-blue-300 dark:hover:border-slate-500 hover:shadow-xs' : ''}`
      } ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''} ${className}`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[11px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider truncate">
          {displayTitle}
        </span>
        {active && (
          <span className="w-2 h-2 rounded-full bg-[#2563EB] dark:bg-[#3B82F6] shrink-0" />
        )}
        {Icon && (
          <div className={`w-7 h-7 rounded-lg ${finalIconBg} ${finalIconColor} flex items-center justify-center shrink-0`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-xl sm:text-2xl font-black tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
          {value}
        </span>
        {trend !== undefined && (
          <span
            className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              isPositive ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60' : isNegative ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/60' : 'text-slate-600 bg-slate-100 dark:bg-slate-800'
            }`}
          >
            {isPositive && <TrendingUp className="w-3 h-3 mr-0.5" />}
            {isNegative && <TrendingDown className="w-3 h-3 mr-0.5" />}
            {trend > 0 ? `+${trend}%` : `${trend}%`}
          </span>
        )}
      </div>

      {(subtitle || trendLabel) && (
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-[#94A3B8] flex items-center gap-1 truncate">
          {trendLabel && <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{trendLabel}</span>}
          <span>{subtitle}</span>
        </p>
      )}
    </div>
  );
}

