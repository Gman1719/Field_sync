import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { syncQueue } from '../../services/database';

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingDetails, setPendingDetails] = useState({});

  useEffect(() => {
    const updateStatus = () => {
      setIsOnline(navigator.onLine);
      const count = syncQueue.count();
      setPendingCount(count);
      
      const items = syncQueue.getAll();
      const details = {};
      items.forEach(item => {
        const labels = {
          'citizen': 'Citizens',
          'report': 'Reports',
          'leave_request': 'Leave Requests',
          'permission_request': 'Permission Requests',
          'attendance': 'Attendance',
          'task': 'Tasks',
          'leave_update': 'Leave Updates',
          'permission_update': 'Permission Updates',
          'supervisor_report': 'Supervisor Reports'
        };
        const label = labels[item.type] || item.type;
        details[label] = (details[label] || 0) + 1;
      });
      setPendingDetails(details);
    };

    updateStatus();
    
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    window.addEventListener('sync-complete', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      window.removeEventListener('sync-complete', updateStatus);
    };
  }, []);

  if (isOnline && pendingCount === 0) return null;

  const detailStrings = Object.entries(pendingDetails)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ');

  return (
    <aside aria-label="System status alert" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className={`px-4 py-2.5 rounded-xl shadow-lg border flex items-center gap-2.5 text-xs font-medium text-white ${
        isOnline ? 'bg-emerald-600 border-emerald-500' : 'bg-rose-600 border-rose-500'
      }`}>
        {isOnline ? (
          <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
        ) : (
          <WifiOff className="w-4 h-4 flex-shrink-0" />
        )}
        <span>
          {isOnline 
            ? `Syncing changes (${pendingCount} pending)` 
            : `Offline Mode — ${pendingCount} items queued`}
        </span>
        {pendingCount > 0 && detailStrings && (
          <span className="bg-white/20 px-2 py-0.5 rounded text-[11px] font-mono">
            {detailStrings}
          </span>
        )}
      </div>
    </aside>
  );
};

export default OfflineIndicator;