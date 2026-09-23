import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function SyncBadge({
  isOnline = true,
  syncing = false,
  pendingSync = 0,
  onClick,
  className = ''
}) {
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 select-none ${
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
        <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
      ) : !isOnline ? (
        <WifiOff className="w-3.5 h-3.5 text-amber-600" />
      ) : (
        <Wifi className="w-3.5 h-3.5 text-emerald-600" />
      )}

      <span>
        {syncing ? (
          'Syncing...'
        ) : !isOnline ? (
          'Offline'
        ) : (
          'Online'
        )}
      </span>

      {pendingSync > 0 && (
        <span className="ml-0.5 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
          {pendingSync}
        </span>
      )}
    </div>
  );
}
