import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './locales/index';
import './index.css';
import './App.css';

try {
  localStorage.removeItem('fieldsync_user_avatar');
} catch (_e) {}

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const r of registrations) {
      r.unregister();
    }
  });
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        if (!name.includes('google-fonts')) {
          caches.delete(name);
        }
      }
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
