// server/src/routes/auditLogs.routes.ts
// REST API Routes for Persistent System Audit Trail & Compliance

import { Router, Request, Response } from 'express';
import { authenticate, requireSupervisor } from '../middleware/auth.middleware.js';
import { queryAuditLogs, getDistinctAuditActions } from '../services/audit.service.js';
import prisma from '../config/db.js';
import { Role } from '@prisma/client';

const router = Router();

/**
 * @route   GET /api/audit-logs
 * @desc    Retrieve persistent audit logs with role-based scoping, search, and date filters
 * @access  Private (Manager: Organization-wide, Supervisor: Zone-scoped)
 */
router.get('/', authenticate, requireSupervisor, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const {
      page = '1',
      limit = '20',
      search,
      role,
      action,
      entityType,
      zoneId,
      startDate,
      endDate,
    } = req.query;

    const result = await queryAuditLogs({
      user: {
        id: user.id,
        role: user.role,
        zoneId: user.zoneId,
        fullName: user.fullName,
      },
      page: Number(page),
      limit: Number(limit),
      search: typeof search === 'string' ? search : undefined,
      role: typeof role === 'string' ? role : undefined,
      action: typeof action === 'string' ? action : undefined,
      entityType: typeof entityType === 'string' ? entityType : undefined,
      zoneId: typeof zoneId === 'string' ? zoneId : undefined,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
    });

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('Fetch audit logs error:', error.message);
    const statusCode = error.message?.includes('Access denied') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to retrieve audit trail',
    });
  }
});

/**
 * @route   GET /api/audit-logs/actions
 * @desc    Fetch distinct audit actions for filtering
 * @access  Private (Manager & Supervisor)
 */
router.get('/actions', authenticate, requireSupervisor, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const actions = await getDistinctAuditActions(user.role, user.zoneId);
    res.json({
      success: true,
      data: actions,
    });
  } catch (error: any) {
    console.error('Fetch audit actions error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve audit actions' });
  }
});

/**
 * @route   GET /api/audit-logs/:id
 * @desc    Retrieve full details of a specific audit event
 * @access  Private (Manager & Supervisor)
 */
router.get('/:id', authenticate, requireSupervisor, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            zone: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!log) {
      res.status(404).json({ success: false, error: 'Audit event not found' });
      return;
    }

    // Role-based scoping check
    if (user.role === Role.SUPERVISOR) {
      if (user.zoneId && log.zoneId && log.zoneId !== user.zoneId && log.actorId !== user.id) {
        res.status(403).json({ success: false, error: 'Access denied to audit event outside assigned Zone' });
        return;
      }
    }

    res.json({
      success: true,
      data: {
        id: log.id,
        actorId: log.actorId,
        actorName: log.actorName || log.actor?.fullName || 'System',
        actorEmail: log.actor?.email || null,
        actorRole: log.actorRole || log.actor?.role || 'SYSTEM',
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        zoneId: log.zoneId || log.actor?.zone?.id || null,
        zoneName: log.actor?.zone?.name || null,
        summary: log.summary,
        previousValues: log.previousValues,
        newValues: log.newValues,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Fetch audit log detail error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve audit event' });
  }
});

export default router;
