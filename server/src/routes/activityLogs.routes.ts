import { Router, Request, Response } from 'express';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { Role, SyncStatus } from '@prisma/client';

const router = Router();

const formatActivityLog = (l: any) => ({
  id: l.id,
  officerId: l.officerId,
  officerName: l.officer?.fullName || '',
  officerEmail: l.officer?.email || '',
  assignmentId: l.assignmentId,
  eventType: l.eventType,
  description: l.description,
  deviceTimestamp: l.deviceTimestamp,
  serverReceivedAt: l.serverReceivedAt,
  relatedRecordId: l.relatedRecordId,
  metadata: l.metadata,
  syncStatus: l.syncStatus,
});

router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = req.user!;
    const body = req.body;
    const rawLogs = Array.isArray(body) ? body : (Array.isArray(body.logs) ? body.logs : [body]);

    if (!rawLogs.length) {
      res.status(400).json({ success: false, error: 'No activity logs provided' });
      return;
    }

    const processed = [];

    for (const log of rawLogs) {
      if (!log.id || !log.eventType || !log.description) {
        continue;
      }

      if (
        String(log.eventType).toUpperCase().includes('SMS') ||
        String(log.description).toUpperCase().includes('SMS')
      ) {
        continue;
      }

      let officerId = caller.id;
      if (log.officerId && log.officerId !== caller.id) {
        const userExists = await prisma.user.findUnique({
          where: { id: log.officerId },
          select: { id: true },
        });
        if (userExists) {
          officerId = userExists.id;
        }
      }

      let assignmentId: string | null = null;
      if (log.assignmentId) {
        const assignmentExists = await prisma.assignment.findUnique({
          where: { id: log.assignmentId },
          select: { id: true },
        });
        if (assignmentExists) {
          assignmentId = assignmentExists.id;
        }
      }

      try {
        const saved = await prisma.activityLog.upsert({
          where: { id: log.id },
          update: {
            eventType: log.eventType,
            description: log.description,
            deviceTimestamp: log.deviceTimestamp ? new Date(log.deviceTimestamp) : new Date(),
            relatedRecordId: log.relatedRecordId || null,
            metadata: log.metadata || null,
            syncStatus: SyncStatus.SYNCED,
          },
          create: {
            id: log.id,
            officerId,
            assignmentId,
            eventType: log.eventType,
            description: log.description,
            deviceTimestamp: log.deviceTimestamp ? new Date(log.deviceTimestamp) : new Date(),
            relatedRecordId: log.relatedRecordId || null,
            metadata: log.metadata || null,
            syncStatus: SyncStatus.SYNCED,
          },
          include: {
            officer: { select: { fullName: true, email: true } },
          },
        });

        processed.push(formatActivityLog(saved));
      } catch (err: any) {
        console.warn(`Skipping invalid activity log (${log.id}):`, err.message);
      }
    }

    res.status(201).json({
      success: true,
      count: processed.length,
      data: processed,
    });
  } catch (error: any) {
    console.error('Save activity logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to process activity logs' });
  }
});

/**
 * @route   GET /api/activity-logs
 * @desc    Retrieve chronological activity logs with role-based scoping
 * @access  Private (Officer, Supervisor, Manager)
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { eventType, officerId, startDate, endDate, limit = '50', page = '1' } = req.query;

    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 50));
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // Role-based scoping: By default, each user's activity log contains only their own work
    if (user.role === Role.FIELD_OFFICER) {
      // Field officers can strictly and exclusively see only their own work
      where.officerId = user.id;
    } else if (user.role === Role.SUPERVISOR) {
      // Supervisors default to their own work, unless querying a specific subordinate
      if (officerId && officerId !== 'all') {
        where.officerId = officerId as string;
      } else {
        where.officerId = user.id;
      }
    } else if (user.role === Role.MANAGER) {
      // Managers default to their own work, unless explicitly querying a specific officer or 'all'
      if (officerId && officerId !== 'all') {
        where.officerId = officerId as string;
      } else if (officerId === 'all') {
        // Nationwide audit view
      } else {
        where.officerId = user.id;
      }
    }

    where.NOT = [
      { eventType: { contains: 'SMS', mode: 'insensitive' } },
      { description: { contains: 'SMS', mode: 'insensitive' } },
    ];

    if (eventType && eventType !== 'all') {
      where.eventType = eventType as string;
    }
    if (startDate || endDate) {
      where.deviceTimestamp = {};
      if (startDate) where.deviceTimestamp.gte = new Date(startDate as string);
      if (endDate) where.deviceTimestamp.lte = new Date(endDate as string);
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { deviceTimestamp: 'desc' },
        include: {
          officer: { select: { fullName: true, email: true } },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs.map(formatActivityLog),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Fetch activity logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve activity logs' });
  }
});

export default router;
