import React from 'react';
import Card from './Card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-[#1E3A8A]',
  iconBg = 'bg-blue-50',
  trend,
  trendLabel,
  onClick,
  className = ''
}) {
  const isPositive = trend > 0;
  const isNegative = trend < 0;

  return (
    <Card
      hover={!!onClick}
      onClick={onClick}
      className={`p-5 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{value}</span>
        {trend !== undefined && (
          <span
            className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              isPositive ? 'text-emerald-700 bg-emerald-50' : isNegative ? 'text-rose-700 bg-rose-50' : 'text-slate-600 bg-slate-100'
            }`}
          >
            {isPositive && <TrendingUp className="w-3 h-3 mr-0.5" />}
            {isNegative && <TrendingDown className="w-3 h-3 mr-0.5" />}
            {trend > 0 ? `+${trend}%` : `${trend}%`}
          </span>
        )}
      </div>

      {(subtitle || trendLabel) && (
        <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
          {trendLabel && <span className="font-medium text-slate-700">{trendLabel}</span>}
          {subtitle}
        </p>
      )}
    </Card>
  );
}
