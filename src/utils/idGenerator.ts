// src/utils/idGenerator.ts
// Universal, Unique ID Generation Utility for FieldSync
//
// Rules specified by system requirements:
// 1. Supervisor: 'sup' + 8 numeric digits (e.g. sup12345678)
// 2. Field Officer: 'off' + 8 numeric digits (e.g. off12345678)
// 3. Manager: 'man' + 8 numeric digits (e.g. man12345678)
// 4. Daily Work Report: 'repo' + 10 numeric digits (e.g. repo1234567890)
// 5. All other entities in system: first 3 letters + 8 numeric digits:
//    - Citizen: 'cit' + 8 digits (e.g. cit12345678)
//    - Task: 'tas' + 8 digits (e.g. tas12345678)
//    - Leave: 'lea' + 8 digits (e.g. lea12345678)
//    - Permission: 'per' + 8 digits (e.g. per12345678)
//    - Alert: 'ale' + 8 digits (e.g. ale12345678)
//    - Notification: 'not' + 8 digits (e.g. not12345678)
//    - Attendance: 'att' + 8 digits (e.g. att12345678)
//    - Verification: 'ver' + 8 digits (e.g. ver12345678)
//    - Session: 'ses' + 8 digits (e.g. ses12345678)
//    - Audit/Activity: 'aud' + 8 digits (e.g. aud12345678)
//    - Chat Message: 'msg' + 8 digits (e.g. msg12345678)
//    - Sync Queue: 'syn' + 8 digits (e.g. syn12345678)

/**
 * Generates an 8-digit cryptographically unique numeric string in range [10000000, 99999999].
 */
export function generate8Digit(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const uint = new Uint32Array(1);
    crypto.getRandomValues(uint);
    const num = 10000000 + (uint[0] % 90000000);
    return num.toString();
  }
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

/**
 * Generates a 10-digit cryptographically unique numeric string in range [1000000000, 9999999999].
 */
export function generate10Digit(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const uint = new Uint32Array(2);
    crypto.getRandomValues(uint);
    const combined = (BigInt(uint[0]) << 32n) | BigInt(uint[1]);
    const num = 1000000000n + (combined % 9000000000n);
    return num.toString();
  }
  const p1 = Math.floor(10000 + Math.random() * 90000).toString();
  const p2 = Math.floor(10000 + Math.random() * 90000).toString();
  return `${p1}${p2}`;
}

/**
 * Generic generator using first 3 characters of prefix + 8 numeric digits.
 */
export function generateId(prefix: string, digitCount: number = 8): string {
  const cleanPrefix = (prefix || 'rec').slice(0, 3).toLowerCase();
  const digits = digitCount === 10 ? generate10Digit() : generate8Digit();
  return `${cleanPrefix}${digits}`;
}

/**
 * Role-based User ID Generator:
 * - supervisor: 'sup' + 8 digits
 * - field_officer: 'off' + 8 digits
 * - manager: 'man' + 8 digits
 */
export function generateUserId(role: 'supervisor' | 'field_officer' | 'manager' | string = 'field_officer'): string {
  const norm = (role || '').toLowerCase();
  if (norm.includes('super')) return `sup${generate8Digit()}`;
  if (norm.includes('man')) return `man${generate8Digit()}`;
  return `off${generate8Digit()}`;
}

/**
 * Citizen ID: 'cit' + 8 digits
 */
export function generateCitizenId(): string {
  return `cit${generate8Digit()}`;
}

/**
 * Daily Work Report ID: 'repo' + 10 digits
 */
export function generateReportId(): string {
  return `repo${generate10Digit()}`;
}

/**
 * Task / Assignment ID: 'tas' + 8 digits
 */
export function generateTaskId(): string {
  return `tas${generate8Digit()}`;
}

/**
 * Leave Request ID: 'lea' + 8 digits
 */
export function generateLeaveId(): string {
  return `lea${generate8Digit()}`;
}

/**
 * Permission Request ID: 'per' + 8 digits
 */
export function generatePermissionId(): string {
  return `per${generate8Digit()}`;
}

/**
 * Alert ID: 'ale' + 8 digits
 */
export function generateAlertId(): string {
  return `ale${generate8Digit()}`;
}

/**
 * Notification ID: 'not' + 8 digits
 */
export function generateNotificationId(): string {
  return `not${generate8Digit()}`;
}

/**
 * Attendance ID: 'att' + 8 digits
 */
export function generateAttendanceId(): string {
  return `att${generate8Digit()}`;
}

/**
 * Verification ID: 'ver' + 8 digits
 */
export function generateVerificationId(): string {
  return `ver${generate8Digit()}`;
}

/**
 * Work Session ID: 'ses' + 8 digits
 */
export function generateSessionId(): string {
  return `ses${generate8Digit()}`;
}

/**
 * Audit / Activity Log ID: 'aud' + 8 digits
 */
export function generateAuditId(): string {
  return `aud${generate8Digit()}`;
}

/**
 * Chat Message ID: 'msg' + 8 digits
 */
export function generateMessageId(): string {
  return `msg${generate8Digit()}`;
}

/**
 * Formats any existing user object into a clean, concise, standardized ID:
 * - Supervisor: supXXXXXXXX
 * - Officer: offXXXXXXXX
 * - Manager: manXXXXXXXX
 */
export function formatDisplayUserId(user?: any): string {
  if (!user) return 'off00000000';

  const empId = user.employeeId || '';
  if (/^(sup|off|man)\d{8}$/i.test(empId)) {
    return empId.toLowerCase();
  }

  const rawId = user.id || '';
  if (/^(sup|off|man)\d{8}$/i.test(rawId)) {
    return rawId.toLowerCase();
  }

  const role = (user.role || 'field_officer').toLowerCase();
  const prefix = role.includes('super') ? 'sup' : role.includes('man') ? 'man' : 'off';

  // Create deterministic 8-digit number from user ID / email
  const seed = `${user.id || ''}:${user.email || ''}:${user.employeeId || ''}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const numeric = (10000000 + (Math.abs(hash) % 90000000)).toString();
  return `${prefix}${numeric}`;
}
