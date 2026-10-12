import crypto from 'crypto';

export function generate8Digit(): string {
  const min = 10000000;
  const max = 99999999;
  return String(crypto.randomInt(min, max + 1));
}

export function generate10Digit(): string {
  const min = 1000000000;
  const max = 9999999999;
  return String(crypto.randomInt(min, max + 1));
}

export function generateUserId(role?: string): string {
  const normalized = String(role || '').toLowerCase();
  const digits = generate8Digit();
  if (normalized.includes('sup')) {
    return `sup${digits}`;
  }
  if (normalized.includes('man') || normalized.includes('admin')) {
    return `man${digits}`;
  }
  return `off${digits}`;
}

export function generateCitizenId(): string {
  return `cit${generate8Digit()}`;
}

export function generateReportId(): string {
  return `repo${generate10Digit()}`;
}

export function generateAssignmentId(): string {
  return `tas${generate8Digit()}`;
}

export function generateNotificationId(): string {
  return `not${generate8Digit()}`;
}

export function generateAuditId(): string {
  return `aud${generate8Digit()}`;
}

export function generateSessionId(): string {
  return `ses${generate8Digit()}`;
}

export function generateVerificationId(): string {
  return `ver${generate8Digit()}`;
}

export function generateAlertId(): string {
  return `ale${generate8Digit()}`;
}
