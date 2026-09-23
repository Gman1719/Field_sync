import db from '../db/index.ts';
import { WorkSessionItem } from '../types/index.ts';

export class ScreenTimeTracker {
  private static activeSessionId: string | null = null;
  private static activeOfficerId: string | null = null;
  private static activeAssignmentId: string | null = null;
  private static sessionStartTime: number | null = null;
  private static inactivityTimer: any = null;
  private static INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes inactivity timeout
  private static isPaused: boolean = true;
  private static listenersAttached: boolean = false;
  private static currentRoute: string = '';

  /**
   * Helper to get local date string YYYY-MM-DD
   */
  public static getLocalDateString(d: Date = new Date()): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Initialize screen-time tracking for an officer
   */
  public static init(officerId: string, currentRoute: string, assignmentId?: string | null) {
    this.activeOfficerId = officerId;
    this.activeAssignmentId = assignmentId || null;
    this.currentRoute = currentRoute;

    if (!this.listenersAttached && typeof window !== 'undefined') {
      this.attachEventListeners();
      this.listenersAttached = true;
    }

    // Check if current route is a designated fieldwork interface
    if (this.isDesignatedWorkRoute(currentRoute)) {
      this.resumeTracking();
    } else {
      this.pauseTracking();
    }
  }

  /**
   * Check if route qualifies for screen-time tracking
   */
  public static isDesignatedWorkRoute(path: string): boolean {
    const workRoutes = [
      '/register',
      '/citizens',
      '/assignments',
      '/tasks',
      '/daily-report',
      '/sync',
      '/dashboard',
    ];
    return workRoutes.some((route) => path.startsWith(route));
  }

  /**
   * Route change handler: pause if moving away from designated work area
   */
  public static onNavigate(newRoute: string) {
    this.currentRoute = newRoute;
    if (this.isDesignatedWorkRoute(newRoute)) {
      if (this.isPaused && !document.hidden) {
        this.resumeTracking();
      }
    } else {
      // Navigating outside work area pauses tracking
      this.pauseTracking();
    }
  }

  /**
   * Resume / Start an active work session
   */
  public static async resumeTracking() {
    if (!this.activeOfficerId || !this.isDesignatedWorkRoute(this.currentRoute)) return;
    if (!this.isPaused && this.activeSessionId) return;

    this.isPaused = false;
    const now = Date.now();
    this.sessionStartTime = now;
    this.activeSessionId = crypto.randomUUID();

    const reportDate = this.getLocalDateString(new Date(now));

    const sessionItem: WorkSessionItem = {
      id: this.activeSessionId,
      officerId: this.activeOfficerId,
      assignmentId: this.activeAssignmentId,
      reportDate,
      startedAt: new Date(now).toISOString(),
      endedAt: null,
      durationSeconds: 0,
      deviceReported: true,
      syncStatus: 'PENDING',
    };

    try {
      await db.workSessions.put(sessionItem);
    } catch (err) {
      console.error('Failed to start work session in IndexedDB:', err);
    }

    this.resetInactivityTimer();
  }

  /**
   * Pause active work session (e.g. tab hidden, navigated away, inactive)
   * NOTE: This pauses the timer but NEVER finalizes the day's total!
   */
  public static async pauseTracking(): Promise<void> {
    if (this.isPaused || !this.activeSessionId || !this.sessionStartTime) return;

    const now = Date.now();
    const durationSeconds = Math.max(0, Math.floor((now - this.sessionStartTime) / 1000));
    const sessionId = this.activeSessionId;

    this.isPaused = true;
    this.activeSessionId = null;
    this.sessionStartTime = null;

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    try {
      const existing = await db.workSessions.get(sessionId);
      if (existing) {
        await db.workSessions.update(sessionId, {
          endedAt: new Date(now).toISOString(),
          durationSeconds,
        });
      }
    } catch (err) {
      console.error('Failed to close paused work session in IndexedDB:', err);
    }
  }

  /**
   * Attach browser event listeners (visibility change, window blur, user activity)
   */
  private static attachEventListeners() {
    // Visibility change (tab hidden / minimized / switched)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseTracking();
      } else if (this.isDesignatedWorkRoute(this.currentRoute)) {
        this.resumeTracking();
      }
    });

    // Window blur/focus
    window.addEventListener('blur', () => this.pauseTracking());
    window.addEventListener('focus', () => {
      if (this.isDesignatedWorkRoute(this.currentRoute) && !document.hidden) {
        this.resumeTracking();
      }
    });

    // Inactivity detection
    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, () => this.onUserActivity(), { passive: true });
    });
  }

  private static onUserActivity() {
    if (this.isPaused && this.isDesignatedWorkRoute(this.currentRoute) && !document.hidden) {
      this.resumeTracking();
    }
    this.resetInactivityTimer();
  }

  private static resetInactivityTimer() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.inactivityTimer = setTimeout(() => {
      // Inactivity timeout reached -> pause tracking
      this.pauseTracking();
    }, this.INACTIVITY_TIMEOUT_MS);
  }

  /**
   * Get total accumulated screen time for an officer for a specific date (in seconds)
   * Includes closed sessions + currently running session elapsed time.
   */
  public static async getTodayScreenTime(officerId: string, reportDate?: string): Promise<{
    totalSeconds: number;
    sessionCount: number;
    isCurrentlyActive: boolean;
  }> {
    const targetDate = reportDate || this.getLocalDateString();

    try {
      const sessions = await db.workSessions
        .where('[officerId+reportDate]')
        .equals([officerId, targetDate])
        .toArray();

      let totalSeconds = sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);

      // Add currently running session if active and belongs to target date
      if (!this.isPaused && this.sessionStartTime && this.activeSessionId) {
        const currentRunningSeconds = Math.max(0, Math.floor((Date.now() - this.sessionStartTime) / 1000));
        totalSeconds += currentRunningSeconds;
      }

      return {
        totalSeconds,
        sessionCount: sessions.length + (!this.isPaused && this.activeSessionId ? 1 : 0),
        isCurrentlyActive: !this.isPaused,
      };
    } catch (err) {
      console.error('Failed to get screen time from IndexedDB:', err);
      return { totalSeconds: 0, sessionCount: 0, isCurrentlyActive: false };
    }
  }

  /**
   * CRITICAL FINALIZATION RULE:
   * Finalizes the daily screen-time total ONLY upon Daily Work Report submission.
   * Closes active session, saves final duration, queues sessions for sync, and returns total seconds.
   */
  public static async finalizeDay(officerId: string, reportDate: string): Promise<number> {
    // 1. Close any currently running session
    await this.pauseTracking();

    // 2. Compute final eligible duration
    const sessions = await db.workSessions
      .where('[officerId+reportDate]')
      .equals([officerId, reportDate])
      .toArray();

    const finalTotalSeconds = sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);

    // 3. Queue closed sessions for sync
    for (const session of sessions) {
      if (session.syncStatus === 'PENDING') {
        await db.syncQueue.add({
          clientRecordId: session.id,
          entityType: 'WORK_SESSION',
          action: 'CREATE',
          payload: session,
          status: 'PENDING',
          retryCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return finalTotalSeconds;
  }
}

export default ScreenTimeTracker;
