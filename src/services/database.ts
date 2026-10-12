import Dexie, { type Table } from 'dexie';
import { SAMPLE_USERS, type SampleUser } from '../utils/constants';
import { uid, getToday } from '../utils/helpers';
import { API_URL } from '../config/api';
import { offlineDb } from '../db/offlineDb';

export interface PendingSyncItem {
  id: string;
  type: string;
  data?: any;
  queuedAt?: string;
  attempts?: number;
  maxRetries?: number;
}

export interface NetworkStatus {
  type: string;
  label: string;
  speed: number;
  isSlow: boolean;
  rtt: number;
  browserOnline: boolean;
  devtoolsOffline: boolean;
}

export class FieldSyncLegacyDb extends Dexie {
  users!: Table<SampleUser, string>;
  reports!: Table<any, string>;
  attendance!: Table<any, string>;
  citizens!: Table<any, string>;
  audit!: Table<any, string>;
  supervisor_reports!: Table<any, string>;
  screen_time!: Table<any, string>;
  notifications!: Table<any, string>;
  status!: Table<any, string>;
  tasks!: Table<any, string>;
  leaves!: Table<any, string>;
  alerts!: Table<any, string>;
  auth!: Table<any, string>;
  permissions!: Table<any, string>;
  gps_locations!: Table<any, string>;
  check_ins!: Table<any, string>;
  verification_history!: Table<any, string>;
  kiosk_sessions!: Table<any, string>;

  constructor() {
    super('FieldSyncDB');
    this.version(3).stores({
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
      verification_history: 'id, officerId, timestamp, questionId, success, synced',
      kiosk_sessions: 'id, officerId, startTime, endTime, status, synced',
    });
  }
}

export const db = new FieldSyncLegacyDb();

export const syncQueue = {
  pending: [] as PendingSyncItem[],

  load: () => {
    try {
      const saved = localStorage.getItem('offlineSyncQueue');
      if (saved) {
        syncQueue.pending = JSON.parse(saved);
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

  add: (item: PendingSyncItem) => {
    const exists = syncQueue.pending.some((q) => q.id === item.id && q.type === item.type);
    if (exists) {
      return;
    }

    syncQueue.pending.push({
      ...item,
      queuedAt: new Date().toISOString(),
      attempts: 0,
      maxRetries: 5,
    });
    syncQueue.save();
  },

  getAll: () => {
    return syncQueue.pending;
  },

  remove: (id: string) => {
    syncQueue.pending = syncQueue.pending.filter((item) => item.id !== id);
    syncQueue.save();
  },

  clear: () => {
    syncQueue.pending = [];
    syncQueue.save();
  },

  count: () => {
    return syncQueue.pending.length;
  },
};

syncQueue.load();

let _networkOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

const checkNetworkWithImage = (): Promise<boolean> => {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (result: boolean) => {
      if (!resolved) {
        resolved = true;
        _networkOnline = result;
        resolve(result);
      }
    };

    const img = new Image();
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = 'https://www.google.com/favicon.ico?_=' + Date.now();

    if (typeof fetch === 'function') {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        fetch('https://www.google.com/favicon.ico?_=' + Date.now(), {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal,
        })
          .then(() => {
            clearTimeout(timeout);
            finish(true);
          })
          .catch(() => {
            clearTimeout(timeout);
          });
      } catch (_e) {}
    }

    setTimeout(() => {
      finish(false);
    }, 1500);
  });
};

export const checkRealInternet = async (): Promise<boolean> => {
  if (!navigator.onLine) {
    _networkOnline = false;
    return false;
  }

  const result = await checkNetworkWithImage();
  _networkOnline = result;
  return result;
};

export const isDevToolsOffline = (): boolean => {
  if (!navigator.onLine) {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }
    return false;
  }
  return false;
};

export const getNetworkStatus = (): NetworkStatus => {
  const nav = navigator as any;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

  const isOnlineFlag = _networkOnline && navigator.onLine;

  if (!isOnlineFlag) {
    return {
      type: 'devtools-offline',
      label: !navigator.onLine ? 'Offline' : 'DevTools Offline',
      speed: 0,
      isSlow: false,
      rtt: 0,
      browserOnline: navigator.onLine,
      devtoolsOffline: true,
    };
  }

  let networkType = 'unknown';
  let isSlow = false;
  let speed = 0;
  let rtt = 0;
  let label = 'Unknown';

  if (connection) {
    const types: Record<string, { label: string; isSlow: boolean }> = {
      'slow-2g': { label: '2G', isSlow: true },
      '2g': { label: '2G', isSlow: true },
      '3g': { label: '3G', isSlow: true },
      '4g': { label: '4G', isSlow: false },
      '5g': { label: '5G', isSlow: false },
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
    devtoolsOffline: false,
  };
};

export const isSlowConnection = (): boolean => {
  const info = getNetworkStatus();
  return info.isSlow || info.type === 'slow-2g' || info.type === '2g' || info.type === '3g';
};

export const isOnline = async (): Promise<boolean> => {
  return await checkRealInternet();
};

export const clearStuckSyncItems = async () => {
  try {
    const storesToCheck: Array<keyof FieldSyncLegacyDb> = [
      'reports',
      'attendance',
      'citizens',
      'tasks',
      'leaves',
      'permissions',
      'supervisor_reports',
      'verification_history',
    ];

    const stuckThreshold = Date.now() - 60000;
    let clearedCount = 0;

    for (const storeName of storesToCheck) {
      try {
        const store = db[storeName] as Table<any, string>;
        if (!store) continue;

        const items = await store.where('synced').equals('syncing' as any).toArray();

        for (const item of items) {
          if (!item.lastSyncAttempt || item.lastSyncAttempt < stuckThreshold) {
            await store.update(item.id, {
              synced: false,
              syncError: 'Stuck sync cleared automatically',
              lastSyncAttempt: Date.now(),
            });
            clearedCount++;
          }
        }
      } catch (error) {
        console.error(`Error checking ${storeName}:`, error);
      }
    }

    const pending = syncQueue.getAll();
    let queueCleared = 0;

    for (const item of pending) {
      if ((item.attempts || 0) >= (item.maxRetries || 5)) {
        syncQueue.remove(item.id);
        queueCleared++;
      }
    }

    return { clearedStore: clearedCount, clearedQueue: queueCleared };
  } catch (error) {
    console.error('Error clearing stuck sync items:', error);
    return { clearedStore: 0, clearedQueue: 0 };
  }
};

const storeMap: Record<string, keyof FieldSyncLegacyDb> = {
  citizen: 'citizens',
  report: 'reports',
  attendance: 'attendance',
  task: 'tasks',
  leave_request: 'leaves',
  leave: 'leaves',
  leave_update: 'leaves',
  permission_request: 'permissions',
  permission: 'permissions',
  permission_update: 'permissions',
  supervisor_report: 'supervisor_reports',
  user: 'users',
  user_status_update: 'users',
  user_delete: 'users',
  alert: 'alerts',
  alert_read: 'alerts',
  screen_time: 'screen_time',
  screen_time_update: 'screen_time',
  audit: 'audit',
  verification: 'verification_history',
  gps_location: 'gps_locations',
  check_in: 'check_ins',
  check_out: 'check_ins',
  kiosk_session: 'kiosk_sessions',
};

export const processSyncQueue = async (onlineFlag: boolean) => {
  if (!onlineFlag) {
    return { synced: 0, failed: 0, pending: syncQueue.count() };
  }

  const pending = syncQueue.getAll();
  if (pending.length === 0) {
    return { synced: 0, failed: 0, pending: 0 };
  }

  let synced = 0;
  let failed = 0;
  const MAX_RETRIES = 3;

  for (const item of pending) {
    try {
      const storeName = storeMap[item.type];
      const store = storeName ? (db[storeName] as Table<any, string>) : null;

      if (store) {
        await store.update(item.id, {
          synced: 'syncing',
          lastSyncAttempt: Date.now(),
        });

        const syncData = {
          ...(item.data || {}),
          id: item.data?.id || item.id,
        };

        const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('fieldsync_token') : null;
        const response = await fetch(`${API_URL}/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ type: item.type, data: syncData }),
        });

        if (response.ok) {
          const result = await response.json().catch(() => null);
          if (!result || result.success !== true) {
            throw new Error(result?.error || 'Server rejected sync operation');
          }

          await store.update(item.id, {
            synced: true,
            syncError: null,
            syncedAt: new Date().toISOString(),
            serverId: result.data?.id || `server-${Date.now()}`,
          });

          if (item.type === 'verification' && typeof window !== 'undefined') {
            const officerId = item.data?.officerId;
            if (officerId) {
              const saved = localStorage.getItem(`verification_${officerId}`);
              if (saved) {
                try {
                  const parsed = JSON.parse(saved);
                  if (parsed.history) {
                    parsed.history = parsed.history.map((h: any) =>
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
        } else {
          const error = await response.json().catch(() => ({}));
          throw new Error(error?.error || `API returned ${response.status}`);
        }
      } else {
        syncQueue.remove(item.id);
        synced++;
      }
    } catch (error: any) {
      console.error(`Sync failure for ${item.type} (${item.id}):`, error.message);
      item.attempts = (item.attempts || 0) + 1;

      const storeName = storeMap[item.type];
      const store = storeName ? (db[storeName] as Table<any, string>) : null;
      if (store) {
        await store.update(item.id, {
          synced: false,
          syncError: error.message,
          lastSyncAttempt: Date.now(),
        });
      }

      if (item.attempts! > MAX_RETRIES) {
        syncQueue.remove(item.id);
        failed++;
      } else {
        const index = syncQueue.pending.findIndex((q) => q.id === item.id);
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
    pending: syncQueue.count(),
  };
};

export const syncPendingData = async (onlineFlag: boolean) => {
  if (!onlineFlag) {
    return { synced: 0, failed: 0, pending: syncQueue.count() };
  }
  return await processSyncQueue(onlineFlag);
};

if (typeof window !== 'undefined') {
  let isSyncing = false;

  const checkAndSync = async () => {
    const online = await checkRealInternet();
    _networkOnline = online;

    if (online && !isSyncing) {
      const count = syncQueue.count();
      if (count > 0) {
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
    setTimeout(checkAndSync, 1000);
  });

  window.addEventListener('offline', () => {
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

export const pullScreenTimeFromServer = async (employeeId: string | null = null) => {
  const online = await checkRealInternet();
  if (!online) return;

  try {
    const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('fieldsync_token') : null;
    const url = employeeId
      ? `${API_URL}/screen-time/employee/${employeeId}`
      : `${API_URL}/screen-time`;
    const response = await fetch(url, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    if (!response.ok) return;

    const data = await response.json().catch(() => null);
    const serverRecords = Array.isArray(data) ? data : (data?.data || []);

    for (const record of serverRecords) {
      const localRecord = {
        id: record.id,
        employeeId: record.employee_id || record.employeeId,
        employeeName: record.employee_name || record.employeeName,
        date: record.date,
        loginTime: record.login_time || record.loginTime,
        logoutTime: record.logout_time || record.logoutTime,
        totalScreenTime: record.total_screen_time ?? record.totalScreenTime ?? 0,
        screenTimeLimit: record.screen_time_limit || record.screenTimeLimit || 28800,
        trustScore: record.trust_score ?? record.trustScore ?? 100,
        isLoggedIn: record.is_logged_in ?? record.isLoggedIn ?? false,
        verified: record.verified ?? true,
        verifiedBy: record.verified_by || record.verifiedBy || 'system',
        createdAt: record.created_at || record.createdAt || new Date().toISOString(),
        updatedAt: record.updated_at || record.updatedAt || new Date().toISOString(),
        synced: true,
      };

      const existing = await db.screen_time.get(record.id);
      if (!existing || new Date(existing.updatedAt) < new Date(localRecord.updatedAt)) {
        await db.screen_time.put(localRecord);
      }
    }
  } catch (_error) {
    // Network or parse fallback - silent to avoid console spam
  }
};

export const pullAuditLogsFromServer = async () => {
  const online = await checkRealInternet();
  if (!online) return;

  try {
    const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('fieldsync_token') : null;
    const response = await fetch(`${API_URL}/audit`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    if (!response.ok) return;

    const data = await response.json().catch(() => null);
    const serverLogs = Array.isArray(data) ? data : (data?.data || []);

    for (const log of serverLogs) {
      const localLog = {
        id: log.id,
        userId: log.user_id || log.actorId || 'system',
        userName: log.user_name || log.actorName || 'System',
        action: log.action || 'ACTION',
        details: log.details || log.summary || '',
        timestamp: log.timestamp || log.createdAt || new Date().toISOString(),
        ip: log.ip || log.ipAddress || '127.0.0.1',
      };
      const existing = await db.audit.get(log.id);
      if (!existing) {
        await db.audit.add(localLog);
      }
    }
  } catch (_error) {
    // Network or parse fallback - silent
  }
};

export const pullAlertsFromServer = async () => {
  const online = await checkRealInternet();
  if (!online) return;

  try {
    const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('fieldsync_token') : null;
    const response = await fetch(`${API_URL}/alerts`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    if (!response.ok) return;

    const data = await response.json().catch(() => null);
    const serverAlerts = Array.isArray(data) ? data : (data?.data || []);

    for (const alert of serverAlerts) {
      const localAlert = {
        id: alert.id,
        title: alert.title || 'Notice',
        message: alert.message || '',
        priority: alert.priority || 'NORMAL',
        type: alert.type || 'system',
        timestamp: alert.timestamp || alert.createdAt || new Date().toISOString(),
        read: alert.read ?? alert.isRead ?? false,
        targetAll: alert.target_all ?? alert.targetAll ?? true,
        targetEmployeeId: alert.target_employee_id || alert.targetEmployeeId || null,
        sentBy: alert.sent_by || alert.sentBy || 'system',
        sentByName: alert.sent_by_name || alert.sentByName || 'System',
        synced: true,
      };
      const existing = await db.alerts.get(alert.id);
      if (!existing || new Date(existing.timestamp) < new Date(localAlert.timestamp)) {
        await db.alerts.put(localAlert);
      }
    }
  } catch (_error) {
    // Network or parse fallback - silent
  }
};

export const pullVerificationFromServer = async () => {
  const online = await checkRealInternet();
  if (!online) return;

  try {
    const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('fieldsync_token') : null;
    const response = await fetch(`${API_URL}/verification`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    if (!response.ok) return;

    const data = await response.json().catch(() => null);
    const serverRecords = Array.isArray(data) ? data : (data?.data || []);

    for (const record of serverRecords) {
      const localRecord = {
        id: record.id,
        officerId: record.officer_id || record.officerId,
        officerName: record.officer_name || record.officerName,
        question: record.question || 'Work Verification',
        answer: record.answer || 'Confirmed',
        success: record.success ?? true,
        score: record.score ?? 100,
        responseTime: record.response_time ?? record.responseTime ?? 10,
        timestamp: record.timestamp || new Date().toISOString(),
        message: record.message || '',
        penalties: record.penalties || [],
        synced: true,
      };
      const existing = await db.verification_history.get(record.id);
      if (!existing || new Date(existing.timestamp) < new Date(localRecord.timestamp)) {
        await db.verification_history.put(localRecord);
      }
    }
  } catch (_error) {
    // Network or parse fallback - silent
  }
};

export const pullSupervisorReportsFromServer = async () => {
  const online = await checkRealInternet();
  if (!online) return;

  try {
    const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('fieldsync_token') : null;
    const response = await fetch(`${API_URL}/supervisor-reports`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    if (!response.ok) return;

    const data = await response.json().catch(() => null);
    const serverReports = Array.isArray(data) ? data : (data?.data || []);

    for (const report of serverReports) {
      const localReport = {
        id: report.id,
        supervisorId: report.supervisor_id || report.supervisorId,
        supervisorName: report.supervisor_name || report.supervisorName,
        officerId: report.officer_id || report.officerId,
        officerName: report.officer_name || report.officerName,
        officerRegion: report.officer_region || report.officerRegion || 'Addis Ababa',
        reportDate: report.report_date || report.reportDate,
        performance: report.performance || 85,
        attendance: report.attendance || 90,
        quality: report.quality || 88,
        punctuality: report.punctuality || 92,
        teamwork: report.teamwork || 87,
        communication: report.communication || 89,
        comments: report.comments || '',
        recommendations: report.recommendations || '',
        overallRating: report.overall_rating || report.overallRating || 4.5,
        status: report.status || 'Submitted',
        submittedAt: report.submitted_at || report.submittedAt || new Date().toISOString(),
        region: report.region || 'Addis Ababa',
        type: report.type || 'Daily Evaluation',
        synced: true,
      };
      const existing = await db.supervisor_reports.get(report.id);
      if (!existing || new Date(existing.submittedAt) < new Date(localReport.submittedAt)) {
        await db.supervisor_reports.put(localReport);
      }
    }
  } catch (_error) {
    // Network or parse fallback - silent
  }
};

export const purgeLegacyDirectionalUsers = async () => {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('fieldsync_purged_legacy_v2') === 'true') {
      return;
    }

    const legacyMockNames = [
      'መሠረት አለሙ', 'Meseret Alemu',
      'ቤተልሔም አበበ', 'Betelhem Abebe',
      'ዳዊት ገብረእግዚአብሔር', 'Dawit Gebreegziabher',
      'ረሃቤል ተሰማ', 'Rehabel Tessema', 'Rehabel Tesema',
      'ቀዳማዊ ገብረእግዚአብሔር', 'Kedamawi Gebreegziabher',
      'ዘነበ አስፋው', 'Zenebe Asfaw',
      'መለስ ዘነበ', 'Meles Zenebe',
      'ተስፋዬ በቀለ', 'Tesfaye Bekele',
      'ኤልሳቤት አለሙ', 'Elsabet Alemu',
      'ፍቅሬ ገብረእግዚአብሔር', 'Fikre Gebreegziabher',
      'ሀና አረጋዊ', 'Hana Aregawi',
      'ዮናስ አስፋው', 'Yonas Asfaw',
      'ብርሃን ገብረእግዚአብሔር', 'Birhan Gebreegziabher', 'Birhan Alemayehu',
      'ሣህለ ሙሉጌታ', 'Sahle Mulugeta',
      'ኪዳን ጥላሁን', 'Kidan Tilahun',
      'Dawit Haile Mariam'
    ];

    const legacyMockEmails = [
      'meseret@fieldsync.com',
      'betelhem@fieldsync.com',
      'dawit@fieldsync.com',
      'rehabel@fieldsync.com',
      'kedamawi@fieldsync.com',
      'zenebe@fieldsync.com',
      'meles@fieldsync.com',
      'tesfaye@fieldsync.com',
      'elsabet@fieldsync.com',
      'fikre@fieldsync.com',
      'hana@fieldsync.com',
      'yonas@fieldsync.com',
      'birhan@fieldsync.com',
      'sahle@fieldsync.com',
      'kidan@fieldsync.com'
    ];

    const isTargetUser = (u: any) => {
      if (!u) return false;
      const reg = (u.region || '').trim().toLowerCase();
      const zone = (u.zone || '').trim().toLowerCase();
      const email = (u.email || '').trim().toLowerCase();
      const name = (u.name || u.fullName || '').trim();
      const empId = (u.employeeId || '').trim();
      const id = String(u.id || '').trim();

      const role = String(u.role || '').trim().toLowerCase();
      // Only manager@fieldsync.com can be manager; purge all other managers
      if (role === 'manager' && email !== 'manager@fieldsync.com') return true;
      if (email === 'abebe@fieldsync.com' || id === 'u_demo_mgr' || id === 'm1') return true;
      if (['north', 'south', 'east', 'west'].includes(reg)) return true;
      if (zone.includes('zonal jurisdiction') || reg.includes('organization-wide')) return true;
      if (/^([so]\d+|m1)$/i.test(id)) return true;
      if (/^FO00[1-9]/i.test(empId) || /^SUP00[1-9]/i.test(empId)) return true;
      if (['u_demo_off', 'u_demo_sup'].includes(id)) return true;
      if (legacyMockEmails.includes(email)) return true;
      if (legacyMockNames.some(n => name.toLowerCase() === n.toLowerCase())) return true;
      return false;
    };

    // 1. Collect all target user IDs from db.users and offlineDb.users
    const allDbUsers = await db.users.toArray();
    const allOfflineUsers = await offlineDb.users.toArray();

    const targetDbUserIds = new Set<string>();
    const targetEmpIds = new Set<string>();
    const targetNames = new Set<string>(legacyMockNames.map(n => n.toLowerCase()));

    allDbUsers.forEach(u => {
      if (isTargetUser(u)) {
        if (u.id) targetDbUserIds.add(u.id);
        if (u.employeeId) targetEmpIds.add(u.employeeId);
        if (u.name) targetNames.add(u.name.toLowerCase());
      }
    });

    allOfflineUsers.forEach(u => {
      if (isTargetUser(u)) {
        if (u.id) {
          targetDbUserIds.add(u.id);
          targetEmpIds.add(u.id);
        }
        if (u.fullName) targetNames.add(u.fullName.toLowerCase());
      }
    });

    // Also include known legacy IDs and employee IDs
    ['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8', 'o9', 'o10', 'o11', 'o12', 's1', 's2', 's3', 'u_demo_off', 'u_demo_sup'].forEach(id => targetDbUserIds.add(id));
    ['FO001', 'FO002', 'FO003', 'FO004', 'FO005', 'FO006', 'FO007', 'FO008', 'FO009', 'FO010', 'FO011', 'FO012', 'SUP001', 'SUP002', 'SUP003'].forEach(eid => targetEmpIds.add(eid));

    const idList = Array.from(targetDbUserIds);
    const empIdList = Array.from(targetEmpIds);

    // Delete users from db.users and offlineDb.users
    await db.users.bulkDelete(idList);
    await offlineDb.users.bulkDelete(idList);

    // 2. Cascade delete from all Dexie tables
    const isTargetRecord = (r: any) => {
      if (!r) return false;
      const uid = String(r.userId || r.officerId || r.supervisorId || r.registeredBy || r.targetEmployeeId || '');
      const eid = String(r.employeeId || '');
      const reg = String(r.region || r.officerRegion || '').trim().toLowerCase();
      const name = String(r.name || r.userName || r.employeeName || r.officerName || r.supervisorName || r.registeredByName || '').trim().toLowerCase();

      if (idList.includes(uid) || empIdList.includes(eid)) return true;
      if (['north', 'south', 'east', 'west'].includes(reg)) return true;
      if (targetNames.has(name)) return true;
      return false;
    };

    // db.reports
    try {
      const reports = await db.reports.toArray();
      const deleteReports = reports.filter(isTargetRecord).map(r => r.id);
      if (deleteReports.length) await db.reports.bulkDelete(deleteReports);
    } catch (_e) {}

    // db.attendance
    try {
      const attendance = await db.attendance.toArray();
      const deleteAttendance = attendance.filter(isTargetRecord).map(a => a.id);
      if (deleteAttendance.length) await db.attendance.bulkDelete(deleteAttendance);
    } catch (_e) {}

    // db.citizens
    try {
      const citizens = await db.citizens.toArray();
      const deleteCitizens = citizens.filter(isTargetRecord).map(c => c.id);
      if (deleteCitizens.length) await db.citizens.bulkDelete(deleteCitizens);
    } catch (_e) {}

    // db.leaves
    try {
      const leaves = await db.leaves.toArray();
      const deleteLeaves = leaves.filter(isTargetRecord).map(l => l.id);
      if (deleteLeaves.length) await db.leaves.bulkDelete(deleteLeaves);
    } catch (_e) {}

    // db.permissions
    try {
      const permissions = await db.permissions.toArray();
      const deletePermissions = permissions.filter(isTargetRecord).map(p => p.id);
      if (deletePermissions.length) await db.permissions.bulkDelete(deletePermissions);
    } catch (_e) {}

    // db.supervisor_reports
    try {
      const supReports = await db.supervisor_reports.toArray();
      const deleteSupReports = supReports.filter(isTargetRecord).map(sr => sr.id);
      if (deleteSupReports.length) await db.supervisor_reports.bulkDelete(deleteSupReports);
    } catch (_e) {}

    // db.status
    try {
      const statuses = await db.status.toArray();
      const deleteStatus = statuses.filter(isTargetRecord).map(s => s.id);
      if (deleteStatus.length) await db.status.bulkDelete(deleteStatus);
    } catch (_e) {}

    // db.screen_time
    try {
      const screenTime = await db.screen_time.toArray();
      const deleteScreenTime = screenTime.filter(isTargetRecord).map(st => st.id);
      if (deleteScreenTime.length) await db.screen_time.bulkDelete(deleteScreenTime);
    } catch (_e) {}

    // db.audit
    try {
      const auditLogs = await db.audit.toArray();
      const deleteAudit = auditLogs.filter(isTargetRecord).map(a => a.id);
      if (deleteAudit.length) await db.audit.bulkDelete(deleteAudit);
    } catch (_e) {}

    // db.notifications
    try {
      const notifs = await db.notifications.toArray();
      const deleteNotifs = notifs.filter(isTargetRecord).map(n => n.id);
      if (deleteNotifs.length) await db.notifications.bulkDelete(deleteNotifs);
    } catch (_e) {}

    // db.tasks
    try {
      const tasks = await db.tasks.toArray();
      const deleteTasks = tasks.filter(isTargetRecord).map(t => t.id);
      if (deleteTasks.length) await db.tasks.bulkDelete(deleteTasks);
    } catch (_e) {}

    // db.verification_history
    try {
      const verif = await db.verification_history.toArray();
      const deleteVerif = verif.filter(isTargetRecord).map(v => v.id);
      if (deleteVerif.length) await db.verification_history.bulkDelete(deleteVerif);
    } catch (_e) {}

    // db.gps_locations
    try {
      const gps = await db.gps_locations.toArray();
      const deleteGps = gps.filter(isTargetRecord).map(g => g.id);
      if (deleteGps.length) await db.gps_locations.bulkDelete(deleteGps);
    } catch (_e) {}

    // db.check_ins
    try {
      const checkIns = await db.check_ins.toArray();
      const deleteCheckIns = checkIns.filter(isTargetRecord).map(ci => ci.id);
      if (deleteCheckIns.length) await db.check_ins.bulkDelete(deleteCheckIns);
    } catch (_e) {}

    // 3. Cascade delete from offlineDb tables
    try {
      const offlineCitizens = await offlineDb.citizens.toArray();
      const delOffCit = offlineCitizens.filter(c => idList.includes(c.registeredById) || ['north', 'south', 'east', 'west'].includes((c.region || '').toLowerCase())).map(c => c.id);
      if (delOffCit.length) await offlineDb.citizens.bulkDelete(delOffCit);
    } catch (_e) {}

    try {
      const offReports = await offlineDb.dailyWorkReports.toArray();
      const delOffRep = offReports.filter(r => idList.includes(r.officerId)).map(r => r.id);
      if (delOffRep.length) await offlineDb.dailyWorkReports.bulkDelete(delOffRep);
    } catch (_e) {}

    try {
      const offSessions = await offlineDb.workSessions.toArray();
      const delOffSess = offSessions.filter(s => idList.includes(s.officerId)).map(s => s.id);
      if (delOffSess.length) await offlineDb.workSessions.bulkDelete(delOffSess);
    } catch (_e) {}

    try {
      const offLogs = await offlineDb.activityLogs.toArray();
      const delOffLogs = offLogs.filter(l => idList.includes(l.officerId)).map(l => l.id);
      if (delOffLogs.length) await offlineDb.activityLogs.bulkDelete(delOffLogs);
    } catch (_e) {}

    try {
      const offVerif = await offlineDb.workVerifications.toArray();
      const delOffVer = offVerif.filter(v => idList.includes(v.officerId)).map(v => v.id);
      if (delOffVer.length) await offlineDb.workVerifications.bulkDelete(delOffVer);
    } catch (_e) {}

    try {
      const offScTime = await offlineDb.dailyScreenTimes.toArray();
      const delOffScTime = offScTime.filter(st => idList.includes(st.officerId)).map(st => st.id);
      if (delOffScTime.length) await offlineDb.dailyScreenTimes.bulkDelete(delOffScTime);
    } catch (_e) {}

    // Note: Chat messages between manager and supervisor are permanently preserved and NEVER auto-purged

    // Ensure u_sup and u_off have real Bole Sub-City attributes
    const existingSup = await db.users.get('u_sup');
    if (existingSup) {
      await db.users.update('u_sup', {
        name: 'alemu kebede ayele',
        region: 'Addis Ababa',
        regionId: 'reg-addis-ababa',
        zone: 'Bole Sub-City',
        zoneId: 'zone-aa-bole',
      });
    }
    const existingOff = await db.users.get('u_off');
    if (existingOff) {
      await db.users.update('u_off', {
        name: 'Meseret Hailu Tadesse',
        region: 'Addis Ababa',
        regionId: 'reg-addis-ababa',
        zone: 'Bole Sub-City',
        zoneId: 'zone-aa-bole',
        woreda: 'Bole Woreda 01',
        woredaId: 'wor-aa-bol-01',
        supervisorId: 'u_sup',
      });
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('fieldsync_purged_legacy_v2', 'true');
    }
  } catch (err) {
    console.warn('Error purging legacy directional users:', err);
  }
};

export const initializeAllData = async () => {
  try {
    const userCount = await db.users.count();
    if (userCount > 0) {
      return;
    }
    await purgeLegacyDirectionalUsers();

    const today = getToday();

    const usersWithPin = SAMPLE_USERS.map((u) => ({
      ...u,
      pin: u.role === 'field_officer' ? '1234' : undefined,
    }));

    await db.users.bulkAdd(usersWithPin);

    const fieldOfficers = usersWithPin.filter((u) => u.role === 'field_officer');

    const attendance = fieldOfficers.map((o) => ({
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
      synced: true,
    }));
    await db.attendance.bulkAdd(attendance);

    const officers = usersWithPin.filter((u) => u.role === 'field_officer' || u.role === 'supervisor');
    const status = officers.map((o) => ({
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
      efficiency: Math.floor(65 + Math.random() * 35),
    }));
    await db.status.bulkAdd(status);

    const screenTime = fieldOfficers.map((o) => ({
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
      synced: true,
    }));
    await db.screen_time.bulkAdd(screenTime);

    const notifications = usersWithPin.map((u) => ({
      id: uid(),
      userId: u.id,
      title: 'Welcome!',
      message: `Welcome to FieldSync, ${u.name}!`,
      type: 'success',
      read: false,
      timestamp: new Date().toISOString(),
      link: '/dashboard',
    }));
    await db.notifications.bulkAdd(notifications);

    const leaves = [
      {
        id: uid(),
        employeeId: 'u_off',
        employeeName: 'Meseret Hailu Tadesse',
        startDate: '2026-10-15',
        endDate: '2026-10-17',
        reason: 'Personal leave',
        type: 'annual',
        status: 'pending',
        createdAt: new Date().toISOString(),
        approvedBy: null,
        approvedAt: null,
        synced: true,
      },
    ];
    await db.leaves.bulkAdd(leaves);

    const reports = [
      {
        id: uid(),
        reportId: 'RPT-001',
        reportDate: today,
        region: 'Addis Ababa',
        siteName: 'Bole Registration Center',
        employeeId: 'u_off',
        employeeName: 'Meseret Hailu Tadesse',
        supervisorId: 'u_sup',
        registrations: 18,
        registrationEfficiency: 90,
        operationalStatus: 'Active',
        attendance: 'present',
        workHours: 8,
        issues: 'None',
        comments: 'Operations progressing smoothly',
        challenges: 'None',
        activities: 'Biometric Enrollment',
        equipmentStatus: 'operational',
        materialsUsed: 'Intake Forms',
        teamMembers: 'Team Bole 01',
        weatherConditions: 'Clear',
        communityFeedback: 'Positive',
        submittedAt: new Date().toISOString(),
        synced: true,
        syncAttempts: 0,
        syncError: null,
        reviewed: true,
        reviewedBy: 'alemu kebede ayele',
      },
    ];
    await db.reports.bulkAdd(reports);

    const citizens = [
      {
        id: uid(),
        nationalId: 'NID-001',
        firstName: 'Abebe',
        lastName: 'Kebede',
        dateOfBirth: '1990-01-01',
        gender: 'Male',
        phone: '+251-911-000001',
        email: 'abebe.citizen@example.com',
        address: 'Addis Ababa, Bole Sub-City, Woreda 01',
        region: 'Addis Ababa',
        district: 'Bole Sub-City',
        village: 'Kebele 01',
        occupation: 'Teacher',
        maritalStatus: 'Married',
        registrationDate: new Date().toISOString(),
        registeredBy: 'u_off',
        registeredByName: 'Meseret Hailu Tadesse',
        idType: 'National ID',
        idNumber: 'NID-001',
        biometrics: true,
        status: 'active',
        synced: true,
      },
    ];
    await db.citizens.bulkAdd(citizens);

    const supervisorReports = [
      {
        id: uid(),
        supervisorId: 'u_sup',
        supervisorName: 'alemu kebede ayele',
        officerId: 'u_off',
        officerName: 'Meseret Hailu Tadesse',
        officerRegion: 'Addis Ababa',
        reportDate: today,
        performance: 'good',
        attendance: 'good',
        quality: 'good',
        punctuality: 'good',
        teamwork: 'good',
        communication: 'good',
        comments: 'Excellent registration throughput and attendance compliance',
        recommendations: 'Continue standard protocol',
        overallRating: 5,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        region: 'Addis Ababa',
        type: 'officer_report',
        synced: true,
      },
    ];
    await db.supervisor_reports.bulkAdd(supervisorReports);

    const audit = [
      {
        id: uid(),
        userId: 'u_mgr',
        userName: 'System Manager',
        action: 'LOGIN',
        details: 'User logged in',
        timestamp: new Date().toISOString(),
        ip: '127.0.0.1',
      },
      {
        id: uid(),
        userId: 'u_off',
        userName: 'Meseret Hailu Tadesse',
        action: 'SUBMIT_REPORT',
        details: 'Daily report submitted for Bole Registration Center',
        timestamp: new Date().toISOString(),
        ip: '127.0.0.1',
      },
    ];
    await db.audit.bulkAdd(audit);

    const alerts = [
      {
        id: uid(),
        title: 'Operations Briefing',
        message: 'All field officers must review weekly synchronization metrics by end of day',
        priority: 'high',
        type: 'operational',
        timestamp: new Date().toISOString(),
        read: false,
        targetAll: true,
        targetEmployeeId: null,
        sentBy: 'u_mgr',
        sentByName: 'System Manager',
      },
    ];
    await db.alerts.bulkAdd(alerts);

    const permissions = [
      {
        id: uid(),
        employeeId: 'u_off',
        employeeName: 'Meseret Hailu Tadesse',
        permissionType: 'Work Permission',
        startDate: '2026-10-25',
        endDate: '2026-10-25',
        reason: 'Medical checkup',
        status: 'pending',
        requestedAt: new Date().toISOString(),
        approvedBy: null,
        approvedAt: null,
        synced: true,
      },
    ];
    await db.permissions.bulkAdd(permissions);

    const gpsLocations = fieldOfficers.map((o) => ({
      id: uid(),
      employeeId: o.employeeId,
      employeeName: o.name,
      latitude: 9.03 + (Math.random() - 0.5) * 0.5,
      longitude: 38.74 + (Math.random() - 0.5) * 0.5,
      accuracy: 10 + Math.random() * 20,
      timestamp: new Date().toISOString(),
      date: today,
      location: 'Work Site',
      synced: true,
    }));
    await db.gps_locations.bulkAdd(gpsLocations);

    const checkIns = fieldOfficers.map((o) => ({
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
      synced: true,
    }));
    await db.check_ins.bulkAdd(checkIns);

    const verificationHistory = fieldOfficers.map((o) => ({
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
      message: 'Verification passed!',
      synced: true,
    }));
    await db.verification_history.bulkAdd(verificationHistory);
  } catch (error) {
    console.error('Error initializing data:', error);
  }
};
