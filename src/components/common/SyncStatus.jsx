// SyncStatus.js - Updated with real network check and clean styling

import React, { useState, useEffect } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { syncQueue } from '../../services/database';

// ===== REAL NETWORK CHECK =====
const checkRealInternet = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch('https://cdn.jsdelivr.net/npm/axios/package.json', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
};

const SyncStatus = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updatePending = () => {
      setPendingCount(syncQueue.count());
    };

    const checkNetwork = async () => {
      const online = await checkRealInternet();
      if (online !== isOnline) {
        setIsOnline(online);
      }
      updatePending();
    };

    const handleOnline = async () => {
      const online = await checkRealInternet();
      setIsOnline(online);
      updatePending();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updatePending();
    };

    // Initial check
    checkNetwork();
    updatePending();

    // Listen for events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-complete', updatePending);
    window.addEventListener('sync-queue-updated', updatePending);

    // Check network every 5 seconds
    const interval = setInterval(checkNetwork, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-complete', updatePending);
      window.removeEventListener('sync-queue-updated', updatePending);
      clearInterval(interval);
    };
  }, [isOnline]);

  // When header already shows badge, don't obstruct screen if online
  if (pendingCount === 0 && isOnline) return null;

  return null; // Header SyncBadge and OfflineIndicator provide full visibility
};

export default SyncStatus;