// FieldSync Core Frontend TypeScript Interfaces with 4-Tier Geographic Hierarchy (Region -> Zone -> Woreda -> Kebele)

export type Role = 'FIELD_OFFICER' | 'SUPERVISOR' | 'MANAGER';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'NEEDS_REVIEW';

export interface Region {
  id: string;
  name: string;
  code: string;
  description?: string | null;
}

export interface Zone {
  id: string;
  name: string;
  code: string;
  regionId: string;
  description?: string | null;
}

export interface Woreda {
  id: string;
  name: string;
  code: string;
  zoneId: string;
  description?: string | null;
}

export interface Kebele {
  id: string;
  name: string;
  code: string;
  woredaId: string;
  description?: string | null;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  phoneNumber?: string | null;
  regionId?: string | null;
  zoneId?: string | null;
  woredaId?: string | null;
  kebeleId?: string | null;
  supervisorId?: string | null;
  region?: { id: string; name: string; code?: string } | null;
  zone?: { id: string; name: string; code?: string } | null;
  woreda?: { id: string; name: string; code?: string } | null;
  kebele?: { id: string; name: string; code?: string } | null;
  supervisor?: { id: string; fullName: string; email?: string } | null;
  isActive: boolean;
  createdAt: string;
}

export interface Citizen {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: Gender;
  phoneNumber?: string | null;
  address: string;
  regionId: string;
  zoneId: string;
  woredaId: string;
  kebeleId: string;
  regionName?: string;
  zoneName?: string;
  woredaName?: string;
  kebeleName?: string;
  photoUrl?: string | null;
  registeredById: string;
  registeredByName?: string;
  clientRecordId: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LocalCitizenRecord {
  clientRecordId: string; // Device-generated primary key
  id?: string; // Server-assigned ID (when synced)
  fullName: string;
  dateOfBirth: string;
  gender: Gender;
  phoneNumber?: string | null;
  address: string;
  regionId: string;
  zoneId: string;
  woredaId: string;
  kebeleId: string;
  regionName?: string;
  zoneName?: string;
  woredaName?: string;
  kebeleName?: string;
  photoUrl?: string | null;
  registeredById: string;
  registeredByName?: string;
  syncStatus: SyncStatus;
  syncAttempts: number;
  lastSyncError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncQueueItem {
  id?: number;
  clientRecordId: string;
  entityType: 'CITIZEN' | 'ACTIVITY_LOG' | 'WORK_SESSION' | 'DAILY_REPORT';
  action: 'CREATE' | 'UPDATE';
  payload: any;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  retryCount: number;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CachedGeographyItem {
  key: string;
  data: any;
  cachedAt: string;
}

export interface NavItem {
  title: string;
  path: string;
  icon: string;
  badge?: string | number;
  roles: Role[];
}

export type AssignmentStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface Assignment {
  id: string;
  title: string;
  description?: string | null;
  targetCount: number;
  status: AssignmentStatus;
  assignedOfficerId: string;
  assignedSupervisorId?: string | null;
  woredaId?: string | null;
  kebeleId?: string | null;
  startDate: string;
  endDate?: string | null;
  assignedOfficer?: { id: string; fullName: string; email: string; phoneNumber?: string | null };
  assignedSupervisor?: { id: string; fullName: string; email?: string };
  woreda?: { id: string; name: string };
  kebele?: { id: string; name: string };
  createdAt?: string;
  updatedAt?: string;
}

export type ActivityEventType =
  | 'ASSIGNMENT_STARTED'
  | 'ASSIGNMENT_PAUSED'
  | 'ASSIGNMENT_RESUMED'
  | 'ASSIGNMENT_COMPLETED'
  | 'CITIZEN_REGISTRATION_STARTED'
  | 'CITIZEN_REGISTRATION_COMPLETED'
  | 'CITIZEN_REGISTRATION_SAVED_OFFLINE'
  | 'REGISTRATION_VALIDATION_FAILED'
  | 'REGISTRATION_SYNC_SUCCEEDED'
  | 'REGISTRATION_SYNC_FAILED'
  | 'PROGRESS_MILESTONE_REACHED'
  | 'DAILY_REPORT_DRAFTED'
  | 'DAILY_REPORT_SUBMITTED'
  | 'SYNC_STARTED'
  | 'SYNC_COMPLETED'
  | 'SYNC_FAILED';

export interface ActivityLogItem {
  id: string; // Device UUID
  officerId: string;
  assignmentId?: string | null;
  eventType: ActivityEventType | string;
  description: string;
  deviceTimestamp: string;
  serverReceivedAt?: string;
  relatedRecordId?: string | null;
  metadata?: Record<string, any> | null;
  syncStatus: SyncStatus;
}

export interface WorkSessionItem {
  id: string; // Device UUID
  officerId: string;
  assignmentId?: string | null;
  reportDate: string; // YYYY-MM-DD
  startedAt: string;
  endedAt?: string | null;
  durationSeconds: number;
  deviceReported: boolean;
  serverReceivedAt?: string;
  syncStatus: SyncStatus;
}

export type DailyReportStatus =
  | 'Draft'
  | 'Submitted — Pending Sync'
  | 'Syncing'
  | 'Synced'
  | 'Sync Failed';

export interface DailyWorkReportItem {
  id: string; // Device UUID
  officerId: string;
  supervisorId?: string | null;
  reportDate: string; // YYYY-MM-DD
  assignmentId?: string | null;
  citizenCountLocal: number;
  citizenCountServerConfirmed: number;
  activityCount: number;
  sessionCount: number;
  screenTimeSeconds: number;
  comments?: string | null;
  submittedAt: string;
  serverReceivedAt?: string;
  syncStatus: SyncStatus;
  isLocked?: boolean;
  officer?: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber?: string | null;
    region?: { name: string };
    woreda?: { name: string };
    kebele?: { name: string };
  };
  supervisor?: { id: string; fullName: string; email?: string };
  assignment?: { id: string; title: string; description?: string | null };
}

export interface SyncErrorItem {
  id: string;
  officerId: string;
  entityType: string;
  recordId: string;
  errorMessage: string;
  errorDetails?: any;
  resolved: boolean;
  createdAt: string;
}


