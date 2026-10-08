// server/src/routes/workMonitoring.routes.ts
// REST API Routes for Screen-Time Tracking, Random Work Verification & Supervisor Monitoring

import { Router, Request, Response } from 'express';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/auth.middleware.js';
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
import { VerificationSchedulerService } from '../services/verificationScheduler.service.js';
import {
  evaluateWorkingHours,
  DEFAULT_WORKING_HOURS_CONFIG,
  getZonedTimeComponents,
} from '../config/workingHours.js';
import { notifySupervisorForZone } from '../services/notification.service.js';

const router = Router();

// Helper to format seconds to "5h 42m" or "0m"
function formatHoursMinutes(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * @route   POST /api/work-monitoring/heartbeat
 * @desc    Client sends periodic heartbeat with current route and screen-time tracking state
 * @access  Private (Officer, Supervisor, Manager)
 */
router.post('/heartbeat', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { trackingState = ScreenTimeStatus.NOT_TRACKING, currentWorkArea = 'unknown', totalEligibleSeconds = 0, pageTimes = {} } = req.body;

    VerificationSchedulerService.recordHeartbeat(
      user.id,
      user.role,
      user.zoneId || null,
      trackingState,
      currentWorkArea,
      pageTimes
    );

    // If officer, upsert today's DailyScreenTime record
    if (user.role === Role.FIELD_OFFICER) {
      const { dateStr } = getZonedTimeComponents();

      // Check if not finalized
      const existing = await prisma.dailyScreenTime.findUnique({
        where: {
          officerId_date: {
            officerId: user.id,
            date: dateStr,
          },
        },
      });

      if (!existing || existing.status !== ScreenTimeStatus.FINALIZED) {
        await prisma.dailyScreenTime.upsert({
          where: {
            officerId_date: {
              officerId: user.id,
              date: dateStr,
            },
          },
          update: {
            totalEligibleSeconds: Math.max(existing?.totalEligibleSeconds || 0, totalEligibleSeconds),
            status: trackingState,
            lastActivityAt: new Date(),
            lastSyncedAt: new Date(),
          },
          create: {
            officerId: user.id,
            date: dateStr,
            startedAt: new Date(),
            totalEligibleSeconds,
            status: trackingState,
            lastActivityAt: new Date(),
            lastSyncedAt: new Date(),
          },
        });
      }
    }

    // Check if there is an active pending verification waiting for this officer
    let pendingVerification = null;
    if (user.role === Role.FIELD_OFFICER) {
      const now = new Date();
      pendingVerification = await prisma.workVerification.findFirst({
        where: {
          officerId: user.id,
          status: VerificationStatus.PENDING,
          deadlineAt: { gt: now },
        },
        orderBy: { scheduledAt: 'desc' },
      });
    }

    res.json({
      success: true,
      pendingVerification: pendingVerification
        ? {
            id: pendingVerification.id,
            scheduledAt: pendingVerification.scheduledAt,
            deadlineAt: pendingVerification.deadlineAt,
            remainingSeconds: Math.max(
              0,
              Math.ceil((pendingVerification.deadlineAt.getTime() - Date.now()) / 1000)
            ),
          }
        : null,
    });
  } catch (error: any) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ success: false, error: 'Failed to process heartbeat' });
  }
});

/**
 * @route   GET /api/work-monitoring/verifications/pending
 * @desc    Check if an active verification popup is required right now for the officer
 * @access  Private (Officer)
 */
router.get('/verifications/pending', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const now = new Date();

    const pending = await prisma.workVerification.findFirst({
      where: {
        officerId: user.id,
        status: VerificationStatus.PENDING,
        deadlineAt: { gt: now },
      },
      orderBy: { scheduledAt: 'desc' },
    });

    if (!pending) {
      res.json({ success: true, pending: null });
      return;
    }

    const remaining = Math.max(0, Math.ceil((pending.deadlineAt.getTime() - now.getTime()) / 1000));

    res.json({
      success: true,
      pending: {
        id: pending.id,
        scheduledAt: pending.scheduledAt,
        deadlineAt: pending.deadlineAt,
        remainingSeconds: remaining,
        message: 'Are you still working in FieldSync?',
      },
    });
  } catch (error: any) {
    console.error('Pending verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending verification' });
  }
});

/**
 * @route   GET /api/work-monitoring/verifications
 * @desc    Supervisor / Manager list of verification records strictly scoped to their assigned officers
 * @access  Private (Supervisor, Manager)
 */
router.get('/verifications', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { startDate, endDate, date, officerId } = req.query;

    const where: any = {};

    if (user.role === Role.SUPERVISOR) {
      // Supervisor sees ONLY their assigned officers
      const officerWhere: any = {
        role: Role.FIELD_OFFICER,
        supervisorId: user.id,
      };

      const myOfficers = await prisma.user.findMany({
        where: officerWhere,
        select: { id: true },
      });

      const officerIds = myOfficers.map((o) => o.id);
      if (officerId) {
        if (!officerIds.includes(officerId as string)) {
          res.json({ success: true, data: [] });
          return;
        }
        where.officerId = officerId as string;
      } else {
        where.officerId = { in: officerIds };
      }
    } else if (user.role === Role.FIELD_OFFICER) {
      where.officerId = user.id;
    } else if (officerId) {
      where.officerId = officerId as string;
    }

    if (date) {
      where.date = date as string;
    } else if (startDate && endDate) {
      where.date = { gte: startDate as string, lte: endDate as string };
    }

    const targetDateStr = (date as string) || (startDate as string) || getZonedTimeComponents().dateStr;
    const targetOfficers = where.officerId
      ? (typeof where.officerId === 'string' ? [where.officerId] : (where.officerId.in || []))
      : [];
    if (targetOfficers.length > 0) {
      await VerificationSchedulerService.ensureDailyVerificationsForOfficers(targetOfficers, targetDateStr);
    }

    const verifications = await prisma.workVerification.findMany({
      where,
      include: {
        officer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            zone: { select: { id: true, name: true } },
            region: { select: { id: true, name: true } },
            woreda: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 1000,
    });

    res.json({
      success: true,
      data: verifications,
    });
  } catch (error: any) {
    console.error('Fetch supervisor verifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve verifications' });
  }
});

/**
 * @route   POST /api/work-monitoring/verifications/respond
 * @desc    Officer clicked "I'm Here" within 15 seconds
 * @access  Private (Officer)
 */
router.post('/verifications/respond', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { verificationId } = req.body;

    if (!verificationId) {
      res.status(400).json({ success: false, error: 'verificationId is required' });
      return;
    }

    const confirmed = await VerificationSchedulerService.recordConfirmation(verificationId, user.id);
    if (!confirmed) {
      res.status(400).json({
        success: false,
        error: 'Verification was already finalized or 15-second response window expired',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Verification confirmed',
      status: VerificationStatus.CONFIRMED,
    });
  } catch (error: any) {
    console.error('Verification response error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit verification response' });
  }
});

/**
 * @route   POST /api/work-monitoring/verifications/missed
 * @desc    Record that an officer did not answer verification within 15 seconds and notify supervisor
 * @access  Private (Officer, Supervisor, Manager)
 */
router.post('/verifications/missed', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = req.user!;
    const { verificationId, reason } = req.body;

    const officer = await prisma.user.findUnique({
      where: { id: caller.id },
      include: { supervisor: true, zone: true },
    });

    if (verificationId) {
      await prisma.workVerification.updateMany({
        where: { id: verificationId, status: VerificationStatus.PENDING },
        data: {
          status: VerificationStatus.MISSED,
          failureReason: reason || VerificationFailureReason.NO_RESPONSE,
          trackingStateAfter: ScreenTimeStatus.NOT_TRACKING,
          notes: 'Work verification missed — FieldSync officer did not respond within required window.',
        },
      });
    }

    if (officer) {
      const supervisorId = officer.supervisorId;
      const zoneId = officer.zoneId;

      if (supervisorId) {
        await prisma.notification.create({
          data: {
            recipientId: supervisorId,
            title: 'Unanswered Work Verification',
            message: `Field officer ${officer.fullName} failed to answer their random security verification prompt.`,
            type: 'SECURITY',
            priority: NotificationPriority.IMPORTANT,
            relatedRecordId: verificationId || null,
          },
        });
      } else if (zoneId) {
        await notifySupervisorForZone(zoneId, {
          title: 'Unanswered Work Verification',
          message: `Field officer ${officer.fullName} failed to answer their random security verification prompt.`,
          type: 'SECURITY',
          priority: NotificationPriority.IMPORTANT,
          relatedRecordId: verificationId || null,
        });
      }
    }

    res.json({ success: true, message: 'Missed verification recorded and supervisor notified' });
  } catch (error: any) {
    console.error('Record missed verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to record missed verification' });
  }
});

/**
 * @route   POST /api/work-monitoring/verifications/sync
 * @desc    Idempotent sync for offline-recorded verifications
 * @access  Private (Officer, Supervisor, Manager)
 */
router.post('/verifications/sync', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = req.user!;
    const body = req.body;
    const items = Array.isArray(body) ? body : (Array.isArray(body.verifications) ? body.verifications : [body]);

    const synced = [];

    for (const item of items) {
      if (!item.id || !item.scheduledAt) continue;

      const officerId = item.officerId || caller.id;
      const dateStr = item.date || item.scheduledAt.slice(0, 10);

      // Determine appropriate status from offline payload
      let status: VerificationStatus = VerificationStatus.CONFIRMED_OFFLINE;
      if (item.status === 'MISSED' || item.status === 'MISSED_OFFLINE' || item.failureReason) {
        status = VerificationStatus.MISSED_OFFLINE;
      }

      const scheduledAt = new Date(item.scheduledAt);
      const deadlineAt = item.deadlineAt ? new Date(item.deadlineAt) : new Date(scheduledAt.getTime() + 15000);
      const respondedAt = item.respondedAt ? new Date(item.respondedAt) : null;
      const responseTimeSeconds = typeof item.responseTimeSeconds === 'number'
        ? item.responseTimeSeconds
        : (respondedAt ? Math.max(0, (respondedAt.getTime() - scheduledAt.getTime()) / 1000) : null);

      const record = await prisma.workVerification.upsert({
        where: { id: item.id },
        update: {
          status,
          respondedAt,
          responseTimeSeconds,
          syncStatus: SyncStatus.SYNCED,
          syncedAt: new Date(),
        },
        create: {
          id: item.id,
          officerId,
          workSessionId: item.workSessionId || null,
          scheduledAt,
          triggeredAt: item.triggeredAt ? new Date(item.triggeredAt) : scheduledAt,
          respondedAt,
          deadlineAt,
          status,
          responseTimeSeconds,
          failureReason: status === VerificationStatus.MISSED_OFFLINE ? (item.failureReason || VerificationFailureReason.NO_RESPONSE) : null,
          connectionState: ConnectionState.OFFLINE,
          loginState: LoginState.LOGGED_IN,
          offlineCreated: true,
          syncStatus: SyncStatus.SYNCED,
          syncedAt: new Date(),
          date: dateStr,
          notes: item.notes || (status === VerificationStatus.CONFIRMED_OFFLINE ? 'Recorded offline and synchronized' : 'Missed offline and synchronized'),
        },
      });

      synced.push(record);
    }

    res.json({
      success: true,
      count: synced.length,
      data: synced,
    });
  } catch (error: any) {
    console.error('Sync verifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to synchronize verifications' });
  }
});

/**
 * @route   POST /api/work-monitoring/screen-time/sync
 * @desc    Idempotent sync for daily screen time record
 * @access  Private (Officer, Supervisor, Manager)
 */
router.post('/screen-time/sync', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = req.user!;
    const body = req.body;
    const records = Array.isArray(body) ? body : (Array.isArray(body.records) ? body.records : [body]);

    const processed = [];

    for (const rec of records) {
      if (!rec.date) continue;
      const officerId = rec.officerId || caller.id;
      const totalEligibleSeconds = parseInt(rec.totalEligibleSeconds || rec.totalScreenTime, 10) || 0;

      const record = await prisma.dailyScreenTime.upsert({
        where: {
          officerId_date: {
            officerId,
            date: rec.date,
          },
        },
        update: {
          totalEligibleSeconds,
          status: rec.status || ScreenTimeStatus.TRACKING,
          lastActivityAt: rec.lastActivityAt ? new Date(rec.lastActivityAt) : new Date(),
          finalizedAt: rec.finalizedAt ? new Date(rec.finalizedAt) : undefined,
          lastSyncedAt: new Date(),
        },
        create: {
          id: rec.id || undefined,
          officerId,
          workSessionId: rec.workSessionId || null,
          date: rec.date,
          startedAt: rec.startedAt ? new Date(rec.startedAt) : new Date(),
          finalizedAt: rec.finalizedAt ? new Date(rec.finalizedAt) : null,
          totalEligibleSeconds,
          status: rec.status || ScreenTimeStatus.TRACKING,
          lastActivityAt: new Date(),
          lastSyncedAt: new Date(),
        },
      });

      processed.push(record);
    }

    res.json({
      success: true,
      count: processed.length,
      data: processed,
    });
  } catch (error: any) {
    console.error('Screen-time sync error:', error);
    res.status(500).json({ success: false, error: 'Failed to sync screen time' });
  }
});

/**
 * @route   POST /api/work-monitoring/trigger-now
 * @desc    Supervisor / Manager triggers an immediate randomized work verification check
 * @access  Private (Supervisor, Manager)
 */
router.post('/trigger-now', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (user.role !== Role.SUPERVISOR && user.role !== Role.MANAGER) {
      res.status(403).json({ success: false, error: 'Unauthorized to trigger work verification' });
      return;
    }

    const { officerId } = req.body;
    let targetOfficer = null;

    if (officerId) {
      targetOfficer = await prisma.user.findUnique({
        where: { id: officerId },
        select: { id: true, fullName: true, email: true, zoneId: true, role: true },
      });

      if (!targetOfficer || targetOfficer.role !== Role.FIELD_OFFICER) {
        res.status(404).json({ success: false, error: 'Target field officer not found' });
        return;
      }

      if (user.role === Role.SUPERVISOR && user.zoneId && targetOfficer.zoneId !== user.zoneId) {
        res.status(403).json({ success: false, error: 'Officer is outside your authorized zone' });
        return;
      }
    } else {
      const where: any = { role: Role.FIELD_OFFICER, isActive: true };
      if (user.role === Role.SUPERVISOR && user.zoneId) {
        where.zoneId = user.zoneId;
      }
      targetOfficer = await prisma.user.findFirst({
        where,
        select: { id: true, fullName: true, email: true, zoneId: true, role: true },
      });
    }

    if (!targetOfficer) {
      res.status(404).json({ success: false, error: 'No eligible field officer found in zone' });
      return;
    }

    const now = new Date();
    const { dateStr } = getZonedTimeComponents(now);

    await VerificationSchedulerService.triggerVerification(targetOfficer, now, dateStr);

    const created = await prisma.workVerification.findFirst({
      where: { officerId: targetOfficer.id, date: dateStr },
      orderBy: { scheduledAt: 'desc' },
    });

    res.json({
      success: true,
      message: `Verification check triggered for ${targetOfficer.fullName}`,
      verification: created
        ? {
            id: created.id,
            officerId: targetOfficer.id,
            officerName: targetOfficer.fullName,
            status: created.status,
            scheduledAt: created.scheduledAt,
            deadlineAt: created.deadlineAt,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Trigger verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to trigger verification' });
  }
});

/**
 * @route   GET /api/work-monitoring/officers
 * @desc    Supervisor / Manager list of Field Officers with live monitoring state
 *          STRICT RBAC: Supervisor sees ONLY officers in their assigned Zone!
 * @access  Private (Supervisor, Manager)
 */
router.get('/officers', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { date } = req.query;
    const targetDate = (date as string) || getZonedTimeComponents().dateStr;

    const where: any = {
      role: Role.FIELD_OFFICER,
      isActive: true,
    };

    // Strict Scoping: Supervisor sees ONLY their assigned officers
    if (user.role === Role.SUPERVISOR) {
      where.supervisorId = user.id;
    }

    const officerIdList = await prisma.user.findMany({
      where,
      select: { id: true },
    });
    if (officerIdList.length > 0) {
      await VerificationSchedulerService.ensureDailyVerificationsForOfficers(
        officerIdList.map((o) => o.id),
        targetDate
      );
    }

    const officers = await prisma.user.findMany({
      where,
      include: {
        region: { select: { id: true, name: true, code: true } },
        zone: { select: { id: true, name: true, code: true } },
        woreda: { select: { id: true, name: true, code: true } },
        kebele: { select: { id: true, name: true, code: true } },
        assignedTasks: {
          where: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
          select: { id: true, title: true },
          take: 1,
        },
        dailyScreenTimes: {
          where: { date: targetDate },
          take: 1,
        },
        workSessions: {
          where: { reportDate: targetDate },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
        workVerifications: {
          where: { date: targetDate },
          orderBy: { scheduledAt: 'desc' },
        },
        dailyReports: {
          where: { reportDate: targetDate },
          take: 1,
        },
        _count: {
          select: { registeredCitizens: true },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    let totalConfirmed = 0;
    let totalMissed = 0;
    let activeCount = 0;
    let offlineCount = 0;
    let loggedOutCount = 0;

    const formatted = officers.map((officer) => {
      const conn = VerificationSchedulerService.getOfficerConnectionStatus(officer.id);
      const screenTimeRec = officer.dailyScreenTimes[0];
      const latestSession = officer.workSessions[0];
      const todayReport = officer.dailyReports[0];
      const verifications = officer.workVerifications;
      const latestVerif = verifications[0];

      // Work Session state
      let workSessionState = 'NOT_STARTED';
      if (todayReport) {
        workSessionState = 'FINALIZED';
      } else if (latestSession && !latestSession.endedAt) {
        workSessionState = 'ACTIVE';
      }

      // Screen time state
      let screenTimeStatus = screenTimeRec?.status || ScreenTimeStatus.NOT_STARTED;
      if (todayReport) screenTimeStatus = ScreenTimeStatus.FINALIZED;

      // Stats
      const confirmedToday = verifications.filter((v) =>
        v.status === VerificationStatus.CONFIRMED || v.status === VerificationStatus.CONFIRMED_OFFLINE
      ).length;

      const missedToday = verifications.filter((v) =>
        v.status === VerificationStatus.MISSED || v.status === VerificationStatus.MISSED_OFFLINE
      ).length;

      const noActiveSessionToday = verifications.filter((v) =>
        v.status === VerificationStatus.NO_ACTIVE_SESSION || v.status === VerificationStatus.NO_ACTIVE_CONNECTION
      ).length;

      totalConfirmed += confirmedToday;
      totalMissed += missedToday;

      if (conn.loginState === LoginState.LOGGED_OUT) {
        loggedOutCount++;
      } else if (conn.connectionState === ConnectionState.OFFLINE) {
        offlineCount++;
      } else {
        activeCount++;
      }

      return {
        id: officer.id,
        name: officer.fullName,
        email: officer.email,
        phoneNumber: officer.phoneNumber,
        assignment: officer.assignedTasks[0]?.title || 'Standard Citizen Fieldwork',
        region: officer.region?.name || '',
        zone: officer.zone?.name || '',
        woreda: officer.woreda?.name || '',
        kebele: officer.kebele?.name || '',
        connectionState: conn.connectionState,
        loginState: conn.loginState,
        workSessionState,
        screenTimeStatus,
        todayScreenTimeSeconds: todayReport
          ? Math.max(screenTimeRec?.totalEligibleSeconds || 0, todayReport.screenTimeSeconds || 0)
          : (screenTimeRec?.totalEligibleSeconds || 0),
        todayScreenTimeFormatted: formatHoursMinutes(
          todayReport
            ? Math.max(screenTimeRec?.totalEligibleSeconds || 0, todayReport.screenTimeSeconds || 0)
            : (screenTimeRec?.totalEligibleSeconds || 0)
        ),
        dailyReportSubmitted: !!todayReport,
        dailyReportSubmittedAt: todayReport?.submittedAt || null,
        reportScreenTimeSeconds: todayReport?.screenTimeSeconds ?? null,
        reportScreenTimeFormatted: todayReport ? formatHoursMinutes(todayReport.screenTimeSeconds) : null,
        reportCitizenCount: todayReport?.citizenCountLocal ?? null,
        registeredCitizensCount: officer._count?.registeredCitizens || 0,
        verificationsCount: verifications.length,
        verificationsConfirmed: confirmedToday,
        verificationsMissed: missedToday,
        verificationsNoActiveSession: noActiveSessionToday,
        lastVerificationStatus: latestVerif ? latestVerif.status : null,
        lastVerificationTime: latestVerif ? latestVerif.scheduledAt : null,
        lastVerificationResponseTime: latestVerif?.responseTimeSeconds || null,
        syncStatus: screenTimeRec?.lastSyncedAt ? 'SYNCHRONIZED' : 'LOCAL_ONLY',
        lastSyncedAt: screenTimeRec?.lastSyncedAt || officer.updatedAt,
        currentWorkArea: VerificationSchedulerService.getOfficerCurrentWorkArea(officer.id),
        pageTimes: VerificationSchedulerService.getOfficerPageTimes(officer.id),
      };
    });

    res.json({
      success: true,
      data: formatted,
      summary: {
        totalOfficers: officers.length,
        activeCount,
        offlineCount,
        loggedOutCount,
        verificationsConfirmed: totalConfirmed,
        verificationsMissed: totalMissed,
        officialPeriod: '08:30 – 17:30',
        lunchPeriod: '12:30 – 13:30 (Excluded)',
        date: targetDate,
      },
    });
  } catch (error: any) {
    console.error('Fetch monitoring officers error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve officer monitoring data' });
  }
});

/**
 * @route   GET /api/work-monitoring/officers/:id
 * @desc    Detailed officer monitoring telemetry with historical screen-time & verifications
 * @access  Private (Supervisor, Manager, Officer for self)
 */
router.get('/officers/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const officerId = req.params.id;
    const { startDate, endDate, date } = req.query;

    const officer = await prisma.user.findUnique({
      where: { id: officerId },
      include: {
        region: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
        woreda: { select: { id: true, name: true } },
        kebele: { select: { id: true, name: true } },
      },
    });

    if (!officer) {
      res.status(404).json({ success: false, error: 'Field Officer not found' });
      return;
    }

    // Role security
    if (user.role === Role.FIELD_OFFICER && user.id !== officerId) {
      res.status(403).json({ success: false, error: 'Unauthorized to view other officers telemetry' });
      return;
    }
    if (user.role === Role.SUPERVISOR && user.zoneId && officer.zoneId !== user.zoneId) {
      res.status(403).json({ success: false, error: 'Unauthorized to view officers outside your assigned Zone' });
      return;
    }

    const todayDateStr = getZonedTimeComponents().dateStr;
    const targetDate = (date as string) || todayDateStr;

    // Build date filter for history
    const dateWhere: any = {};
    if (startDate && endDate) {
      dateWhere.date = { gte: startDate as string, lte: endDate as string };
    } else if (startDate) {
      dateWhere.date = { gte: startDate as string };
    }

    // Historical screen time
    const screenTimes = await prisma.dailyScreenTime.findMany({
      where: {
        officerId,
        ...dateWhere,
      },
      orderBy: { date: 'desc' },
      take: 30,
    });

    // Verification records
    const verifications = await prisma.workVerification.findMany({
      where: {
        officerId,
        ...(dateWhere.date ? { date: dateWhere.date } : { date: targetDate }),
      },
      orderBy: { scheduledAt: 'desc' },
    });

    // Connection state
    const conn = VerificationSchedulerService.getOfficerConnectionStatus(officerId);

    // Active session
    const activeSession = await prisma.workSession.findFirst({
      where: {
        officerId,
        reportDate: targetDate,
        endedAt: null,
      },
    });

    const dailyReport = await prisma.dailyWorkReport.findFirst({
      where: {
        officerId,
        reportDate: targetDate,
      },
    });

    let workSessionState = 'NOT_STARTED';
    if (dailyReport) {
      workSessionState = 'FINALIZED';
    } else if (activeSession) {
      workSessionState = 'ACTIVE';
    }

    const todayScreenTime = screenTimes.find((s) => s.date === targetDate);

    const confirmed = verifications.filter((v) =>
      v.status === VerificationStatus.CONFIRMED || v.status === VerificationStatus.CONFIRMED_OFFLINE
    ).length;

    const missed = verifications.filter((v) =>
      v.status === VerificationStatus.MISSED || v.status === VerificationStatus.MISSED_OFFLINE
    ).length;

    const noActive = verifications.filter((v) =>
      v.status === VerificationStatus.NO_ACTIVE_SESSION || v.status === VerificationStatus.NO_ACTIVE_CONNECTION
    ).length;

    res.json({
      success: true,
      data: {
        officer: {
          id: officer.id,
          name: officer.fullName,
          email: officer.email,
          phone: officer.phoneNumber,
          region: officer.region?.name || '',
          zone: officer.zone?.name || '',
          woreda: officer.woreda?.name || '',
          kebele: officer.kebele?.name || '',
        },
        currentStatus: {
          connectionState: conn.connectionState,
          loginState: conn.loginState,
          workSessionState,
          screenTimeStatus: todayScreenTime?.status || ScreenTimeStatus.NOT_STARTED,
          currentWorkArea: VerificationSchedulerService.getOfficerCurrentWorkArea(officerId),
          pageTimes: VerificationSchedulerService.getOfficerPageTimes(officerId),
        },
        todaySummary: {
          date: targetDate,
          officialWorkPeriod: '08:30 – 17:30',
          lunchPeriod: '12:30 – 13:30 (Excluded)',
          screenTimeSeconds: dailyReport
            ? Math.max(todayScreenTime?.totalEligibleSeconds || 0, dailyReport.screenTimeSeconds || 0)
            : (todayScreenTime?.totalEligibleSeconds || 0),
          screenTimeFormatted: formatHoursMinutes(
            dailyReport
              ? Math.max(todayScreenTime?.totalEligibleSeconds || 0, dailyReport.screenTimeSeconds || 0)
              : (todayScreenTime?.totalEligibleSeconds || 0)
          ),
          dailyReportSubmitted: !!dailyReport,
          dailyReportSubmittedAt: dailyReport?.submittedAt || null,
          reportScreenTimeSeconds: dailyReport?.screenTimeSeconds ?? null,
          reportScreenTimeFormatted: dailyReport ? formatHoursMinutes(dailyReport.screenTimeSeconds) : null,
          reportCitizenCount: dailyReport?.citizenCountLocal ?? null,
          verificationChecks: verifications.length,
          confirmed,
          missed,
          noActiveSession: noActive,
        },
        screenTimeHistory: screenTimes.map((s) => ({
          id: s.id,
          date: s.date,
          totalEligibleSeconds: s.totalEligibleSeconds,
          formatted: formatHoursMinutes(s.totalEligibleSeconds),
          status: s.status,
          startedAt: s.startedAt,
          finalizedAt: s.finalizedAt,
          lastSyncedAt: s.lastSyncedAt,
        })),
        verifications: verifications.map((v) => ({
          id: v.id,
          scheduledAt: v.scheduledAt,
          triggeredAt: v.triggeredAt,
          respondedAt: v.respondedAt,
          deadlineAt: v.deadlineAt,
          status: v.status,
          responseTimeSeconds: v.responseTimeSeconds,
          failureReason: v.failureReason,
          connectionState: v.connectionState,
          loginState: v.loginState,
          offlineCreated: v.offlineCreated,
          syncStatus: v.syncStatus,
          notes: v.notes,
        })),
      },
    });
  } catch (error: any) {
    console.error('Fetch officer detail error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve officer detail' });
  }
});

export default router;
