// src/services/unifiedSyncEngine.ts
// Unified Offline-First Synchronization Engine for FieldSync (Phase 8)

import { offlineDb } from '../db/offlineDb';
import { API_BASE } from '../config/api';

export interface SyncSummary {
  citizensPending: number;
  activityLogsPending: number;
  workSessionsPending: number;
  dailyReportsPending: number;
  totalPending: number;
  lastSyncTime: string | null;
  isSyncing: boolean;
  lastError: string | null;
}

class UnifiedSyncEngine {
  private isSyncing = false;
  private lastSyncTime: string | null = null;
  private lastError: string | null = null;

  constructor() {
    // Listen for online events to auto-trigger synchronization
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 Network restored, initiating automated synchronization...');
        this.syncAll();
      });
    }
  }

  /**
   * Get counts of pending offline items across all stores
   */
  async getPendingSummary(): Promise<SyncSummary> {
    try {
      const [citizens, activities, sessions, reports] = await Promise.all([
        offlineDb.citizens.where('syncStatus').equals('PENDING').count(),
        offlineDb.activityLogs.where('syncStatus').equals('PENDING').count(),
        offlineDb.workSessions.where('syncStatus').equals('PENDING').count(),
        offlineDb.dailyWorkReports.where('syncStatus').equals('PENDING').count(),
      ]);

      const totalPending = citizens + activities + sessions + reports;

      return {
        citizensPending: citizens,
        activityLogsPending: activities,
        workSessionsPending: sessions,
        dailyReportsPending: reports,
        totalPending,
        lastSyncTime: this.lastSyncTime,
        isSyncing: this.isSyncing,
        lastError: this.lastError,
      };
    } catch (e: any) {
      console.error('Error fetching sync summary:', e);
      return {
        citizensPending: 0,
        activityLogsPending: 0,
        workSessionsPending: 0,
        dailyReportsPending: 0,
        totalPending: 0,
        lastSyncTime: this.lastSyncTime,
        isSyncing: this.isSyncing,
        lastError: e.message,
      };
    }
  }

  /**
   * Run synchronization pipeline across all pending entity stores
   */
  async syncAll(): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
    if (this.isSyncing) {
      console.warn('Sync already in progress, skipping duplicate invocation');
      return { success: false, syncedCount: 0, errors: ['Sync already in progress'] };
    }

    if (!navigator.onLine) {
      return { success: false, syncedCount: 0, errors: ['Device is offline'] };
    }

    const authToken = localStorage.getItem('fieldsync_token');
    if (!authToken) {
      return { success: false, syncedCount: 0, errors: ['Authentication token missing'] };
    }

    this.isSyncing = true;
    this.broadcastStatus();

    let syncedCount = 0;
    const errors: string[] = [];

    try {
      // 1. Sync Pending Citizens
      const pendingCitizens = await offlineDb.citizens
        .where('syncStatus')
        .equals('PENDING')
        .toArray();

      for (const citizen of pendingCitizens) {
        try {
          const res = await fetch(`${API_BASE}/citizens`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(citizen),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
              await offlineDb.citizens.update(citizen.clientRecordId, {
                id: data.data.id,
                syncStatus: 'SYNCED',
                duplicateReviewStatus: data.data.duplicateReviewStatus,
              });
              syncedCount++;
            }
          } else {
            const errData = await res.json();
            errors.push(`Citizen ${citizen.firstName}: ${errData.error || res.statusText}`);
          }
        } catch (netErr: any) {
          errors.push(`Citizen sync error: ${netErr.message}`);
        }
      }

      // 2. Sync Pending Activity Logs
      const pendingLogs = await offlineDb.activityLogs
        .where('syncStatus')
        .equals('PENDING')
        .toArray();

      if (pendingLogs.length > 0) {
        try {
          const res = await fetch(`${API_BASE}/activity-logs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ logs: pendingLogs }),
          });

          if (res.ok) {
            for (const log of pendingLogs) {
              await offlineDb.activityLogs.update(log.id, { syncStatus: 'SYNCED' });
              syncedCount++;
            }
          }
        } catch (logErr: any) {
          errors.push(`Activity logs sync error: ${logErr.message}`);
        }
      }

      // 3. Sync Pending Work Sessions
      const pendingSessions = await offlineDb.workSessions
        .where('syncStatus')
        .equals('PENDING')
        .toArray();

      if (pendingSessions.length > 0) {
        try {
          const res = await fetch(`${API_BASE}/work-sessions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ sessions: pendingSessions }),
          });

          if (res.ok) {
            for (const s of pendingSessions) {
              await offlineDb.workSessions.update(s.id, { syncStatus: 'SYNCED' });
              syncedCount++;
            }
          }
        } catch (sessErr: any) {
          errors.push(`Work sessions sync error: ${sessErr.message}`);
        }
      }

      // 4. Sync Pending Daily Reports
      const pendingReports = await offlineDb.dailyWorkReports
        .where('syncStatus')
        .equals('PENDING')
        .toArray();

      for (const report of pendingReports) {
        try {
          const res = await fetch(`${API_BASE}/reports/daily`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(report),
          });

          if (res.ok) {
            await offlineDb.dailyWorkReports.update(report.id, { syncStatus: 'SYNCED' });
            syncedCount++;
          }
        } catch (repErr: any) {
          errors.push(`Daily report sync error: ${repErr.message}`);
        }
      }

      this.lastSyncTime = new Date().toISOString();
      this.lastError = errors.length > 0 ? errors.join('; ') : null;

      return {
        success: errors.length === 0,
        syncedCount,
        errors,
      };
    } finally {
      this.isSyncing = false;
      this.broadcastStatus();
    }
  }

  private broadcastStatus() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fieldsync-status-updated'));
    }
  }
}

export const syncEngine = new UnifiedSyncEngine();
export default syncEngine;
