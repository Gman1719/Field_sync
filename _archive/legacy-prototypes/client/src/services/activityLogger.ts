import db from '../db/index.ts';
import { ActivityEventType, ActivityLogItem } from '../types/index.ts';

export interface LogEventOptions {
  officerId: string;
  assignmentId?: string | null;
  relatedRecordId?: string | null;
  metadata?: Record<string, any> | null;
  timestamp?: Date;
}

export class ActivityLogger {
  /**
   * Automatically records a fieldwork activity event into IndexedDB and enqueues for synchronization.
   * Works 100% offline. Never requires internet access.
   */
  static async logEvent(
    eventType: ActivityEventType | string,
    description: string,
    options: LogEventOptions
  ): Promise<ActivityLogItem> {
    const eventId = crypto.randomUUID();
    const deviceTimestamp = options.timestamp
      ? options.timestamp.toISOString()
      : new Date().toISOString();

    const logItem: ActivityLogItem = {
      id: eventId,
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
      // 1. Immediately persist to Dexie activityLogs
      await db.activityLogs.put(logItem);

      // 2. Add to syncQueue
      await db.syncQueue.add({
        clientRecordId: eventId,
        entityType: 'ACTIVITY_LOG',
        action: 'CREATE',
        payload: {
          id: eventId,
          officerId: options.officerId,
          assignmentId: options.assignmentId || null,
          eventType,
          description,
          deviceTimestamp,
          relatedRecordId: options.relatedRecordId || null,
          metadata: options.metadata || null,
        },
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to record activity log locally:', err);
    }

    return logItem;
  }

  /**
   * Retrieve activity logs for an officer from Dexie
   */
  static async getOfficerLogs(
    officerId: string,
    limit: number = 50
  ): Promise<ActivityLogItem[]> {
    try {
      return await db.activityLogs
        .where('officerId')
        .equals(officerId)
        .reverse()
        .sortBy('deviceTimestamp')
        .then((logs) => logs.slice(0, limit));
    } catch (err) {
      console.error('Failed to get officer logs from IndexedDB:', err);
      return [];
    }
  }

  /**
   * Count pending activity logs awaiting synchronization
   */
  static async getPendingLogsCount(officerId: string): Promise<number> {
    try {
      return await db.activityLogs
        .where('[officerId+syncStatus]')
        .equals([officerId, 'PENDING'])
        .count();
    } catch (err) {
      return 0;
    }
  }
}

export default ActivityLogger;
