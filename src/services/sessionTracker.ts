// src/services/sessionTracker.ts
// Robust Timestamp-Based Work Session & Screen-Time Telemetry Engine (Phase 5)

import { offlineDb } from '../db/offlineDb';
import type { WorkSession } from '../types/index';
import ActivityLogger from './activityLogger';

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes inactivity timeout
const DESIGNATED_WORK_TABS = ['register', 'tasks', 'assignments', 'dashboard', 'reports'];

export class SessionTracker {
  private static activeSession: WorkSession | null = null;
  private static lastActivityTimestamp: number = Date.now();
  private static inactivityTimer: any = null;
  private static isPaused: boolean = false;
  private static pauseStartedAt: number | null = null;

  /**
   * Initializes session tracking event listeners (visibility, activity, focus)
   */
  static initialize() {
    if (typeof window === 'undefined') return;

    // 1. Visibility change listener (tab hidden/minimized)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        SessionTracker.pauseTracking('Browser tab hidden or minimized');
      } else if (document.visibilityState === 'visible') {
        SessionTracker.resumeTracking('Browser tab visible');
      }
    });

    // 2. Window focus and blur
    window.addEventListener('blur', () => {
      SessionTracker.pauseTracking('Window lost focus');
    });
    window.addEventListener('focus', () => {
      SessionTracker.resumeTracking('Window regained focus');
    });

    // 3. User interaction activity listeners (resets inactivity timer)
    const resetActivity = () => {
      SessionTracker.lastActivityTimestamp = Date.now();
      if (SessionTracker.isPaused && document.visibilityState === 'visible' && document.hasFocus()) {
        SessionTracker.resumeTracking('User activity detected');
      }
      SessionTracker.scheduleInactivityCheck();
    };

    window.addEventListener('mousemove', resetActivity, { passive: true });
    window.addEventListener('keydown', resetActivity, { passive: true });
    window.addEventListener('touchstart', resetActivity, { passive: true });
    window.addEventListener('scroll', resetActivity, { passive: true });

    SessionTracker.scheduleInactivityCheck();
    SessionTracker.restoreActiveSession();
  }

  /**
   * Schedules check for user inactivity timeout
   */
  private static scheduleInactivityCheck() {
    if (SessionTracker.inactivityTimer) {
      clearTimeout(SessionTracker.inactivityTimer);
    }
    SessionTracker.inactivityTimer = setTimeout(() => {
      const idleTime = Date.now() - SessionTracker.lastActivityTimestamp;
      if (idleTime >= INACTIVITY_TIMEOUT_MS) {
        SessionTracker.pauseTracking('Inactivity timeout reached');
      }
    }, INACTIVITY_TIMEOUT_MS + 1000);
  }

  /**
   * Restores active session from localStorage or IndexedDB
   */
  static async restoreActiveSession(): Promise<WorkSession | null> {
    try {
      const stored = localStorage.getItem('fieldsync_active_work_session');
      if (stored) {
        const parsed = JSON.parse(stored) as WorkSession;
        SessionTracker.activeSession = parsed;
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse stored active session:', e);
    }
    return null;
  }

  /**
   * Start a new work session when entering a designated work tab
   */
  static async startSession(officerId: string, assignmentId?: string | null): Promise<WorkSession> {
    const todayStr = new Date().toISOString().split('T')[0];

    // Check if an active session already exists
    if (SessionTracker.activeSession && !SessionTracker.activeSession.endedAt) {
      SessionTracker.resumeTracking('Resumed existing work session');
      return SessionTracker.activeSession;
    }

    const sessionId = crypto.randomUUID();
    const session: WorkSession = {
      id: sessionId,
      officerId,
      assignmentId: assignmentId || null,
      reportDate: todayStr,
      startedAt: new Date().toISOString(),
      endedAt: null,
      durationSeconds: 0,
      deviceReported: true,
      syncStatus: 'PENDING',
    };

    SessionTracker.activeSession = session;
    SessionTracker.isPaused = false;
    SessionTracker.pauseStartedAt = null;

    localStorage.setItem('fieldsync_active_work_session', JSON.stringify(session));

    // Save to Dexie
    await offlineDb.workSessions.put(session);

    // Record activity log
    await ActivityLogger.log(
      'WORK_SESSION_STARTED',
      `Field officer started active work session on ${todayStr}`,
      { officerId, assignmentId }
    );

    return session;
  }

  /**
   * Pause tracking (e.g. user navigated away, tab minimized, inactivity)
   * Important: Does NOT finalize the day's screen time!
   */
  static pauseTracking(reason: string = 'Paused') {
    if (!SessionTracker.activeSession || SessionTracker.isPaused) return;

    SessionTracker.isPaused = true;
    SessionTracker.pauseStartedAt = Date.now();
    console.log(`⏸️ Work session tracking paused: ${reason}`);
  }

  /**
   * Resume tracking when user returns to work area
   */
  static resumeTracking(reason: string = 'Resumed') {
    if (!SessionTracker.activeSession || !SessionTracker.isPaused) return;

    SessionTracker.isPaused = false;
    SessionTracker.pauseStartedAt = null;
    SessionTracker.lastActivityTimestamp = Date.now();
    console.log(`▶️ Work session tracking resumed: ${reason}`);
  }

  /**
   * Handle route/tab changes:
   * Pause if outside designated work interfaces; resume if entering them.
   */
  static handleTabChange(currentTab: string, officerId?: string) {
    const isWorkTab = DESIGNATED_WORK_TABS.includes(currentTab);
    if (!isWorkTab) {
      SessionTracker.pauseTracking(`Navigated to non-work area: ${currentTab}`);
    } else {
      if (SessionTracker.activeSession) {
        SessionTracker.resumeTracking(`Returned to work area: ${currentTab}`);
      } else if (officerId) {
        SessionTracker.startSession(officerId);
      }
    }
  }

  /**
   * Get accumulated eligible screen time in seconds for an officer on a given reporting date.
   * Includes closed sessions + current session's elapsed time.
   */
  static async getAccumulatedScreenTime(officerId: string, reportDate: string): Promise<number> {
    try {
      const closedSessions = await offlineDb.workSessions
        .where('officerId')
        .equals(officerId)
        .filter((s) => s.reportDate === reportDate && !!s.endedAt)
        .toArray();

      let totalSeconds = closedSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);

      // Add active session if on the same report date
      if (
        SessionTracker.activeSession &&
        SessionTracker.activeSession.reportDate === reportDate &&
        !SessionTracker.activeSession.endedAt
      ) {
        const startMs = new Date(SessionTracker.activeSession.startedAt).getTime();
        const nowMs = Date.now();
        const activeElapsed = Math.max(0, Math.floor((nowMs - startMs) / 1000));
        totalSeconds += activeElapsed;
      }

      return totalSeconds;
    } catch (e) {
      console.error('Error calculating accumulated screen time:', e);
      return 0;
    }
  }

  /**
   * Finalize the daily screen-time total.
   * Strictly invoked ONLY when the Daily Work Report is submitted!
   */
  static async finalizeDailyScreenTime(
    officerId: string,
    reportDate: string
  ): Promise<{ finalizedScreenTimeSeconds: number; sessionCount: number }> {
    const now = new Date().toISOString();

    // 1. If there is an active session, close it and persist
    if (SessionTracker.activeSession && !SessionTracker.activeSession.endedAt) {
      const startMs = new Date(SessionTracker.activeSession.startedAt).getTime();
      const endMs = new Date(now).getTime();
      const durationSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));

      const closedSession: WorkSession = {
        ...SessionTracker.activeSession,
        endedAt: now,
        durationSeconds,
        syncStatus: 'PENDING',
      };

      await offlineDb.workSessions.put(closedSession);

      // Enqueue closed session for sync
      await offlineDb.syncQueue.put({
        id: crypto.randomUUID(),
        entityType: 'work_session',
        entityId: closedSession.id,
        payload: closedSession,
        queuedAt: now,
        attempts: 0,
        maxRetries: 5,
        status: 'PENDING',
      });

      // Clear in-memory active session
      SessionTracker.activeSession = null;
      localStorage.removeItem('fieldsync_active_work_session');
    }

    // 2. Aggregate all sessions for that report date
    const daySessions = await offlineDb.workSessions
      .where('officerId')
      .equals(officerId)
      .filter((s) => s.reportDate === reportDate)
      .toArray();

    const finalizedScreenTimeSeconds = daySessions.reduce(
      (sum, s) => sum + (s.durationSeconds || 0),
      0
    );

    return {
      finalizedScreenTimeSeconds,
      sessionCount: daySessions.length,
    };
  }
}

export default SessionTracker;
