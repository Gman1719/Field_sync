// utils/helpers.js - Complete fixed version

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const generateTempPassword = () => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'; // no confusing I/l/O/0
  const numbers = '23456789';
  let password = '';
  for (let i = 0; i < 4; i++) password += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 4; i++) password += numbers[Math.floor(Math.random() * numbers.length)];
  return password.split('').sort(() => Math.random() - 0.5).join(''); // shuffle
};

export const getToday = () => new Date().toISOString().slice(0, 10);

export const getCurrentTime = () => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

export const formatTime = (seconds) => {
  // FIX: Guard against ALL invalid values
  if (seconds === undefined || seconds === null) return '00:00:00';
  if (typeof seconds === 'string') seconds = parseInt(seconds);
  if (typeof seconds !== 'number' || isNaN(seconds) || !isFinite(seconds)) return '00:00:00';
  if (seconds < 0) return '00:00:00';
  if (seconds > 86400) seconds = 86400; // Cap at 24 hours max display
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const fakeSyncApi = (report) => {
  return new Promise((resolve, reject) => {
    if (!navigator.onLine) {
      reject(new Error('You are offline. Please connect to the internet.'));
      return;
    }
    
    const delay = 500 + Math.random() * 1000;
    setTimeout(() => {
      if (Math.random() < 0.1) {
        reject(new Error('Network error - sync failed'));
      } else {
        resolve({ ...report, synced: true, syncDate: new Date().toISOString() });
      }
    }, delay);
  });
};

export const exportCSV = (data, filename) => {
  if (!data || data.length === 0) { 
    alert('No data to export'); 
    return; 
  }
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','), 
    ...data.map(row => headers.map(h => `"${row[h] != null ? row[h] : ''}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const convertTo12Hour = (timeStr) => {
  if (!timeStr || timeStr === 'N/A') return '--:--';
  try {
    // Handle ISO date strings
    if (timeStr.includes('T')) {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return '--:--';
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${h12}:${String(minutes).padStart(2, '0')} ${ampm}`;
    }
    
    // Handle time strings like "08:00" or "17:00:00"
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    
    const hours = parseInt(parts[0]);
    const minutes = parts[1];
    
    if (isNaN(hours)) return timeStr;
    
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  } catch (error) {
    return timeStr || '--:--';
  }
};