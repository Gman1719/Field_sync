import Dexie, { type Table } from 'dexie';
import {
  LocalCitizenRecord,
  SyncQueueItem,
  CachedGeographyItem,
  Assignment,
  ActivityLogItem,
  WorkSessionItem,
  DailyWorkReportItem,
  SyncErrorItem,
} from '../types/index.ts';

export class FieldSyncLocalDB extends Dexie {
  citizens!: Table<LocalCitizenRecord, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  cachedGeography!: Table<CachedGeographyItem, string>;
  assignments!: Table<Assignment, string>;
  activityLogs!: Table<ActivityLogItem, string>;
  workSessions!: Table<WorkSessionItem, string>;
  dailyWorkReports!: Table<DailyWorkReportItem, string>;
  syncErrors!: Table<SyncErrorItem, string>;

  constructor() {
    super('FieldSyncLocalDB');

    this.version(1).stores({
      citizens:
        'clientRecordId, id, fullName, dateOfBirth, gender, phoneNumber, regionId, zoneId, woredaId, kebeleId, syncStatus, registeredById, createdAt, [syncStatus+createdAt]',
      syncQueue:
        '++id, clientRecordId, entityType, status, retryCount, createdAt, [status+retryCount]',
      cachedGeography: 'key, cachedAt',
    });

    this.version(2).stores({
      citizens:
        'clientRecordId, id, fullName, dateOfBirth, gender, phoneNumber, regionId, zoneId, woredaId, kebeleId, syncStatus, registeredById, createdAt, [syncStatus+createdAt]',
      syncQueue:
        '++id, clientRecordId, entityType, status, retryCount, createdAt, [status+retryCount]',
      cachedGeography: 'key, cachedAt',
      assignments: 'id, assignedOfficerId, status, startDate, endDate',
      activityLogs:
        'id, officerId, assignmentId, eventType, deviceTimestamp, syncStatus, [officerId+syncStatus], [officerId+deviceTimestamp]',
      workSessions:
        'id, officerId, assignmentId, reportDate, startedAt, syncStatus, [officerId+reportDate]',
      dailyWorkReports:
        'id, officerId, reportDate, assignmentId, syncStatus, [officerId+reportDate]',
      syncErrors: 'id, officerId, entityType, recordId, resolved, createdAt',
    });
  }
}

export const db = new FieldSyncLocalDB();
export default db;

