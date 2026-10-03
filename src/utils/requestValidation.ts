// src/utils/requestValidation.ts
// Comprehensive Validation Rules for Leave and Permission Requests in FieldSync

export const LEAVE_TYPES = [
  { id: 'annual', label: 'Annual Leave' },
  { id: 'sick', label: 'Sick Leave' },
  { id: 'emergency', label: 'Emergency Leave' },
  { id: 'personal', label: 'Personal Leave' },
  { id: 'other', label: 'Other' },
] as const;

export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return -1;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return -1;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return -1;
  return h * 60 + m;
}

export function isValidDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d.getTime());
}

export interface LeaveValidationInput {
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface PermissionValidationInput {
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

/**
 * Validates a Leave Request according to system rules
 */
export function validateLeaveRequest(
  input: LeaveValidationInput,
  existingLeaves: any[] = [],
  currentId?: string,
  userT: (key: string) => string = (k) => k
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  // 1. Leave type is required
  if (!input.type || !input.type.trim()) {
    errors.type = userT('Leave type is required.');
  } else {
    const validIds = LEAVE_TYPES.map((t) => t.id);
    if (!validIds.includes(input.type.toLowerCase() as any)) {
      errors.type = userT('Please select a valid leave type.');
    }
  }

  // 2. Start date validation
  if (!input.startDate) {
    errors.startDate = userT('Start date is required.');
  } else if (!isValidDate(input.startDate)) {
    errors.startDate = userT('Start date must be a valid calendar date (YYYY-MM-DD).');
  }

  // 3. End date validation
  if (!input.endDate) {
    errors.endDate = userT('End date is required.');
  } else if (!isValidDate(input.endDate)) {
    errors.endDate = userT('End date must be a valid calendar date (YYYY-MM-DD).');
  } else if (input.startDate && isValidDate(input.startDate) && input.endDate < input.startDate) {
    errors.endDate = userT('End date cannot be before start date.');
  }

  // 4. Reason validation
  if (!input.reason || !input.reason.trim()) {
    errors.reason = userT('Reason is required.');
  } else if (input.reason.trim().length < 5) {
    errors.reason = userT('Reason must contain meaningful text (at least 5 characters).');
  }

  // 5. Overlap / duplicate check with existing pending/approved leaves
  if (!errors.startDate && !errors.endDate) {
    const overlapping = existingLeaves.find((l) => {
      if (currentId && l.id === currentId) return false;
      const st = (l.status || '').toLowerCase();
      if (st !== 'pending' && st !== 'approved') return false;
      const s = l.startDate || l.start_date;
      const e = l.endDate || l.end_date;
      if (!s || !e) return false;
      // Overlap: newStart <= existingEnd && newEnd >= existingStart
      return input.startDate <= e && input.endDate >= s;
    });

    if (overlapping) {
      const s = overlapping.startDate || overlapping.start_date;
      const e = overlapping.endDate || overlapping.end_date;
      errors.startDate = `${userT('Overlaps with an existing')} ${overlapping.status} ${userT('leave')} (${s} - ${e}).`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates a Permission Request according to system rules
 */
export function validatePermissionRequest(
  input: PermissionValidationInput,
  existingPermissions: any[] = [],
  existingLeaves: any[] = [],
  currentId?: string,
  userT: (key: string) => string = (k) => k
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  // 1. Date validation
  if (!input.date) {
    errors.date = userT('Permission date is required.');
  } else if (!isValidDate(input.date)) {
    errors.date = userT('Permission date must be a valid calendar date (YYYY-MM-DD).');
  }

  // 2. Start time & end time validation
  const startMins = timeStringToMinutes(input.startTime);
  const endMins = timeStringToMinutes(input.endTime);

  if (!input.startTime) {
    errors.startTime = userT('Start time is required.');
  } else if (startMins < 0) {
    errors.startTime = userT('Start time must be a valid time (HH:mm).');
  }

  if (!input.endTime) {
    errors.endTime = userT('End time is required.');
  } else if (endMins < 0) {
    errors.endTime = userT('End time must be a valid time (HH:mm).');
  } else if (startMins >= 0 && endMins <= startMins) {
    errors.endTime = userT('End time must be later than start time.');
  }

  // 3. Working Hours Enforcement: 08:30 (510 min) to 17:30 (1050 min)
  const WORK_START = 510;  // 08:30
  const WORK_END = 1050;   // 17:30
  const LUNCH_START = 750; // 12:30
  const LUNCH_END = 810;   // 13:30

  if (startMins >= 0 && endMins > startMins) {
    if (startMins < WORK_START || endMins > WORK_END) {
      errors.startTime = userT('Permission time must fall within official working hours (8:30 AM – 5:30 PM).');
    } else if (startMins >= LUNCH_START && endMins <= LUNCH_END) {
      // 4. Do not allow permission requests entirely inside the lunch period
      errors.startTime = userT('Permission cannot be requested entirely during the lunch break (12:30 PM – 1:30 PM).');
    }
  }

  // 5. Reason validation
  if (!input.reason || !input.reason.trim()) {
    errors.reason = userT('Reason is required.');
  } else if (input.reason.trim().length < 5) {
    errors.reason = userT('Reason must contain meaningful text (at least 5 characters).');
  }

  // 6. Check if officer already has an active leave on this date
  if (!errors.date && input.date) {
    const activeLeave = existingLeaves.find((l) => {
      const st = (l.status || '').toLowerCase();
      if (st !== 'pending' && st !== 'approved') return false;
      const s = l.startDate || l.start_date;
      const e = l.endDate || l.end_date;
      return s && e && input.date >= s && input.date <= e;
    });

    if (activeLeave) {
      errors.date = `${userT('You already have an active leave request covering')} ${input.date}.`;
    }
  }

  // 7. Check for overlapping permissions on the same date
  if (!errors.date && !errors.startTime && !errors.endTime && startMins >= 0 && endMins > startMins) {
    const overlapping = existingPermissions.find((p) => {
      if (currentId && p.id === currentId) return false;
      const st = (p.status || '').toLowerCase();
      if (st !== 'pending' && st !== 'approved') return false;
      const pDate = p.date || p.permissionDate || p.startDate || p.start_date;
      if (pDate !== input.date) return false;

      const pStart = timeStringToMinutes(p.startTime || p.start_time);
      const pEnd = timeStringToMinutes(p.endTime || p.end_time);
      if (pStart < 0 || pEnd < 0) return false;

      // Overlap: newStart < existingEnd && newEnd > existingStart
      return startMins < pEnd && endMins > pStart;
    });

    if (overlapping) {
      const st = overlapping.startTime || overlapping.start_time;
      const et = overlapping.endTime || overlapping.end_time;
      errors.startTime = `${userT('Overlaps with an existing')} ${overlapping.status} ${userT('permission')} (${st} - ${et}).`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
