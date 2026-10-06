// src/hooks/useScreenTime.ts
// Authoritative Screen-Time Tracking Engine for FieldSync Field Officers
// Follows strict rules: No manual pause/resume, official working hours (08:30-12:30, 13:30-17:30),
// tab focus/visibility, eligible designated work areas, and 5-min inactivity safeguards.

import { useState, useEffect, useRef, useCallback } from 'react';
import { offlineDb } from '../db/offlineDb';
import { API_BASE } from '../config/api';
import ActivityLogger from '../services/activityLogger';
import {
  evaluateWorkingHours,
  getZonedTimeComponents,
  isEligibleWorkArea,
} from '../config/workingHours';
import { db } from '../services/database';
import { timeStringToMinutes } from '../utils/requestValidation';
import { generateSessionId } from '../utils/idGenerator';
import type { ScreenTimeStatus, DailyScreenTime, WorkSession } from '../types/index';

export interface ScreenTimeHookResult {
  screenTimeDisplay: string;         // "HH:MM:SS"
  screenTimeShort: string;           // "5h 42m" or "12m"
  isScreenTimeRunning: boolean;      // true if currently tracking
  screenTimeCounter: number;         // total eligible seconds accumulated today
  trackingStatus: ScreenTimeStatus;  // 'NOT_STARTED' | 'TRACKING' | 'NOT_TRACKING' | 'VERIFICATION_PENDING' | 'FINALIZED'
  isSessionActive: boolean;          // true if work session has been started and not finalized
  sessionStartedAt: string | null;   // ISO string of when session started
  activeWorkArea: string;            // current active tab/route
  startWorkSession: () => Promise<void>;
  finalizeWorkSession: () => Promise<void>;
  pauseAndSaveOnLogout: () => Promise<void>;
  resetSessionForTesting: () => Promise<void>;
  isTabActive: boolean;
  isWorkingHours: boolean;
  isLunch: boolean;
  statusMessage: string;
  isInitialized: boolean;
  isOnApprovedLeave?: boolean;
  activeApprovedLeave?: any | null;
  isOnApprovedPermission?: boolean;
  activeApprovedPermission?: any | null;
}

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes inactivity timeout
const HEARTBEAT_INTERVAL_MS = 10 * 1000;     // 10 seconds heartbeat

function formatHMS(totalSecs: number): string {
  const s = Math.max(0, Math.floor(totalSecs || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatShortHM(totalSecs: number): string {
  const s = Math.max(0, Math.floor(totalSecs || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function useScreenTime(user: any): ScreenTimeHookResult {
  const officerId = user?.id || user?.employeeId || null;
  const isOfficer = user?.role === 'field_officer';

  const [screenTimeCounter, setScreenTimeCounter] = useState(0);
  const [trackingStatus, setTrackingStatus] = useState<ScreenTimeStatus>('NOT_STARTED');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [activeWorkArea, setActiveWorkArea] = useState<string>(() => {
    return localStorage.getItem('fieldsync_active_tab') || 'dashboard';
  });
  const [isTabActive, setIsTabActive] = useState(true);
  const [isWorkingHours, setIsWorkingHours] = useState(() => evaluateWorkingHours().isWorkingHours);
  const [isLunch, setIsLunch] = useState(() => evaluateWorkingHours().isLunch);
  const [isInitialized, setIsInitialized] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Not Started');
  const [isOnApprovedLeave, setIsOnApprovedLeave] = useState(false);
  const [activeApprovedLeave, setActiveApprovedLeave] = useState<any | null>(null);
  const [isOnApprovedPermission, setIsOnApprovedPermission] = useState(false);
  const [activeApprovedPermission, setActiveApprovedPermission] = useState<any | null>(null);

  // Verification modal state
  const [isVerificationPending, setIsVerificationPending] = useState(false);

  // References for reliable interval ticks
  const timerRef = useRef<any>(null);
  const heartbeatRef = useRef<any>(null);
  const lastActiveTimestampRef = useRef<number>(Date.now());
  const counterRef = useRef<number>(0);
  const statusRef = useRef<ScreenTimeStatus>('NOT_STARTED');
  const sessionActiveRef = useRef<boolean>(false);
  const activeWorkAreaRef = useRef<string>(activeWorkArea);
  const verificationPendingRef = useRef<boolean>(false);
  const tabActiveRef = useRef<boolean>(true);
  const isWindowFocusedRef = useRef<boolean>(
    typeof document !== 'undefined' && typeof document.hasFocus === 'function' ? document.hasFocus() : true
  );
  const pageTimesRef = useRef<Record<string, number>>({});
  const approvedLeaveRef = useRef<any | null>(null);
  const approvedPermissionRef = useRef<any | null>(null);

  // Check approved absences (leaves and permissions)
  const checkApprovedAbsences = useCallback(async () => {
    if (!officerId || !isOfficer) return;
    try {
      const { dateStr, totalMinutes } = getZonedTimeComponents();

      // Check leaves
      let userLeaves: any[] = [];
      if (db.leaves) {
        userLeaves = await db.leaves.where('employeeId').equals(officerId).toArray();
      }
      const activeLeave = userLeaves.find(
        (l) =>
          (l.status || '').toLowerCase() === 'approved' &&
          (l.startDate || l.start_date) <= dateStr &&
          (l.endDate || l.end_date) >= dateStr
      );

      setIsOnApprovedLeave(Boolean(activeLeave));
      setActiveApprovedLeave(activeLeave || null);
      approvedLeaveRef.current = activeLeave || null;

      // Check permissions
      let userPerms: any[] = [];
      if (db.permissions) {
        userPerms = await db.permissions.where('employeeId').equals(officerId).toArray();
      }
      const activePerm = userPerms.find((p) => {
        if ((p.status || '').toLowerCase() !== 'approved') return false;
        const pDate = p.date || p.permissionDate || p.startDate || p.start_date;
        if (pDate !== dateStr) return false;
        const sMins = timeStringToMinutes(p.startTime || p.start_time);
        const eMins = timeStringToMinutes(p.endTime || p.end_time);
        return sMins >= 0 && eMins >= 0 && totalMinutes >= sMins && totalMinutes <= eMins;
      });

      setIsOnApprovedPermission(Boolean(activePerm));
      setActiveApprovedPermission(activePerm || null);
      approvedPermissionRef.current = activePerm || null;
    } catch (_) {}
  }, [officerId, isOfficer]);

  useEffect(() => {
    checkApprovedAbsences();
    const interval = setInterval(checkApprovedAbsences, 10000);
    window.addEventListener('fieldsync-request-updated', checkApprovedAbsences);
    return () => {
      clearInterval(interval);
      window.removeEventListener('fieldsync-request-updated', checkApprovedAbsences);
    };
  }, [checkApprovedAbsences]);

  useEffect(() => {
    try {
      const { dateStr } = getZonedTimeComponents();
      const key = `fieldsync_page_times_${officerId}_${dateStr}`;
      const saved = localStorage.getItem(key);
      if (saved) pageTimesRef.current = JSON.parse(saved);
    } catch {}
  }, [officerId]);

  // Sync refs with state
  counterRef.current = screenTimeCounter;
  statusRef.current = trackingStatus;
  sessionActiveRef.current = isSessionActive;
  activeWorkAreaRef.current = activeWorkArea;
  verificationPendingRef.current = isVerificationPending;
  tabActiveRef.current = isTabActive;

  // Reusable helper to persist screen time to Dexie & localStorage immediately
  const persistCurrentScreenTime = useCallback(() => {
    if (!officerId || counterRef.current <= 0) return;
    const { dateStr } = getZonedTimeComponents();
    const screenTimeId = `st_${officerId}_${dateStr}`;
    try {
      localStorage.setItem(`fieldsync_screentime_${officerId}_${dateStr}`, String(counterRef.current));
      offlineDb.dailyScreenTimes?.update(screenTimeId, {
        totalEligibleSeconds: counterRef.current,
        status: statusRef.current === 'FINALIZED' ? 'FINALIZED' : 'NOT_TRACKING',
        lastActivityAt: new Date().toISOString(),
        syncStatus: 'PENDING',
      }).catch(() => {});
    } catch {}
  }, [officerId]);

  // 1. Listen for active tab changes across the application
  useEffect(() => {
    const handleTabChange = (e: any) => {
      const newTab = e.detail?.tab || localStorage.getItem('fieldsync_active_tab') || 'dashboard';
      setActiveWorkArea(newTab);
      activeWorkAreaRef.current = newTab;
    };
    window.addEventListener('fieldsync-tab-change', handleTabChange);
    return () => window.removeEventListener('fieldsync-tab-change', handleTabChange);
  }, []);

  // 2. Listen for verification popup open/close
  useEffect(() => {
    const handleVerificationStatus = (e: any) => {
      const pending = !!e.detail?.pending;
      setIsVerificationPending(pending);
      verificationPendingRef.current = pending;
    };
    window.addEventListener('verification-modal-state', handleVerificationStatus);
    return () => window.removeEventListener('verification-modal-state', handleVerificationStatus);
  }, []);

  // 3. User activity, focus/blur, media watching & window minimize detection
  useEffect(() => {
    const recordActivity = () => {
      lastActiveTimestampRef.current = Date.now();
    };

    const handleBlur = () => {
      isWindowFocusedRef.current = false;
      tabActiveRef.current = false;
      setIsTabActive(false);

      // Immediately set status to paused so header and UI reflect pause without waiting for interval
      if (sessionActiveRef.current && statusRef.current === 'TRACKING') {
        setTrackingStatus('NOT_TRACKING');
        statusRef.current = 'NOT_TRACKING';
        setStatusMessage('Page Inactive / Minimized — Paused');
      }

      persistCurrentScreenTime();
    };

    const handleFocus = () => {
      const isVisible = typeof document !== 'undefined' && document.visibilityState === 'visible' && !document.hidden;
      const hasFocus = typeof document !== 'undefined' && typeof document.hasFocus === 'function' ? document.hasFocus() : true;

      if (isVisible && hasFocus) {
        isWindowFocusedRef.current = true;
        tabActiveRef.current = true;
        setIsTabActive(true);
        recordActivity();

        const wh = evaluateWorkingHours();
        if (
          sessionActiveRef.current &&
          statusRef.current !== 'FINALIZED' &&
          wh.isWorkingHours &&
          !wh.isLunch &&
          !verificationPendingRef.current
        ) {
          setTrackingStatus('TRACKING');
          statusRef.current = 'TRACKING';
          setStatusMessage('Actively Counting');
        }
      } else {
        handleBlur();
      }
    };

    const handleVisibilityChange = () => {
      const isDocHidden = typeof document !== 'undefined' && (document.hidden || document.visibilityState !== 'visible');
      if (isDocHidden) {
        handleBlur();
      } else {
        // When coming back, ensure window focus has settled
        setTimeout(() => {
          if (typeof document !== 'undefined' && document.hasFocus && document.hasFocus()) {
            handleFocus();
          } else {
            handleBlur();
          }
        }, 30);
      }
    };

    window.addEventListener('mousemove', recordActivity, { passive: true });
    window.addEventListener('keydown', recordActivity, { passive: true });
    window.addEventListener('click', recordActivity, { passive: true });
    window.addEventListener('scroll', recordActivity, { passive: true });
    window.addEventListener('touchstart', recordActivity, { passive: true });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pagehide', handleBlur);
    window.addEventListener('pageshow', handleFocus);

    // Initial check on mount
    if (typeof document !== 'undefined') {
      if (document.hidden || document.visibilityState !== 'visible' || (document.hasFocus && !document.hasFocus())) {
        isWindowFocusedRef.current = false;
        tabActiveRef.current = false;
        setIsTabActive(false);
      }
    }

    return () => {
      window.removeEventListener('mousemove', recordActivity);
      window.removeEventListener('keydown', recordActivity);
      window.removeEventListener('click', recordActivity);
      window.removeEventListener('scroll', recordActivity);
      window.removeEventListener('touchstart', recordActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handleBlur);
      window.removeEventListener('pageshow', handleFocus);
    };
  }, [officerId, persistCurrentScreenTime]);

  // Handle window beforeunload / tab close: save screen time
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (officerId && counterRef.current > 0) {
        const { dateStr } = getZonedTimeComponents();
        const screenTimeId = `st_${officerId}_${dateStr}`;
        try {
          localStorage.setItem(`fieldsync_screentime_${officerId}_${dateStr}`, String(counterRef.current));
          offlineDb.dailyScreenTimes?.update(screenTimeId, {
            totalEligibleSeconds: counterRef.current,
            lastActivityAt: new Date().toISOString(),
          }).catch(() => {});
        } catch {}
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [officerId]);

  // 4. Load initial state for today from Dexie / server
  useEffect(() => {
    if (!officerId || !isOfficer) {
      setTrackingStatus('NOT_STARTED');
      setIsSessionActive(false);
      setScreenTimeCounter(0);
      return;
    }

    const loadTodayState = async () => {
      const { dateStr } = getZonedTimeComponents();

      try {
        // A. Check today's dailyScreenTime in Dexie
        let localScreenTime: DailyScreenTime | undefined;
        if (offlineDb.dailyScreenTimes) {
          localScreenTime = await offlineDb.dailyScreenTimes
            .where('officerId')
            .equals(officerId)
            .filter((r) => r.date === dateStr)
            .first();
        }

        // B. Check localStorage fallback for cached seconds today
        const cachedSecsStr = localStorage.getItem(`fieldsync_screentime_${officerId}_${dateStr}`);
        const cachedSecs = cachedSecsStr ? parseInt(cachedSecsStr, 10) : 0;
        const totalSavedSeconds = Math.max(localScreenTime?.totalEligibleSeconds || 0, cachedSecs || 0);

        // C. Check today's latest workSession in Dexie
        const localSession = await offlineDb.workSessions
          .where('officerId')
          .equals(officerId)
          .filter((s) => s.reportDate === dateStr)
          .reverse()
          .first();

        // 1. If an active, unended session exists, it resumes counting from totalSavedSeconds!
        if (localSession && !localSession.endedAt) {
          setIsSessionActive(true);
          sessionActiveRef.current = true;
          setSessionStartedAt(localSession.startedAt);
          setScreenTimeCounter(totalSavedSeconds);
          counterRef.current = totalSavedSeconds;
          setTrackingStatus('TRACKING');
          statusRef.current = 'TRACKING';
          setStatusMessage('Work Session Active');
          return;
        }

        // 2. If report already submitted today, keep finalized with 0 counter
        const dailyReport = await offlineDb.dailyWorkReports
          .where('officerId')
          .equals(officerId)
          .filter((r) => r.reportDate === dateStr && !!r.submittedAt)
          .first();

        if (dailyReport) {
          setIsSessionActive(false);
          sessionActiveRef.current = false;
          setTrackingStatus('FINALIZED');
          statusRef.current = 'FINALIZED';
          setStatusMessage('Session Finalized');
          setScreenTimeCounter(0);
          counterRef.current = 0;
          setSessionStartedAt(localSession?.startedAt || null);
          return;
        }

        // 3. If a session was started today, not submitted, and user logged out & logged back in:
        if (localSession && totalSavedSeconds > 0) {
          setIsSessionActive(true);
          sessionActiveRef.current = true;
          setSessionStartedAt(localSession.startedAt);
          setScreenTimeCounter(totalSavedSeconds);
          counterRef.current = totalSavedSeconds;
          setTrackingStatus('TRACKING');
          statusRef.current = 'TRACKING';
          setStatusMessage('Work Session Active');
          return;
        }

        // 4. Otherwise session not yet started today
        setIsSessionActive(false);
        sessionActiveRef.current = false;
        setTrackingStatus('NOT_STARTED');
        statusRef.current = 'NOT_STARTED';
        setStatusMessage('Work Session Not Started');
        setScreenTimeCounter(totalSavedSeconds);
        counterRef.current = totalSavedSeconds;
        setSessionStartedAt(null);
      } catch (err) {
        console.error('Error loading today screen-time state:', err);
      } finally {
        setIsInitialized(true);
      }
    };

    loadTodayState();

    return () => {
      // Cleanup on unmount or user change: cache current screen time
      if (officerId && counterRef.current > 0) {
        const { dateStr } = getZonedTimeComponents();
        const screenTimeId = `st_${officerId}_${dateStr}`;
        try {
          localStorage.setItem(`fieldsync_screentime_${officerId}_${dateStr}`, String(counterRef.current));
          offlineDb.dailyScreenTimes?.update(screenTimeId, {
            totalEligibleSeconds: counterRef.current,
            lastActivityAt: new Date().toISOString(),
          }).catch(() => {});
        } catch {}
      }
    };
  }, [officerId, isOfficer]);

  // 5. Start Work Session function (Explicit Officer Action)
  const startWorkSession = useCallback(async () => {
    if (!officerId || !isOfficer) return;

    const { dateStr } = getZonedTimeComponents();
    const nowIso = new Date().toISOString();
    const sessionId = generateSessionId();
    const screenTimeId = `st_${officerId}_${dateStr}`;

    try {
      // 1. Save WorkSession in Dexie
      const newSession: WorkSession = {
        id: sessionId,
        officerId,
        reportDate: dateStr,
        startedAt: nowIso,
        endedAt: null,
        durationSeconds: 0,
        deviceReported: true,
        syncStatus: 'PENDING',
      };
      await offlineDb.workSessions.put(newSession);

      // 2. Save DailyScreenTime in Dexie
      if (offlineDb.dailyScreenTimes) {
        const existing = await offlineDb.dailyScreenTimes.get(screenTimeId);
        const newScreenTime: DailyScreenTime = {
          id: screenTimeId,
          officerId,
          workSessionId: sessionId,
          date: dateStr,
          startedAt: existing?.startedAt || nowIso,
          finalizedAt: null,
          totalEligibleSeconds: 0,
          status: 'TRACKING',
          lastActivityAt: nowIso,
          lastSyncedAt: null,
          syncStatus: 'PENDING',
        };
        await offlineDb.dailyScreenTimes.put(newScreenTime);
        setScreenTimeCounter(0);
        counterRef.current = 0;
      }

      setIsSessionActive(true);
      sessionActiveRef.current = true;
      setSessionStartedAt(nowIso);
      setTrackingStatus('TRACKING');
      statusRef.current = 'TRACKING';
      setStatusMessage('Work Session Active');

      // Record Activity Log
      ActivityLogger.log(
        'WORK_SESSION_STARTED',
        `Started daily work session (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        {
          officerId,
          officerName: user?.fullName || user?.name || 'Field Officer',
          metadata: {
            sessionId,
            reportDate: dateStr,
          },
        }
      ).catch(() => {});

      // 3. Notify server if online
      if (navigator.onLine) {
        const token = localStorage.getItem('fieldsync_token');
        if (token) {
          fetch(`${API_BASE}/work-sessions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              id: sessionId,
              reportDate: dateStr,
              startedAt: nowIso,
            }),
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.error('Failed to start work session:', e);
    }
  }, [officerId, isOfficer]);

  // 6. Finalize Work Session (Triggered on Daily Report Submission)
  const finalizeWorkSession = useCallback(async () => {
    if (!officerId) return;

    const { dateStr } = getZonedTimeComponents();
    const nowIso = new Date().toISOString();
    const screenTimeId = `st_${officerId}_${dateStr}`;

    try {
      if (offlineDb.dailyScreenTimes) {
        await offlineDb.dailyScreenTimes.update(screenTimeId, {
          status: 'FINALIZED',
          finalizedAt: nowIso,
          lastActivityAt: nowIso,
          syncStatus: 'PENDING',
        });
      }

      const activeSession = await offlineDb.workSessions
        .where('officerId')
        .equals(officerId)
        .filter((s) => s.reportDate === dateStr && !s.endedAt)
        .first();

      if (activeSession) {
        await offlineDb.workSessions.update(activeSession.id, {
          endedAt: nowIso,
          syncStatus: 'PENDING',
        });
      }

      setIsSessionActive(false);
      setTrackingStatus('FINALIZED');
      setStatusMessage('Session Finalized');
      setScreenTimeCounter(0);
      counterRef.current = 0;

      // Record Activity Log
      ActivityLogger.log(
        'WORK_SESSION_ENDED',
        `Finalized daily work session for ${dateStr}`,
        {
          officerId,
          officerName: user?.fullName || user?.name || 'Field Officer',
          metadata: {
            reportDate: dateStr,
          },
        }
      ).catch(() => {});
    } catch (e) {
      console.error('Failed to finalize work session:', e);
    }
  }, [officerId]);

  // 7. Explicit pause and save when user logs out
  const pauseAndSaveOnLogout = useCallback(async () => {
    if (!officerId) return;

    isWindowFocusedRef.current = false;
    tabActiveRef.current = false;
    setIsTabActive(false);
    setTrackingStatus('NOT_TRACKING');
    statusRef.current = 'NOT_TRACKING';

    const { dateStr } = getZonedTimeComponents();
    const screenTimeId = `st_${officerId}_${dateStr}`;
    const currentSecs = counterRef.current;

    try {
      localStorage.setItem(`fieldsync_screentime_${officerId}_${dateStr}`, String(currentSecs));
      if (offlineDb.dailyScreenTimes) {
        await offlineDb.dailyScreenTimes.update(screenTimeId, {
          totalEligibleSeconds: currentSecs,
          status: 'NOT_TRACKING',
          lastActivityAt: new Date().toISOString(),
          syncStatus: 'PENDING',
        });
      }
    } catch (e) {
      console.warn('Failed to save screen time on logout:', e);
    }
  }, [officerId]);

  // Explicit session reset for testing first-time login
  const resetSessionForTesting = useCallback(async () => {
    if (!officerId) return;
    const { dateStr } = getZonedTimeComponents();
    const screenTimeId = `st_${officerId}_${dateStr}`;
    try {
      localStorage.removeItem(`fieldsync_screentime_${officerId}_${dateStr}`);
      if (offlineDb.dailyScreenTimes) {
        await offlineDb.dailyScreenTimes.delete(screenTimeId);
      }
      if (offlineDb.workSessions) {
        const list = await offlineDb.workSessions
          .where('officerId')
          .equals(officerId)
          .filter((s) => s.reportDate === dateStr)
          .toArray();
        for (const s of list) {
          await offlineDb.workSessions.delete(s.id);
        }
      }
      if (offlineDb.dailyWorkReports) {
        const reports = await offlineDb.dailyWorkReports
          .where('officerId')
          .equals(officerId)
          .filter((r) => r.reportDate === dateStr)
          .toArray();
        for (const r of reports) {
          await offlineDb.dailyWorkReports.delete(r.id);
        }
      }
    } catch (_e) {}

    setIsSessionActive(false);
    sessionActiveRef.current = false;
    setTrackingStatus('NOT_STARTED');
    statusRef.current = 'NOT_STARTED';
    setScreenTimeCounter(0);
    counterRef.current = 0;
    setSessionStartedAt(null);
    setStatusMessage('Work Session Not Started');
    window.dispatchEvent(new CustomEvent('fieldsync-session-reset'));
  }, [officerId]);

  // 7. Core 1-Second Screen-Time Evaluation Loop
  useEffect(() => {
    if (!isOfficer || !officerId) return;

    timerRef.current = setInterval(() => {
      const wh = evaluateWorkingHours();
      setIsWorkingHours(wh.isWorkingHours);
      setIsLunch(wh.isLunch);

      // Must not track if finalized or not started
      if (!sessionActiveRef.current || statusRef.current === 'FINALIZED') {
        if (approvedLeaveRef.current) {
          const lType = approvedLeaveRef.current.type || 'Leave';
          const formattedType = lType.charAt(0).toUpperCase() + lType.slice(1);
          setStatusMessage(`On Approved Leave (${formattedType}) — Absence Authorized`);
        }
        return;
      }

      // Check Approved Leave (Absence Authorized - officer not expected to work)
      if (approvedLeaveRef.current) {
        if (statusRef.current !== 'NOT_TRACKING') {
          setTrackingStatus('NOT_TRACKING');
        }
        const lType = approvedLeaveRef.current.type || 'Leave';
        const formattedType = lType.charAt(0).toUpperCase() + lType.slice(1);
        setStatusMessage(`On Approved Leave (${formattedType}) — Absence Authorized`);
        return;
      }

      // Check Approved Permission (Authorized temporary absence recorded separately from screen-time)
      if (approvedPermissionRef.current) {
        if (statusRef.current !== 'NOT_TRACKING') {
          setTrackingStatus('NOT_TRACKING');
        }
        const pStart = approvedPermissionRef.current.startTime || approvedPermissionRef.current.start_time || '';
        const pEnd = approvedPermissionRef.current.endTime || approvedPermissionRef.current.end_time || '';
        setStatusMessage(`Approved Permission (${pStart}–${pEnd}) — Authorized Absence`);
        return;
      }

      // Check Verification Modal State
      if (verificationPendingRef.current) {
        if (statusRef.current !== 'VERIFICATION_PENDING') {
          setTrackingStatus('VERIFICATION_PENDING');
          setStatusMessage('Verification Pending');
        }
        return;
      }

      // Live, real-time verification of document visibility and window focus
      const isDocHidden = typeof document !== 'undefined' && (document.hidden || document.visibilityState !== 'visible');
      const hasDocFocus = typeof document !== 'undefined' && typeof document.hasFocus === 'function' ? document.hasFocus() : false;

      // Update refs to match live browser state
      if (isDocHidden || !hasDocFocus) {
        isWindowFocusedRef.current = false;
        tabActiveRef.current = false;
        setIsTabActive(false);
      } else {
        isWindowFocusedRef.current = true;
        tabActiveRef.current = true;
        setIsTabActive(true);
      }

      const isLiveActive = !isDocHidden && hasDocFocus && isWindowFocusedRef.current && tabActiveRef.current;

      // User activity safeguard (pause if inactive for > 5 minutes)
      const nowMs = Date.now();
      const isUserActive = (nowMs - lastActiveTimestampRef.current) < INACTIVITY_TIMEOUT_MS;

      // Condition:
      // Once started, count ONLY when:
      // 1. Within official working hours (08:30-12:30, 13:30-17:30)
      // 2. Not during lunch break (12:30-13:30)
      // 3. Page is visible AND window is actively focused (pauses on minimize, tab switch, or when viewing other media/windows)
      // 4. User is active (not idle > 5 mins)
      const shouldCount =
        wh.isWorkingHours &&
        !wh.isLunch &&
        isLiveActive &&
        isUserActive;

      if (shouldCount) {
        if (statusRef.current !== 'TRACKING') {
          setTrackingStatus('TRACKING');
          setStatusMessage('Actively Counting');
        }

        // Increment counter
        setScreenTimeCounter((prev) => {
          const next = prev + 1;
          counterRef.current = next;

          // Track time on active work area page
          const area = activeWorkAreaRef.current || 'dashboard';
          pageTimesRef.current[area] = (pageTimesRef.current[area] || 0) + 1;

          // Every 5 seconds, sync to Dexie & localStorage
          if (next % 5 === 0) {
            const { dateStr } = getZonedTimeComponents();
            const screenTimeId = `st_${officerId}_${dateStr}`;
            offlineDb.dailyScreenTimes?.update(screenTimeId, {
              totalEligibleSeconds: next,
              status: 'TRACKING',
              lastActivityAt: new Date().toISOString(),
              syncStatus: 'PENDING',
            }).catch(() => {});

            try {
              localStorage.setItem(`fieldsync_page_times_${officerId}_${dateStr}`, JSON.stringify(pageTimesRef.current));
            } catch {}
          }

          return next;
        });
      } else {
        if (statusRef.current !== 'NOT_TRACKING') {
          setTrackingStatus('NOT_TRACKING');

          if (wh.isLunch) {
            setStatusMessage('Lunch Break (12:30–13:30) — Paused');
          } else if (!wh.isWorkingHours) {
            setStatusMessage('Outside Working Hours — Paused');
          } else if (!isLiveActive) {
            setStatusMessage('Page Inactive / Minimized — Paused');
          } else if (!isUserActive) {
            setStatusMessage('User Inactive — Paused');
          } else {
            setStatusMessage('Paused');
          }
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOfficer, officerId]);

  // 8. Periodic Heartbeat to Server (Every 10 seconds when online)
  useEffect(() => {
    if (!isOfficer || !officerId) return;

    heartbeatRef.current = setInterval(() => {
      if (!navigator.onLine) return;
      const token = localStorage.getItem('fieldsync_token');
      if (!token) return;

      fetch(`${API_BASE}/work-monitoring/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          trackingState: statusRef.current,
          currentWorkArea: activeWorkAreaRef.current,
          totalEligibleSeconds: counterRef.current,
          pageTimes: pageTimesRef.current,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.pendingVerification) {
            // Signal verification modal to open
            window.dispatchEvent(
              new CustomEvent('incoming-verification', {
                detail: data.pendingVerification,
              })
            );
          }
        })
        .catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isOfficer, officerId]);

  return {
    screenTimeDisplay: formatHMS(screenTimeCounter),
    screenTimeShort: formatShortHM(screenTimeCounter),
    isScreenTimeRunning: trackingStatus === 'TRACKING',
    screenTimeCounter,
    trackingStatus,
    isSessionActive,
    sessionStartedAt,
    activeWorkArea,
    startWorkSession,
    finalizeWorkSession,
    pauseAndSaveOnLogout,
    resetSessionForTesting,
    isTabActive,
    isWorkingHours,
    isLunch,
    statusMessage,
    isInitialized,
    isOnApprovedLeave,
    activeApprovedLeave,
    isOnApprovedPermission,
    activeApprovedPermission,
  };
}

export default useScreenTime;
