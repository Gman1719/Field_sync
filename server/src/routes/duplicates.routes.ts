// server/src/routes/duplicates.routes.ts
// REST API Routes for Duplicate Citizen Detection & Supervisor Review Workflow (Phase 8)

import { Router, Request, Response } from 'express';
import prisma from '../config/db.js';
import { authenticate, requireSupervisor } from '../middleware/auth.middleware.js';
import { Role, DuplicateReviewStatus, NotificationPriority } from '@prisma/client';
import { notifyOfficer } from '../services/notification.service.js';
import { recordAuditEvent } from '../services/audit.service.js';
import { z, ZodError } from 'zod';

const router = Router();

const resolveSchema = z.object({
  decision: z.enum(['APPROVED_AS_DIFFERENT', 'CONFIRMED_DUPLICATE']),
  notes: z.string().optional(),
  reviewerNotes: z.string().optional(),
}).refine((d) => (d.notes && d.notes.trim().length >= 3) || (d.reviewerNotes && d.reviewerNotes.trim().length >= 3), {
  message: 'Reviewer justification notes are required (at least 3 characters)',
});

const formatCitizenDetail = (c: any) => {
  if (!c) return null;
  return {
    id: c.id,
    clientRecordId: c.clientRecordId,
    firstName: c.firstName,
    middleName: c.middleName,
    lastName: c.lastName,
    fullName: `${c.firstName} ${c.middleName ? c.middleName + ' ' : ''}${c.lastName}`,
    gender: c.gender,
    dateOfBirth: c.dateOfBirth,
    age: c.age,
    maritalStatus: c.maritalStatus,
    phoneNumber: c.phoneNumber,
    alternativePhone: c.alternativePhone,
    regionId: c.regionId,
    regionName: c.region?.name || '',
    zoneId: c.zoneId,
    zoneName: c.zone?.name || '',
    woredaId: c.woredaId,
    woredaName: c.woreda?.name || '',
    kebeleId: c.kebeleId,
    kebeleName: c.kebele?.name || '',
    village: c.village,
    registeredById: c.registeredById,
    registeredByName: c.registeredBy?.fullName || '',
    registrationTimestamp: c.registrationTimestamp,
    duplicateReviewStatus: c.duplicateReviewStatus,
    syncStatus: c.syncStatus,
  };
};

const formatReview = (r: any) => ({
  id: r.id,
  status: r.status,
  matchReason: r.matchReason,
  notes: r.notes,
  reviewedAt: r.reviewedAt,
  reviewerId: r.reviewerId,
  reviewerName: r.reviewer?.fullName || null,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  candidateCitizen: formatCitizenDetail(r.citizen),
  suspectedDuplicate: formatCitizenDetail(r.suspectedDuplicate),
});

const citizenInclude = {
  region: { select: { name: true } },
  zone: { select: { name: true } },
  woreda: { select: { name: true } },
  kebele: { select: { name: true } },
  registeredBy: { select: { fullName: true, email: true } },
};

/**
 * @route   GET /api/duplicates
 * @desc    Retrieve duplicate reviews scoped by role and filterable by status
 * @access  Private (Supervisor, Manager)
 */
router.get(
  '/',
  authenticate,
  requireSupervisor,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { status, woredaId, page = '1', limit = '30', search } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 30));
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      // Role-based scoping: Supervisor sees team / assigned jurisdiction
      if (user.role === Role.SUPERVISOR) {
        where.OR = [
          { citizen: { registeredBy: { supervisorId: user.id } } },
          { citizen: { zoneId: user.zoneId || undefined } },
        ];
      }

      if (status && status !== 'ALL') {
        where.status = status as DuplicateReviewStatus;
      }

      if (woredaId) {
        where.citizen = { ...(where.citizen || {}), woredaId: woredaId as string };
      }

      if (search) {
        const query = (search as string).trim();
        where.OR = [
          ...(where.OR || []),
          { citizen: { firstName: { contains: query, mode: 'insensitive' } } },
          { citizen: { lastName: { contains: query, mode: 'insensitive' } } },
          { citizen: { phoneNumber: { contains: query } } },
        ];
      }

      const [reviews, total] = await Promise.all([
        prisma.duplicateReview.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: { select: { fullName: true } },
            citizen: { include: citizenInclude },
            suspectedDuplicate: { include: citizenInclude },
          },
        }),
        prisma.duplicateReview.count({ where }),
      ]);

      // Summary counts for dashboard tabs
      const [pendingCount, confirmedCount, approvedCount] = await Promise.all([
        prisma.duplicateReview.count({
          where: {
            ...where,
            status: { in: [DuplicateReviewStatus.NEEDS_REVIEW, DuplicateReviewStatus.POSSIBLE_DUPLICATE] },
          },
        }),
        prisma.duplicateReview.count({
          where: { ...where, status: DuplicateReviewStatus.CONFIRMED_DUPLICATE },
        }),
        prisma.duplicateReview.count({
          where: { ...where, status: DuplicateReviewStatus.APPROVED_AS_DIFFERENT },
        }),
      ]);

      res.json({
        success: true,
        data: reviews.map(formatReview),
        stats: {
          pending: pendingCount,
          confirmed: confirmedCount,
          approved: approvedCount,
          total,
        },
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      console.error('Fetch duplicate reviews error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve duplicate reviews' });
    }
  }
);

/**
 * @route   GET /api/duplicates/:id
 * @desc    Retrieve single duplicate review record with side-by-side details
 * @access  Private (Supervisor, Manager)
 */
router.get(
  '/:id',
  authenticate,
  requireSupervisor,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const review = await prisma.duplicateReview.findUnique({
        where: { id },
        include: {
          reviewer: { select: { fullName: true } },
          citizen: { include: citizenInclude },
          suspectedDuplicate: { include: citizenInclude },
        },
      });

      if (!review) {
        res.status(404).json({ success: false, error: 'Duplicate review record not found' });
        return;
      }

      res.json({
        success: true,
        data: formatReview(review),
      });
    } catch (error: any) {
      console.error('Fetch single duplicate review error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve review details' });
    }
  }
);

/**
 * @route   POST /api/duplicates/:id/resolve
 * @desc    Adjudicate duplicate review (Approve as Different or Confirm as Duplicate)
 * @access  Private (Supervisor, Manager)
 */
router.post(
  '/:id/resolve',
  authenticate,
  requireSupervisor,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const validated = resolveSchema.parse(req.body);

      const review = await prisma.duplicateReview.findUnique({
        where: { id },
        include: {
          citizen: {
            select: { id: true, firstName: true, lastName: true, registeredById: true },
          },
        },
      });

      if (!review) {
        res.status(404).json({ success: false, error: 'Duplicate review record not found' });
        return;
      }

      const decisionStatus =
        validated.decision === 'APPROVED_AS_DIFFERENT'
          ? DuplicateReviewStatus.APPROVED_AS_DIFFERENT
          : DuplicateReviewStatus.CONFIRMED_DUPLICATE;

      // Update DuplicateReview record and Citizen status atomically
      const [updatedReview] = await prisma.$transaction([
        prisma.duplicateReview.update({
          where: { id },
          data: {
            status: decisionStatus,
            reviewerId: user.id,
            notes: validated.notes || validated.reviewerNotes || '',
            reviewedAt: new Date(),
          },
          include: {
            reviewer: { select: { fullName: true } },
            citizen: { include: citizenInclude },
            suspectedDuplicate: { include: citizenInclude },
          },
        }),
        prisma.citizen.update({
          where: { id: review.citizenId },
          data: {
            duplicateReviewStatus: decisionStatus,
          },
        }),
      ]);

      // Notify the registering officer of the duplicate adjudication
      if (review.citizen?.registeredById) {
        try {
          const actionText =
            decisionStatus === DuplicateReviewStatus.APPROVED_AS_DIFFERENT
              ? 'approved as a distinct individual'
              : 'confirmed as a duplicate record';

          await notifyOfficer(review.citizen.registeredById, {
            title: `Duplicate Review: ${review.citizen.firstName} ${review.citizen.lastName}`,
            message: `${user.fullName} (${user.role}) has ${actionText}.${validated.notes ? ` Notes: "${validated.notes}"` : ''}`,
            type: 'DUPLICATE',
            priority:
              decisionStatus === DuplicateReviewStatus.APPROVED_AS_DIFFERENT
                ? NotificationPriority.NORMAL
                : NotificationPriority.IMPORTANT,
            relatedRecordId: review.id,
            actionUrl: '/sync_center',
            metadata: {
              reviewId: review.id,
              citizenId: review.citizenId,
              decision: decisionStatus,
              reviewerName: user.fullName,
            },
          });
        } catch (notifErr) {
          console.warn('Failed to send officer notification for duplicate review:', notifErr);
        }
      }

      // Record audit log entry
      try {
        await recordAuditEvent({
          req,
          action: 'DUPLICATE_REVIEW_RESOLVED',
          entityType: 'DuplicateReview',
          entityId: id,
          zoneId: updatedReview.citizen?.zoneId || user.zoneId || null,
          summary: `${user.fullName} (${user.role}) adjudicated duplicate review for ${updatedReview.citizen?.firstName} ${updatedReview.citizen?.lastName} as ${decisionStatus}`,
          newValues: {
            decision: decisionStatus,
            notes: validated.notes,
            citizenId: review.citizenId,
          },
        });
      } catch (auditErr) {
        console.warn('Failed to write audit log for duplicate resolution:', auditErr);
      }

      res.json({
        success: true,
        message: `Duplicate review adjudicated as ${decisionStatus}`,
        data: formatReview(updatedReview),
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: error.errors[0]?.message || 'Validation error',
        });
        return;
      }
      console.error('Resolve duplicate review error:', error);
      res.status(500).json({ success: false, error: 'Failed to adjudicate duplicate review' });
    }
  }
);

export default router;
