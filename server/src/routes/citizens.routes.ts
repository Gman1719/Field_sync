// server/src/routes/citizens.routes.ts
// REST API Routes for Citizen Registration, Duplicate Detection, and Querying

import { Router, Request, Response } from 'express';
import { ZodError } from 'zod';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { citizenSchema } from '../validators/citizen.validator.js';
import { Gender, SyncStatus, DuplicateReviewStatus, Role } from '@prisma/client';
import { ensureGeographicHierarchy } from '../utils/geoHelper.js';

const router = Router();

/**
 * Format Prisma citizen model into normalized response object
 */
const formatCitizenResponse = (c: any) => ({
  id: c.id,
  clientRecordId: c.clientRecordId,
  firstName: c.firstName,
  middleName: c.middleName || '',
  lastName: c.lastName,
  fullName: [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' '),
  dateOfBirth: c.dateOfBirth ? c.dateOfBirth.toISOString().split('T')[0] : null,
  age: c.age,
  gender: c.gender,
  maritalStatus: c.maritalStatus || '',
  phoneNumber: c.phoneNumber || '',
  alternativePhone: c.alternativePhone || '',

  // Full Address Hierarchy
  regionId: c.regionId,
  zoneId: c.zoneId,
  woredaId: c.woredaId,
  kebeleId: c.kebeleId,
  village: c.village,

  regionName: c.region?.name || '',
  zoneName: c.zone?.name || '',
  woredaName: c.woreda?.name || '',
  kebeleName: c.kebele?.name || '',

  registeredById: c.registeredById,
  registeredByName: c.registeredBy?.fullName || '',
  assignmentId: c.assignmentId,
  syncStatus: c.syncStatus,
  duplicateReviewStatus: c.duplicateReviewStatus,
  registrationTimestamp: c.registrationTimestamp,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

/**
 * @route   POST /api/citizens
 * @desc    Register citizen with full Ethiopian address & duplicate detection
 * @access  Private (Officer, Supervisor, Manager)
 */
router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = citizenSchema.parse(req.body);
    const officerId = req.user!.id;


    // 1. Multi-Level Duplicate Detection against PostgreSQL
    const matchReasons: string[] = [];
    let suspectedDuplicates: any[] = [];

    // Level 1: Exact Phone Number Match (normalized)
    if (validated.phoneNumber) {
      const phoneMatches = await prisma.citizen.findMany({
        where: {
          phoneNumber: validated.phoneNumber,
          clientRecordId: { not: validated.clientRecordId },
        },
        include: {
          region: { select: { name: true } },
          zone: { select: { name: true } },
          woreda: { select: { name: true } },
          kebele: { select: { name: true } },
        },
        take: 3,
      });

      if (phoneMatches.length > 0) {
        matchReasons.push(`Phone number ${validated.phoneNumber} matches ${phoneMatches.length} existing record(s)`);
        suspectedDuplicates.push(...phoneMatches);
      }
    }

    // Level 2 & 3: Personal Information & Location Match
    const nameMatches = await prisma.citizen.findMany({
      where: {
        firstName: { equals: validated.firstName, mode: 'insensitive' },
        lastName: { equals: validated.lastName, mode: 'insensitive' },
        clientRecordId: { not: validated.clientRecordId },
        gender: validated.gender as Gender,
      },
      include: {
        region: { select: { name: true } },
        zone: { select: { name: true } },
        woreda: { select: { name: true } },
        kebele: { select: { name: true } },
      },
      take: 3,
    });

    for (const match of nameMatches) {
      const isSameKebele = match.kebeleId === validated.kebeleId;
      const isSameAge = validated.age && match.age === validated.age;

      if (isSameKebele && isSameAge) {
        matchReasons.push(`Identical name, gender, age (${validated.age}), and kebele`);
        if (!suspectedDuplicates.some((d) => d.id === match.id)) {
          suspectedDuplicates.push(match);
        }
      } else if (isSameKebele) {
        matchReasons.push(`Matching name and kebele location`);
        if (!suspectedDuplicates.some((d) => d.id === match.id)) {
          suspectedDuplicates.push(match);
        }
      }
    }

    const isSuspectedDuplicate = suspectedDuplicates.length > 0;
    if (isSuspectedDuplicate) {
      res.status(409).json({
        success: false,
        error: 'Duplicate citizen registration detected: citizen is already registered.',
        matchReasons,
        duplicates: suspectedDuplicates,
      });
      return;
    }

    const initialReviewStatus = DuplicateReviewStatus.NO_DUPLICATE_DETECTED;

    // Ensure geography hierarchy exists to prevent foreign key violations
    await ensureGeographicHierarchy({
      regionId: validated.regionId,
      regionName: (req.body && req.body.regionName) || undefined,
      zoneId: validated.zoneId,
      zoneName: (req.body && req.body.zoneName) || undefined,
      woredaId: validated.woredaId,
      woredaName: (req.body && req.body.woredaName) || undefined,
      kebeleId: validated.kebeleId,
      kebeleName: (req.body && req.body.kebeleName) || undefined,
    });

    // 2. Idempotent Upsert by clientRecordId
    const citizen = await prisma.citizen.upsert({
      where: { clientRecordId: validated.clientRecordId },
      update: {
        firstName: validated.firstName,
        middleName: validated.middleName,
        lastName: validated.lastName,
        dateOfBirth: validated.dateOfBirth ? new Date(validated.dateOfBirth) : null,
        age: validated.age,
        gender: validated.gender as Gender,
        maritalStatus: validated.maritalStatus,
        phoneNumber: validated.phoneNumber,
        alternativePhone: validated.alternativePhone,
        regionId: validated.regionId,
        zoneId: validated.zoneId,
        woredaId: validated.woredaId,
        kebeleId: validated.kebeleId,
        village: validated.village,
        assignmentId: validated.assignmentId,
        syncStatus: SyncStatus.SYNCED,
        duplicateReviewStatus: initialReviewStatus,
      },
      create: {
        id: (req.body && req.body.id) || validated.clientRecordId,
        clientRecordId: validated.clientRecordId,
        firstName: validated.firstName,
        middleName: validated.middleName,
        lastName: validated.lastName,
        dateOfBirth: validated.dateOfBirth ? new Date(validated.dateOfBirth) : null,
        age: validated.age,
        gender: validated.gender as Gender,
        maritalStatus: validated.maritalStatus,
        phoneNumber: validated.phoneNumber,
        alternativePhone: validated.alternativePhone,
        regionId: validated.regionId,
        zoneId: validated.zoneId,
        woredaId: validated.woredaId,
        kebeleId: validated.kebeleId,
        village: validated.village,
        registeredById: officerId,
        assignmentId: validated.assignmentId,
        syncStatus: SyncStatus.SYNCED,
        duplicateReviewStatus: initialReviewStatus,
        registrationTimestamp: validated.registrationTimestamp
          ? new Date(validated.registrationTimestamp)
          : new Date(),
      },
      include: {
        region: { select: { id: true, name: true, code: true } },
        zone: { select: { id: true, name: true, code: true } },
        woreda: { select: { id: true, name: true, code: true } },
        kebele: { select: { id: true, name: true, code: true } },
        registeredBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    // 3. Create DuplicateReview record if suspected duplicate
    if (isSuspectedDuplicate && suspectedDuplicates[0]) {
      await prisma.duplicateReview.create({
        data: {
          citizenId: citizen.id,
          suspectedDuplicateId: suspectedDuplicates[0].id,
          status: DuplicateReviewStatus.NEEDS_REVIEW,
          matchReason: matchReasons.join('; '),
        },
      });
    }

    // 4. Record Audit Log
    await prisma.auditLog.create({
      data: {
        actorId: officerId,
        action: 'CITIZEN_REGISTERED',
        entityType: 'Citizen',
        entityId: citizen.id,
        metadata: {
          clientRecordId: citizen.clientRecordId,
          regionId: citizen.regionId,
          zoneId: citizen.zoneId,
          woredaId: citizen.woredaId,
          kebeleId: citizen.kebeleId,
          village: citizen.village,
          isSuspectedDuplicate,
        },
      },
    });

    res.status(201).json({
      success: true,
      data: formatCitizenResponse(citizen),
      isSuspectedDuplicate,
      duplicateWarnings: matchReasons,
      suspectedDuplicates: suspectedDuplicates.map(formatCitizenResponse),
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

    console.error('Citizen registration error:', error);
    res.status(500).json({
      success: false,
      error: 'An internal server error occurred while registering citizen',
    });
  }
});

/**
 * @route   GET /api/citizens
 * @desc    Retrieve citizens with role-based scoping and filtering
 * @access  Private (Officer, Supervisor, Manager)
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const {
      search,
      regionId,
      zoneId,
      woredaId,
      kebeleId,
      syncStatus,
      duplicateReviewStatus,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Build role-scoped WHERE clause
    const where: any = {};

    if (user.role === Role.FIELD_OFFICER) {
      // Officer strictly sees own registrations
      where.registeredById = user.id;
    } else if (user.role === Role.SUPERVISOR) {
      // Supervisor strictly sees registrations by their assigned officers
      const assignedOfficers = await prisma.user.findMany({
        where: {
          role: Role.FIELD_OFFICER,
          OR: [
            { supervisorId: user.id },
            ...(user.zoneId ? [{ zoneId: user.zoneId }] : []),
          ],
        },
        select: { id: true },
      });
      const assignedOfficerIds = assignedOfficers.map((o) => o.id);
      assignedOfficerIds.push(user.id);
      where.registeredById = { in: assignedOfficerIds };
    }
    // Manager has unrestricted organization-wide access

    // Dynamic filters
    if (regionId) where.regionId = regionId as string;
    if (zoneId) where.zoneId = zoneId as string;
    if (woredaId) where.woredaId = woredaId as string;
    if (kebeleId) where.kebeleId = kebeleId as string;
    if (syncStatus) where.syncStatus = syncStatus as SyncStatus;
    if (duplicateReviewStatus) where.duplicateReviewStatus = duplicateReviewStatus as DuplicateReviewStatus;

    if (search) {
      const q = (search as string).trim();
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { middleName: { contains: q, mode: 'insensitive' } },
        { phoneNumber: { contains: q } },
        { clientRecordId: { contains: q, mode: 'insensitive' } },
        { village: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [citizens, total] = await Promise.all([
      prisma.citizen.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { registrationTimestamp: 'desc' },
        include: {
          region: { select: { id: true, name: true, code: true } },
          zone: { select: { id: true, name: true, code: true } },
          woreda: { select: { id: true, name: true, code: true } },
          kebele: { select: { id: true, name: true, code: true } },
          registeredBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
      prisma.citizen.count({ where }),
    ]);

    res.json({
      success: true,
      data: citizens.map(formatCitizenResponse),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Fetch citizens error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve citizens' });
  }
});

/**
 * @route   GET /api/citizens/:id
 * @desc    Retrieve single citizen by ID or clientRecordId
 * @access  Private (Officer, Supervisor, Manager)
 */
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const citizen = await prisma.citizen.findFirst({
      where: {
        OR: [{ id }, { clientRecordId: id }],
      },
      include: {
        region: { select: { id: true, name: true, code: true } },
        zone: { select: { id: true, name: true, code: true } },
        woreda: { select: { id: true, name: true, code: true } },
        kebele: { select: { id: true, name: true, code: true } },
        registeredBy: { select: { id: true, fullName: true, email: true } },
        duplicateReviews: {
          include: {
            suspectedDuplicate: {
              select: {
                id: true,
                clientRecordId: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                village: true,
              },
            },
          },
        },
      },
    });

    if (!citizen) {
      res.status(404).json({ success: false, error: 'Citizen record not found' });
      return;
    }

    res.json({
      success: true,
      data: formatCitizenResponse(citizen),
    });
  } catch (error: any) {
    console.error('Fetch citizen by ID error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve citizen record' });
  }
});

/**
 * @route   POST /api/citizens/check-duplicate
 * @desc    Pre-check for potential duplicates before final submission
 * @access  Private (Officer, Supervisor, Manager)
 */
router.post('/check-duplicate', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, firstName, lastName, gender, age, kebeleId, clientRecordId } = req.body;

    const matchReasons: string[] = [];
    const duplicates: any[] = [];

    // Check phone number
    if (phoneNumber) {
      const phoneMatches = await prisma.citizen.findMany({
        where: {
          phoneNumber,
          clientRecordId: clientRecordId ? { not: clientRecordId } : undefined,
        },
        include: {
          region: { select: { name: true } },
          zone: { select: { name: true } },
          woreda: { select: { name: true } },
          kebele: { select: { name: true } },
        },
        take: 3,
      });

      if (phoneMatches.length > 0) {
        matchReasons.push(`Exact phone match with ${phoneMatches.length} existing record(s)`);
        duplicates.push(...phoneMatches);
      }
    }

    // Check name + kebele
    if (firstName && lastName && kebeleId) {
      const nameMatches = await prisma.citizen.findMany({
        where: {
          firstName: { equals: firstName, mode: 'insensitive' },
          lastName: { equals: lastName, mode: 'insensitive' },
          kebeleId,
          clientRecordId: clientRecordId ? { not: clientRecordId } : undefined,
        },
        include: {
          region: { select: { name: true } },
          zone: { select: { name: true } },
          woreda: { select: { name: true } },
          kebele: { select: { name: true } },
        },
        take: 3,
      });

      if (nameMatches.length > 0) {
        matchReasons.push(`Matching name in the same Kebele`);
        for (const m of nameMatches) {
          if (!duplicates.some((d) => d.id === m.id)) {
            duplicates.push(m);
          }
        }
      }
    }

    res.json({
      success: true,
      hasDuplicate: duplicates.length > 0,
      matchReasons,
      duplicates: duplicates.map(formatCitizenResponse),
    });
  } catch (error: any) {
    console.error('Check duplicate error:', error);
    res.status(500).json({ success: false, error: 'Failed to check duplicates' });
  }
});

export default router;
