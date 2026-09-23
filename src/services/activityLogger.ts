// src/services/activityLogger.ts
// Reusable Offline Activity Logger for FieldSync (Phase 4)

import { offlineDb } from '../db/offlineDb';
import type { ActivityLog } from '../types/index';

export type ActivityEventType =
  | 'ASSIGNMENT_STARTED'
  | 'ASSIGNMENT_PAUSED'
  | 'ASSIGNMENT_RESUMED'
  | 'CITIZEN_REGISTRATION_STARTED'
  | 'CITIZEN_REGISTRATION_COMPLETED'
  | 'CITIZEN_REGISTRATION_SAVED_OFFLINE'
  | 'REGISTRATION_VALIDATION_FAILED'
  | 'REGISTRATION_SYNC_SUCCEEDED'
  | 'REGISTRATION_SYNC_FAILED'
  | 'PROGRESS_MILESTONE_REACHED'
  | 'DAILY_REPORT_DRAFTED'
  | 'DAILY_REPORT_SUBMITTED'
  | 'ASSIGNMENT_COMPLETION_REPORTED'
  | 'SYNC_STARTED'
  | 'SYNC_COMPLETED'
  | 'SYNC_FAILED'
  | 'WORK_SESSION_STARTED'
  | 'WORK_SESSION_PAUSED'
  | 'WORK_SESSION_RESUMED'
  | 'WORK_SESSION_ENDED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | string;

export interface LogEventOptions {
  officerId: string;
  assignmentId?: string | null;
  relatedRecordId?: string | null;
  metadata?: Record<string, unknown> | null;
  deviceTimestamp?: string;
}

export class ActivityLogger {
  /**
   * Automatically records a fieldwork activity event into IndexedDB and marks for sync.
   * Works 100% offline. Never requires internet access.
   */
  static async log(
    eventType: ActivityEventType,
    description: string,
    options: LogEventOptions
  ): Promise<ActivityLog> {
    const id = crypto.randomUUID();
    const deviceTimestamp = options.deviceTimestamp || new Date().toISOString();

    const logItem: ActivityLog = {
      id,
      officerId: options.officerId,
      assignmentId: options.assignmentId || null,
      eventType,
      description,
      deviceTimestamp,
      relatedRecordId: options.relatedRecordId || null,
      metadata: options.metadata || null,
      syncStatus: 'PENDING',
    };

    try {
      // 1. Immediately store in IndexedDB activityLogs
      await offlineDb.activityLogs.put(logItem);

      // 2. Add to IndexedDB syncQueue
      await offlineDb.syncQueue.put({
        id: crypto.randomUUID(),
        entityType: 'activity_log',
        entityId: id,
        payload: logItem,
        queuedAt: new Date().toISOString(),
        attempts: 0,
        maxRetries: 5,
        status: 'PENDING',
      });
    } catch (err) {
      console.error('Failed to persist activity log locally:', err);
    }

    return logItem;
  }

  /**
   * Get chronological logs for an officer from IndexedDB
   */
  static async getOfficerLogs(
    officerId: string,
    limit: number = 100
  ): Promise<ActivityLog[]> {
    try {
      return await offlineDb.activityLogs
        .where('officerId')
        .equals(officerId)
        .reverse()
        .sortBy('deviceTimestamp')
        .then((items) => items.slice(0, limit));
    } catch (err) {
      console.error('Error fetching officer logs from IndexedDB:', err);
      return [];
    }
  }

  /**
   * Get pending logs awaiting sync
   */
  static async getPendingLogs(officerId?: string): Promise<ActivityLog[]> {
    try {
      if (officerId) {
        return await offlineDb.activityLogs
          .where('officerId')
          .equals(officerId)
          .filter((l) => l.syncStatus === 'PENDING')
          .toArray();
      }
      return await offlineDb.activityLogs
        .where('syncStatus')
        .equals('PENDING')
        .toArray();
    } catch (err) {
      console.error('Error fetching pending logs from IndexedDB:', err);
      return [];
    }
  }
}

export default ActivityLogger;
