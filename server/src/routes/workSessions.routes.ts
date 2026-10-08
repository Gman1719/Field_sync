// server/src/routes/workSessions.routes.ts
// REST API Routes for Work Sessions & Device Screen Time Telemetry (Phase 6)

import { Router, Request, Response } from 'express';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { Role, SyncStatus } from '@prisma/client';

const router = Router();

const formatSession = (s: any) => ({
  id: s.id,
  officerId: s.officerId,
  officerName: s.officer?.fullName || '',
  officerEmail: s.officer?.email || '',
  reportDate: s.reportDate,
  startedAt: s.startedAt,
  endedAt: s.endedAt,
  durationSeconds: s.durationSeconds,
  durationMinutes: Math.round(s.durationSeconds / 60),
  deviceReported: s.deviceReported,
  serverReceivedAt: s.serverReceivedAt,
  syncStatus: s.syncStatus,
});

/**
 * @route   POST /api/work-sessions
 * @desc    Idempotent sync for work sessions and device screen-time metrics
 * @access  Private (Officer, Supervisor, Manager)
 */
router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = req.user!;
    const body = req.body;
    const rawSessions = Array.isArray(body) ? body : (Array.isArray(body.sessions) ? body.sessions : [body]);

    if (!rawSessions.length) {
      res.status(400).json({ success: false, error: 'No work sessions provided' });
      return;
    }

    const processed = [];

    for (const sess of rawSessions) {
      if (!sess.id || !sess.startedAt) {
        continue;
      }

      const officerId = sess.officerId || caller.id;
      const reportDate = sess.reportDate || new Date(sess.startedAt).toISOString().split('T')[0];
      const durationSeconds = parseInt(sess.durationSeconds, 10) || 0;

      const saved = await prisma.workSession.upsert({
        where: { id: sess.id },
        update: {
          endedAt: sess.endedAt ? new Date(sess.endedAt) : null,
          durationSeconds,
          syncStatus: SyncStatus.SYNCED,
        },
        create: {
          id: sess.id,
          officerId,
          reportDate,
          startedAt: new Date(sess.startedAt),
          endedAt: sess.endedAt ? new Date(sess.endedAt) : null,
          durationSeconds,
          deviceReported: true,
          syncStatus: SyncStatus.SYNCED,
        },
        include: {
          officer: { select: { fullName: true, email: true } },
        },
      });

      processed.push(formatSession(saved));
    }

    res.status(201).json({
      success: true,
      count: processed.length,
      data: processed,
    });
  } catch (error: any) {
    console.error('Save work sessions error:', error);
    res.status(500).json({ success: false, error: 'Failed to process work sessions' });
  }
});

/**
 * @route   GET /api/work-sessions
 * @desc    Retrieve work session telemetry and screen time totals
 * @access  Private (Officer, Supervisor, Manager)
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { officerId, date, startDate, endDate } = req.query;

    const where: any = {};

    if (user.role === Role.FIELD_OFFICER) {
      where.officerId = user.id;
    } else if (user.role === Role.SUPERVISOR) {
      where.OR = [
        { officer: { supervisorId: user.id } },
        { officerId: user.id },
      ];
    }

    if (officerId) where.officerId = officerId as string;
    if (date) where.reportDate = date as string;

    const sessions = await prisma.workSession.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      include: {
        officer: { select: { fullName: true, email: true } },
      },
    });

    const totalSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);

    res.json({
      success: true,
      data: sessions.map(formatSession),
      totalDurationSeconds: totalSeconds,
      totalDurationHours: (totalSeconds / 3600).toFixed(2),
      count: sessions.length,
    });
  } catch (error: any) {
    console.error('Fetch work sessions error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve work sessions' });
  }
});

export default router;
