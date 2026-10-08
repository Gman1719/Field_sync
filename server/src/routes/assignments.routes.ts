// server/src/routes/assignments.routes.ts
// REST API Routes for Fieldwork Assignments, Lifecycle State Transitions & Progress Tracking

import { Router, Request, Response } from 'express';
import { ZodError } from 'zod';
import prisma from '../config/db.js';
import { authenticate, requireSupervisor } from '../middleware/auth.middleware.js';
import { createAssignmentSchema, updateAssignmentStatusSchema } from '../validators/assignment.validator.js';
import { Role, AssignmentStatus, SyncStatus, NotificationPriority } from '@prisma/client';
import { generateAssignmentId } from '../utils/idGenerator.js';
import { notifyOfficer } from '../services/notification.service.js';

const router = Router();

/**
 * Format Prisma assignment model into normalized response object
 */
const formatAssignmentResponse = (a: any) => {
  const registeredCount = a._count?.citizens ?? a.citizens?.length ?? 0;
  const targetCount = a.targetCount || 1;
  const progressPercentage = Math.min(100, Math.round((registeredCount / targetCount) * 100));

  return {
    id: a.id,
    title: a.title,
    description: a.description || '',
    targetCount: a.targetCount,
    registeredCount,
    progressPercentage,
    status: a.status,
    startDate: a.startDate ? a.startDate.toISOString().split('T')[0] : '',
    endDate: a.endDate ? a.endDate.toISOString().split('T')[0] : null,

    // Assigned Personnel
    assignedOfficerId: a.assignedOfficerId,
    officerName: a.assignedOfficer?.fullName || '',
    officerEmail: a.assignedOfficer?.email || '',
    officerPhone: a.assignedOfficer?.phoneNumber || '',

    assignedSupervisorId: a.assignedSupervisorId,
    supervisorName: a.assignedSupervisor?.fullName || '',
    supervisorEmail: a.assignedSupervisor?.email || '',

    // Administrative Location
    woredaId: a.woredaId,
    kebeleId: a.kebeleId,
    woredaName: a.woreda?.name || '',
    zoneName: a.woreda?.zone?.name || '',
    regionName: a.woreda?.zone?.region?.name || '',
    kebeleName: a.kebele?.name || '',

    activityCount: a._count?.activityLogs ?? 0,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
};

/**
 * @route   POST /api/assignments
 * @desc    Create new fieldwork assignment with target count and location
 * @access  Private (Supervisor or Manager only)
 */
router.post('/', authenticate, requireSupervisor, async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = createAssignmentSchema.parse(req.body);
    const caller = req.user!;

    // Verify assigned officer exists and has FIELD_OFFICER role
    const officer = await prisma.user.findUnique({
      where: { id: validated.assignedOfficerId },
      include: { region: true, zone: true, woreda: true, kebele: true },
    });

    if (!officer) {
      res.status(404).json({ success: false, error: 'Assigned officer not found' });
      return;
    }

    if (!officer.isActive) {
      res.status(400).json({ success: false, error: 'Cannot assign task to a deactivated officer' });
      return;
    }

    // Default supervisor: if caller is supervisor, use caller. If not specified, use officer's supervisor
    const supervisorId =
      validated.assignedSupervisorId ||
      (caller.role === Role.SUPERVISOR ? caller.id : officer.supervisorId);

    // Default woreda and kebele from officer's location if not explicitly provided
    const woredaId = validated.woredaId || officer.woredaId;
    const kebeleId = validated.kebeleId || officer.kebeleId;

    const assignment = await prisma.assignment.create({
      data: {
        id: (req.body && req.body.id) || generateAssignmentId(),
        title: validated.title,
        description: validated.description,
        targetCount: validated.targetCount,
        status: AssignmentStatus.ASSIGNED,
        assignedOfficerId: officer.id,
        assignedSupervisorId: supervisorId,
        woredaId: woredaId,
        kebeleId: kebeleId,
        startDate: validated.startDate ? new Date(validated.startDate) : new Date(),
        endDate: validated.endDate ? new Date(validated.endDate) : null,
      },
      include: {
        assignedOfficer: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
        assignedSupervisor: { select: { id: true, fullName: true, email: true } },
        woreda: {
          select: {
            id: true,
            name: true,
            zone: { select: { id: true, name: true, region: { select: { id: true, name: true } } } },
          },
        },
        kebele: { select: { id: true, name: true } },
        _count: { select: { citizens: true, activityLogs: true } },
      },
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        actorId: caller.id,
        action: 'ASSIGNMENT_CREATED',
        entityType: 'Assignment',
        entityId: assignment.id,
        metadata: {
          title: assignment.title,
          officerId: officer.id,
          targetCount: assignment.targetCount,
        },
      },
    });

    // Role-based notification: Notify officer of new assignment
    try {
      await notifyOfficer(officer.id, {
        title: `New Assignment: ${assignment.title}`,
        message: `You have been assigned to "${assignment.title}" (Target: ${assignment.targetCount} citizens).`,
        type: 'ASSIGNMENT',
        priority: NotificationPriority.NORMAL,
        relatedRecordId: assignment.id,
        actionUrl: '/assignments',
        metadata: {
          assignmentId: assignment.id,
          targetCount: assignment.targetCount,
          assignedById: caller.id,
        },
      });
    } catch (notifErr) {
      console.warn('Failed to notify officer of new assignment:', notifErr);
    }

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: formatAssignmentResponse(assignment),
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors[0]?.message || 'Validation error',
        details: error.errors,
      });
      return;
    }

    console.error('Create assignment error:', error);
    res.status(500).json({
      success: false,
      error: 'An internal server error occurred while creating assignment',
    });
  }
});

/**
 * @route   GET /api/assignments
 * @desc    Get assignments filtered by user role and query parameters
 * @access  Private (Officer, Supervisor, Manager)
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { status, officerId, woredaId } = req.query;

    const where: any = {};

    // Role-based visibility
    if (user.role === Role.FIELD_OFFICER) {
      // Officer strictly views their own assignments
      where.assignedOfficerId = user.id;
    } else if (user.role === Role.SUPERVISOR) {
      // Supervisor views assignments they supervise or within their zone
      where.OR = [
        { assignedSupervisorId: user.id },
        { assignedOfficer: { supervisorId: user.id } },
        ...(user.zoneId ? [{ woreda: { zoneId: user.zoneId } }] : []),
      ];
    }
    // Manager has unrestricted view

    // Dynamic filters
    if (status && status !== 'all') {
      where.status = status as AssignmentStatus;
    }
    if (officerId) {
      where.assignedOfficerId = officerId as string;
    }
    if (woredaId) {
      where.woredaId = woredaId as string;
    }

    const assignments = await prisma.assignment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedOfficer: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
        assignedSupervisor: { select: { id: true, fullName: true, email: true } },
        woreda: {
          select: {
            id: true,
            name: true,
            zone: { select: { id: true, name: true, region: { select: { id: true, name: true } } } },
          },
        },
        kebele: { select: { id: true, name: true } },
        _count: { select: { citizens: true, activityLogs: true } },
      },
    });

    res.json({
      success: true,
      data: assignments.map(formatAssignmentResponse),
      count: assignments.length,
    });
  } catch (error: any) {
    console.error('Fetch assignments error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve assignments' });
  }
});

/**
 * @route   GET /api/assignments/:id
 * @desc    Get single assignment details with progress statistics
 * @access  Private (Officer, Supervisor, Manager)
 */
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        assignedOfficer: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
        assignedSupervisor: { select: { id: true, fullName: true, email: true } },
        woreda: {
          select: {
            id: true,
            name: true,
            zone: { select: { id: true, name: true, region: { select: { id: true, name: true } } } },
          },
        },
        kebele: { select: { id: true, name: true } },
        _count: { select: { citizens: true, activityLogs: true } },
      },
    });

    if (!assignment) {
      res.status(404).json({ success: false, error: 'Assignment not found' });
      return;
    }

    // Role-based authorization
    if (user.role === Role.FIELD_OFFICER && assignment.assignedOfficerId !== user.id) {
      res.status(403).json({ success: false, error: 'Forbidden: You are not assigned to this task' });
      return;
    }

    res.json({
      success: true,
      data: formatAssignmentResponse(assignment),
    });
  } catch (error: any) {
    console.error('Fetch assignment error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve assignment' });
  }
});

/**
 * @route   PATCH /api/assignments/:id/status
 * @desc    Transition assignment lifecycle state and record activity log
 * @access  Private (Assigned Officer, Supervisor, Manager)
 */
router.patch('/:id/status', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validated = updateAssignmentStatusSchema.parse(req.body);
    const caller = req.user!;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { assignedOfficer: true },
    });

    if (!assignment) {
      res.status(404).json({ success: false, error: 'Assignment not found' });
      return;
    }

    // Authorization: Assigned officer or authorized Supervisor / Manager
    if (caller.role === Role.FIELD_OFFICER && assignment.assignedOfficerId !== caller.id) {
      res.status(403).json({ success: false, error: 'Forbidden: You can only transition your own assignments' });
      return;
    }

    const previousStatus = assignment.status;

    // Determine event type for activity logger
    let eventType = 'ASSIGNMENT_STATUS_CHANGED';
    if (validated.status === AssignmentStatus.IN_PROGRESS) {
      eventType = previousStatus === AssignmentStatus.PAUSED ? 'ASSIGNMENT_RESUMED' : 'ASSIGNMENT_STARTED';
    } else if (validated.status === AssignmentStatus.PAUSED) {
      eventType = 'ASSIGNMENT_PAUSED';
    } else if (validated.status === AssignmentStatus.COMPLETED) {
      eventType = 'ASSIGNMENT_COMPLETED';
    } else if (validated.status === AssignmentStatus.CANCELLED) {
      eventType = 'ASSIGNMENT_CANCELLED';
    }

    // Update assignment status
    const updated = await prisma.assignment.update({
      where: { id },
      data: {
        status: validated.status,
      },
      include: {
        assignedOfficer: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
        assignedSupervisor: { select: { id: true, fullName: true, email: true } },
        woreda: {
          select: {
            id: true,
            name: true,
            zone: { select: { id: true, name: true, region: { select: { id: true, name: true } } } },
          },
        },
        kebele: { select: { id: true, name: true } },
        _count: { select: { citizens: true, activityLogs: true } },
      },
    });

    // Automatically create ActivityLog record
    await prisma.activityLog.create({
      data: {
        id: crypto.randomUUID(),
        officerId: assignment.assignedOfficerId,
        assignmentId: assignment.id,
        eventType,
        description: `Assignment "${assignment.title}" moved from ${previousStatus} to ${validated.status}${validated.notes ? ': ' + validated.notes : ''}`,
        deviceTimestamp: new Date(),
        syncStatus: SyncStatus.SYNCED,
      },
    });

    // Record AuditLog
    await prisma.auditLog.create({
      data: {
        actorId: caller.id,
        action: 'ASSIGNMENT_STATUS_UPDATE',
        entityType: 'Assignment',
        entityId: assignment.id,
        metadata: {
          from: previousStatus,
          to: validated.status,
          notes: validated.notes,
        },
      },
    });

    // Role-based notification: Notify officer if status was changed by supervisor/manager
    if (caller.id !== assignment.assignedOfficerId) {
      try {
        await notifyOfficer(assignment.assignedOfficerId, {
          title: `Assignment Updated: ${assignment.title}`,
          message: `Your assignment status has been changed to ${validated.status} by ${caller.fullName}.${validated.notes ? ` Notes: ${validated.notes}` : ''}`,
          type: 'ASSIGNMENT',
          priority: NotificationPriority.NORMAL,
          relatedRecordId: assignment.id,
          actionUrl: '/assignments',
        });
      } catch (notifErr) {
        console.warn('Failed to notify officer of status update:', notifErr);
      }
    }

    res.json({
      success: true,
      message: `Assignment transitioned to ${validated.status}`,
      data: formatAssignmentResponse(updated),
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors[0]?.message || 'Validation error',
        details: error.errors,
      });
      return;
    }

    console.error('Update assignment status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update assignment status' });
  }
});

export default router;
