import { getZonedTimeComponents } from '../config/workingHours';

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

export function getTodayDateString(): string {
  try {
    const { dateStr } = getZonedTimeComponents();
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  } catch {}
  return new Date().toISOString().split('T')[0];
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

export function validateLeaveRequest(
  input: LeaveValidationInput,
  existingLeaves: any[] = [],
  existingPermissions: any[] = [],
  currentId?: string,
  userT: (key: string) => string = (k) => k
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const todayStr = getTodayDateString();

  if (!input.type || !input.type.trim()) {
    errors.type = userT('Leave type is required.');
  } else {
    const validIds = LEAVE_TYPES.map((t) => t.id);
    if (!validIds.includes(input.type.toLowerCase() as any)) {
      errors.type = userT('Please select a valid leave type.');
    }
  }

  if (!input.startDate) {
    errors.startDate = userT('Start date is required.');
  } else if (!isValidDate(input.startDate)) {
    errors.startDate = userT('Start date must be a valid calendar date (YYYY-MM-DD).');
  } else if (input.startDate < todayStr) {
    errors.startDate = userT('Start date cannot be in the past.');
  }

  if (!input.endDate) {
    errors.endDate = userT('End date is required.');
  } else if (!isValidDate(input.endDate)) {
    errors.endDate = userT('End date must be a valid calendar date (YYYY-MM-DD).');
  } else if (input.endDate < todayStr) {
    errors.endDate = userT('End date cannot be in the past.');
  } else if (input.startDate && isValidDate(input.startDate) && input.endDate < input.startDate) {
    errors.endDate = userT('End date cannot be before start date.');
  }

  if (!input.reason || !input.reason.trim()) {
    errors.reason = userT('Reason is required.');
  } else if (input.reason.trim().length < 5) {
    errors.reason = userT('Reason must contain meaningful text (at least 5 characters).');
  }

  if (!errors.startDate && !errors.endDate) {
    // 1. Check overlap with existing leaves
    const overlapping = existingLeaves.find((l) => {
      if (currentId && l.id === currentId) return false;
      const st = (l.status || '').toLowerCase();
      if (st !== 'pending' && st !== 'approved' && st !== 'active') return false;
      const s = l.startDate || l.start_date;
      const e = l.endDate || l.end_date;
      if (!s || !e) return false;

      return input.startDate <= e && input.endDate >= s;
    });

    if (overlapping) {
      const s = overlapping.startDate || overlapping.start_date;
      const e = overlapping.endDate || overlapping.end_date;
      errors.startDate = `${userT('Overlaps with an existing')} ${overlapping.status} ${userT('leave')} (${s} - ${e}).`;
    }

    // 2. Check duplication/conflict with existing permissions in the requested leave date range
    if (!errors.startDate) {
      const conflictingPerm = existingPermissions.find((p) => {
        if (currentId && p.id === currentId) return false;
        const st = (p.status || '').toLowerCase();
        if (st !== 'pending' && st !== 'approved' && st !== 'active') return false;
        const pDate = p.date || p.permissionDate || p.startDate || p.start_date;
        if (!pDate) return false;

        return pDate >= input.startDate && pDate <= input.endDate;
      });

      if (conflictingPerm) {
        const pDate = conflictingPerm.date || conflictingPerm.permissionDate || conflictingPerm.startDate || conflictingPerm.start_date;
        const pStart = conflictingPerm.startTime || conflictingPerm.start_time || '';
        const pEnd = conflictingPerm.endTime || conflictingPerm.end_time || '';
        const timeInfo = pStart && pEnd ? ` (${pStart} - ${pEnd})` : '';
        errors.startDate = `${userT('Duplicate conflict: You already requested permission on')} ${pDate}${timeInfo}. ${userT('Cannot request leave on the same date as a permission.')}`;
      }
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
  const todayStr = getTodayDateString();

  // 1. Date validation (cannot be in the past)
  if (!input.date) {
    errors.date = userT('Permission date is required.');
  } else if (!isValidDate(input.date)) {
    errors.date = userT('Permission date must be a valid calendar date (YYYY-MM-DD).');
  } else if (input.date < todayStr) {
    errors.date = userT('Permission date cannot be in the past.');
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
      errors.startTime = userT('Permission cannot be requested entirely during the lunch break (12:30 PM – 1:30 PM).');
    }
  }

  // 4. Reason validation
  if (!input.reason || !input.reason.trim()) {
    errors.reason = userT('Reason is required.');
  } else if (input.reason.trim().length < 5) {
    errors.reason = userT('Reason must contain meaningful text (at least 5 characters).');
  }

  // 5. Check duplication with active leaves covering this date
  if (!errors.date && input.date) {
    const activeLeave = existingLeaves.find((l) => {
      if (currentId && l.id === currentId) return false;
      const st = (l.status || '').toLowerCase();
      if (st !== 'pending' && st !== 'approved' && st !== 'active') return false;
      const s = l.startDate || l.start_date;
      const e = l.endDate || l.end_date;
      return s && e && input.date >= s && input.date <= e;
    });

    if (activeLeave) {
      const s = activeLeave.startDate || activeLeave.start_date;
      const e = activeLeave.endDate || activeLeave.end_date;
      errors.date = `${userT('Duplicate conflict: You already have a')} ${activeLeave.status} ${userT('leave request covering')} ${input.date} (${s} - ${e}). ${userT('Cannot request permission on a date where you already have a leave.')}`;
    }
  }

  // 6. Check for overlapping permissions on the same date
  if (!errors.date && !errors.startTime && !errors.endTime && startMins >= 0 && endMins > startMins) {
    const overlapping = existingPermissions.find((p) => {
      if (currentId && p.id === currentId) return false;
      const st = (p.status || '').toLowerCase();
      if (st !== 'pending' && st !== 'approved' && st !== 'active') return false;
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
