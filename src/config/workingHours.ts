// src/config/workingHours.ts
// Centralized Ethiopian Official Working Hours, Timezone & Safeguards Configuration (Client)

export interface WorkingHoursConfig {
  timezone: string;
  morningStart: string;   // "08:30"
  morningEnd: string;     // "12:30"
  lunchStart: string;     // "12:30"
  lunchEnd: string;       // "13:30"
  afternoonStart: string; // "13:30"
  afternoonEnd: string;   // "17:30"
  minVerificationGapMinutes: number;
  minVerificationIntervalMinutes: number;
  maxVerificationIntervalMinutes: number;
  maxDailyChecks: number;
  verificationTimeoutSeconds: number;
}

export const DEFAULT_WORKING_HOURS_CONFIG: WorkingHoursConfig = {
  timezone: 'Africa/Addis_Ababa',
  morningStart: '08:30',
  morningEnd: '12:30',
  lunchStart: '12:30',
  lunchEnd: '13:30',
  afternoonStart: '13:30',
  afternoonEnd: '17:30',
  minVerificationGapMinutes: 10,
  minVerificationIntervalMinutes: 10,
  maxVerificationIntervalMinutes: 20,
  maxDailyChecks: 40,
  verificationTimeoutSeconds: 15,
};

// Designated work routes/tabs where active screen time counts after starting session
export const DESIGNATED_WORK_AREAS = [
  'register',
  'citizens',
  'daily_report',
  'reports',
  'tasks',
  'assignments',
  'screentime',
  'dashboard',
];

/**
 * Checks if a tab/route is an eligible designated work area
 */
export function isEligibleWorkArea(tabName: string): boolean {
  if (!tabName) return false;
  return DESIGNATED_WORK_AREAS.includes(tabName.toLowerCase());
}

/**
 * Parses "HH:mm" string to minutes from start of day
 */
export function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Returns current local time components in Ethiopia / configured timezone
 */
export function getZonedTimeComponents(
  date: Date = new Date(),
  timezone: string = DEFAULT_WORKING_HOURS_CONFIG.timezone
): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm:ss
  totalMinutes: number;
} {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const findPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';

    const year = parseInt(findPart('year'), 10);
    const month = parseInt(findPart('month'), 10);
    const day = parseInt(findPart('day'), 10);
    let hours = parseInt(findPart('hour'), 10);
    if (hours === 24) hours = 0;
    const minutes = parseInt(findPart('minute'), 10);
    const seconds = parseInt(findPart('second'), 10);

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const totalMinutes = hours * 60 + minutes;

    return {
      year,
      month,
      day,
      hours,
      minutes,
      seconds,
      dateStr,
      timeStr,
      totalMinutes,
    };
  } catch (_e) {
    // Fallback if Intl timezone fails
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    return {
      year,
      month,
      day,
      hours,
      minutes,
      seconds,
      dateStr: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      timeStr: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      totalMinutes: hours * 60 + minutes,
    };
  }
}

/**
 * Evaluates whether the current local time is inside official working hours:
 * 08:30–12:30 & 13:30–17:30
 * 12:30–13:30 is lunch (excluded)
 */
export function evaluateWorkingHours(
  date: Date = new Date(),
  config: WorkingHoursConfig = DEFAULT_WORKING_HOURS_CONFIG
): {
  isWorkingHours: boolean;
  isLunch: boolean;
  period: 'morning' | 'lunch' | 'afternoon' | 'outside';
  dateStr: string;
  timeStr: string;
} {
  const { totalMinutes, dateStr, timeStr } = getZonedTimeComponents(date, config.timezone);

  const morningStart = timeStringToMinutes(config.morningStart);
  const morningEnd = timeStringToMinutes(config.morningEnd);
  const lunchStart = timeStringToMinutes(config.lunchStart);
  const lunchEnd = timeStringToMinutes(config.lunchEnd);
  const afternoonStart = timeStringToMinutes(config.afternoonStart);
  const afternoonEnd = timeStringToMinutes(config.afternoonEnd);

  if (totalMinutes >= morningStart && totalMinutes < morningEnd) {
    return {
      isWorkingHours: true,
      isLunch: false,
      period: 'morning',
      dateStr,
      timeStr,
    };
  }

  if (totalMinutes >= lunchStart && totalMinutes < lunchEnd) {
    return {
      isWorkingHours: false,
      isLunch: true,
      period: 'lunch',
      dateStr,
      timeStr,
    };
  }

  if (totalMinutes >= afternoonStart && totalMinutes < afternoonEnd) {
    return {
      isWorkingHours: true,
      isLunch: false,
      period: 'afternoon',
      dateStr,
      timeStr,
    };
  }

  return {
    isWorkingHours: false,
    isLunch: false,
    period: 'outside',
    dateStr,
    timeStr,
  };
}

/**
 * Deterministically generates the verification slots across the 8-hour workday
 * (08:30-12:30 and 13:30-17:30 = 480 minutes total, excluding 12:30-13:30 lunch).
 * Intervals are strictly randomized between 10 and 20 minutes (average ~15 min),
 * producing ~30-32 checks per day.
 */
export function getDailyVerificationSlots(
  dateStr: string,
  seedString: string = ''
): Array<{ minuteOfDay: number; timeStr: string; isoDate: string }> {
  let seed = 0;
  const fullSeedStr = `${dateStr}_${seedString}`;
  for (let i = 0; i < fullSeedStr.length; i++) {
    seed = (seed * 31 + fullSeedStr.charCodeAt(i)) & 0xffffffff;
  }
  const nextRandom = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 4294967296;
  };

  const slots: Array<{ minuteOfDay: number; timeStr: string; isoDate: string }> = [];

  // Morning: 08:30 (510 min) to 12:30 (750 min)
  let currMin = 510 + Math.floor(nextRandom() * 6) + 8; // ~08:38 - 08:44
  while (currMin < 750) {
    const h = Math.floor(currMin / 60);
    const m = currMin % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    const isoDate = `${dateStr}T${timeStr}+03:00`;
    slots.push({ minuteOfDay: currMin, timeStr, isoDate });
    const step = 10 + Math.floor(nextRandom() * 11); // 10..20 minutes
    currMin += step;
  }

  // Afternoon: 13:30 (810 min) to 17:30 (1050 min)
  currMin = 810 + Math.floor(nextRandom() * 6) + 8; // ~13:38 - 13:44
  while (currMin < 1050) {
    const h = Math.floor(currMin / 60);
    const m = currMin % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    const isoDate = `${dateStr}T${timeStr}+03:00`;
    slots.push({ minuteOfDay: currMin, timeStr, isoDate });
    const step = 10 + Math.floor(nextRandom() * 11); // 10..20 minutes
    currMin += step;
  }

  return slots;
}

