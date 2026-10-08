// server/src/routes/dailyReports.routes.ts
// REST API Routes for Daily Work Reports, Verification & Offline Submissions (Phase 6)

import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import prisma from '../config/db.js';
import { generateReportId } from '../utils/idGenerator.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { Role, SyncStatus, NotificationPriority, ScreenTimeStatus } from '@prisma/client';
import {
  createNotification,
  notifyManagers,
  notifyOfficer,
} from '../services/notification.service.js';
import { recordAuditEvent } from '../services/audit.service.js';

const router = Router();

function formatSeconds(secs: number = 0) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const formatReport = (r: any) => {
  let structured: any = {
    summary: '',
    achievements: '',
    challenges: '',
    resources: '',
    nextDayPlan: '',
    isUrgent: false,
    urgentReason: '',
  };

  if (r.comments) {
    try {
      const parsed = JSON.parse(r.comments);
      if (typeof parsed === 'object' && parsed !== null) {
        structured = { ...structured, ...parsed };
      } else {
        structured.summary = r.comments;
      }
    } catch {
      structured.summary = r.comments;
    }
  }

  return {
    id: r.id,
    officerId: r.officerId,
    officerName: r.officer?.fullName || '',
    officerEmail: r.officer?.email || '',
    officerWoreda: r.officer?.woreda?.name || '',
    supervisorId: r.supervisorId,
    supervisorName: r.supervisor?.fullName || '',
    reportDate: r.reportDate,
    assignmentId: r.assignmentId || null,
    citizenCountLocal: r.citizenCountLocal,
    citizenCountServerConfirmed: r.citizenCountServerConfirmed,
    activityCount: r.activityCount,
    sessionCount: r.sessionCount,
    screenTimeSeconds: r.screenTimeSeconds,
    screenTimeFormatted: formatSeconds(r.screenTimeSeconds),
    comments: r.comments || '',
    summary: structured.summary || (r.comments && !r.comments.startsWith('{') ? r.comments : ''),
    achievements: structured.achievements || '',
    challenges: structured.challenges || '',
    resources: structured.resources || '',
    nextDayPlan: structured.nextDayPlan || '',
    isUrgent: Boolean(structured.isUrgent),
    urgentReason: structured.urgentReason || '',
    submittedAt: r.submittedAt,
    serverReceivedAt: r.serverReceivedAt,
    syncStatus: r.syncStatus,
    createdAt: r.createdAt,
  };
};

/**
 * Helper to process daily report submission
 */
async function handleDailyReportSubmit(req: Request, res: Response): Promise<void> {
  try {
    const caller = req.user!;
    const body = req.body;
    const rawReports = Array.isArray(body) ? body : (Array.isArray(body.reports) ? body.reports : [body]);

    if (!rawReports.length) {
      res.status(400).json({ success: false, error: 'No daily reports provided' });
      return;
    }

    const processed = [];

    for (const r of rawReports) {
      if (!r.reportDate) {
        continue;
      }

      const reportId = r.id || generateReportId();
      const officerId = r.officerId || caller.id;

      // Determine supervisor & woreda
      const officer = await prisma.user.findUnique({
        where: { id: officerId },
        select: { id: true, fullName: true, supervisorId: true, woredaId: true },
      });
      const supervisorId = officer?.supervisorId || r.supervisorId || null;

      // Compute actual server-confirmed citizens for this officer and date
      let startOfDay = new Date(`${r.reportDate}T00:00:00.000Z`);
      let endOfDay = new Date(`${r.reportDate}T23:59:59.999Z`);
      if (isNaN(startOfDay.getTime()) || isNaN(endOfDay.getTime())) {
        startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
      }

      const actualServerCitizens = await prisma.citizen.count({
        where: {
          registeredById: officerId,
          registrationTimestamp: { gte: startOfDay, lte: endOfDay },
        },
      });

      // Prepare comments & structured fields
      let commentsString = r.comments || '';
      let isUrgent = Boolean(r.isUrgent);
      let urgentReason = r.urgentReason || '';

      if (
        r.summary !== undefined ||
        r.achievements !== undefined ||
        r.challenges !== undefined ||
        r.resources !== undefined ||
        r.nextDayPlan !== undefined ||
        r.isUrgent !== undefined ||
        r.urgentReason !== undefined
      ) {
        const structuredData = {
          summary: r.summary || (typeof r.comments === 'string' && !r.comments.startsWith('{') ? r.comments : '') || '',
          achievements: r.achievements || '',
          challenges: r.challenges || '',
          resources: r.resources || '',
          nextDayPlan: r.nextDayPlan || '',
          isUrgent: Boolean(r.isUrgent),
          urgentReason: r.urgentReason || '',
        };
        commentsString = JSON.stringify(structuredData);
        isUrgent = structuredData.isUrgent;
        urgentReason = structuredData.urgentReason;
      } else if (commentsString.startsWith('{')) {
        try {
          const parsed = JSON.parse(commentsString);
          isUrgent = Boolean(parsed.isUrgent);
          urgentReason = parsed.urgentReason || '';
        } catch {}
      }

      const report = await prisma.dailyWorkReport.upsert({
        where: { id: reportId },
        update: {
          citizenCountLocal: r.citizenCountLocal ?? 0,
          citizenCountServerConfirmed: actualServerCitizens,
          activityCount: r.activityCount ?? 0,
          sessionCount: r.sessionCount ?? 0,
          screenTimeSeconds: r.screenTimeSeconds ?? 0,
          comments: commentsString || null,
          submittedAt: r.submittedAt ? new Date(r.submittedAt) : new Date(),
          syncStatus: SyncStatus.SYNCED,
        },
        create: {
          id: reportId,
          officerId,
          supervisorId,
          reportDate: r.reportDate,
          citizenCountLocal: r.citizenCountLocal ?? 0,
          citizenCountServerConfirmed: actualServerCitizens,
          activityCount: r.activityCount ?? 0,
          sessionCount: r.sessionCount ?? 0,
          screenTimeSeconds: r.screenTimeSeconds ?? 0,
          comments: commentsString || null,
          submittedAt: r.submittedAt ? new Date(r.submittedAt) : new Date(),
          syncStatus: SyncStatus.SYNCED,
        },
        include: {
          officer: {
            select: {
              fullName: true,
              email: true,
              woreda: { select: { name: true } },
            },
          },
          supervisor: { select: { fullName: true } },
        },
      });

      // Upsert DailyScreenTime to reflect report submission with cumulative screen time
      if (r.screenTimeSeconds !== undefined && r.screenTimeSeconds !== null) {
        try {
          await prisma.dailyScreenTime.upsert({
            where: {
              officerId_date: {
                officerId,
                date: r.reportDate,
              },
            },
            update: {
              totalEligibleSeconds: r.screenTimeSeconds,
              status: ScreenTimeStatus.FINALIZED,
              finalizedAt: new Date(),
              lastSyncedAt: new Date(),
            },
            create: {
              officerId,
              date: r.reportDate,
              totalEligibleSeconds: r.screenTimeSeconds,
              status: ScreenTimeStatus.FINALIZED,
              finalizedAt: new Date(),
              lastSyncedAt: new Date(),
            },
          });
        } catch (stErr) {
          console.warn('Failed to upsert DailyScreenTime on report submission:', stErr);
        }
      }

      // Automatically record activity log
      try {
        await prisma.activityLog.create({
          data: {
            id: crypto.randomUUID(),
            officerId,
            eventType: 'DAILY_REPORT_SUBMITTED',
            description: `Daily work report submitted for ${r.reportDate} (Registered: ${report.citizenCountLocal}, Screen-time: ${formatSeconds(report.screenTimeSeconds)})`,
            deviceTimestamp: new Date(),
            syncStatus: SyncStatus.SYNCED,
          },
        });
      } catch (logErr) {
        console.warn('Activity log creation failed for daily report submission:', logErr);
      }

      // Role-based notification: Notify supervisor of daily report submission
      if (supervisorId) {
        try {
          await createNotification({
            recipientId: supervisorId,
            title: isUrgent
              ? `URGENT ROADBLOCK: Daily Report from ${officer?.fullName || 'Field Officer'}`
              : `Daily Report: ${officer?.fullName || 'Field Officer'}`,
            message: isUrgent
              ? (urgentReason || `${officer?.fullName || 'Field Officer'} flagged an urgent roadblock in their report for ${r.reportDate}.`)
              : `${officer?.fullName || 'Field Officer'} submitted daily work report for ${r.reportDate} (${report.citizenCountLocal} citizens, ${formatSeconds(report.screenTimeSeconds)}).`,
            type: 'REPORT',
            priority: isUrgent ? NotificationPriority.URGENT : NotificationPriority.NORMAL,
            relatedRecordId: report.id,
            actionUrl: '/reports',
            metadata: {
              reportId: report.id,
              officerId,
              reportDate: r.reportDate,
              isUrgent,
            },
          });
        } catch (notifErr) {
          console.warn('Supervisor notification failed:', notifErr);
        }
      }

      // If urgent roadblock flagged, also dispatch urgent notification to all Managers
      if (isUrgent) {
        try {
          await notifyManagers({
            title: `URGENT ROADBLOCK: ${officer?.fullName || 'Field Officer'} (${r.reportDate})`,
            message: urgentReason || `Urgent roadblock flagged by ${officer?.fullName || 'Field Officer'} for date ${r.reportDate}. Immediate attention required.`,
            type: 'REPORT',
            priority: NotificationPriority.URGENT,
            relatedRecordId: report.id,
            actionUrl: '/all_reports',
            metadata: {
              reportId: report.id,
              officerId,
              reportDate: r.reportDate,
              isUrgent: true,
            },
          });
        } catch (managerErr) {
          console.warn('Manager notification for urgent roadblock failed:', managerErr);
        }
      }

      // Record in system audit trail
      try {
        await prisma.auditLog.create({
          data: {
            actorId: caller.id,
            action: 'DAILY_REPORT_SUBMITTED',
            entityType: 'DAILY_WORK_REPORT',
            entityId: report.id,
            metadata: {
              reportDate: report.reportDate,
              citizenCountLocal: report.citizenCountLocal,
              screenTimeSeconds: report.screenTimeSeconds,
              isUrgent,
            },
          },
        });
      } catch (auditErr) {
        console.warn('Audit log write error:', auditErr);
      }

      processed.push(formatReport(report));
    }

    res.status(201).json({
      success: true,
      message: 'Daily work report submitted successfully',
      data: processed.length === 1 ? processed[0] : processed,
      count: processed.length,
    });
  } catch (error: any) {
    console.error('Submit daily report error:', error);
    res.status(500).json({ success: false, error: 'Failed to process daily work report' });
  }
}

/**
 * Helper to fetch daily reports with role-based scoping
 */
async function handleDailyReportsFetch(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user!;
    const { date, officerId, page = '1', limit = '50', isUrgent } = req.query;

    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (user.role === Role.FIELD_OFFICER) {
      where.officerId = user.id;
    } else if (user.role === Role.SUPERVISOR) {
      where.OR = [
        { supervisorId: user.id },
        { officer: { supervisorId: user.id } },
      ];
    }
    // Managers have access to all reports (no where restriction on officerId/supervisorId)

    if (date) where.reportDate = date as string;
    if (officerId) where.officerId = officerId as string;

    const [reports, total] = await Promise.all([
      prisma.dailyWorkReport.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { reportDate: 'desc' },
        include: {
          officer: {
            select: {
              fullName: true,
              email: true,
              woreda: { select: { name: true } },
            },
          },
          supervisor: { select: { fullName: true } },
        },
      }),
      prisma.dailyWorkReport.count({ where }),
    ]);

    let formatted = reports.map(formatReport);

    if (isUrgent === 'true') {
      formatted = formatted.filter((r) => r.isUrgent);
    }

    res.json({
      success: true,
      data: formatted,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Fetch daily reports error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve daily reports' });
  }
}

/**
 * @route   POST /api/reports and POST /api/reports/daily
 * @desc    Submit or synchronize a Daily Work Report
 */
router.post('/', authenticate, handleDailyReportSubmit);
router.post('/daily', authenticate, handleDailyReportSubmit);

/**
 * @route   GET /api/reports and GET /api/reports/daily
 * @desc    Retrieve daily work reports scoped by role
 */
router.get('/', authenticate, handleDailyReportsFetch);
router.get('/daily', authenticate, handleDailyReportsFetch);

/**
 * @route   GET /api/reports/:id or /api/reports/daily/:id
 * @desc    Retrieve a single daily report by ID
 */
async function handleSingleReportFetch(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;

    const report = await prisma.dailyWorkReport.findUnique({
      where: { id },
      include: {
        officer: {
          select: {
            fullName: true,
            email: true,
            supervisorId: true,
            woreda: { select: { name: true } },
          },
        },
        supervisor: { select: { fullName: true } },
      },
    });

    if (!report) {
      res.status(404).json({ success: false, error: 'Report not found' });
      return;
    }

    // Role-based access check
    if (user.role === Role.FIELD_OFFICER && report.officerId !== user.id) {
      res.status(403).json({ success: false, error: 'Unauthorized to view this report' });
      return;
    }
    if (
      user.role === Role.SUPERVISOR &&
      report.supervisorId !== user.id &&
      report.officer?.supervisorId !== user.id
    ) {
      res.status(403).json({ success: false, error: 'Unauthorized to view this report' });
      return;
    }

    res.json({
      success: true,
      data: formatReport(report),
    });
  } catch (error: any) {
    console.error('Fetch single daily report error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve report' });
  }
}

router.get('/:id', authenticate, handleSingleReportFetch);
router.get('/daily/:id', authenticate, handleSingleReportFetch);

/**
 * @route   POST /api/reports/:id/review and /api/reports/daily/:id/review
 * @desc    Supervisor or Manager reviews, evaluates, and marks a daily work report
 * @access  Private (Supervisor, Manager)
 */
async function handleReportReview(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user!;
    if (user.role === Role.FIELD_OFFICER) {
      res.status(403).json({ success: false, error: 'Officers cannot review daily reports' });
      return;
    }

    const { id } = req.params;
    const { decision, supervisorNotes, comments } = req.body;

    const report = await prisma.dailyWorkReport.findUnique({
      where: { id },
      include: { officer: true },
    });

    if (!report) {
      res.status(404).json({ success: false, error: 'Daily report not found' });
      return;
    }

    let existingParsed: any = {};
    if (report.comments) {
      try {
        existingParsed = JSON.parse(report.comments);
      } catch {
        existingParsed = { originalComments: report.comments };
      }
    }

    const updatedComments = JSON.stringify({
      ...existingParsed,
      reviewDecision: decision || 'APPROVED',
      supervisorNotes: supervisorNotes || comments || 'Reviewed by supervisor',
      reviewedBy: user.fullName,
      reviewedAt: new Date().toISOString(),
    });

    const updated = await prisma.dailyWorkReport.update({
      where: { id },
      data: {
        supervisorId: user.id,
        comments: updatedComments,
        syncStatus: SyncStatus.SYNCED,
      },
      include: {
        officer: {
          select: {
            fullName: true,
            email: true,
            supervisorId: true,
            woreda: { select: { name: true } },
          },
        },
        supervisor: { select: { fullName: true } },
      },
    });

    // Notify officer of report review
    try {
      await notifyOfficer(report.officerId, {
        title: `Report Reviewed: ${report.reportDate}`,
        message: `Your report for ${report.reportDate} was reviewed by ${user.fullName}: ${decision || 'APPROVED'}.${supervisorNotes ? ` Feedback: ${supervisorNotes}` : ''}`,
        type: 'REPORT',
        priority: NotificationPriority.NORMAL,
        relatedRecordId: report.id,
        actionUrl: '/reports',
        metadata: {
          reportId: report.id,
          decision: decision || 'APPROVED',
          supervisorNotes: supervisorNotes || '',
          reviewedBy: user.fullName,
        },
      });
    } catch (notifErr) {
      console.warn('Failed to notify officer of report review:', notifErr);
    }

    // Record Audit Log for Supervisor Review
    try {
      await recordAuditEvent({
        req,
        action: 'DAILY_REPORT_REVIEWED',
        entityType: 'DailyWorkReport',
        entityId: report.id,
        zoneId: report.officer?.zoneId || user.zoneId || null,
        summary: `${user.fullName} (${user.role}) reviewed report for ${report.reportDate} (${report.officer?.fullName || 'Field Officer'}): ${decision || 'APPROVED'}`,
        previousValues: {
          decision: existingParsed.reviewDecision || 'PENDING_REVIEW',
        },
        newValues: {
          decision: decision || 'APPROVED',
          supervisorNotes: supervisorNotes || comments || '',
        },
      });
    } catch (auditErr) {
      console.warn('Failed to record audit log for report review:', auditErr);
    }

    res.json({
      success: true,
      message: 'Daily work report review submitted successfully',
      data: formatReport(updated),
    });
  } catch (error: any) {
    console.error('Report review error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit report review' });
  }
}

router.post('/:id/review', authenticate, handleReportReview);
router.post('/daily/:id/review', authenticate, handleReportReview);

export default router;
