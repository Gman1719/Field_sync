// components/common/NetworkStatus.jsx

import React, { useState, useEffect } from 'react';
import { getNetworkStatus, isDevToolsOffline } from '../../services/database';

const NetworkStatus = () => {
  const [networkInfo, setNetworkInfo] = useState({
    type: 'unknown',
    label: 'Unknown',
    speed: 0,
    isSlow: false,
    rtt: 0,
    browserOnline: true,
    isDevToolsOffline: false
  });

  useEffect(() => {
    const updateNetworkInfo = () => {
      const devToolsOffline = isDevToolsOffline();
      const info = getNetworkStatus();
      
      // Priority: DevTools offline > Browser offline > Network type
      setNetworkInfo({
        ...info,
        isDevToolsOffline: devToolsOffline,
        browserOnline: navigator.onLine && !devToolsOffline
      });
    };

    updateNetworkInfo();

    const handleOnline = () => {
      console.log('🔄 Browser online event');
      updateNetworkInfo();
    };
    
    const handleOffline = () => {
      console.log('🔄 Browser offline event');
      updateNetworkInfo();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = navigator.connection || navigator.mozConnection;
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    // Check DevTools status periodically (every 2 seconds)
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

  // Priority 1: DevTools Offline (highest priority)
  if (networkInfo.isDevToolsOffline) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '20px',
        background: '#fee2e2',
        border: '1px solid #dc2626',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        <span>🔴</span>
        <span style={{ color: '#dc2626' }}>DevTools Offline</span>
      </div>
    );
  }

  // Priority 2: Browser Offline
  if (!networkInfo.browserOnline) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '20px',
        background: '#fee2e2',
        border: '1px solid #dc2626',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        <span>🌐</span>
        <span style={{ color: '#dc2626' }}>Offline</span>
      </div>
    );
  }

  // Priority 3: Network Type (only when online)
  if (networkInfo.type === 'unknown') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '20px',
        background: '#f3f4f6',
        border: '1px solid #d1d5db',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        <span>📡</span>
        <span style={{ color: '#6b7280' }}>Unknown</span>
      </div>
    );
  }

  let color = '#6b7280';
  let emoji = '📶';
  let label = networkInfo.label;

  if (networkInfo.type === 'slow-2g' || networkInfo.type === '2g') {
    color = '#dc2626';
    emoji = '🐢';
    label = `${networkInfo.label} (Very Slow)`;
  } else if (networkInfo.type === '3g') {
    color = '#f59e0b';
    emoji = '📶';
    label = `${networkInfo.label} (Slow)`;
  } else if (networkInfo.type === '4g') {
    color = '#22c55e';
    emoji = '📶';
    label = `${networkInfo.label} (Fast)`;
  } else if (networkInfo.type === '5g') {
    color = '#8b5cf6';
    emoji = '📶';
    label = `${networkInfo.label} (Very Fast)`;
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 12px',
      borderRadius: '20px',
      background: networkInfo.isSlow ? '#fef2f2' : '#f0fdf4',
      border: `1px solid ${color}`,
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'default'
    }}>
      <span>{emoji}</span>
      <span style={{ color: color }}>
        {label}
        {networkInfo.speed > 0 && ` (${networkInfo.speed.toFixed(1)} Mbps)`}
        {networkInfo.isSlow && ' ⚠️'}
        {networkInfo.rtt > 0 && ` ${networkInfo.rtt}ms`}
      </span>
      <span style={{
        fontSize: '10px',
        padding: '1px 6px',
        borderRadius: '4px',
        background: '#d1fae5',
        color: '#065f37'
      }}>
        Live
      </span>
    </div>
  );
};

export default NetworkStatus;