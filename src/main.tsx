import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './locales/index';
import './index.css';
import './App.css';

// Clean up legacy shared avatar key that leaked across users
try {
  localStorage.removeItem('fieldsync_user_avatar');
} catch (_e) {}

// Force update and activate latest build across all tabs
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const r of registrations) {
      r.update().catch(() => {});
    }
  });

  let hasRefreshed = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hasRefreshed) {
      hasRefreshed = true;
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);