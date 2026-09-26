import React, { useState, useEffect } from 'react';
import { syncQueue, checkRealInternet } from '../../services/database';

export const SyncStatus: React.FC = () => {
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

    checkNetwork();
    updatePending();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-complete', updatePending);
    window.addEventListener('sync-queue-updated', updatePending);

    const interval = setInterval(checkNetwork, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-complete', updatePending);
      window.removeEventListener('sync-queue-updated', updatePending);
      clearInterval(interval);
    };
  }, [isOnline]);

  if (pendingCount === 0 && isOnline) return null;

  return null;
};

export default SyncStatus;
