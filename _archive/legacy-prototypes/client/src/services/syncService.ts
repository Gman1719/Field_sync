import db from '../db/index.ts';
import api from './api.ts';

export interface SyncProgressEvent {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
  lastSyncTime: string | null;
  lastError: string | null;
}

type SyncListener = (progress: SyncProgressEvent) => void;

export class SyncService {
  private static isSyncing = false;
  private static listeners: Set<SyncListener> = new Set();
  private static lastSyncTime: string | null = null;
  private static lastError: string | null = null;

  /**
   * Subscribe to live synchronization progress events.
   */
  static subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getProgress());
    return () => this.listeners.delete(listener);
  }

  private static notifyListeners(total = 0, completed = 0, failed = 0) {
    const progress = this.getProgress(total, completed, failed);
    this.listeners.forEach((fn) => {
      try {
        fn(progress);
      } catch (e) {
        console.error('Error in sync listener:', e);
      }
    });
  }

  static getProgress(total = 0, completed = 0, failed = 0): SyncProgressEvent {
    return {
      total,
      completed,
      failed,
      inProgress: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError,
    };
  }

  /**
   * Execute synchronization of all pending records in IndexedDB queue.
   */
  static async syncAll(): Promise<{ total: number; synced: number; failed: number }> {
    if (this.isSyncing) {
      return { total: 0, synced: 0, failed: 0 };
    }

    if (!navigator.onLine) {
      this.lastError = 'Device is currently offline.';
      this.notifyListeners();
      return { total: 0, synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.lastError = null;

    try {
      const pendingItems = await db.syncQueue
        .where('status')
        .equals('PENDING')
        .toArray();

      const total = pendingItems.length;
      let synced = 0;
      let failed = 0;

      this.notifyListeners(total, synced, failed);

      for (const item of pendingItems) {
        try {
          if (item.action === 'CREATE') {
            if (item.entityType === 'CITIZEN') {
              const res = await api.post('/citizens', item.payload);
              const serverCitizen = res.data.data;
              const isFlaggedDuplicate = res.data.isFlaggedDuplicate;

              await db.transaction('rw', [db.citizens, db.syncQueue], async () => {
                await db.citizens.update(item.clientRecordId, {
                  id: serverCitizen.id,
                  syncStatus: isFlaggedDuplicate ? 'NEEDS_REVIEW' : 'SYNCED',
                  lastSyncError: null,
                  updatedAt: new Date().toISOString(),
                });

                if (item.id) {
                  await db.syncQueue.update(item.id, {
                    status: 'COMPLETED',
                    updatedAt: new Date().toISOString(),
                  });
                }
              });

              synced++;
            } else if (item.entityType === 'ACTIVITY_LOG') {
              await api.post('/activity-logs/sync', { logs: [item.payload] });

              await db.transaction('rw', [db.activityLogs, db.syncQueue], async () => {
                await db.activityLogs.update(item.clientRecordId, {
                  syncStatus: 'SYNCED',
                  serverReceivedAt: new Date().toISOString(),
                });

                if (item.id) {
                  await db.syncQueue.update(item.id, {
                    status: 'COMPLETED',
                    updatedAt: new Date().toISOString(),
                  });
                }
              });

              synced++;
            } else if (item.entityType === 'WORK_SESSION') {
              await api.post('/work-sessions/sync', { sessions: [item.payload] });

              await db.transaction('rw', [db.workSessions, db.syncQueue], async () => {
                await db.workSessions.update(item.clientRecordId, {
                  syncStatus: 'SYNCED',
                  serverReceivedAt: new Date().toISOString(),
                });

                if (item.id) {
                  await db.syncQueue.update(item.id, {
                    status: 'COMPLETED',
                    updatedAt: new Date().toISOString(),
                  });
                }
              });

              synced++;
            } else if (item.entityType === 'DAILY_REPORT') {
              await api.post('/daily-reports', item.payload);

              await db.transaction('rw', [db.dailyWorkReports, db.syncQueue], async () => {
                await db.dailyWorkReports.update(item.clientRecordId, {
                  syncStatus: 'SYNCED',
                  serverReceivedAt: new Date().toISOString(),
                });

                if (item.id) {
                  await db.syncQueue.update(item.id, {
                    status: 'COMPLETED',
                    updatedAt: new Date().toISOString(),
                  });
                }
              });

              synced++;
            }
          }
        } catch (itemErr: any) {
          failed++;
          const errorMsg =
            itemErr.response?.data?.error || itemErr.message || 'Synchronization failed';

          const newRetryCount = item.retryCount + 1;
          const isPermanentFailure = newRetryCount >= 5;

          await db.transaction('rw', [db.citizens, db.syncQueue], async () => {
            await db.citizens.update(item.clientRecordId, {
              syncStatus: 'FAILED',
              lastSyncError: errorMsg,
              syncAttempts: newRetryCount,
              updatedAt: new Date().toISOString(),
            });

            if (item.id) {
              await db.syncQueue.update(item.id, {
                status: isPermanentFailure ? 'FAILED' : 'PENDING',
                retryCount: newRetryCount,
                errorMessage: errorMsg,
                updatedAt: new Date().toISOString(),
              });
            }
          });
        }

        this.notifyListeners(total, synced, failed);
      }

      this.lastSyncTime = new Date().toLocaleTimeString();
      return { total, synced, failed };
    } catch (globalErr: any) {
      console.error('Global sync execution error:', globalErr);
      this.lastError = globalErr.message;
      return { total: 0, synced: 0, failed: 0 };
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Initialize background sync triggers (online event + periodic timer).
   */
  static initAutoSync(intervalMs = 60000) {
    if (typeof window === 'undefined') return;

    // 1. Sync on network recovery
    window.addEventListener('online', () => {
      console.log('🌐 Network reconnected! Initiating automatic background sync...');
      this.syncAll();
    });

    // 2. Periodic sync timer
    setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        db.syncQueue
          .where('status')
          .equals('PENDING')
          .count()
          .then((count) => {
            if (count > 0) {
              this.syncAll();
            }
          })
          .catch((err) => console.warn('Sync queue poll error:', err));
      }
    }, intervalMs);
  }
}

export default SyncService;
