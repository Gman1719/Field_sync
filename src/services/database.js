// services/database.js – FULL WITH VERIFICATION AND SUPERVISOR REPORTS SYNC
// FIX: Added verification to sync queue processing and fixed verification_history schema

import Dexie from 'dexie';
import { SAMPLE_USERS } from '../utils/constants';
import { uid, getToday } from '../utils/helpers';
import { API_URL } from '../config/api';

// ============================================================
// Create Dexie database with corrected schema
// ============================================================
const db = new Dexie('FieldSyncDB');

// Version 3 – with verification_history using string `id` as primary key
db.version(3).stores({
  users: 'id, employeeId, email, role, region, status, pin',
  reports: 'id, reportId, employeeId, region, reportDate, synced',
  attendance: 'id, employeeId, date, status, region, synced',
  citizens: 'id, nationalId, firstName, lastName, region, phone, synced',
  audit: 'id, userId, action, timestamp',
  supervisor_reports: 'id, supervisorId, officerId, reportDate, synced',
  screen_time: 'id, employeeId, date, trustScore',
  notifications: 'id, userId, read, timestamp',
  status: 'id, employeeId, status, lastActive',
  tasks: 'id, employeeId, status, deadline, priority, synced',
  leaves: 'id, employeeId, status, startDate, endDate, synced',
  alerts: 'id, targetEmployeeId, targetAll, read, timestamp',
  auth: 'id',
  permissions: 'id, employeeId, status, startDate, endDate, synced',
  gps_locations: 'id, employeeId, date, timestamp, synced, latitude, longitude',
  check_ins: 'id, employeeId, date, type, checkInId, synced, timestamp',
  // FIX: verification_history now uses string `id` as primary key and includes `synced`
  verification_history: 'id, officerId, timestamp, questionId, success, synced',
  kiosk_sessions: 'id, officerId, startTime, endTime, status, synced'
});

export { db };

// ============================================================
// OFFLINE SYNC QUEUE
// ============================================================
export const syncQueue = {
  pending: [],
  
  load: () => {
    try {
      const saved = localStorage.getItem('offlineSyncQueue');
      if (saved) {
        syncQueue.pending = JSON.parse(saved);
        console.log(`📥 Loaded ${syncQueue.pending.length} pending items from queue`);
      }
    } catch (e) {
      console.error('Error loading sync queue:', e);
      syncQueue.pending = [];
    }
  },
  
  save: () => {
    try {
      localStorage.setItem('offlineSyncQueue', JSON.stringify(syncQueue.pending));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sync-queue-updated'));
      }
    } catch (e) {
      console.error('Error saving sync queue:', e);
    }
  },
  
  add: (item) => {
    const exists = syncQueue.pending.some(q => q.id === item.id && q.type === item.type);
    if (exists) {
      console.log(`⚠️ Item ${item.id} already in queue`);
      return;
    }
    
    syncQueue.pending.push({
      ...item,
      queuedAt: new Date().toISOString(),
      attempts: 0,
      maxRetries: 5
    });
    syncQueue.save();
    console.log(`📥 Added to sync queue: ${item.type} - ${item.id} (Total: ${syncQueue.pending.length})`);
  },
  
  getAll: () => {
    return syncQueue.pending;
  },
  
  remove: (id) => {
    syncQueue.pending = syncQueue.pending.filter(item => item.id !== id);
    syncQueue.save();
    console.log(`✅ Removed from sync queue: ${id} (Remaining: ${syncQueue.pending.length})`);
  },
  
  clear: () => {
    syncQueue.pending = [];
    syncQueue.save();
    console.log('🗑️ Sync queue cleared');
  },
  
  count: () => {
    return syncQueue.pending.length;
  }
};

syncQueue.load();

// ============================================================
// NETWORK CHECK
// ============================================================

let _networkOnline = true;

const checkNetworkWithImage = () => {
  return new Promise((resolve) => {
    const img = new Image();
    let resolved = false;
    
    img.onload = () => {
      if (!resolved) {
        resolved = true;
        _networkOnline = true;
        resolve(true);
      }
    };
    
    img.onerror = () => {
      if (!resolved) {
        resolved = true;
        _networkOnline = false;
        resolve(false);
      }
    };
    
    img.src = 'https://www.google.com/favicon.ico?_=' + Date.now();
    
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        _networkOnline = false;
        resolve(false);
      }
    }, 3000);
  });
};

export const checkRealInternet = async () => {
  if (!navigator.onLine) {
    _networkOnline = false;
    return false;
  }
  
  const result = await checkNetworkWithImage();
  _networkOnline = result;
  return result;
};

export const isDevToolsOffline = () => {
  if (!navigator.onLine) {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }
    return false;
  }
  return false;
};

export const getNetworkStatus = () => {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  const isOnline = _networkOnline && navigator.onLine;
  
  if (!isOnline) {
    return {
      type: 'devtools-offline',
      label: !navigator.onLine ? 'Offline' : 'DevTools Offline',
      speed: 0,
      isSlow: false,
      rtt: 0,
      browserOnline: navigator.onLine,
      devtoolsOffline: true
    };
  }
  
  let networkType = 'unknown';
  let isSlow = false;
  let speed = 0;
  let rtt = 0;
  let label = 'Unknown';
  
  if (connection) {
    const types = {
      'slow-2g': { label: '2G', isSlow: true },
      '2g': { label: '2G', isSlow: true },
      '3g': { label: '3G', isSlow: true },
      '4g': { label: '4G', isSlow: false },
      '5g': { label: '5G', isSlow: false }
    };
    
    const effectiveType = connection.effectiveType || 'unknown';
    const info = types[effectiveType] || { label: 'Unknown', isSlow: false };
    
    networkType = effectiveType;
    label = info.label;
    isSlow = info.isSlow;
    speed = connection.downlink || 0;
    rtt = connection.rtt || 0;
  }
  
  return {
    type: networkType,
    label: label,
    speed: speed,
    isSlow: isSlow,
    rtt: rtt,
    browserOnline: true,
    devtoolsOffline: false
  };
};

export const isSlowConnection = () => {
  const info = getNetworkStatus();
  return info.isSlow || info.type === 'slow-2g' || info.type === '2g' || info.type === '3g';
};

export const isOnline = async () => {
  return await checkRealInternet();
};

// ============================================================
// CLEAR STUCK SYNC ITEMS (updated with verification_history)
// ============================================================
export const clearStuckSyncItems = async () => {
  try {
    console.log('🧹 Clearing stuck sync operations...');
    
    const storesToCheck = [
      'reports', 'attendance', 'citizens', 'tasks', 
      'leaves', 'permissions', 'supervisor_reports', 'verification_history'
    ];
    
    const stuckThreshold = Date.now() - 60000;
    let clearedCount = 0;
    
    for (const storeName of storesToCheck) {
      try {
        const store = db[storeName];
        if (!store) continue;
        
        const items = await store
          .where('synced')
          .equals('syncing')
          .toArray();
        
        for (const item of items) {
          if (!item.lastSyncAttempt || item.lastSyncAttempt < stuckThreshold) {
            await store.update(item.id, {
              synced: false,
              syncError: 'Stuck sync cleared automatically',
              lastSyncAttempt: Date.now()
            });
            clearedCount++;
            console.log(`✅ Cleared stuck sync for ${storeName} ${item.id}`);
          }
        }
      } catch (error) {
        console.error(`Error checking ${storeName}:`, error);
      }
    }
    
    const pending = syncQueue.getAll();
    let queueCleared = 0;
    
    for (const item of pending) {
      if (item.attempts >= item.maxRetries) {
        syncQueue.remove(item.id);
        queueCleared++;
        console.log(`✅ Removed stuck queue item: ${item.type} - ${item.id}`);
      }
    }
    
    console.log(`✅ Cleared ${clearedCount} stuck store items and ${queueCleared} stuck queue items`);
    
    return { clearedStore: clearedCount, clearedQueue: queueCleared };
    
  } catch (error) {
    console.error('Error clearing stuck sync items:', error);
    return { clearedStore: 0, clearedQueue: 0 };
  }
};

// ============================================================
// PROCESS SYNC QUEUE (REAL API CALLS)
// ============================================================
export const processSyncQueue = async (isOnline) => {
  if (!isOnline) {
    console.log('📡 Offline - Cannot process sync queue');
    return { synced: 0, failed: 0, pending: syncQueue.count() };
  }

  const pending = syncQueue.getAll();
  if (pending.length === 0) {
    console.log('✅ No pending items to sync');
    return { synced: 0, failed: 0, pending: 0 };
  }

  console.log(`📤 Processing ${pending.length} sync queue items...`);
  
  let synced = 0;
  let failed = 0;
  const MAX_RETRIES = 3;

  for (const item of pending) {
    try {
      // Store map – includes all types including 'verification'
      const storeMap = {
        'citizen': 'citizens',
        'report': 'reports',
        'attendance': 'attendance',
        'task': 'tasks',
        'leave_request': 'leaves',
        'leave': 'leaves',
        'leave_update': 'leaves',
        'permission_request': 'permissions',
        'permission': 'permissions',
        'permission_update': 'permissions',
        'supervisor_report': 'supervisor_reports',
        'user': 'users',
        'user_status_update': 'users',
        'user_delete': 'users',
        'alert': 'alerts',
        'alert_read': 'alerts',
        'screen_time': 'screen_time',
        'screen_time_update': 'screen_time',
        'audit': 'audit',
        'verification': 'verification_history',   // <-- verification sync
        'gps_location': 'gps_locations',
        'check_in': 'check_ins',
        'check_out': 'check_ins',
        'kiosk_session': 'kiosk_sessions'
      };
      
      const store = storeMap[item.type];
      if (store && db[store]) {
        // Mark as syncing
        await db[store].update(item.id, { 
          synced: 'syncing',
          lastSyncAttempt: Date.now()
        });
        
        console.log(`🔄 Syncing to PostgreSQL: ${item.type} - ${item.id}`);
        
        // Ensure id is explicitly in the data payload
        const syncData = {
          ...(item.data || {}),
          id: item.data?.id || item.id
        };

        // Send to /api/sync
        const response = await fetch(`${API_URL}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: item.type, data: syncData })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (!result || result.success !== true) {
            throw new Error(result?.error || 'Server rejected sync operation');
          }
          
          // Mark as fully synced ONLY after server confirms
          await db[store].update(item.id, { 
            synced: true,
            syncError: null,
            syncedAt: new Date().toISOString(),
            serverId: result.data?.id || `server-${Date.now()}`
          });

          // If verification, also update localStorage to keep sync
          if (item.type === 'verification' && typeof window !== 'undefined') {
            const officerId = item.data.officerId;
            if (officerId) {
              const saved = localStorage.getItem(`verification_${officerId}`);
              if (saved) {
                try {
                  const parsed = JSON.parse(saved);
                  if (parsed.history) {
                    parsed.history = parsed.history.map(h =>
                      h.id === item.id ? { ...h, synced: true } : h
                    );
                    localStorage.setItem(`verification_${officerId}`, JSON.stringify(parsed));
                  }
                } catch (e) {
                  console.warn('Could not update localStorage verification history', e);
                }
              }
            }
          }
          
          syncQueue.remove(item.id);
          synced++;
          console.log(`✅ Synced to PostgreSQL: ${item.type} - ${item.id}`);
        } else {
          const error = await response.json();
          throw new Error(error.error || `API returned ${response.status}`);
        }
        
      } else {
        // If store not found, just remove from queue to avoid infinite loop
        syncQueue.remove(item.id);
        synced++;
      }
    } catch (error) {
      console.error(`❌ Failed to sync: ${item.type} - ${item.id}`, error.message);
      item.attempts = (item.attempts || 0) + 1;
      
      // Update the item in IndexedDB to reflect the failure
      const storeMap = {
        'citizen': 'citizens',
        'report': 'reports',
        'attendance': 'attendance',
        'task': 'tasks',
        'leave_request': 'leaves',
        'leave': 'leaves',
        'leave_update': 'leaves',
        'permission_request': 'permissions',
        'permission': 'permissions',
        'permission_update': 'permissions',
        'supervisor_report': 'supervisor_reports',
        'user': 'users',
        'user_status_update': 'users',
        'user_delete': 'users',
        'alert': 'alerts',
        'alert_read': 'alerts',
        'screen_time': 'screen_time',
        'screen_time_update': 'screen_time',
        'audit': 'audit',
        'verification': 'verification_history',
        'gps_location': 'gps_locations',
        'check_in': 'check_ins',
        'check_out': 'check_ins',
        'kiosk_session': 'kiosk_sessions'
      };
      
      const store = storeMap[item.type];
      if (store && db[store]) {
        await db[store].update(item.id, {
          synced: false,
          syncError: error.message,
          lastSyncAttempt: Date.now()
        });
      }
      
      if (item.attempts > MAX_RETRIES) {
        console.warn(`⚠️ Max attempts (${MAX_RETRIES}) reached for ${item.id}, removing from queue`);
        syncQueue.remove(item.id);
        failed++;
      } else {
        // Update the item in the queue for retry
        const index = syncQueue.pending.findIndex(q => q.id === item.id);
        if (index !== -1) {
          syncQueue.pending[index] = item;
          syncQueue.save();
        }
        failed++;
      }
    }
  }

  syncQueue.save();
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('sync-complete'));
  }
  
  return {
    synced,
    failed,
    pending: syncQueue.count()
  };
};

// ============================================================
// SYNC ENGINE
// ============================================================
export const syncPendingData = async (isOnline) => {
  if (!isOnline) {
    console.log('📡 Offline - Sync paused');
    return { synced: 0, failed: 0, pending: syncQueue.count() };
  }
  
  return await processSyncQueue(isOnline);
};

// ============================================================
// AUTO-SYNC
// ============================================================
if (typeof window !== 'undefined') {
  let isSyncing = false;
  
  const checkAndSync = async () => {
    const online = await checkRealInternet();
    _networkOnline = online;
    
    if (online && !isSyncing) {
      const count = syncQueue.count();
      if (count > 0) {
        console.log(`🔄 Auto-syncing ${count} items to PostgreSQL...`);
        isSyncing = true;
        try {
          await processSyncQueue(true);
        } catch (error) {
          console.error('Sync error:', error);
        } finally {
          isSyncing = false;
        }
      }
    }
  };

  window.addEventListener('online', () => {
    console.log('🔄 Browser online event');
    setTimeout(checkAndSync, 1000);
  });

  window.addEventListener('offline', () => {
    console.log('🔴 Browser offline event');
    _networkOnline = false;
  });

  const interval = setInterval(checkAndSync, 2000);
  
  setTimeout(checkAndSync, 1000);
  
  window.addEventListener('force-sync', checkAndSync);
  
  setInterval(async () => {
    const online = await checkRealInternet();
    if (online) {
      await clearStuckSyncItems();
    }
  }, 30000);

  window.addEventListener('beforeunload', () => {
    if (interval) {
      clearInterval(interval);
    }
  });
}

// ============================================================
// PULL SCREEN TIME FROM SERVER
// ============================================================
export const pullScreenTimeFromServer = async (employeeId = null) => {
  const online = await checkRealInternet();
  if (!online) {
    console.log('📡 Offline – skipping screen time pull');
    return;
  }

  try {
    const url = employeeId
      ? `${API_URL}/screen-time/employee/${employeeId}`
      : `${API_URL}/screen-time`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} – ${response.statusText}`);
    }
    const serverRecords = await response.json();
    console.log(`📥 Pulled ${serverRecords.length} screen time records from server`);

    for (const record of serverRecords) {
      const localRecord = {
        id: record.id,
        employeeId: record.employee_id,
        employeeName: record.employee_name,
        date: record.date,
        loginTime: record.login_time,
        logoutTime: record.logout_time,
        totalScreenTime: record.total_screen_time,
        screenTimeLimit: record.screen_time_limit,
        trustScore: record.trust_score,
        isLoggedIn: record.is_logged_in,
        verified: record.verified,
        verifiedBy: record.verified_by,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        synced: true,
      };

      const existing = await db.screen_time.get(record.id);
      if (!existing || new Date(existing.updatedAt) < new Date(localRecord.updatedAt)) {
        await db.screen_time.put(localRecord);
        console.log(`🔄 Updated screen time record for ${localRecord.employeeName}`);
      }
    }
    console.log('✅ Screen time pull completed');
  } catch (error) {
    console.error('❌ Pull screen time failed:', error);
  }
};

// ============================================================
// PULL AUDIT LOGS FROM SERVER
// ============================================================
export const pullAuditLogsFromServer = async () => {
  const online = await checkRealInternet();
  if (!online) {
    console.log('📡 Offline – skipping audit pull');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/audit`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} – ${response.statusText}`);
    }
    const serverLogs = await response.json();
    console.log(`📥 Pulled ${serverLogs.length} audit logs from server`);

    for (const log of serverLogs) {
      const localLog = {
        id: log.id,
        userId: log.user_id,
        userName: log.user_name,
        action: log.action,
        details: log.details,
        timestamp: log.timestamp,
        ip: log.ip,
      };
      const existing = await db.audit.get(log.id);
      if (!existing) {
        await db.audit.add(localLog);
        console.log(`🔄 Added audit log: ${log.action} by ${log.user_name}`);
      }
    }
    console.log('✅ Audit pull completed');
  } catch (error) {
    console.error('❌ Pull audit logs failed:', error);
  }
};

// ============================================================
// PULL ALERTS FROM SERVER
// ============================================================
export const pullAlertsFromServer = async () => {
  const online = await checkRealInternet();
  if (!online) {
    console.log('📡 Offline – skipping alerts pull');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/alerts`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} – ${response.statusText}`);
    }
    const serverAlerts = await response.json();
    console.log(`📥 Pulled ${serverAlerts.length} alerts from server`);

    for (const alert of serverAlerts) {
      const localAlert = {
        id: alert.id,
        title: alert.title,
        message: alert.message,
        priority: alert.priority,
        type: alert.type,
        timestamp: alert.timestamp,
        read: alert.read,
        targetAll: alert.target_all,
        targetEmployeeId: alert.target_employee_id,
        sentBy: alert.sent_by,
        sentByName: alert.sent_by_name,
        synced: true
      };
      const existing = await db.alerts.get(alert.id);
      if (!existing || new Date(existing.timestamp) < new Date(alert.timestamp)) {
        await db.alerts.put(localAlert);
        console.log(`🔄 Updated alert: ${alert.title}`);
      }
    }
    console.log('✅ Alerts pull completed');
  } catch (error) {
    console.error('❌ Pull alerts failed:', error);
  }
};

// ============================================================
// PULL VERIFICATION FROM SERVER (updated to use string ID)
// ============================================================
export const pullVerificationFromServer = async () => {
  const online = await checkRealInternet();
  if (!online) {
    console.log('📡 Offline – skipping verification pull');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/verification`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} – ${response.statusText}`);
    }
    const serverRecords = await response.json();
    console.log(`📥 Pulled ${serverRecords.length} verification records from server`);

    for (const record of serverRecords) {
      const localRecord = {
        id: record.id,                      // string ID from server
        officerId: record.officer_id,
        officerName: record.officer_name,
        question: record.question,
        answer: record.answer,
        success: record.success,
        score: record.score,
        responseTime: record.response_time,
        timestamp: record.timestamp,
        message: record.message,
        penalties: record.penalties || [],
        synced: true
      };
      const existing = await db.verification_history.get(record.id);
      if (!existing || new Date(existing.timestamp) < new Date(record.timestamp)) {
        await db.verification_history.put(localRecord);
        console.log(`🔄 Added/updated verification record for ${record.officer_name}`);
      }
    }
    console.log('✅ Verification pull completed');
  } catch (error) {
    console.error('❌ Pull verification failed:', error);
  }
};

// ============================================================
// PULL SUPERVISOR REPORTS FROM SERVER
// ============================================================
export const pullSupervisorReportsFromServer = async () => {
  const online = await checkRealInternet();
  if (!online) {
    console.log('📡 Offline – skipping supervisor reports pull');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/supervisor-reports`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} – ${response.statusText}`);
    }
    const serverReports = await response.json();
    console.log(`📥 Pulled ${serverReports.length} supervisor reports from server`);

    for (const report of serverReports) {
      const localReport = {
        id: report.id,
        supervisorId: report.supervisor_id,
        supervisorName: report.supervisor_name,
        officerId: report.officer_id,
        officerName: report.officer_name,
        officerRegion: report.officer_region,
        reportDate: report.report_date,
        performance: report.performance,
        attendance: report.attendance,
        quality: report.quality,
        punctuality: report.punctuality,
        teamwork: report.teamwork,
        communication: report.communication,
        comments: report.comments,
        recommendations: report.recommendations,
        overallRating: report.overall_rating,
        status: report.status,
        submittedAt: report.submitted_at,
        region: report.region,
        type: report.type,
        synced: true
      };
      const existing = await db.supervisor_reports.get(report.id);
      if (!existing || new Date(existing.submittedAt) < new Date(report.submitted_at)) {
        await db.supervisor_reports.put(localReport);
        console.log(`🔄 Updated supervisor report for ${report.supervisor_name}`);
      }
    }
    console.log('✅ Supervisor reports pull completed');
  } catch (error) {
    console.error('❌ Pull supervisor reports failed:', error);
  }
};

// ============================================================
// INITIALIZE DATA (unchanged, but ensures verification_history has synced)
// ============================================================
export const initializeAllData = async () => {
  try {
    const userCount = await db.users.count();
    if (userCount > 0) {
      console.log('✅ Data already exists, skipping initialization');
      return;
    }

    console.log('📦 Initializing data...');
    const today = getToday();

    const usersWithPin = SAMPLE_USERS.map(u => ({
      ...u,
      pin: u.role === 'field_officer' ? '1234' : null
    }));

    await db.users.bulkAdd(usersWithPin);

    const fieldOfficers = usersWithPin.filter(u => u.role === 'field_officer');
    
    const attendance = fieldOfficers.map(o => ({
      id: uid(),
      employeeId: o.employeeId,
      employeeName: o.name,
      date: today,
      status: 'present',
      checkIn: '08:00',
      checkOut: '17:00',
      workHours: 8,
      region: o.region,
      supervisorId: o.supervisorId,
      notes: '',
      approved: true,
      updatedBy: 'system',
      overtime: 0,
      submittedToManager: true,
      synced: true
    }));
    await db.attendance.bulkAdd(attendance);

    const officers = usersWithPin.filter(u => u.role === 'field_officer' || u.role === 'supervisor');
    const status = officers.map(o => ({
      id: uid(),
      userId: o.id,
      employeeId: o.employeeId,
      employeeName: o.name,
      status: 'online',
      lastActive: new Date().toISOString(),
      currentTask: '',
      productivityScore: Math.floor(70 + Math.random() * 30),
      tasksCompleted: Math.floor(Math.random() * 5),
      tasksInProgress: Math.floor(Math.random() * 3),
      efficiency: Math.floor(65 + Math.random() * 35)
    }));
    await db.status.bulkAdd(status);

    const screenTime = fieldOfficers.map(o => ({
      id: uid(),
      employeeId: o.employeeId,
      employeeName: o.name,
      date: today,
      loginTime: '08:00',
      logoutTime: '17:00',
      activeHours: 8,
      idleTime: 0,
      screenTime: 8,
      trustScore: Math.floor(70 + Math.random() * 30),
      supervisorId: o.supervisorId,
      verified: true,
      notes: '',
      verifiedBy: 'system',
      screenTimeLimit: 8,
      screenTimeWarnings: 0,
      screenTimeExceeded: false,
      isLoggedIn: false,
      sessionStart: null,
      sessionEnd: null,
      totalScreenTime: 28800,
      synced: true
    }));
    await db.screen_time.bulkAdd(screenTime);

    const notifications = usersWithPin.map(u => ({
      id: uid(),
      userId: u.id,
      title: '👋 Welcome!',
      message: `Welcome to FieldSync ${u.name}!`,
      type: 'success',
      read: false,
      timestamp: new Date().toISOString(),
      link: '/dashboard'
    }));
    await db.notifications.bulkAdd(notifications);

    const leaves = [
      { id: uid(), employeeId: 'FO001', employeeName: 'Meseret Alemu', startDate: '2024-02-15', endDate: '2024-02-17', reason: 'Family event', type: 'annual', status: 'pending', createdAt: new Date().toISOString(), approvedBy: null, approvedAt: null, synced: true },
      { id: uid(), employeeId: 'FO004', employeeName: 'Meles Zenebe', startDate: '2024-02-20', endDate: '2024-02-22', reason: 'Sick', type: 'sick', status: 'pending', createdAt: new Date().toISOString(), approvedBy: null, approvedAt: null, synced: true }
    ];
    await db.leaves.bulkAdd(leaves);

    const reports = [
      { id: uid(), reportId: 'RPT-001', reportDate: today, region: 'North', siteName: 'Site A', employeeId: 'FO001', employeeName: 'Meseret Alemu', supervisorId: 's1', registrations: 15, registrationEfficiency: 75, operationalStatus: 'Active', attendance: 'present', workHours: 8, issues: 'None', comments: 'Good progress', challenges: 'Weather', activities: 'Registration', equipmentStatus: 'operational', materialsUsed: 'Forms', teamMembers: 'Team A', weatherConditions: 'Sunny', communityFeedback: 'Positive', submittedAt: new Date().toISOString(), synced: true, syncAttempts: 0, syncError: null, reviewed: true, reviewedBy: 'System' },
      { id: uid(), reportId: 'RPT-002', reportDate: today, region: 'South', siteName: 'Site B', employeeId: 'FO004', employeeName: 'Meles Zenebe', supervisorId: 's2', registrations: 10, registrationEfficiency: 50, operationalStatus: 'Active', attendance: 'present', workHours: 7, issues: 'None', comments: 'Good', challenges: 'None', activities: 'Registration', equipmentStatus: 'operational', materialsUsed: 'Forms', teamMembers: 'Team B', weatherConditions: 'Cloudy', communityFeedback: 'Good', submittedAt: new Date().toISOString(), synced: true, syncAttempts: 0, syncError: null, reviewed: true, reviewedBy: 'System' },
      { id: uid(), reportId: 'RPT-003', reportDate: today, region: 'East', siteName: 'Site C', employeeId: 'FO007', employeeName: 'Fikre Gebreegziabher', supervisorId: 's3', registrations: 8, registrationEfficiency: 40, operationalStatus: 'Active', attendance: 'present', workHours: 6, issues: 'None', comments: 'Good', challenges: 'None', activities: 'Registration', equipmentStatus: 'operational', materialsUsed: 'Forms', teamMembers: 'Team C', weatherConditions: 'Sunny', communityFeedback: 'Good', submittedAt: new Date().toISOString(), synced: true, syncAttempts: 0, syncError: null, reviewed: true, reviewedBy: 'System' }
    ];
    await db.reports.bulkAdd(reports);

    const citizens = [
      { id: uid(), nationalId: 'NID-001', firstName: 'Abebe', lastName: 'Kebede', dateOfBirth: '1990-01-01', gender: 'Male', phone: '+251-911-000001', email: 'abebe@test.com', address: 'Addis Ababa', region: 'North', district: 'District 1', village: 'Village 1', occupation: 'Teacher', maritalStatus: 'Married', registrationDate: new Date().toISOString(), registeredBy: 'FO001', registeredByName: 'Meseret Alemu', idType: 'National ID', idNumber: 'NID-001', biometrics: false, status: 'active', synced: true },
      { id: uid(), nationalId: 'NID-002', firstName: 'Sahle', lastName: 'Work', dateOfBirth: '1985-06-15', gender: 'Female', phone: '+251-911-000002', email: 'sahle@test.com', address: 'Addis Ababa', region: 'South', district: 'District 2', village: 'Village 2', occupation: 'Nurse', maritalStatus: 'Single', registrationDate: new Date().toISOString(), registeredBy: 'FO004', registeredByName: 'Meles Zenebe', idType: 'National ID', idNumber: 'NID-002', biometrics: false, status: 'active', synced: true },
      { id: uid(), nationalId: 'NID-003', firstName: 'Kidan', lastName: 'Tesema', dateOfBirth: '1992-03-20', gender: 'Male', phone: '+251-911-000003', email: 'kidan@test.com', address: 'Addis Ababa', region: 'East', district: 'District 3', village: 'Village 3', occupation: 'Engineer', maritalStatus: 'Single', registrationDate: new Date().toISOString(), registeredBy: 'FO007', registeredByName: 'Fikre Gebreegziabher', idType: 'National ID', idNumber: 'NID-003', biometrics: false, status: 'active', synced: true }
    ];
    await db.citizens.bulkAdd(citizens);

    const supervisorReports = [{
      id: uid(),
      supervisorId: 's1',
      supervisorName: 'Birhan Gebreegziabher',
      officerId: 'o1',
      officerName: 'Meseret Alemu',
      officerRegion: 'North',
      reportDate: today,
      performance: 'good',
      attendance: 'good',
      quality: 'good',
      punctuality: 'good',
      teamwork: 'good',
      communication: 'good',
      comments: 'Good performance',
      recommendations: 'Keep it up',
      overallRating: 4,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      region: 'North',
      type: 'officer_report',
      synced: true
    }];
    await db.supervisor_reports.bulkAdd(supervisorReports);

    const audit = [
      { id: uid(), userId: 'MGR001', userName: 'Abebe Bekele', action: 'LOGIN', details: 'User logged in', timestamp: new Date().toISOString(), ip: '127.0.0.1' },
      { id: uid(), userId: 'FO001', userName: 'Meseret Alemu', action: 'SUBMIT_REPORT', details: 'Report submitted for Site A', timestamp: new Date().toISOString(), ip: '127.0.0.1' }
    ];
    await db.audit.bulkAdd(audit);

    const alerts = [{
      id: uid(),
      title: 'Emergency Meeting',
      message: 'All officers must attend emergency meeting at 2pm today',
      priority: 'high',
      type: 'emergency',
      timestamp: new Date().toISOString(),
      read: false,
      targetAll: true,
      targetEmployeeId: null,
      sentBy: 'MGR001',
      sentByName: 'Abebe Bekele'
    }];
    await db.alerts.bulkAdd(alerts);

    const permissions = [{
      id: uid(),
      employeeId: 'FO001',
      employeeName: 'Meseret Alemu',
      permissionType: 'Work Permission',
      startDate: '2024-02-25',
      endDate: '2024-02-25',
      reason: 'Medical appointment',
      status: 'pending',
      requestedAt: new Date().toISOString(),
      approvedBy: null,
      approvedAt: null,
      synced: true
    }];
    await db.permissions.bulkAdd(permissions);

    const gpsLocations = fieldOfficers.map(o => ({
      id: uid(),
      employeeId: o.employeeId,
      employeeName: o.name,
      latitude: 9.03 + (Math.random() - 0.5) * 0.5,
      longitude: 38.74 + (Math.random() - 0.5) * 0.5,
      accuracy: 10 + Math.random() * 20,
      timestamp: new Date().toISOString(),
      date: today,
      location: 'Work Site',
      synced: true
    }));
    await db.gps_locations.bulkAdd(gpsLocations);

    const checkIns = fieldOfficers.map(o => ({
      id: uid(),
      employeeId: o.employeeId,
      employeeName: o.name,
      type: 'check_in',
      location: 'Main Office',
      latitude: 9.03 + (Math.random() - 0.5) * 0.5,
      longitude: 38.74 + (Math.random() - 0.5) * 0.5,
      accuracy: 10 + Math.random() * 20,
      timestamp: new Date().toISOString(),
      date: today,
      synced: true
    }));
    await db.check_ins.bulkAdd(checkIns);

    // Initialize verification_history with synced records
    const verificationHistory = fieldOfficers.map(o => ({
      id: uid(),
      officerId: o.id,
      officerName: o.name,
      question: 'What is your current location?',
      answer: 'Field',
      timestamp: new Date().toISOString(),
      responseTime: Math.floor(5 + Math.random() * 15),
      score: Math.floor(70 + Math.random() * 30),
      penalties: [],
      questionId: 'q1',
      success: true,
      message: '✅ Verification passed!',
      synced: true
    }));
    await db.verification_history.bulkAdd(verificationHistory);

    console.log('✅ Data initialization complete!');
    console.log('📧 Login with your credentials:');
    console.log('   Manager: abebe@fieldsync.com / manager123');
    console.log('   Supervisor: birhan@fieldsync.com / super123');
    console.log('   Officer: meseret@fieldsync.com / officer123');
    console.log('   Officer PIN: 1234');
  } catch (error) {
    console.error('Error initializing data:', error);
  }
};