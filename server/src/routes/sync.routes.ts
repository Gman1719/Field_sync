// server/src/routes/sync.routes.ts
// Centralized Synchronization Engine REST APIs for FieldSync (Phase 7)

import { Router, Request, Response } from 'express';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { Role, SyncStatus, DuplicateReviewStatus, Gender, NotificationPriority } from '@prisma/client';
import { ensureGeographicHierarchy } from '../utils/geoHelper.js';
import {
  createNotification,
  notifyOfficer,
  notifySupervisorForZone,
  notifyManagers,
} from '../services/notification.service.js';

const router = Router();

function formatSeconds(secs: number = 0) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * @route   POST /api/sync/batch
 * @desc    Atomic/Batch synchronization endpoint for offline entities
 * @access  Private (Officer, Supervisor, Manager)
 */
router.post('/batch', authenticate, async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  try {
    const caller = req.user!;
    const {
      citizens = [],
      activityLogs = [],
      workSessions = [],
      dailyReports = [],
    } = req.body;

    const results = {
      citizens: { synced: 0, conflicts: 0, errors: [] as string[] },
      activityLogs: { synced: 0, errors: [] as string[] },
      workSessions: { synced: 0, errors: [] as string[] },
      dailyReports: { synced: 0, errors: [] as string[] },
    };

    const serverTimestamp = new Date();

    // 1. Process Citizens Batch with Multi-Level Duplicate Detection & Conflict Resolution
    for (const c of citizens) {
      if (!c.clientRecordId || !c.firstName || !c.lastName || !c.regionId || !c.zoneId || !c.woredaId || !c.kebeleId || !c.village) {
        results.citizens.errors.push(`Invalid citizen record missing required fields: ${c.clientRecordId || 'unknown'}`);
        continue;
      }

      try {
        const registeredById = c.registeredById || caller.id;

        // Check for cross-device duplicate detection
        let duplicateStatus: DuplicateReviewStatus = DuplicateReviewStatus.NO_DUPLICATE_DETECTED;
        let matchReason: string | null = null;
        let suspectedDupId: string | null = null;

        // Check 1: Phone match
        if (c.phoneNumber) {
          const phoneMatch = await prisma.citizen.findFirst({
            where: {
              phoneNumber: c.phoneNumber,
              clientRecordId: { not: c.clientRecordId },
            },
          });
          if (phoneMatch) {
            duplicateStatus = DuplicateReviewStatus.POSSIBLE_DUPLICATE;
            matchReason = `Identical phone number (${c.phoneNumber}) matched record ${phoneMatch.id}`;
            suspectedDupId = phoneMatch.id;
            results.citizens.conflicts++;
          }
        }

        // Check 2: Name + Kebele match if phone didn't trigger
        if (duplicateStatus === DuplicateReviewStatus.NO_DUPLICATE_DETECTED) {
          const nameMatch = await prisma.citizen.findFirst({
            where: {
              firstName: { equals: c.firstName, mode: 'insensitive' },
              lastName: { equals: c.lastName, mode: 'insensitive' },
              kebeleId: c.kebeleId,
              clientRecordId: { not: c.clientRecordId },
            },
          });
          if (nameMatch) {
            duplicateStatus = DuplicateReviewStatus.POSSIBLE_DUPLICATE;
            matchReason = `Identical full name (${c.firstName} ${c.lastName}) in same kebele`;
            suspectedDupId = nameMatch.id;
            results.citizens.conflicts++;
          }
        }

        const validGender = Object.values(Gender).includes(c.gender) ? (c.gender as Gender) : Gender.OTHER;

        await ensureGeographicHierarchy({
          regionId: c.regionId,
          regionName: c.regionName || c.region,
          zoneId: c.zoneId,
          zoneName: c.zoneName || c.zone,
          woredaId: c.woredaId,
          woredaName: c.woredaName || c.woreda,
          kebeleId: c.kebeleId,
          kebeleName: c.kebeleName || c.kebele,
        });

        // Upsert citizen record by stable clientRecordId
        const savedCitizen = await prisma.citizen.upsert({
          where: { clientRecordId: c.clientRecordId },
          update: {
            firstName: c.firstName,
            middleName: c.middleName || null,
            lastName: c.lastName,
            gender: validGender,
            dateOfBirth: c.dateOfBirth ? new Date(c.dateOfBirth) : null,
            age: c.age ? parseInt(c.age, 10) : null,
            maritalStatus: c.maritalStatus || null,
            phoneNumber: c.phoneNumber || null,
            alternativePhone: c.alternativePhone || null,
            regionId: c.regionId,
            zoneId: c.zoneId,
            woredaId: c.woredaId,
            kebeleId: c.kebeleId,
            village: c.village,
            duplicateReviewStatus: duplicateStatus,
            syncStatus: SyncStatus.SYNCED,
          },
          create: {
            id: c.id || crypto.randomUUID(),
            clientRecordId: c.clientRecordId,
            registeredById,
            firstName: c.firstName,
            middleName: c.middleName || null,
            lastName: c.lastName,
            gender: validGender,
            dateOfBirth: c.dateOfBirth ? new Date(c.dateOfBirth) : null,
            age: c.age ? parseInt(c.age, 10) : null,
            maritalStatus: c.maritalStatus || null,
            phoneNumber: c.phoneNumber || null,
            alternativePhone: c.alternativePhone || null,
            regionId: c.regionId,
            zoneId: c.zoneId,
            woredaId: c.woredaId,
            kebeleId: c.kebeleId,
            village: c.village,
            registrationTimestamp: c.registrationTimestamp ? new Date(c.registrationTimestamp) : serverTimestamp,
            duplicateReviewStatus: duplicateStatus,
            syncStatus: SyncStatus.SYNCED,
          },
        });

        // If duplicate detected, create DuplicateReview audit entry
        if (duplicateStatus === DuplicateReviewStatus.POSSIBLE_DUPLICATE && matchReason) {
          await prisma.duplicateReview.create({
            data: {
              citizenId: savedCitizen.id,
              suspectedDuplicateId: suspectedDupId,
              status: DuplicateReviewStatus.NEEDS_REVIEW,
              matchReason,
              notes: 'Flagged automatically during batch synchronization pipeline.',
            },
          });
        }

        results.citizens.synced++;
      } catch (citErr: any) {
        results.citizens.errors.push(`Citizen ${c.firstName} ${c.lastName}: ${citErr.message}`);
      }
    }

    // 2. Process Activity Logs Batch
    for (const log of activityLogs) {
      if (!log.id || !log.eventType) continue;
      try {
        await prisma.activityLog.upsert({
          where: { id: log.id },
          update: {
            syncStatus: SyncStatus.SYNCED,
            serverReceivedAt: serverTimestamp,
          },
          create: {
            id: log.id,
            officerId: log.officerId || caller.id,
            assignmentId: log.assignmentId || null,
            eventType: log.eventType,
            description: log.description || '',
            deviceTimestamp: log.deviceTimestamp ? new Date(log.deviceTimestamp) : serverTimestamp,
            relatedRecordId: log.relatedRecordId || null,
            metadata: log.metadata || null,
            syncStatus: SyncStatus.SYNCED,
            serverReceivedAt: serverTimestamp,
          },
        });
        results.activityLogs.synced++;
      } catch (logErr: any) {
        results.activityLogs.errors.push(`Log ${log.id}: ${logErr.message}`);
      }
    }

    // 3. Process Work Sessions Batch
    for (const s of workSessions) {
      if (!s.id || !s.startedAt) continue;
      try {
        await prisma.workSession.upsert({
          where: { id: s.id },
          update: {
            endedAt: s.endedAt ? new Date(s.endedAt) : null,
            durationSeconds: s.durationSeconds || 0,
            syncStatus: SyncStatus.SYNCED,
            serverReceivedAt: serverTimestamp,
          },
          create: {
            id: s.id,
            officerId: s.officerId || caller.id,
            assignmentId: s.assignmentId || null,
            reportDate: s.reportDate || new Date().toISOString().split('T')[0],
            startedAt: new Date(s.startedAt),
            endedAt: s.endedAt ? new Date(s.endedAt) : null,
            durationSeconds: s.durationSeconds || 0,
            deviceReported: true,
            syncStatus: SyncStatus.SYNCED,
            serverReceivedAt: serverTimestamp,
          },
        });
        results.workSessions.synced++;
      } catch (sessErr: any) {
        results.workSessions.errors.push(`Session ${s.id}: ${sessErr.message}`);
      }
    }

    // 4. Process Daily Work Reports Batch
    for (const r of dailyReports) {
      if (!r.id || !r.reportDate) continue;
      try {
        const officerId = r.officerId || caller.id;

        // Retrieve officer supervisor
        const officer = await prisma.user.findUnique({
          where: { id: officerId },
          select: { supervisorId: true, fullName: true },
        });
        const supervisorId = officer?.supervisorId || r.supervisorId || null;

        // Compute actual confirmed citizens for that date
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

        let commentsString = r.comments || '';
        let isUrgent = Boolean(r.isUrgent);

        if (r.summary !== undefined || r.challenges !== undefined || r.isUrgent !== undefined) {
          const structured = {
            summary: r.summary || (typeof r.comments === 'string' && !r.comments.startsWith('{') ? r.comments : '') || '',
            achievements: r.achievements || '',
            challenges: r.challenges || '',
            resources: r.resources || '',
            nextDayPlan: r.nextDayPlan || '',
            isUrgent: Boolean(r.isUrgent),
            urgentReason: r.urgentReason || '',
          };
          commentsString = JSON.stringify(structured);
          isUrgent = structured.isUrgent;
        } else if (commentsString.startsWith('{')) {
          try {
            const parsed = JSON.parse(commentsString);
            isUrgent = Boolean(parsed.isUrgent);
          } catch {}
        }

        await prisma.dailyWorkReport.upsert({
          where: { id: r.id },
          update: {
            citizenCountLocal: r.citizenCountLocal ?? 0,
            citizenCountServerConfirmed: actualServerCitizens,
            activityCount: r.activityCount ?? 0,
            sessionCount: r.sessionCount ?? 0,
            screenTimeSeconds: r.screenTimeSeconds ?? 0,
            comments: commentsString || null,
            submittedAt: r.submittedAt ? new Date(r.submittedAt) : serverTimestamp,
            syncStatus: SyncStatus.SYNCED,
            serverReceivedAt: serverTimestamp,
          },
          create: {
            id: r.id,
            officerId,
            supervisorId,
            reportDate: r.reportDate,
            citizenCountLocal: r.citizenCountLocal ?? 0,
            citizenCountServerConfirmed: actualServerCitizens,
            activityCount: r.activityCount ?? 0,
            sessionCount: r.sessionCount ?? 0,
            screenTimeSeconds: r.screenTimeSeconds ?? 0,
            comments: commentsString || null,
            submittedAt: r.submittedAt ? new Date(r.submittedAt) : serverTimestamp,
            syncStatus: SyncStatus.SYNCED,
            serverReceivedAt: serverTimestamp,
          },
        });
 
        // Upsert DailyScreenTime to reflect synced report cumulative screen time
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
                status: 'FINALIZED',
                finalizedAt: serverTimestamp,
                lastSyncedAt: serverTimestamp,
              },
              create: {
                officerId,
                date: r.reportDate,
                totalEligibleSeconds: r.screenTimeSeconds,
                status: 'FINALIZED',
                finalizedAt: serverTimestamp,
                lastSyncedAt: serverTimestamp,
              },
            });
          } catch (stErr) {
            console.warn('Failed to upsert DailyScreenTime on report sync:', stErr);
          }
        }

        // Role-based notification: Notify supervisor of daily report submission via sync
        if (supervisorId) {
          try {
            await createNotification({
              recipientId: supervisorId,
              title: isUrgent
                ? `URGENT ROADBLOCK: Daily Report from ${officer?.fullName || 'Field Officer'}`
                : `Daily Report: ${officer?.fullName || 'Field Officer'}`,
              message: isUrgent
                ? (r.urgentReason || `${officer?.fullName || 'Field Officer'} flagged an urgent roadblock in their synced report for ${r.reportDate}.`)
                : `${officer?.fullName || 'Field Officer'} submitted daily work report for ${r.reportDate} via sync (${actualServerCitizens} citizens).`,
              type: 'REPORT',
              priority: isUrgent ? NotificationPriority.URGENT : NotificationPriority.NORMAL,
              relatedRecordId: r.id,
              actionUrl: '/reports',
              metadata: { reportId: r.id, officerId, reportDate: r.reportDate, isUrgent },
            });
          } catch (notifErr) {
            console.warn('Supervisor notification for synced daily report failed:', notifErr);
          }
        }

        if (isUrgent) {
          try {
            await notifyManagers({
              title: `URGENT ROADBLOCK: ${officer?.fullName || 'Field Officer'} (${r.reportDate})`,
              message: r.urgentReason || `Urgent roadblock flagged by ${officer?.fullName || 'Field Officer'} for date ${r.reportDate}. Immediate attention required.`,
              type: 'REPORT',
              priority: NotificationPriority.URGENT,
              relatedRecordId: r.id,
              actionUrl: '/all_reports',
              metadata: { reportId: r.id, officerId, reportDate: r.reportDate, isUrgent: true },
            });
          } catch (mgrErr) {
            console.warn('Manager notification for synced urgent report failed:', mgrErr);
          }
        }

        results.dailyReports.synced++;
      } catch (repErr: any) {
        results.dailyReports.errors.push(`Report ${r.id}: ${repErr.message}`);
      }
    }

    // 5. Dispatch role-based notifications for sync outcomes
    if (caller.role === Role.FIELD_OFFICER) {
      try {
        // Citizen sync success notification
        if (results.citizens.synced > 0) {
          await notifyOfficer(caller.id, {
            title: 'Sync Completed',
            message: `Successfully synchronized ${results.citizens.synced} citizen record(s) to central database.`,
            type: 'SYNC',
            priority: NotificationPriority.NORMAL,
            actionUrl: '/sync_center',
            metadata: { syncedCount: results.citizens.synced },
          });
        }

        // Conflict / Duplicate detection notification
        if (results.citizens.conflicts > 0) {
          await notifyOfficer(caller.id, {
            title: 'Sync Conflict Detected',
            message: `${results.citizens.conflicts} citizen record(s) flagged as potential duplicate(s) and queued for supervisor review.`,
            type: 'DUPLICATE',
            priority: NotificationPriority.IMPORTANT,
            actionUrl: '/sync_center',
            metadata: { conflictCount: results.citizens.conflicts },
          });

          // Notify supervisor for caller's zone
          const userWithLocation = await prisma.user.findUnique({
            where: { id: caller.id },
            select: { zoneId: true, woreda: { select: { zoneId: true } } },
          });
          const targetZoneId = userWithLocation?.zoneId || userWithLocation?.woreda?.zoneId;
          if (targetZoneId) {
            await notifySupervisorForZone(targetZoneId, {
              title: 'Duplicate Citizen Flagged',
              message: `${results.citizens.conflicts} citizen record(s) flagged for duplicate review in your zone by ${caller.fullName}.`,
              type: 'DUPLICATE',
              priority: NotificationPriority.IMPORTANT,
              actionUrl: '/duplicates',
              metadata: { conflictCount: results.citizens.conflicts, officerId: caller.id },
            });
          }
        }

        // Sync issues / errors notification
        if (results.citizens.errors.length > 0) {
          await notifyOfficer(caller.id, {
            title: 'Sync Issues Detected',
            message: `Batch sync encountered ${results.citizens.errors.length} error(s). Please review your offline records.`,
            type: 'SYNC',
            priority: NotificationPriority.IMPORTANT,
            actionUrl: '/sync_center',
            metadata: { errorCount: results.citizens.errors.length },
          });

          // Anomaly alert to Managers if large-scale failure
          if (results.citizens.errors.length >= 3) {
            await notifyManagers({
              title: 'Sync Failure Anomaly Detected',
              message: `Officer ${caller.fullName} encountered ${results.citizens.errors.length} errors during batch synchronization.`,
              type: 'SYNC',
              priority: NotificationPriority.IMPORTANT,
              actionUrl: '/sync_center',
              metadata: { officerId: caller.id, errorCount: results.citizens.errors.length },
            });
          }
        }
      } catch (notifOutcomeErr) {
        console.warn('Sync outcome notification dispatch error:', notifOutcomeErr);
      }
    }

    // System audit log for batch sync
    try {
      await prisma.auditLog.create({
        data: {
          actorId: caller.id,
          action: 'BATCH_SYNC_PROCESSED',
          entityType: 'SyncPipeline',
          entityId: caller.id,
          metadata: {
            durationMs: Date.now() - startTime,
            results,
          },
        },
      });
    } catch {}

    const totalSynced =
      results.citizens.synced +
      results.activityLogs.synced +
      results.workSessions.synced +
      results.dailyReports.synced;

    res.status(200).json({
      success: true,
      message: `Batch synchronization completed in ${Date.now() - startTime}ms`,
      totalSynced,
      results,
      serverTimestamp: serverTimestamp.toISOString(),
    });
  } catch (error: any) {
    console.error('Batch sync endpoint error:', error);
    try {
      const caller = req.user;
      if (caller && caller.role === Role.FIELD_OFFICER) {
        await notifyOfficer(caller.id, {
          title: 'Sync Failed',
          message: 'Batch sync failed due to a server error. Your offline data remains safe on your device.',
          type: 'SYNC',
          priority: NotificationPriority.IMPORTANT,
          actionUrl: '/sync_center',
        });
        await notifyManagers({
          title: 'Sync Pipeline Anomaly',
          message: `Server error during batch sync for officer ${caller.fullName}: ${error.message}`,
          type: 'SYNC',
          priority: NotificationPriority.IMPORTANT,
          actionUrl: '/sync_center',
        });
      }
    } catch {}
    res.status(500).json({
      success: false,
      error: 'Batch sync failed due to server error',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/sync/pull
 * @desc    Delta retrieval endpoint for downloading updated central records
 * @access  Private (Officer, Supervisor, Manager)
 */
router.get('/pull', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = req.user!;
    const { since } = req.query;

    const sinceDate = since ? new Date(since as string) : new Date(0);

    const whereCitizen: any = {
      updatedAt: { gt: sinceDate },
    };

    // Role scoping for delta download
    if (caller.role === Role.FIELD_OFFICER) {
      whereCitizen.OR = [
        { registeredById: caller.id },
        { woredaId: caller.woredaId || undefined },
      ];
    } else if (caller.role === Role.SUPERVISOR) {
      whereCitizen.OR = [
        { registeredBy: { supervisorId: caller.id } },
        { zoneId: caller.zoneId || undefined },
      ];
    }
    // Managers pull organization-wide updates

    const [updatedCitizens, updatedReviews] = await Promise.all([
      prisma.citizen.findMany({
        where: whereCitizen,
        take: 200,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.duplicateReview.findMany({
        where: { updatedAt: { gt: sinceDate } },
        take: 100,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        citizens: updatedCitizens,
        duplicateReviews: updatedReviews,
        serverTimestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Sync pull endpoint error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve delta updates' });
  }
});

/**
 * @route   GET /api/sync/health
 * @desc    Returns system synchronization telemetry and diagnostic metrics
 * @access  Private
 */
router.get('/health', authenticate, async (_req: Request, res: Response): Promise<void> => {
  try {
    const [citizensTotal, syncedCitizens, pendingCitizens, sessionsTotal, reportsTotal] = await Promise.all([
      prisma.citizen.count(),
      prisma.citizen.count({ where: { syncStatus: SyncStatus.SYNCED } }),
      prisma.citizen.count({ where: { syncStatus: SyncStatus.PENDING } }),
      prisma.workSession.count(),
      prisma.dailyWorkReport.count(),
    ]);

    res.json({
      success: true,
      data: {
        databaseStatus: 'CONNECTED',
        syncHealth: 'HEALTHY',
        citizens: {
          total: citizensTotal,
          synced: syncedCitizens,
          pending: pendingCitizens,
        },
        workSessionsTotal: sessionsTotal,
        dailyReportsTotal: reportsTotal,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      databaseStatus: 'DISCONNECTED',
    });
  }
});

export default router;
