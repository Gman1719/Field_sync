// Offline-First IndexedDB Database using Dexie.js for FieldSync (Phase 3)

import Dexie, { type EntityTable } from 'dexie';
import type {
  Citizen,
  Region,
  Zone,
  Woreda,
  Kebele,
  ActivityLog,
  WorkSession,
  DailyWorkReport,
  Assignment,
  User,
  SyncQueueItem,
  SyncErrorRecord,
  AppNotification,
  DailyScreenTime,
  WorkVerification,
  ChatMessage,
} from '../types/index';

export class FieldSyncDatabase extends Dexie {
  citizens!: EntityTable<Citizen, 'clientRecordId'>;
  regions!: EntityTable<Region, 'id'>;
  zones!: EntityTable<Zone, 'id'>;
  woredas!: EntityTable<Woreda, 'id'>;
  kebeles!: EntityTable<Kebele, 'id'>;
  activityLogs!: EntityTable<ActivityLog, 'id'>;
  workSessions!: EntityTable<WorkSession, 'id'>;
  dailyWorkReports!: EntityTable<DailyWorkReport, 'id'>;
  assignments!: EntityTable<Assignment, 'id'>;
  users!: EntityTable<User, 'id'>;
  syncQueue!: EntityTable<SyncQueueItem, 'id'>;
  syncErrors!: EntityTable<SyncErrorRecord, 'id'>;
  notifications!: EntityTable<AppNotification, 'id'>;
  dailyScreenTimes!: EntityTable<DailyScreenTime, 'id'>;
  workVerifications!: EntityTable<WorkVerification, 'id'>;

  chatMessages!: EntityTable<ChatMessage, 'id'>;

  constructor() {
    super('FieldSyncOfflineDB');

    // Schema definition for offline-first store
    this.version(1).stores({
      citizens: 'clientRecordId, id, registeredById, regionId, zoneId, woredaId, kebeleId, syncStatus, duplicateReviewStatus, registrationTimestamp',
      regions: 'id, code, name',
      zones: 'id, regionId, code, name',
      woredas: 'id, zoneId, code, name',
      kebeles: 'id, woredaId, code, name',
      activityLogs: 'id, officerId, assignmentId, eventType, syncStatus, deviceTimestamp',
      workSessions: 'id, officerId, reportDate, syncStatus, startedAt',
      dailyWorkReports: 'id, officerId, reportDate, syncStatus, submittedAt',
      assignments: 'id, assignedOfficerId, assignedSupervisorId, status',
      users: 'id, email, role, isActive',
    });

    this.version(2).stores({
      syncQueue: 'id, entityType, entityId, status, queuedAt',
      syncErrors: 'id, officerId, entityType, entityId, timestamp, resolved',
    });

    this.version(3).stores({
      notifications: 'id, recipientId, isRead, priority, type, createdAt',
    });

    this.version(4).stores({
      dailyScreenTimes: 'id, officerId, date, status, syncStatus',
      workVerifications: 'id, officerId, scheduledAt, deadlineAt, status, syncStatus, date',
    });

    this.version(5).stores({
      chatMessages: 'id, senderId, receiverId, conversationId, timestamp, isRead, status',
    });
  }
}

export const offlineDb = new FieldSyncDatabase();
export default offlineDb;
