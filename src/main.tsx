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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);