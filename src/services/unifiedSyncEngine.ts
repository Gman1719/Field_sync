// src/services/unifiedSyncEngine.ts
// Unified Offline-First Synchronization Engine for FieldSync (Phase 7)

import { offlineDb } from '../db/offlineDb';
import { API_BASE } from '../config/api';
import type { SyncQueueItem, SyncErrorRecord } from '../types/index';

export interface SyncSummary {
  citizensPending: number;
  activityLogsPending: number;
  workSessionsPending: number;
  dailyReportsPending: number;
  totalPending: number;
  queuePendingCount: number;
  unresolvedErrorsCount: number;
  lastSyncTime: string | null;
  isSyncing: boolean;
  lastError: string | null;
}

class UnifiedSyncEngine {
  private isSyncing = false;
  private lastSyncTime: string | null = null;
  private lastError: string | null = null;
  private autoSyncTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // 1. Auto-sync on network reconnect
      window.addEventListener('online', () => {
        console.log('🌐 Network restored: initiating automated synchronization pipeline...');
        this.syncAll();
      });

      // 2. Periodic sync poll every 60 seconds if online
      this.autoSyncTimer = setInterval(() => {
        if (navigator.onLine && !this.isSyncing) {
          this.syncAll(true); // silent background sync
        }
      }, 60 * 1000);
    }
  }

  /**
   * Get counts of pending offline items across all stores and queues
   */
  async getPendingSummary(): Promise<SyncSummary> {
    try {
      const [citizens, activities, sessions, reports, queuePending, errors] = await Promise.all([
        offlineDb.citizens.where('syncStatus').equals('PENDING').count(),
        offlineDb.activityLogs.where('syncStatus').equals('PENDING').count(),
        offlineDb.workSessions.where('syncStatus').equals('PENDING').count(),
        offlineDb.dailyWorkReports.where('syncStatus').equals('PENDING').count(),
        offlineDb.syncQueue.where('status').equals('PENDING').count(),
        offlineDb.syncErrors.filter((e) => !e.resolved).count(),
      ]);

      const totalPending = citizens + activities + sessions + reports;

      return {
        citizensPending: citizens,
        activityLogsPending: activities,
        workSessionsPending: sessions,
        dailyReportsPending: reports,
        totalPending,
        queuePendingCount: queuePending,
        unresolvedErrorsCount: errors,
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
        queuePendingCount: 0,
        unresolvedErrorsCount: 0,
        lastSyncTime: this.lastSyncTime,
        isSyncing: this.isSyncing,
        lastError: e.message,
      };
    }
  }

  /**
   * Run synchronization pipeline across all pending entity stores using batch API
   */
  async syncAll(silent: boolean = false): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
    if (this.isSyncing) {
      if (!silent) console.warn('Sync already in progress, skipping duplicate invocation');
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
      // 1. Gather all pending items from stores
      const [pendingCitizens, pendingLogs, pendingSessions, pendingReports] = await Promise.all([
        offlineDb.citizens.where('syncStatus').equals('PENDING').toArray(),
        offlineDb.activityLogs.where('syncStatus').equals('PENDING').toArray(),
        offlineDb.workSessions.where('syncStatus').equals('PENDING').toArray(),
        offlineDb.dailyWorkReports.where('syncStatus').equals('PENDING').toArray(),
      ]);

      const hasItemsToPush =
        pendingCitizens.length > 0 ||
        pendingLogs.length > 0 ||
        pendingSessions.length > 0 ||
        pendingReports.length > 0;

      // 2. Push Batch to Server if pending items exist
      if (hasItemsToPush) {
        try {
          const res = await fetch(`${API_BASE}/sync/batch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              citizens: pendingCitizens,
              activityLogs: pendingLogs,
              workSessions: pendingSessions,
              dailyReports: pendingReports,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              // Update local stores on successful batch push
              // Citizens
              for (const c of pendingCitizens) {
                await offlineDb.citizens.update(c.clientRecordId, { syncStatus: 'SYNCED' });
              }
              // Activity Logs
              for (const l of pendingLogs) {
                await offlineDb.activityLogs.update(l.id, { syncStatus: 'SYNCED' });
              }
              // Work Sessions
              for (const s of pendingSessions) {
                await offlineDb.workSessions.update(s.id, { syncStatus: 'SYNCED' });
              }
              // Daily Reports
              for (const r of pendingReports) {
                await offlineDb.dailyWorkReports.update(r.id, { syncStatus: 'SYNCED' });
              }

              // Clear or resolve matching items from syncQueue
              await offlineDb.syncQueue.where('status').equals('PENDING').modify({ status: 'RESOLVED' });

              syncedCount += data.totalSynced || (pendingCitizens.length + pendingLogs.length + pendingSessions.length + pendingReports.length);
            } else {
              errors.push(data.error || 'Batch sync failed on server');
            }
          } else {
            const errData = await res.json().catch(() => ({}));
            const errMsg = errData.error || `Server responded with ${res.status}: ${res.statusText}`;
            errors.push(errMsg);

            // Record to syncErrors store
            await offlineDb.syncErrors.put({
              id: crypto.randomUUID(),
              officerId: 'current_user',
              entityType: 'batch_sync',
              entityId: 'batch',
              errorMessage: errMsg,
              errorCode: res.status.toString(),
              retryCount: 1,
              timestamp: new Date().toISOString(),
              resolved: false,
            });
          }
        } catch (fetchErr: any) {
          errors.push(`Network batch sync error: ${fetchErr.message}`);
          await offlineDb.syncErrors.put({
            id: crypto.randomUUID(),
            officerId: 'current_user',
            entityType: 'network',
            entityId: 'batch',
            errorMessage: fetchErr.message,
            errorCode: 'NET_ERROR',
            retryCount: 1,
            timestamp: new Date().toISOString(),
            resolved: false,
          });
        }
      }

      // 3. Bidirectional Pull: Fetch latest central changes (delta update)
      try {
        await this.pullServerUpdates(authToken);
      } catch (pullErr: any) {
        console.warn('Delta pull failed:', pullErr.message);
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

  /**
   * Delta pull from server to update local Dexie records (Conflict Resolution: Server-Wins on reviews)
   */
  async pullServerUpdates(token?: string): Promise<{ pulledCount: number }> {
    const authToken = token || localStorage.getItem('fieldsync_token');
    if (!authToken || !navigator.onLine) {
      return { pulledCount: 0 };
    }

    try {
      const sinceParam = this.lastSyncTime ? `?since=${encodeURIComponent(this.lastSyncTime)}` : '';
      const res = await fetch(`${API_BASE}/sync/pull${sinceParam}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!res.ok) return { pulledCount: 0 };

      const json = await res.json();
      if (!json.success || !json.data) return { pulledCount: 0 };

      const { citizens = [] } = json.data;
      let pulledCount = 0;

      for (const serverCitizen of citizens) {
        if (!serverCitizen.clientRecordId) continue;

        // Upsert server data into local Dexie
        const local = await offlineDb.citizens.get(serverCitizen.clientRecordId);
        if (local) {
          // If local was already synced, accept server review updates
          if (local.syncStatus === 'SYNCED') {
            await offlineDb.citizens.update(serverCitizen.clientRecordId, {
              duplicateReviewStatus: serverCitizen.duplicateReviewStatus,
              id: serverCitizen.id,
            });
            pulledCount++;
          }
        } else {
          // New citizen from other devices in same woreda
          await offlineDb.citizens.put({
            ...serverCitizen,
            syncStatus: 'SYNCED',
          });
          pulledCount++;
        }
      }

      return { pulledCount };
    } catch (e) {
      console.warn('Pull updates failed:', e);
      return { pulledCount: 0 };
    }
  }

  /**
   * Manually retry a specific failed queue item
   */
  async retryItem(item: SyncQueueItem): Promise<boolean> {
    const authToken = localStorage.getItem('fieldsync_token');
    if (!authToken || !navigator.onLine) return false;

    try {
      await offlineDb.syncQueue.update(item.id, {
        status: 'SYNCING',
        attempts: item.attempts + 1,
      });

      let endpoint = '';
      if (item.entityType === 'citizen') endpoint = `${API_BASE}/citizens`;
      else if (item.entityType === 'activity_log') endpoint = `${API_BASE}/activity-logs`;
      else if (item.entityType === 'work_session') endpoint = `${API_BASE}/work-sessions`;
      else if (item.entityType === 'daily_report') endpoint = `${API_BASE}/reports/daily`;

      if (!endpoint) return false;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(item.payload),
      });

      if (res.ok) {
        await offlineDb.syncQueue.update(item.id, {
          status: 'RESOLVED',
          lastError: null,
        });
        this.broadcastStatus();
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        await offlineDb.syncQueue.update(item.id, {
          status: item.attempts + 1 >= item.maxRetries ? 'FAILED' : 'PENDING',
          lastError: err.error || res.statusText,
        });
        this.broadcastStatus();
        return false;
      }
    } catch (e: any) {
      await offlineDb.syncQueue.update(item.id, {
        status: item.attempts + 1 >= item.maxRetries ? 'FAILED' : 'PENDING',
        lastError: e.message,
      });
      this.broadcastStatus();
      return false;
    }
  }

  /**
   * Mark all error records as resolved
   */
  async clearResolvedErrors(): Promise<void> {
    const errors = await offlineDb.syncErrors.toArray();
    for (const err of errors) {
      await offlineDb.syncErrors.update(err.id, { resolved: true });
    }
    this.broadcastStatus();
  }

  private broadcastStatus() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fieldsync-status-updated'));
      window.dispatchEvent(new CustomEvent('fieldsync-queue-updated'));
    }
  }
}

export const syncEngine = new UnifiedSyncEngine();
export default syncEngine;
