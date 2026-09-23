import React from 'react';
import { Clock, RefreshCw, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { SyncStatus } from '../../types/index.ts';

export interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  status?: SyncStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  status,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  if (status) {
    switch (status) {
      case 'PENDING':
        return (
          <span
            className={`inline-flex items-center gap-1 font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses} ${className}`}
          >
            <Clock className="w-3 h-3 text-amber-600" />
            <span>{children || 'Pending Sync'}</span>
          </span>
        );
      case 'SYNCING':
        return (
          <span
            className={`inline-flex items-center gap-1 font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses} ${className}`}
          >
            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
            <span>{children || 'Syncing...'}</span>
          </span>
        );
      case 'SYNCED':
        return (
          <span
            className={`inline-flex items-center gap-1 font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses} ${className}`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{children || 'Synced'}</span>
          </span>
        );
      case 'FAILED':
        return (
          <span
            className={`inline-flex items-center gap-1 font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses} ${className}`}
          >
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>{children || 'Sync Failed'}</span>
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span
            className={`inline-flex items-center gap-1 font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200 ${sizeClasses} ${className}`}
          >
            <AlertTriangle className="w-3 h-3 text-purple-600" />
            <span>{children || 'Needs Review'}</span>
          </span>
        );
    }
  }

  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variantStyles[variant]} ${sizeClasses} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
