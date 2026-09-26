import React, { useState, useEffect } from 'react';
import { getNetworkStatus, isDevToolsOffline } from '../../services/database';

export const NetworkStatus: React.FC = () => {
  const [networkInfo, setNetworkInfo] = useState({
    type: 'unknown',
    label: 'Unknown',
    speed: 0,
    isSlow: false,
    rtt: 0,
    browserOnline: true,
    isDevToolsOffline: false,
  });

  useEffect(() => {
    const updateNetworkInfo = () => {
      const devToolsOffline = isDevToolsOffline();
      const info = getNetworkStatus();

      setNetworkInfo({
        ...info,
        isDevToolsOffline: devToolsOffline,
        browserOnline: navigator.onLine && !devToolsOffline,
      });
    };

    updateNetworkInfo();

    const handleOnline = () => {
      updateNetworkInfo();
    };

    const handleOffline = () => {
      updateNetworkInfo();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection;
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    const devToolsInterval = setInterval(() => {
      const devToolsOffline = isDevToolsOffline();
      if (devToolsOffline !== networkInfo.isDevToolsOffline) {
        updateNetworkInfo();
      }
    }, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
      clearInterval(devToolsInterval);
    };
  }, [networkInfo.isDevToolsOffline]);

  if (networkInfo.isDevToolsOffline) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/60 border border-red-500 text-xs font-medium text-red-600 dark:text-red-400">
        <span>🔴</span>
        <span>DevTools Offline</span>
      </div>
    );
  }

  if (!networkInfo.browserOnline) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/60 border border-red-500 text-xs font-medium text-red-600 dark:text-red-400">
        <span>🌐</span>
        <span>Offline</span>
      </div>
    );
  }

  if (networkInfo.type === 'unknown') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span>📡</span>
        <span>Online</span>
      </div>
    );
  }

  let colorClass = 'text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700';
  let emoji = '📶';
  let label = networkInfo.label;

  if (networkInfo.type === 'slow-2g' || networkInfo.type === '2g') {
    colorClass = 'text-rose-600 dark:text-rose-400 border-rose-500 bg-rose-50 dark:bg-rose-950/40';
    emoji = '🐢';
    label = `${networkInfo.label} (Very Slow)`;
  } else if (networkInfo.type === '3g') {
    colorClass = 'text-amber-600 dark:text-amber-400 border-amber-500 bg-amber-50 dark:bg-amber-950/40';
    emoji = '📶';
    label = `${networkInfo.label} (Slow)`;
  } else if (networkInfo.type === '4g' || networkInfo.type === '5g') {
    colorClass = 'text-emerald-600 dark:text-emerald-400 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40';
    emoji = '📶';
    label = `${networkInfo.label} (Fast)`;
  }

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${colorClass}`}>
      <span>{emoji}</span>
      <span>
        {label}
        {networkInfo.speed > 0 && ` (${networkInfo.speed.toFixed(1)} Mbps)`}
      </span>
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
        Live
      </span>
    </div>
  );
};

export default NetworkStatus;
