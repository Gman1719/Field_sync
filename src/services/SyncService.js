// services/SyncService.js

import { db } from './database';
import { getNetworkStatus, isDevToolsOffline } from './database';

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncQueue = [];
    this.retryInterval = null;
    this.maxRetries = 5;
    this.retryDelay = 3000; // Start with 3 seconds
    this.isPaused = false;
  }

  async initialize() {
    // Start periodic sync check
    this.startPeriodicSync();
    
    // Listen for online events
    window.addEventListener('online', () => {
      console.log('🔄 Online detected - starting sync');
      this.retryPendingOperations();
    });

    // Listen for DevTools changes
    setInterval(() => {
      if (isDevToolsOffline()) {
        this.pauseSync();
      } else if (navigator.onLine) {
        this.resumeSync();
      }
    }, 3000);

    // Clear stuck syncs on initialization
    await this.clearStuckSyncs();
  }

  async clearStuckSyncs() {
    try {
      console.log('🧹 Clearing stuck sync operations...');
      
      // Find operations that have been syncing for more than 2 minutes
      const stuckThreshold = Date.now() - 120000; // 2 minutes
      
      // Update pending operations
      const pendingOps = await db.operations
        .where('status')
        .equals('syncing')
        .toArray();

      for (const op of pendingOps) {
        if (op.lastSyncAttempt && op.lastSyncAttempt < stuckThreshold) {
          await db.operations.update(op.id, {
            status: 'pending',
            error: 'Stuck sync cleared automatically',
            lastSyncAttempt: Date.now()
          });
          console.log(`✅ Cleared stuck sync for operation ${op.id}`);
        }
      }

      // Clear stuck attendance records
      const stuckAttendance = await db.attendance
        .where('syncStatus')
        .equals('syncing')
        .toArray();

      for (const record of stuckAttendance) {
        if (record.lastSyncAttempt && record.lastSyncAttempt < stuckThreshold) {
          await db.attendance.update(record.id, {
            syncStatus: 'pending',
            syncError: 'Stuck sync cleared automatically',
            lastSyncAttempt: Date.now()
          });
          console.log(`✅ Cleared stuck sync for attendance ${record.id}`);
        }
      }

      // Reset failed operations that haven't been retried
      const failedOps = await db.operations
        .where('status')
        .equals('failed')
        .toArray();

      for (const op of failedOps) {
        if (op.retryCount < this.maxRetries) {
          await db.operations.update(op.id, {
            status: 'pending',
            retryCount: op.retryCount + 1
          });
          console.log(`🔄 Reset failed operation ${op.id} for retry ${op.retryCount + 1}`);
        }
      }

    } catch (error) {
      console.error('❌ Error clearing stuck syncs:', error);
    }
  }

  pauseSync() {
    if (!this.isPaused) {
      this.isPaused = true;
      console.log('⏸️ Sync paused (DevTools offline)');
    }
  }

  resumeSync() {
    if (this.isPaused) {
      this.isPaused = false;
      console.log('▶️ Sync resumed');
      this.retryPendingOperations();
    }
  }

  async retryPendingOperations() {
    if (this.isSyncing || this.isPaused || !navigator.onLine || isDevToolsOffline()) {
      return;
    }

    console.log('🔄 Checking for pending operations...');
    this.isSyncing = true;

    try {
      // Get pending operations
      const pendingOps = await db.operations
        .where('status')
        .anyOf(['pending', 'retrying'])
        .toArray();

      const pendingAttendance = await db.attendance
        .where('syncStatus')
        .equals('pending')
        .toArray();

      if (pendingOps.length === 0 && pendingAttendance.length === 0) {
        console.log('✅ No pending operations');
        this.isSyncing = false;
        return;
      }

      console.log(`📤 Syncing ${pendingOps.length} operations and ${pendingAttendance.length} attendance records`);

      // Sync attendance first
      for (const record of pendingAttendance) {
        await this.syncAttendanceRecord(record);
      }

      // Then sync operations
      for (const op of pendingOps) {
        await this.syncOperation(op);
      }

    } catch (error) {
      console.error('❌ Sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  async syncAttendanceRecord(record) {
    try {
      // Mark as syncing
      await db.attendance.update(record.id, {
        syncStatus: 'syncing',
        lastSyncAttempt: Date.now()
      });

      // Simulate API call
      const response = await this.sendToServer('/api/attendance', record);

      if (response.success) {
        // Mark as synced
        await db.attendance.update(record.id, {
          syncStatus: 'synced',
          syncedAt: new Date().toISOString(),
          serverId: response.id
        });
        console.log(`✅ Attendance ${record.id} synced successfully`);
      } else {
        throw new Error('Sync failed');
      }

    } catch (error) {
      console.error(`❌ Failed to sync attendance ${record.id}:`, error);
      
      // Update with error
      await db.attendance.update(record.id, {
        syncStatus: 'failed',
        syncError: error.message,
        retryCount: (record.retryCount || 0) + 1
      });

      // Schedule retry
      this.scheduleRetry(record, 'attendance');
    }
  }

  async syncOperation(operation) {
    try {
      // Mark as syncing
      await db.operations.update(operation.id, {
        status: 'syncing',
        lastSyncAttempt: Date.now()
      });

      // Simulate API call
      const response = await this.sendToServer('/api/operations', operation);

      if (response.success) {
        // Mark as completed
        await db.operations.update(operation.id, {
          status: 'completed',
          syncedAt: new Date().toISOString(),
          serverId: response.id
        });
        console.log(`✅ Operation ${operation.id} synced successfully`);
      } else {
        throw new Error('Sync failed');
      }

    } catch (error) {
      console.error(`❌ Failed to sync operation ${operation.id}:`, error);
      
      // Update with error
      await db.operations.update(operation.id, {
        status: 'failed',
        error: error.message,
        retryCount: (operation.retryCount || 0) + 1
      });

      // Schedule retry
      this.scheduleRetry(operation, 'operation');
    }
  }

  scheduleRetry(item, type) {
    const retryCount = item.retryCount || 0;
    if (retryCount >= this.maxRetries) {
      console.log(`⛔ Max retries reached for ${type} ${item.id}`);
      return;
    }

    const delay = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
    console.log(`⏱️ Scheduling retry for ${type} ${item.id} in ${delay}ms`);

    setTimeout(async () => {
      if (!this.isPaused && navigator.onLine && !isDevToolsOffline()) {
        if (type === 'attendance') {
          await this.syncAttendanceRecord(item);
        } else {
          await this.syncOperation(item);
        }
      }
    }, delay);
  }

  async sendToServer(endpoint, data) {
    // Simulate API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() < 0.05) { // 5% failure rate for testing
          reject(new Error('Server error'));
        } else {
          resolve({ success: true, id: Date.now() });
        }
      }, 500);
    });
  }

  startPeriodicSync() {
    // Check for pending operations every 30 seconds
    setInterval(() => {
      if (!this.isPaused && navigator.onLine && !isDevToolsOffline()) {
        this.retryPendingOperations();
      }
    }, 30000);
  }

  // Clean up on unmount
  cleanup() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }
  }
}

export default new SyncService();