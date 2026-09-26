// src/hooks/useScreenTime.ts
// Authoritative Screen-Time Tracking Engine for FieldSync Field Officers
// Follows strict rules: No manual pause/resume, official working hours (08:30-12:30, 13:30-17:30),
// tab focus/visibility, eligible designated work areas, and 5-min inactivity safeguards.

import { useState, useEffect, useRef, useCallback } from 'react';
import { offlineDb } from '../db/offlineDb';
import { API_BASE } from '../config/api';
import {
  evaluateWorkingHours,
  getZonedTimeComponents,
  isEligibleWorkArea,
} from '../config/workingHours';
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
  isTabActive: boolean;
  isWorkingHours: boolean;
  isLunch: boolean;
  statusMessage: string;
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
  const [isWorkingHours, setIsWorkingHours] = useState(false);
  const [isLunch, setIsLunch] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Not Started');

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
  const pageTimesRef = useRef<Record<string, number>>({});

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

  // 3. User activity listeners (inactivity timeout)
  useEffect(() => {
    const recordActivity = () => {
      lastActiveTimestampRef.current = Date.now();
    };

    const updateVisibility = () => {
      const active = document.visibilityState === 'visible' && document.hasFocus();
      setIsTabActive(active);
      tabActiveRef.current = active;
      if (active) recordActivity();
    };

    window.addEventListener('mousemove', recordActivity, { passive: true });
    window.addEventListener('keydown', recordActivity, { passive: true });
    window.addEventListener('click', recordActivity, { passive: true });
    window.addEventListener('scroll', recordActivity, { passive: true });
    window.addEventListener('touchstart', recordActivity, { passive: true });

    document.addEventListener('visibilitychange', updateVisibility);
    window.addEventListener('focus', updateVisibility);
    window.addEventListener('blur', updateVisibility);

    updateVisibility();

    return () => {
      window.removeEventListener('mousemove', recordActivity);
      window.removeEventListener('keydown', recordActivity);
      window.removeEventListener('click', recordActivity);
      window.removeEventListener('scroll', recordActivity);
      window.removeEventListener('touchstart', recordActivity);
      document.removeEventListener('visibilitychange', updateVisibility);
      window.removeEventListener('focus', updateVisibility);
      window.removeEventListener('blur', updateVisibility);
    };
  }, []);

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

        // B. Check today's workSession in Dexie
        const localSession = await offlineDb.workSessions
          .where('officerId')
          .equals(officerId)
          .filter((s) => s.reportDate === dateStr)
          .reverse()
          .first();

        // Check if report already submitted (finalized)
        const dailyReport = await offlineDb.dailyWorkReports
          .where('officerId')
          .equals(officerId)
          .filter((r) => r.reportDate === dateStr)
          .first();

        if (dailyReport || localScreenTime?.status === 'FINALIZED') {
          setIsSessionActive(false);
          setTrackingStatus('FINALIZED');
          setStatusMessage('Finalized (Daily Report Submitted)');
          setScreenTimeCounter(localScreenTime?.totalEligibleSeconds || 0);
          setSessionStartedAt(localSession?.startedAt || null);
          return;
        }

        if (localSession && !localSession.endedAt) {
          // Session is actively started
          setIsSessionActive(true);
          setSessionStartedAt(localSession.startedAt);
          setScreenTimeCounter(localScreenTime?.totalEligibleSeconds || 0);
          setTrackingStatus('TRACKING');
          setStatusMessage('Work Session Active');
        } else {
          // Session not yet started today
          setIsSessionActive(false);
          setTrackingStatus('NOT_STARTED');
          setStatusMessage('Work Session Not Started');
          setScreenTimeCounter(localScreenTime?.totalEligibleSeconds || 0);
          setSessionStartedAt(null);
        }
      } catch (err) {
        console.error('Error loading today screen-time state:', err);
      }
    };

    loadTodayState();
  }, [officerId, isOfficer]);

  // 5. Start Work Session function (Explicit Officer Action)
  const startWorkSession = useCallback(async () => {
    if (!officerId || !isOfficer) return;

    const { dateStr } = getZonedTimeComponents();
    const nowIso = new Date().toISOString();
    const sessionId = `ws_${officerId}_${dateStr}_${Date.now()}`;
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
          totalEligibleSeconds: existing?.totalEligibleSeconds || 0,
          status: 'TRACKING',
          lastActivityAt: nowIso,
          lastSyncedAt: null,
          syncStatus: 'PENDING',
        };
        await offlineDb.dailyScreenTimes.put(newScreenTime);
        setScreenTimeCounter(newScreenTime.totalEligibleSeconds);
      }

      setIsSessionActive(true);
      setSessionStartedAt(nowIso);
      setTrackingStatus('TRACKING');
      setStatusMessage('Work Session Active');

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
      setStatusMessage('Finalized (Daily Report Submitted)');
    } catch (e) {
      console.error('Failed to finalize work session:', e);
    }
  }, [officerId]);

  // 7. Core 1-Second Screen-Time Evaluation Loop
  useEffect(() => {
    if (!isOfficer || !officerId) return;

    timerRef.current = setInterval(() => {
      // Must not track if finalized or not started
      if (!sessionActiveRef.current || statusRef.current === 'FINALIZED') {
        return;
      }

      const wh = evaluateWorkingHours();
      setIsWorkingHours(wh.isWorkingHours);
      setIsLunch(wh.isLunch);

      // Check Verification Modal State
      if (verificationPendingRef.current) {
        if (statusRef.current !== 'VERIFICATION_PENDING') {
          setTrackingStatus('VERIFICATION_PENDING');
          setStatusMessage('Verification Pending');
        }
        return;
      }

      // Check Tab/Window Visibility & Focus
      const isVisibleAndFocused = tabActiveRef.current;

      // Condition:
      // Once started, never pause until daily report is submitted,
      // EXCEPT when the officer minimizes the page, switches to another tab,
      // or during lunch (12:30-13:30) / outside working hours.
      const shouldCount =
        wh.isWorkingHours &&
        !wh.isLunch &&
        isVisibleAndFocused;

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
          } else if (!isVisibleAndFocused) {
            setStatusMessage('Page Inactive / Minimized — Paused');
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
    isTabActive,
    isWorkingHours,
    isLunch,
    statusMessage,
  };
}

export default useScreenTime;
