import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export interface SyncBadgeProps {
  isOnline?: boolean;
  syncing?: boolean;
  pendingSync?: number;
  onClick?: () => void;
  className?: string;
}

export default function SyncBadge({
  isOnline = true,
  syncing = false,
  pendingSync = 0,
  onClick,
  className = '',
}: SyncBadgeProps) {
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-all duration-150 select-none ${
        onClick ? 'cursor-pointer hover:shadow-sm active:scale-95' : ''
      } ${
        !isOnline
          ? 'bg-amber-50 text-amber-800 border-amber-200'
          : syncing
          ? 'bg-blue-50 text-blue-800 border-blue-200'
          : pendingSync > 0
          ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
      } ${className}`}
      title={
        !isOnline
          ? 'Offline - changes will queue locally'
          : syncing
          ? 'Syncing data with server...'
          : pendingSync > 0
          ? `${pendingSync} item(s) pending sync`
          : 'Online and fully synced'
      }
    >
      {syncing ? (
        <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 animate-spin shrink-0" />
      ) : !isOnline ? (
        <WifiOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
      ) : (
        <Wifi className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
      )}

      <span className="hidden sm:inline">
        {syncing ? 'Syncing...' : !isOnline ? 'Offline' : 'Online'}
      </span>

      {pendingSync > 0 && (
        <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] sm:text-xs font-bold">
          {pendingSync}
        </span>
      )}
    </div>
  );
}
