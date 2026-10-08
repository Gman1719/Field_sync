// server/src/routes/activityLogs.routes.ts
// REST API Routes for Offline-First Activity Logs & Timeline Tracking (Phase 5)

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

/**
 * @route   POST /api/activity-logs
 * @desc    Idempotent batch or single sync for activity logs
 * @access  Private (Officer, Supervisor, Manager)
 */
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

      // Completely reject any SMS logs
      if (
        String(log.eventType).toUpperCase().includes('SMS') ||
        String(log.description).toUpperCase().includes('SMS')
      ) {
        continue;
      }

      const officerId = log.officerId || caller.id;

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
          assignmentId: log.assignmentId || null,
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

    // Role-based scoping: Supervisors see only what they did unless querying a specific officer
    if (user.role === Role.FIELD_OFFICER) {
      where.officerId = user.id;
    } else if (user.role === Role.SUPERVISOR) {
      if (officerId) {
        where.officerId = officerId as string;
      } else {
        where.officerId = user.id;
      }
    }
    // Manager has nationwide view

    where.NOT = [
      { eventType: { contains: 'SMS', mode: 'insensitive' } },
      { description: { contains: 'SMS', mode: 'insensitive' } },
    ];

    if (eventType && eventType !== 'all') {
      where.eventType = eventType as string;
    }
    if (officerId) {
      where.officerId = officerId as string;
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
