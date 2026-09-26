// Core TypeScript Domain Interfaces for FieldSync (Phase 1)

export type Role = 'field_officer' | 'supervisor' | 'manager';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'NEEDS_REVIEW';

export type DuplicateReviewStatus =
  | 'NO_DUPLICATE_DETECTED'
  | 'POSSIBLE_DUPLICATE'
  | 'NEEDS_REVIEW'
  | 'CONFIRMED_DUPLICATE'
  | 'APPROVED_AS_DIFFERENT';

export type AssignmentStatus =
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

// Geographic Administrative Hierarchy
export interface Region {
  id: string;
  name: string;
  code: string;
  description?: string;
  type?: 'region' | 'chartered_city';
}

export interface Zone {
  id: string;
  name: string;
  code: string;
  regionId: string;
  description?: string;
}

export interface Woreda {
  id: string;
  name: string;
  code: string;
  zoneId: string;
  description?: string;
}

export interface Kebele {
  id: string;
  name: string;
  code: string;
  woredaId: string;
  description?: string;
}

// User Profile
export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  phoneNumber?: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  regionId?: string | null;
  zoneId?: string | null;
  woredaId?: string | null;
  kebeleId?: string | null;
  region?: string;
  zone?: string;
  woreda?: string;
  kebele?: string;
  supervisorId?: string | null;
  supervisorName?: string | null;
  createdAt?: string;
  lastLogin?: string | null;
}

// Citizen Registration Model with Full Address Hierarchy
export interface Citizen {
  id: string;                           // Generated UUID
  clientRecordId: string;               // Stable client-generated UUID for idempotent synchronization
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth?: string;
  age?: number;
  gender: Gender;
  maritalStatus?: string;
  phoneNumber?: string;
  email?: string;
  nationalId?: string;
  alternativePhone?: string;

  // Complete Administrative Address Hierarchy
  regionId: string;
  zoneId: string;
  woredaId: string;
  kebeleId: string;
  village: string;                      // Village or Community name

  // Denormalized strings for display and offline caching
  regionName?: string;
  zoneName?: string;
  woredaName?: string;
  kebeleName?: string;

  registeredById: string;
  assignmentId?: string | null;
  syncStatus: SyncStatus;
  duplicateReviewStatus: DuplicateReviewStatus;
  registrationTimestamp: string;
  registrationDate?: string;
  createdAt: string;
  synced?: boolean;
  [key: string]: any;
}

// Assignment Model
export interface Assignment {
  id: string;
  title: string;
  description?: string;
  targetCount: number;
  status: AssignmentStatus;
  assignedOfficerId: string;
  assignedSupervisorId?: string | null;
  regionId?: string | null;
  zoneId?: string | null;
  woredaId?: string | null;
  kebeleId?: string | null;
  startDate: string;
  endDate?: string | null;
}

// Activity Log Model
export interface ActivityLog {
  id: string;
  officerId: string;
  assignmentId?: string | null;
  eventType: string;
  description: string;
  deviceTimestamp: string;
  relatedRecordId?: string | null;
  metadata?: Record<string, unknown> | null;
  syncStatus: SyncStatus;
}

// Work Session Model
export interface WorkSession {
  id: string;
  officerId: string;
  assignmentId?: string | null;
  reportDate: string;
  startedAt: string;
  endedAt?: string | null;
  durationSeconds: number;
  deviceReported: boolean;
  syncStatus: SyncStatus;
}

// Screen Time Statuses
export type ScreenTimeStatus =
  | 'NOT_STARTED'
  | 'TRACKING'
  | 'NOT_TRACKING'
  | 'VERIFICATION_PENDING'
  | 'FINALIZED';

// Work Verification Statuses
export type VerificationStatus =
  | 'SCHEDULED'
  | 'PENDING'
  | 'CONFIRMED'
  | 'MISSED'
  | 'CONFIRMED_OFFLINE'
  | 'MISSED_OFFLINE'
  | 'NO_ACTIVE_SESSION'
  | 'NO_ACTIVE_CONNECTION'
  | 'SYNC_PENDING'
  | 'SYNC_FAILED'
  | 'SYNCED';

export type VerificationFailureReason =
  | 'NO_RESPONSE'
  | 'NO_ACTIVE_SESSION'
  | 'NO_ACTIVE_CONNECTION'
  | 'CLIENT_NOT_AVAILABLE'
  | 'TAB_HIDDEN'
  | 'NETWORK_UNAVAILABLE'
  | 'SESSION_NOT_ACTIVE';

export type ConnectionState = 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
export type LoginState = 'LOGGED_IN' | 'LOGGED_OUT' | 'SESSION_EXPIRED' | 'UNKNOWN';

// Daily Screen Time Model
export interface DailyScreenTime {
  id: string;
  officerId: string;
  workSessionId?: string | null;
  date: string; // YYYY-MM-DD
  startedAt?: string | null;
  finalizedAt?: string | null;
  totalEligibleSeconds: number;
  status: ScreenTimeStatus;
  lastActivityAt?: string | null;
  lastSyncedAt?: string | null;
  syncStatus?: SyncStatus;
}

// Work Verification Model
export interface WorkVerification {
  id: string;
  officerId: string;
  officerName?: string;
  workSessionId?: string | null;
  scheduledAt: string;
  triggeredAt?: string | null;
  respondedAt?: string | null;
  deadlineAt: string;
  status: VerificationStatus;
  responseTimeSeconds?: number | null;
  failureReason?: VerificationFailureReason | null;
  connectionState: ConnectionState;
  loginState: LoginState;
  trackingStateBefore?: ScreenTimeStatus | null;
  trackingStateAfter?: ScreenTimeStatus | null;
  offlineCreated?: boolean;
  syncStatus: SyncStatus;
  syncedAt?: string | null;
  date: string;
  notes?: string | null;
}

// Daily Work Report Model
export interface DailyWorkReport {
  id: string;
  officerId: string;
  officerName?: string;
  officerEmail?: string;
  officerWoreda?: string;
  supervisorId?: string | null;
  supervisorName?: string;
  reportDate: string;
  assignmentId?: string | null;
  citizenCountLocal: number;
  citizenCountServerConfirmed: number;
  activityCount: number;
  sessionCount: number;
  screenTimeSeconds: number;
  screenTimeFormatted?: string;
  comments?: string | null;
  summary?: string;
  achievements?: string;
  challenges?: string;
  resources?: string;
  nextDayPlan?: string;
  isUrgent?: boolean;
  urgentReason?: string;
  submittedAt: string;
  syncStatus: SyncStatus;
}

// Synchronization Queue Item Model
export interface SyncQueueItem {
  id: string; // Queue Item UUID
  entityType: 'citizen' | 'activity_log' | 'work_session' | 'daily_report';
  entityId: string;
  payload: any;
  queuedAt: string;
  attempts: number;
  maxRetries: number;
  status: 'PENDING' | 'SYNCING' | 'FAILED' | 'RESOLVED';
  lastError?: string | null;
}

// Synchronization Error Record Model
export interface SyncErrorRecord {
  id: string; // Error Record UUID
  officerId: string;
  entityType: string;
  entityId: string;
  errorMessage: string;
  errorCode?: string;
  retryCount: number;
  timestamp: string;
  resolved: boolean;
}

// In-App Role-Based Notification Models
export type NotificationPriority = 'NORMAL' | 'IMPORTANT' | 'URGENT';

export interface AppNotification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  type: string;
  priority: NotificationPriority;
  isRead: boolean;
  readAt?: string | null;
  relatedRecordId?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}
export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  conversationId: string;
  text: string;
  senderName: string;
  senderRole: 'manager' | 'supervisor';
  timestamp: string;
  isRead: boolean;
  status: 'sent' | 'delivered' | 'read';
  reactions?: Record<string, string[]>;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  attachment?: {
    name: string;
    type: string;
    size?: string;
    url?: string;
    dataUrl?: string;
  };
}
