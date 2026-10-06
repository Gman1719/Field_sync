// Reusable Offline Activity Logger for FieldSync
// Catches and records all user work across all roles (Officer, Supervisor, Manager, Admin)
// Works 100% offline-first and automatically queues/syncs to PostgreSQL

import { offlineDb } from '../db/offlineDb';
import { API_BASE } from '../config/api';
import type { ActivityLog } from '../types/index';
import { generateAuditId, generateId } from '../utils/idGenerator';

export type ActivityEventType =
  | 'ASSIGNMENT_STARTED'
  | 'ASSIGNMENT_PAUSED'
  | 'ASSIGNMENT_RESUMED'
  | 'ASSIGNMENT_COMPLETED'
  | 'CITIZEN_REGISTRATION_STARTED'
  | 'CITIZEN_REGISTRATION_COMPLETED'
  | 'CITIZEN_REGISTERED'
  | 'CITIZEN_REGISTRATION_SAVED_OFFLINE'
  | 'REGISTRATION_VALIDATION_FAILED'
  | 'REGISTRATION_SYNC_SUCCEEDED'
  | 'REGISTRATION_SYNC_FAILED'
  | 'PROGRESS_MILESTONE_REACHED'
  | 'DAILY_REPORT_DRAFTED'
  | 'DAILY_REPORT_SUBMITTED'
  | 'ASSIGNMENT_COMPLETION_REPORTED'
  | 'TASK_ASSIGNED'
  | 'SUPERVISOR_EVALUATION'
  | 'SUPERVISOR_REPORT'
  | 'OFFICER_ALERT_SENT'
  | 'ATTENDANCE_RECORDED'
  | 'ATTENDANCE_CHECK_IN'
  | 'ATTENDANCE_CHECK_OUT'
  | 'VERIFICATION_CONFIRMED'
  | 'VERIFICATION_MISSED'
  | 'VERIFICATION_SUBMITTED'
  | 'LEAVE_REQUESTED'
  | 'LEAVE_REVIEWED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'PERMISSION_REQUESTED'
  | 'PERMISSION_REVIEWED'
  | 'PERMISSION_APPROVED'
  | 'PERMISSION_REJECTED'
  | 'USER_CREATED'
  | 'USER_STATUS_CHANGE'
  | 'ROLE_AND_LOCATION_CHANGE'
  | 'WORKSTATION_REASSIGNED'
  | 'USER_ROLE_CHANGED'
  | 'USER_PROFILE_UPDATED'
  | 'USER_PASSWORD_RESET'
  | 'PROFILE_UPDATED'
  | 'PASSWORD_CHANGED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'SYNC_STARTED'
  | 'SYNC_COMPLETED'
  | 'SYNC_FAILED'
  | 'DATA_SYNC_SUCCESSFUL'
  | 'WORK_SESSION_STARTED'
  | 'WORK_SESSION_PAUSED'
  | 'WORK_SESSION_RESUMED'
  | 'WORK_SESSION_ENDED'
  | string;

export interface LogEventOptions {
  officerId?: string;
  officerName?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  woredaName?: string;
  assignmentId?: string | null;
  relatedRecordId?: string | null;
  metadata?: Record<string, unknown> | null;
  deviceTimestamp?: string;
  [key: string]: any;
}

export class ActivityLogger {
  /**
   * Helper to retrieve currently authenticated user from localStorage if not explicitly supplied
   */
  private static getFallbackUser() {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('fieldsync_user');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  /**
   * Automatically records a fieldwork/system activity event into IndexedDB and marks for sync.
   * Works 100% offline. Never requires internet access.
   */
  static async log(
    eventType: ActivityEventType,
    description: string,
    options?: LogEventOptions
  ): Promise<ActivityLog> {
    const fallbackUser = ActivityLogger.getFallbackUser();
    const id = generateAuditId();
    const deviceTimestamp = options?.deviceTimestamp || new Date().toISOString();

    const resolvedOfficerId =
      options?.officerId ||
      options?.userId ||
      fallbackUser?.id ||
      fallbackUser?.employeeId ||
      'staff';

    const resolvedOfficerName =
      options?.officerName ||
      options?.userName ||
      fallbackUser?.name ||
      fallbackUser?.fullName ||
      fallbackUser?.email ||
      'Staff Member';

    const resolvedWoredaName =
      options?.woredaName ||
      fallbackUser?.woreda?.name ||
      fallbackUser?.region ||
      undefined;

    const logItem: ActivityLog = {
      id,
      officerId: resolvedOfficerId,
      officerName: resolvedOfficerName,
      woredaName: resolvedWoredaName,
      assignmentId: options?.assignmentId || null,
      eventType,
      description,
      deviceTimestamp,
      relatedRecordId: options?.relatedRecordId || null,
      metadata: {
        ...(options?.metadata || {}),
        userName: resolvedOfficerName,
        userRole: options?.userRole || fallbackUser?.role,
      },
      syncStatus: 'PENDING',
    };

    try {
      // 1. Immediately store in IndexedDB activityLogs
      await offlineDb.activityLogs.put(logItem);

      // 2. Add to IndexedDB syncQueue for background sync
      await offlineDb.syncQueue.put({
        id: generateId('syn'),
        entityType: 'activity_log',
        entityId: id,
        payload: logItem,
        queuedAt: new Date().toISOString(),
        attempts: 0,
        maxRetries: 5,
        status: 'PENDING',
      });

      // 3. Dispatch reactive event so open UI components immediately refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fieldsync-activity-logged', { detail: logItem }));
      }

      // 4. If online, fire-and-forget push to central PostgreSQL API
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const token = localStorage.getItem('fieldsync_token');
        fetch(`${API_BASE}/activity-logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            id: logItem.id,
            officerId: logItem.officerId,
            officerName: logItem.officerName,
            eventType: logItem.eventType,
            description: logItem.description,
            deviceTimestamp: logItem.deviceTimestamp,
            metadata: logItem.metadata,
          }),
        })
          .then((res) => {
            if (res.ok) {
              offlineDb.activityLogs.update(id, { syncStatus: 'SYNCED' }).catch(() => {});
            }
          })
          .catch(() => {});
      }
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
      const all = await offlineDb.activityLogs.toArray();
      return all
        .filter((l) => l.officerId === officerId)
        .sort((a, b) => new Date(b.deviceTimestamp).getTime() - new Date(a.deviceTimestamp).getTime())
        .slice(0, limit);
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
