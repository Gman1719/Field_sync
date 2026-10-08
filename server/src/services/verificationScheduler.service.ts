// server/src/services/verificationScheduler.service.ts
// Authoritative Random Work Verification Scheduler & Connection Tracker

import prisma from '../config/db.js';
import {
  evaluateWorkingHours,
  DEFAULT_WORKING_HOURS_CONFIG,
  getZonedTimeComponents,
  getDailyVerificationSlots,
} from '../config/workingHours.js';
import { generateVerificationId, generateAlertId } from '../utils/idGenerator.js';
import {
  Role,
  VerificationStatus,
  VerificationFailureReason,
  ConnectionState,
  LoginState,
  ScreenTimeStatus,
  SyncStatus,
  NotificationPriority,
} from '@prisma/client';
import { notifySupervisorForZone, createNotification } from './notification.service.js';

interface ConnectedClient {
  userId: string;
  role: Role;
  zoneId: string | null;
  lastHeartbeat: number; // Date.now()
  trackingState: ScreenTimeStatus;
  currentWorkArea: string;
  pageTimes?: Record<string, number>;
}

export class VerificationSchedulerService {
  // In-memory active connection registry
  private static connectedClients = new Map<string, ConnectedClient>();

  // Tracks active verification timers: verificationId -> timeout
  private static pendingTimeouts = new Map<string, NodeJS.Timeout>();

  private static schedulerInterval: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Heartbeat from FieldSync client (keeps connection alive and updates tracking state)
   */
  static recordHeartbeat(
    userId: string,
    role: Role,
    zoneId: string | null,
    trackingState: ScreenTimeStatus = ScreenTimeStatus.NOT_TRACKING,
    currentWorkArea: string = 'unknown',
    pageTimes?: Record<string, number>
  ) {
    const existing = this.connectedClients.get(userId);
    const updatedPageTimes = pageTimes || existing?.pageTimes || {};
    this.connectedClients.set(userId, {
      userId,
      role,
      zoneId,
      lastHeartbeat: Date.now(),
      trackingState,
      currentWorkArea,
      pageTimes: updatedPageTimes,
    });
  }

  static getOfficerCurrentWorkArea(userId: string): string {
    const client = this.connectedClients.get(userId);
    return client?.currentWorkArea || 'dashboard';
  }

  static getOfficerPageTimes(userId: string): Record<string, number> {
    const client = this.connectedClients.get(userId);
    return client?.pageTimes || {};
  }

  /**
   * Remove client on logout or explicit disconnect
   */
  static recordLogout(userId: string) {
    this.connectedClients.delete(userId);
  }

  static unregisterClient(userId: string) {
    this.connectedClients.delete(userId);
  }

  /**
   * Check connection status of an officer
   */
  static getOfficerConnectionStatus(userId: string): {
    connectionState: ConnectionState;
    loginState: LoginState;
    trackingState: ScreenTimeStatus;
  } {
    const client = this.connectedClients.get(userId);
    if (!client) {
      return {
        connectionState: ConnectionState.OFFLINE,
        loginState: LoginState.LOGGED_OUT,
        trackingState: ScreenTimeStatus.NOT_TRACKING,
      };
    }

    const isRecent = Date.now() - client.lastHeartbeat < 45000; // 45s heartbeat window
    if (!isRecent) {
      return {
        connectionState: ConnectionState.OFFLINE,
        loginState: LoginState.LOGGED_IN,
        trackingState: ScreenTimeStatus.NOT_TRACKING,
      };
    }

    return {
      connectionState: ConnectionState.ONLINE,
      loginState: LoginState.LOGGED_IN,
      trackingState: client.trackingState,
    };
  }

  /**
   * Start the authoritative server scheduler loop
   */
  static start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('⏰ [VerificationScheduler] Service initialized for official working hours.');

    // Run scheduler check every 60 seconds
    this.schedulerInterval = setInterval(() => {
      this.tickScheduler();
    }, 60 * 1000);

    // Initial check on boot
    this.tickScheduler();
  }

  /**
   * Stop the scheduler
   */
  static stop() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    this.isRunning = false;
  }

  /**
   * Main scheduler tick:
   * 1. Evaluates official working hours (8:30–12:30, 13:30–17:30).
   * 2. If lunch or outside working hours: gracefully skips.
   * 3. For all active FIELD_OFFICERs:
   *    - Checks last verification time.
   *    - If randomized window has elapsed (and safeguards satisfied): generates verification check.
   */
  private static async tickScheduler() {
    try {
      const now = new Date();
      const workingHoursEval = evaluateWorkingHours(now);

      // When official working hours end (17:30 onwards), dispatch daily report submission reminder alerts
      const { totalMinutes } = getZonedTimeComponents(now);
      if (totalMinutes >= 1050) {
        await this.checkAndDispatchDailyReportAlerts(now);
      }

      // Do NOT schedule verifications during lunch (12:30–13:30) or outside 08:30–17:30
      if (!workingHoursEval.isWorkingHours) {
        return;
      }

      const todayDateStr = workingHoursEval.dateStr;

      // 1. Fetch all active field officers
      const officers = await prisma.user.findMany({
        where: {
          role: Role.FIELD_OFFICER,
          isActive: true,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          zoneId: true,
        },
      });

      for (const officer of officers) {
        await this.evaluateOfficerVerification(officer, now, todayDateStr);
      }
    } catch (err: any) {
      console.error('Error in verification scheduler tick:', err.message);
    }
  }

  /**
   * Evaluates whether an individual officer is due for a random verification
   */
  private static async evaluateOfficerVerification(
    officer: { id: string; fullName: string; email: string; zoneId: string | null },
    now: Date,
    todayDateStr: string
  ) {
    const config = DEFAULT_WORKING_HOURS_CONFIG;

    // 1. Check if there is already a SCHEDULED or PENDING check for this officer
    const activeCheck = await prisma.workVerification.findFirst({
      where: {
        officerId: officer.id,
        date: todayDateStr,
        status: { in: [VerificationStatus.SCHEDULED, VerificationStatus.PENDING] },
      },
    });

    if (activeCheck) {
      return; // Already has an ongoing check
    }

    // 2. Count total checks today for this officer
    const totalTodayChecks = await prisma.workVerification.count({
      where: {
        officerId: officer.id,
        date: todayDateStr,
      },
    });

    if (totalTodayChecks >= config.maxDailyChecks) {
      return; // Safeguard: max daily checks reached
    }

    // 3. Find the most recent verification for this officer today
    const lastVerification = await prisma.workVerification.findFirst({
      where: {
        officerId: officer.id,
        date: todayDateStr,
      },
      orderBy: { scheduledAt: 'desc' },
    });

    const minGapMs = config.minVerificationGapMinutes * 60 * 1000;
    if (lastVerification) {
      const elapsedSinceLast = now.getTime() - lastVerification.scheduledAt.getTime();
      if (elapsedSinceLast < minGapMs) {
        return; // Safeguard: minimum gap not met
      }

      // Randomization within minInterval and maxInterval
      const minIntervalMs = config.minVerificationIntervalMinutes * 60 * 1000;
      const maxIntervalMs = config.maxVerificationIntervalMinutes * 60 * 1000;

      // Deterministic but pseudo-random check per minute
      const randomThreshold = Math.random();
      if (elapsedSinceLast < minIntervalMs) {
        return;
      }
      if (elapsedSinceLast < maxIntervalMs && randomThreshold > 0.35) {
        return; // Wait a bit more for natural randomization
      }
    } else {
      // First check of the day: randomized entry
      const randomFirstCheck = Math.random();
      if (randomFirstCheck > 0.4) {
        return; // Stagger across morning
      }
    }

    // Officer is due for verification!
    await this.triggerVerification(officer, now, todayDateStr);
  }

  /**
   * Triggers a verification check for the officer
   */
  static async triggerVerification(
    officer: { id: string; fullName: string; email: string; zoneId: string | null },
    now: Date,
    todayDateStr: string
  ) {
    const deadlineAt = new Date(now.getTime() + DEFAULT_WORKING_HOURS_CONFIG.verificationTimeoutSeconds * 1000);
    const conn = this.getOfficerConnectionStatus(officer.id);

    // Get today's active work session if exists
    const activeSession = await prisma.workSession.findFirst({
      where: {
        officerId: officer.id,
        reportDate: todayDateStr,
        endedAt: null,
      },
    });

    // Check conditions
    if (conn.loginState === LoginState.LOGGED_OUT) {
      // Case D / E: Officer logged out / closed app during working hours
      const missedV = await prisma.workVerification.create({
        data: {
          id: generateVerificationId(),
          officerId: officer.id,
          workSessionId: activeSession?.id || null,
          scheduledAt: now,
          triggeredAt: now,
          deadlineAt,
          status: VerificationStatus.MISSED,
          failureReason: VerificationFailureReason.NO_ACTIVE_SESSION,
          connectionState: conn.connectionState,
          loginState: LoginState.LOGGED_OUT,
          trackingStateBefore: conn.trackingState,
          trackingStateAfter: ScreenTimeStatus.NOT_TRACKING,
          date: todayDateStr,
          notes: 'Missed — Officer was logged out during official working hours',
        },
      });

      // Find officer's assigned supervisor - notify ONLY assigned supervisor
      const officerWithSup = await prisma.user.findUnique({
        where: { id: officer.id },
        select: {
          supervisorId: true,
          zoneId: true,
          assignedTasks: {
            where: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
            select: { assignedSupervisorId: true },
            take: 1,
          },
        },
      });

      const assignedSupId = officerWithSup?.supervisorId || officerWithSup?.assignedTasks?.[0]?.assignedSupervisorId;

      if (assignedSupId) {
        await createNotification({
          recipientId: assignedSupId,
          title: 'Missed Verification: Officer Logged Out',
          message: `Field officer ${officer.fullName} failed to answer a scheduled work verification because they were logged out during official working hours.`,
          type: 'SECURITY',
          priority: NotificationPriority.IMPORTANT,
          relatedRecordId: missedV.id,
        });
      } else if (officer.zoneId) {
        await notifySupervisorForZone(officer.zoneId, {
          title: 'Missed Verification: Officer Logged Out',
          message: `Field officer ${officer.fullName} failed to answer a scheduled work verification because they were logged out during official working hours.`,
          type: 'SECURITY',
          priority: NotificationPriority.IMPORTANT,
          relatedRecordId: missedV.id,
        });
      }
      return;
    }

    if (conn.connectionState === ConnectionState.OFFLINE) {
      // Case C: Offline + No active client connection
      const offlineV = await prisma.workVerification.create({
        data: {
          id: generateVerificationId(),
          officerId: officer.id,
          workSessionId: activeSession?.id || null,
          scheduledAt: now,
          triggeredAt: now,
          deadlineAt,
          status: VerificationStatus.NO_ACTIVE_CONNECTION,
          failureReason: VerificationFailureReason.NO_ACTIVE_CONNECTION,
          connectionState: ConnectionState.OFFLINE,
          loginState: conn.loginState,
          trackingStateBefore: conn.trackingState,
          trackingStateAfter: ScreenTimeStatus.NOT_TRACKING,
          date: todayDateStr,
          notes: 'No active FieldSync connection detected during scheduled verification.',
        },
      });

      const officerWithSup = await prisma.user.findUnique({
        where: { id: officer.id },
        select: {
          supervisorId: true,
          zoneId: true,
          assignedTasks: {
            where: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
            select: { assignedSupervisorId: true },
            take: 1,
          },
        },
      });

      const assignedSupId = officerWithSup?.supervisorId || officerWithSup?.assignedTasks?.[0]?.assignedSupervisorId;

      if (assignedSupId) {
        await createNotification({
          recipientId: assignedSupId,
          title: 'No active connection during verification',
          message: `No active FieldSync connection detected for ${officer.fullName} during scheduled verification.`,
          type: 'SECURITY',
          priority: NotificationPriority.NORMAL,
          relatedRecordId: offlineV.id,
        });
      } else if (officer.zoneId) {
        await notifySupervisorForZone(officer.zoneId, {
          title: 'No active FieldSync connection detected',
          message: `No active FieldSync connection detected for ${officer.fullName} during scheduled verification.`,
          type: 'SECURITY',
          priority: NotificationPriority.NORMAL,
          relatedRecordId: offlineV.id,
        });
      }
      return;
    }

    // Case A: Online + Logged In -> Create PENDING verification with 15-sec deadline
    const verification = await prisma.workVerification.create({
      data: {
        id: generateVerificationId(),
        officerId: officer.id,
        workSessionId: activeSession?.id || null,
        scheduledAt: now,
        triggeredAt: now,
        deadlineAt,
        status: VerificationStatus.PENDING,
        connectionState: ConnectionState.ONLINE,
        loginState: LoginState.LOGGED_IN,
        trackingStateBefore: conn.trackingState,
        trackingStateAfter: conn.trackingState,
        date: todayDateStr,
      },
    });

    // Set 15-second server-side timeout to mark as MISSED if not answered
    const timeout = setTimeout(async () => {
      this.pendingTimeouts.delete(verification.id);
      await this.handleVerificationTimeout(verification.id, officer.zoneId, officer.fullName);
    }, 15500); // 15.5s grace

    this.pendingTimeouts.set(verification.id, timeout);
  }

  /**
   * Handles timeout when 15 seconds expire without officer confirmation
   */
  private static async handleVerificationTimeout(
    verificationId: string,
    zoneId: string | null,
    officerName: string
  ) {
    try {
      const v = await prisma.workVerification.findUnique({
        where: { id: verificationId },
      });

      if (!v || v.status !== VerificationStatus.PENDING) {
        return; // Already resolved
      }

      await prisma.workVerification.update({
        where: { id: verificationId },
        data: {
          status: VerificationStatus.MISSED,
          failureReason: VerificationFailureReason.NO_RESPONSE,
          trackingStateAfter: ScreenTimeStatus.NOT_TRACKING,
          notes: 'Work verification missed — FieldSync did not receive a response within 15 seconds.',
        },
      });

      // Update DailyScreenTime state to NOT_TRACKING if tracking was active
      await prisma.dailyScreenTime.updateMany({
        where: {
          officerId: v.officerId,
          date: v.date,
          status: ScreenTimeStatus.TRACKING,
        },
        data: {
          status: ScreenTimeStatus.NOT_TRACKING,
        },
      });

      // Notify assigned Supervisor ONLY (or zone fallback if unassigned)
      const offUser = await prisma.user.findUnique({
        where: { id: v.officerId },
        select: {
          supervisorId: true,
          zoneId: true,
          assignedTasks: {
            where: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
            select: { assignedSupervisorId: true },
            take: 1,
          },
        },
      });

      const assignedSupId = offUser?.supervisorId || offUser?.assignedTasks?.[0]?.assignedSupervisorId;

      if (assignedSupId) {
        await createNotification({
          recipientId: assignedSupId,
          title: 'Work verification missed',
          message: `FieldSync did not receive a response within 15 seconds for ${officerName}.`,
          type: 'SECURITY',
          priority: NotificationPriority.IMPORTANT,
          relatedRecordId: verificationId,
        });
      } else if (zoneId || offUser?.zoneId) {
        await notifySupervisorForZone((zoneId || offUser?.zoneId)!, {
          title: 'Work verification missed',
          message: `FieldSync did not receive a response within 15 seconds for ${officerName}.`,
          type: 'SECURITY',
          priority: NotificationPriority.IMPORTANT,
          relatedRecordId: verificationId,
        });
      }
    } catch (err: any) {
      console.error('Error handling verification timeout:', err.message);
    }
  }

  /**
   * Officer responded to verification within the 15-second window
   */
  static async recordConfirmation(verificationId: string, officerId: string): Promise<boolean> {
    const v = await prisma.workVerification.findUnique({
      where: { id: verificationId },
    });

    if (!v || v.officerId !== officerId) {
      return false;
    }

    if (v.status !== VerificationStatus.PENDING && v.status !== VerificationStatus.SCHEDULED) {
      return false; // Already resolved or expired
    }

    const now = new Date();
    const responseTimeSecs = Math.max(0, (now.getTime() - v.scheduledAt.getTime()) / 1000);

    // Cancel timeout
    const timeout = this.pendingTimeouts.get(verificationId);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingTimeouts.delete(verificationId);
    }

    await prisma.workVerification.update({
      where: { id: verificationId },
      data: {
        status: VerificationStatus.CONFIRMED,
        respondedAt: now,
        responseTimeSeconds: Math.round(responseTimeSecs * 10) / 10,
        trackingStateAfter: ScreenTimeStatus.TRACKING,
        notes: `Verification confirmed in ${responseTimeSecs.toFixed(1)}s`,
      },
    });

    return true;
  }

  /**
   * Authoritatively guarantees that for any working day (08:30 - 12:30 and 13:30 - 17:30 = 8h),
   * all scheduled verification checks at 10-20 minute intervals (~30-32 checks total)
   * are populated for the specified field officers, even if the officer is not logged in or has not started their session.
   */
  static async ensureDailyVerificationsForOfficers(officerIds: string[], targetDateStr?: string) {
    if (!officerIds || officerIds.length === 0) return;

    const { dateStr: todayDateStr, totalMinutes: currentMinute } = getZonedTimeComponents(new Date());
    const dateStr = targetDateStr || todayDateStr;

    // Only process dates that are today or in the past
    if (dateStr > todayDateStr) return;

    const isToday = dateStr === todayDateStr;

    for (const officerId of officerIds) {
      try {
        const slots = getDailyVerificationSlots(dateStr, officerId);

        // Determine which slots have passed
        const applicableSlots = slots.filter((s) => {
          if (!isToday) return true; // full day has passed
          return s.minuteOfDay <= currentMinute;
        });

        if (applicableSlots.length === 0) continue;

        // Fetch all existing verifications for this officer on this date
        const existing = await prisma.workVerification.findMany({
          where: {
            officerId,
            date: dateStr,
          },
          select: {
            id: true,
            scheduledAt: true,
            status: true,
          },
        });

        // Find active work session for this date if any
        const activeSession = await prisma.workSession.findFirst({
          where: {
            officerId,
            reportDate: dateStr,
          },
        });

        for (const slot of applicableSlots) {
          const slotTime = new Date(slot.isoDate).getTime();
          // Check if an existing verification is within 5 minutes of this slot
          const hasCheck = existing.some((v) => {
            const vTime = new Date(v.scheduledAt).getTime();
            return Math.abs(vTime - slotTime) <= 5 * 60 * 1000;
          });

          if (!hasCheck) {
            const scheduledAt = new Date(slot.isoDate);
            const deadlineAt = new Date(scheduledAt.getTime() + 15000);
            const newVId = generateVerificationId();

            await prisma.workVerification.create({
              data: {
                id: newVId,
                officerId,
                workSessionId: activeSession?.id || null,
                scheduledAt,
                triggeredAt: scheduledAt,
                deadlineAt,
                status: VerificationStatus.MISSED,
                failureReason: VerificationFailureReason.NO_ACTIVE_SESSION,
                connectionState: ConnectionState.OFFLINE,
                loginState: LoginState.LOGGED_OUT,
                trackingStateBefore: ScreenTimeStatus.NOT_TRACKING,
                trackingStateAfter: ScreenTimeStatus.NOT_TRACKING,
                date: dateStr,
                notes: 'Missed — Officer was not logged in / no active session during working hours',
              },
            });
          }
        }
      } catch (err: any) {
        console.error(`Error ensuring verifications for officer ${officerId}:`, err.message);
      }
    }
  }

  /**
   * Dispatches the default operational alert to field officers who have not submitted
   * their daily work report for today once official working hours have ended (at or after 17:30).
   */
  static async checkAndDispatchDailyReportAlerts(now: Date = new Date()) {
    try {
      const { dateStr: todayDateStr, totalMinutes } = getZonedTimeComponents(now);

      // Report submission time arrives when official working hours end (17:30 = 1050 minutes)
      if (totalMinutes < 1050) {
        return; // Working hours are still active; do not interrupt officers during their shift
      }

      // Fetch all active field officers
      const officers = await prisma.user.findMany({
        where: {
          role: Role.FIELD_OFFICER,
          isActive: true,
        },
        select: {
          id: true,
          fullName: true,
          supervisorId: true,
          supervisor: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      for (const officer of officers) {
        // Check if report already submitted for today
        const existingReport = await prisma.dailyWorkReport.findFirst({
          where: {
            officerId: officer.id,
            reportDate: todayDateStr,
          },
        });

        if (existingReport) {
          continue; // Officer has already submitted today's report
        }

        // Check if alert already sent today to avoid duplicate notifications
        const alreadyAlerted = await prisma.notification.findFirst({
          where: {
            recipientId: officer.id,
            type: 'SUPERVISOR_ALERT',
            title: 'Daily Work Report Required',
            createdAt: {
              gte: new Date(`${todayDateStr}T00:00:00.000Z`),
            },
          },
        });

        if (alreadyAlerted) {
          continue; // Already sent today
        }

        const supervisorName = officer.supervisor?.fullName || 'Assigned Supervisor';
        const supervisorId = officer.supervisor?.id || officer.supervisorId || 'supervisor';
        const alertId = generateAlertId();

        await prisma.notification.create({
          data: {
            id: alertId,
            recipientId: officer.id,
            title: 'Daily Work Report Required',
            message: `Hello ${officer.fullName}, official working hours have ended (17:30) and you have not submitted your daily work report for today (${todayDateStr}) to your assigned supervisor (${supervisorName}). Please submit your daily report now.`,
            type: 'SUPERVISOR_ALERT',
            priority: NotificationPriority.IMPORTANT,
            isRead: false,
            actionUrl: 'report_new',
            metadata: {
              senderId: supervisorId,
              senderName: supervisorName,
              senderRole: 'supervisor',
              isDailyReportReminder: true,
              reportDate: todayDateStr,
            },
          },
        });
      }
    } catch (err: any) {
      console.error('Error in checkAndDispatchDailyReportAlerts:', err.message);
    }
  }
}

export default VerificationSchedulerService;
