// server/src/utils/idGenerator.ts
// Standardized ID generator for FieldSync backend
// Formats:
// - Supervisor:  sup + 8 digits (e.g. sup12345678)
// - Officer:     off + 8 digits (e.g. off12345678)
// - Manager:     man + 8 digits (e.g. man12345678)
// - Report:      repo + 10 digits (e.g. repo1234567890)
// - Citizen:     cit + 8 digits (e.g. cit12345678)
// - Others:      first 3 letters + 8 digits

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
