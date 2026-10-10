// server/src/routes/users.routes.ts
// REST API Routes for User Profile & User Management Module

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { ZodError } from 'zod';
import prisma from '../config/db.js';
import { authenticate, requireManager, requireSupervisor } from '../middleware/auth.middleware.js';
import { formatUserResponse } from './auth.routes.js';
import {
  updateProfileSchema,
  adminUpdateUserSchema,
  createUserSchema,
  reassignLocationSchema,
  normalizeRole,
  generateSecureTempPassword,
} from '../validators/user.validator.js';
import { normalizeEthiopianPhone } from '../utils/phone.utils.js';
import { generateUserId } from '../utils/idGenerator.js';
import { Role, NotificationPriority } from '@prisma/client';
import {
  createNotification,
  notifyManagers,
  notifySupervisorForZone,
  notifyOfficer,
} from '../services/notification.service.js';
import { recordAuditEvent } from '../services/audit.service.js';

const router = Router();

// Include object for full user details with Ethiopian administrative hierarchy & supervisor
const userIncludeRelations = {
  region: { select: { id: true, name: true, code: true } },
  zone: { select: { id: true, name: true, code: true } },
  woreda: { select: { id: true, name: true, code: true } },
  kebele: { select: { id: true, name: true, code: true } },
  supervisor: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
  _count: { select: { registeredCitizens: true } },
};

/**
 * Strictly validates the Ethiopian Administrative Hierarchy based on user role:
 * - MANAGER: organization-wide scope, all administrative regions/zones/woredas/supervisors forced to null.
 * - SUPERVISOR: regional & zonal level, regionId & zoneId required, zone must belong to region, woreda forced to null.
 * - FIELD_OFFICER: woreda level, regionId, zoneId, & woredaId required. Zone must belong to region, woreda must belong to zone.
 *   If supervisorId is specified, supervisor must exist, have role SUPERVISOR, be active, and belong to the same zone.
 */
async function validateLocationHierarchyAndRole(
  role: Role,
  regionId?: string | null,
  zoneId?: string | null,
  woredaId?: string | null,
  kebeleId?: string | null,
  supervisorId?: string | null
): Promise<{
  regionId: string | null;
  zoneId: string | null;
  woredaId: string | null;
  kebeleId: string | null;
  supervisorId: string | null;
}> {
  if (role === Role.MANAGER) {
    return {
      regionId: null,
      zoneId: null,
      woredaId: null,
      kebeleId: null,
      supervisorId: null,
    };
  }

  if (role === Role.SUPERVISOR) {
    if (!regionId) {
      throw new Error('Region is required for Supervisor role.');
    }
    if (!zoneId) {
      throw new Error('Zone is required for Supervisor role.');
    }

    const region = await prisma.region.findUnique({ where: { id: regionId } });
    if (!region) {
      throw new Error(`Region with ID "${regionId}" does not exist in the database.`);
    }

    const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone) {
      throw new Error(`Zone with ID "${zoneId}" does not exist in the database.`);
    }

    if (zone.regionId !== regionId) {
      throw new Error(`Hierarchy validation failed: Zone "${zone.name}" does not belong to Region "${region.name}".`);
    }

    return {
      regionId,
      zoneId,
      woredaId: null,
      kebeleId: null,
      supervisorId: null,
    };
  }

  if (role === Role.FIELD_OFFICER) {
    if (!regionId) {
      throw new Error('Region is required for Field Officer role.');
    }
    if (!zoneId) {
      throw new Error('Zone is required for Field Officer role.');
    }
    if (!woredaId) {
      throw new Error('Woreda is required for Field Officer role.');
    }

    const region = await prisma.region.findUnique({ where: { id: regionId } });
    if (!region) {
      throw new Error(`Region with ID "${regionId}" does not exist in the database.`);
    }

    const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone) {
      throw new Error(`Zone with ID "${zoneId}" does not exist in the database.`);
    }

    if (zone.regionId !== regionId) {
      throw new Error(`Hierarchy validation failed: Zone "${zone.name}" does not belong to Region "${region.name}".`);
    }

    const woreda = await prisma.woreda.findUnique({ where: { id: woredaId } });
    if (!woreda) {
      throw new Error(`Woreda with ID "${woredaId}" does not exist in the database.`);
    }

    if (woreda.zoneId !== zoneId) {
      throw new Error(`Hierarchy validation failed: Woreda "${woreda.name}" does not belong to Zone "${zone.name}".`);
    }

    // STRICT VALIDATION: A Field Officer can only be registered, assigned, or transferred to a Woreda
    // if that area has at least one active Supervisor responsible for that Zone.
    const activeSupervisorsInZone = await prisma.user.findMany({
      where: {
        role: Role.SUPERVISOR,
        isActive: true,
        zoneId: zoneId,
      },
    });

    if (activeSupervisorsInZone.length === 0) {
      throw new Error(
        `Hierarchy validation failed: A Field Officer can only be registered, assigned, or transferred to a Woreda if that area has at least one active Supervisor responsible for that Zone (${zone.name}). No active Supervisor found for this Zone.`
      );
    }

    let checkedSupervisorId = supervisorId || null;
    if (checkedSupervisorId) {
      const supervisor = await prisma.user.findUnique({ where: { id: checkedSupervisorId } });
      if (!supervisor) {
        throw new Error('Assigned supervisor not found in database.');
      }
      if (supervisor.role !== Role.SUPERVISOR) {
        throw new Error('Assigned supervisor must hold the SUPERVISOR role.');
      }
      if (!supervisor.isActive) {
        throw new Error('Assigned supervisor account is currently deactivated.');
      }
      if (supervisor.zoneId && supervisor.zoneId !== zoneId) {
        throw new Error(`Assigned supervisor must operate in the officer's Zone (${zone.name}).`);
      }
    } else {
      // Auto-assign to the first active supervisor in the zone if not explicitly specified
      checkedSupervisorId = activeSupervisorsInZone[0].id;
    }

    return {
      regionId,
      zoneId,
      woredaId,
      kebeleId: kebeleId || null,
      supervisorId: checkedSupervisorId,
    };
  }

  throw new Error(`Unsupported user role: ${role}`);
}

/**
 * Helper to fetch real role-specific statistics
 */
async function getUserStats(user: any) {
  if (user.role === 'FIELD_OFFICER') {
    const [citizenCount, reportsCount, sessionsCount, aggregateScreenTime] = await Promise.all([
      prisma.citizen.count({ where: { registeredById: user.id } }),
      prisma.dailyWorkReport.count({ where: { officerId: user.id } }),
      prisma.workSession.count({ where: { officerId: user.id } }),
      prisma.workSession.aggregate({
        where: { officerId: user.id },
        _sum: { durationSeconds: true },
      }),
    ]);

    const totalSeconds = aggregateScreenTime._sum.durationSeconds || 0;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const formattedScreenTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    return {
      roleType: 'field_officer',
      totalCitizensRegistered: citizenCount,
      totalReportsSubmitted: reportsCount,
      totalWorkSessions: sessionsCount,
      totalScreenTimeSeconds: totalSeconds,
      formattedScreenTime,
      lastSyncTime: user.updatedAt,
    };
  }

  if (user.role === 'SUPERVISOR') {
    const [assignedOfficersCount, teamReportsCount] = await Promise.all([
      prisma.user.count({ where: { supervisorId: user.id, role: Role.FIELD_OFFICER } }),
      prisma.dailyWorkReport.count({ where: { supervisorId: user.id } }),
    ]);

    return {
      roleType: 'supervisor',
      assignedOfficersCount,
      teamReportsCount,
      assignedRegion: user.region?.name || 'Unassigned',
      assignedZone: user.zone?.name || 'Unassigned',
    };
  }

  if (user.role === 'MANAGER') {
    const [totalUsers, totalCitizens, totalReports] = await Promise.all([
      prisma.user.count(),
      prisma.citizen.count(),
      prisma.dailyWorkReport.count(),
    ]);

    return {
      roleType: 'manager',
      organizationCoverage: 'National / Organization-wide',
      totalStaffCount: totalUsers,
      totalRegisteredCitizens: totalCitizens,
      totalDailyReports: totalReports,
    };
  }

  return {};
}

/**
 * @route   GET /api/users/me
 * @desc    Get currently authenticated user's personal profile and role-specific stats
 * @access  Private (All Roles)
 */
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const callerId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: callerId },
      include: userIncludeRelations,
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User profile not found' });
      return;
    }

    const formatted = formatUserResponse(user);
    const stats = await getUserStats(user);

    res.json({
      success: true,
      data: {
        ...formatted,
        stats,
      },
    });
  } catch (error: any) {
    console.error('Fetch /api/users/me error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve profile' });
  }
});

/**
 * @route   PATCH /api/users/me
 * @desc    Update permitted personal information for current user
 * @access  Private (All Roles)
 */
router.patch('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const callerId = req.user!.id;
    const validated = updateProfileSchema.parse(req.body);

    const currentUser = await prisma.user.findUnique({
      where: { id: callerId },
    });

    if (!currentUser) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Check email uniqueness if email is changed
    if (validated.email && validated.email !== currentUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validated.email },
      });
      if (emailExists) {
        res.status(400).json({ success: false, error: 'Email address already in use' });
        return;
      }
    }

    const rawPhone = validated.phoneNumber || validated.phone;
    const normalizedPhone = rawPhone !== undefined ? normalizeEthiopianPhone(rawPhone) : currentUser.phoneNumber;

    const firstName = validated.firstName !== undefined ? validated.firstName : currentUser.firstName;
    const middleName = validated.middleName !== undefined ? validated.middleName : currentUser.middleName;
    const lastName = validated.lastName !== undefined ? validated.lastName : currentUser.lastName;

    // Reconstruct full name from components
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ') || currentUser.fullName;

    const updatedUser = await prisma.user.update({
      where: { id: callerId },
      data: {
        firstName,
        middleName,
        lastName,
        fullName,
        email: validated.email || currentUser.email,
        phoneNumber: normalizedPhone,
        profilePhotoUrl:
          validated.profilePhotoUrl !== undefined ? validated.profilePhotoUrl : currentUser.profilePhotoUrl,
      },
      include: userIncludeRelations,
    });

    await prisma.auditLog.create({
      data: {
        actorId: callerId,
        action: 'USER_PROFILE_UPDATED',
        entityType: 'User',
        entityId: callerId,
        metadata: {
          updatedFields: Object.keys(validated),
        },
      },
    });

    const formatted = formatUserResponse(updatedUser);
    const stats = await getUserStats(updatedUser);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        ...formatted,
        stats,
      },
      user: formatted,
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
    console.error('Update /api/users/me error:', error);
    res.status(500).json({ success: false, error: 'Failed to update personal profile' });
  }
});

/**
 * @route   GET /api/users/stats
 * @desc    Get aggregate staff and workforce statistics
 * @access  Private (Manager & Supervisor)
 */
router.get('/stats', authenticate, requireSupervisor, async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      managers,
      supervisors,
      fieldOfficers,
      activeUsers,
      inactiveUsers,
      unassignedOfficers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: Role.MANAGER } }),
      prisma.user.count({ where: { role: Role.SUPERVISOR } }),
      prisma.user.count({ where: { role: Role.FIELD_OFFICER } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.count({
        where: {
          role: Role.FIELD_OFFICER,
          OR: [{ supervisorId: null }, { woredaId: null }],
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        managers,
        supervisors,
        fieldOfficers,
        activeUsers,
        inactiveUsers,
        unassignedFieldOfficers: unassignedOfficers,
      },
    });
  } catch (error: any) {
    console.error('Fetch /api/users/stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to load user statistics' });
  }
});

/**
 * @route   GET /api/users
 * @desc    List staff users with filtering
 * @access  Private (Manager & Supervisor)
 */
router.get('/', authenticate, requireSupervisor, async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = req.user!;
    const { role, status, regionId, zoneId, woredaId, search } = req.query;

    const where: any = {};

    // Role scoping: Supervisor only sees own officers or zone; Manager sees all
    if (caller.role === Role.SUPERVISOR) {
      where.OR = [
        { supervisorId: caller.id },
        { id: caller.id },
        ...(caller.zoneId ? [{ zoneId: caller.zoneId }] : []),
      ];
    }

    if (role && typeof role === 'string' && role !== 'all') {
      const roleUpper = role.toUpperCase();
      if (roleUpper in Role) {
        where.role = roleUpper as Role;
      }
    }

    if (status && typeof status === 'string' && status !== 'all') {
      where.isActive = status === 'active';
    }

    if (regionId && typeof regionId === 'string' && regionId !== 'all') {
      where.regionId = regionId;
    }

    if (zoneId && typeof zoneId === 'string' && zoneId !== 'all') {
      where.zoneId = zoneId;
    }

    if (woredaId && typeof woredaId === 'string' && woredaId !== 'all') {
      where.woredaId = woredaId;
    }

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phoneNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      include: userIncludeRelations,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      count: users.length,
      data: users.map(formatUserResponse),
    });
  } catch (error: any) {
    console.error('Fetch /api/users error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve users' });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user profile details by ID (Manager, Supervisor for own team, or Self)
 * @access  Private
 */
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const caller = req.user!;

    // Permissions check
    const isSelf = caller.id === id;
    const isManager = caller.role === Role.MANAGER;

    const user = await prisma.user.findUnique({
      where: { id },
      include: userIncludeRelations,
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const isSupervisedByCaller = user.supervisorId === caller.id;

    if (!isSelf && !isManager && !isSupervisedByCaller) {
      res.status(403).json({ success: false, error: 'Access denied to this user profile' });
      return;
    }

    const formatted = formatUserResponse(user);
    const stats = await getUserStats(user);

    res.json({
      success: true,
      data: {
        ...formatted,
        stats,
      },
      user: formatted,
    });
  } catch (error: any) {
    console.error('Fetch /api/users/:id error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve user details' });
  }
});

/**
 * @route   POST /api/users
 * @desc    Manager creates a new staff account with temporary password & mustChangePassword=true
 * @access  Private (Manager Only)
 */
router.post('/', authenticate, requireManager, async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = createUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: validated.email },
    });
    if (existing) {
      res.status(400).json({ success: false, error: 'User with this email already exists' });
      return;
    }

    // System is restricted to a single System Manager
    if (validated.role === Role.MANAGER) {
      res.status(400).json({
        success: false,
        error: 'System is restricted to a single System Manager (manager@fieldsync.com). Additional managers cannot be registered.',
      });
      return;
    }

    // Validate Ethiopian Location Hierarchy based on Role
    const hierarchy = await validateLocationHierarchyAndRole(
      validated.role,
      validated.regionId,
      validated.zoneId,
      validated.woredaId,
      validated.kebeleId,
      validated.supervisorId
    );

    const rawPhone = validated.phoneNumber || validated.phone;
    const normalizedPhone = rawPhone ? normalizeEthiopianPhone(rawPhone) : null;

    // Cryptographically secure temporary password
    const tempPassword = validated.password || generateSecureTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const fullName = [validated.firstName, validated.middleName, validated.lastName].filter(Boolean).join(' ');

    const userId = (req.body && req.body.id) || generateUserId(validated.role);

    const newUser = await prisma.user.create({
      data: {
        id: userId,
        firstName: validated.firstName,
        middleName: validated.middleName || null,
        lastName: validated.lastName,
        fullName,
        email: validated.email,
        phoneNumber: normalizedPhone,
        passwordHash,
        role: validated.role,
        isActive: true,
        mustChangePassword: true,
        regionId: hierarchy.regionId,
        zoneId: hierarchy.zoneId,
        woredaId: hierarchy.woredaId,
        kebeleId: hierarchy.kebeleId,
        supervisorId: hierarchy.supervisorId,
      },
      include: userIncludeRelations,
    });

    // Create Audit Log (never log temporary password)
    await recordAuditEvent({
      req,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: newUser.id,
      zoneId: newUser.zoneId,
      summary: `${req.user!.fullName} created staff account for ${newUser.fullName} (${newUser.role.replace('_', ' ')})`,
      newValues: {
        email: newUser.email,
        role: newUser.role,
        regionId: newUser.regionId,
        zoneId: newUser.zoneId,
        woredaId: newUser.woredaId,
      },
    });

    // Create In-App Notification for new user
    await notifyOfficer(newUser.id, {
      title: 'Welcome to FieldSync',
      message: `Your staff account has been provisioned with the role of ${newUser.role.replace('_', ' ')}. Please log in using your temporary password and set a permanent password.`,
      type: 'ACCOUNT',
      priority: NotificationPriority.NORMAL,
      actionUrl: '/profile',
    });

    // Notify Managers of new user account creation
    await notifyManagers({
      title: 'New User Account Created',
      message: `${newUser.fullName} (${newUser.role.replace('_', ' ')}) was provisioned in the system.`,
      type: 'ACCOUNT',
      priority: NotificationPriority.IMPORTANT,
      relatedRecordId: newUser.id,
      actionUrl: '/users',
    });

    // If Field Officer assigned to a Zone, notify the Zone Supervisor
    if (newUser.role === Role.FIELD_OFFICER && newUser.zoneId) {
      await notifySupervisorForZone(newUser.zoneId, {
        title: 'New Field Officer Assigned to Zone',
        message: `${newUser.fullName} has been assigned to your zone as Field Officer.`,
        type: 'ASSIGNMENT',
        priority: NotificationPriority.IMPORTANT,
        relatedRecordId: newUser.id,
        actionUrl: '/team',
      });
    }

    const formatted = formatUserResponse(newUser);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        ...formatted,
        temporaryPassword: tempPassword,
      },
      user: {
        ...formatted,
        temporaryPassword: tempPassword,
      },
      temporaryPassword: tempPassword,
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
    if (error.message && error.message.includes('Hierarchy validation') || error.message.includes('required for')) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    console.error('Create user error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create user' });
  }
});

interface TransferItem {
  officerId: string;
  targetSupervisorId: string;
}

/**
 * Atomically transfers supervised field officers from a supervisor to new active supervisor(s).
 * Supports both:
 * 1) Uniform transfer to one replacement supervisor (transferSupervisorId / newSupervisorId)
 * 2) Multi-officer individual transfers across different active supervisors (officerTransfers map or array)
 */
async function executeOfficerTransfers(
  currentSupervisor: { id: string; fullName: string },
  supervisedOfficers: Array<{ id: string; fullName: string }>,
  transferSupervisorId?: string | null,
  officerTransfers?: Record<string, string> | Array<{ officerId: string; targetSupervisorId?: string; newSupervisorId?: string }>,
  req?: Request,
  reason: string = 'role change'
): Promise<{ transferredCount: number; transfers: TransferItem[] }> {
  const resolvedTransfers: Record<string, string> = {};

  if (officerTransfers) {
    if (Array.isArray(officerTransfers)) {
      for (const item of officerTransfers) {
        const oId = item.officerId;
        const sId = item.targetSupervisorId || item.newSupervisorId;
        if (oId && sId) resolvedTransfers[oId] = sId;
      }
    } else if (typeof officerTransfers === 'object') {
      for (const [oId, sId] of Object.entries(officerTransfers)) {
        if (oId && typeof sId === 'string' && sId.trim()) resolvedTransfers[oId] = sId.trim();
      }
    }
  }

  // Fallback to transferSupervisorId for any officer not explicitly mapped
  if (transferSupervisorId) {
    for (const officer of supervisedOfficers) {
      if (!resolvedTransfers[officer.id]) {
        resolvedTransfers[officer.id] = transferSupervisorId;
      }
    }
  }

  // Validate that ALL supervised officers have an assigned replacement supervisor
  const missingOfficers = supervisedOfficers.filter(o => !resolvedTransfers[o.id]);
  if (missingOfficers.length > 0) {
    throw new Error(
      `Reassignment Required: All ${supervisedOfficers.length} field officers must be reassigned before proceeding. Missing replacement supervisor for ${missingOfficers.length} officer(s): ${missingOfficers.map(o => o.fullName).join(', ')}.`
    );
  }

  // Validate each target supervisor is an active Supervisor and not the current supervisor
  const uniqueTargetSupIds = Array.from(new Set(Object.values(resolvedTransfers)));
  const supervisorCache: Record<string, { id: string; fullName: string }> = {};

  for (const supId of uniqueTargetSupIds) {
    if (supId === currentSupervisor.id) {
      throw new Error('Replacement supervisor cannot be the current supervisor being changed or relocated.');
    }
    const sup = await prisma.user.findUnique({
      where: { id: supId },
      select: { id: true, fullName: true, role: true, isActive: true },
    });
    if (!sup || sup.role !== Role.SUPERVISOR || !sup.isActive) {
      throw new Error(`Target supervisor with ID "${supId}" is not an active Supervisor.`);
    }
    supervisorCache[supId] = { id: sup.id, fullName: sup.fullName };
  }

  // Atomically update each officer
  const transferList: TransferItem[] = [];
  for (const officer of supervisedOfficers) {
    const targetSupId = resolvedTransfers[officer.id];
    await prisma.user.update({
      where: { id: officer.id },
      data: { supervisorId: targetSupId },
    });
    transferList.push({ officerId: officer.id, targetSupervisorId: targetSupId });
  }

  // Notifications and audit events
  try {
    const groupedBySup: Record<string, string[]> = {};
    for (const item of transferList) {
      if (!groupedBySup[item.targetSupervisorId]) groupedBySup[item.targetSupervisorId] = [];
      groupedBySup[item.targetSupervisorId].push(item.officerId);
    }

    for (const [targetSupId, officerIds] of Object.entries(groupedBySup)) {
      const targetSupName = supervisorCache[targetSupId]?.fullName || 'Supervisor';
      await createNotification({
        recipientId: targetSupId,
        title: 'Field Officers Assigned to You',
        message: `${officerIds.length} field officer(s) have been transferred to your supervision from ${currentSupervisor.fullName} due to ${reason}.`,
        type: 'ASSIGNMENT',
        priority: NotificationPriority.IMPORTANT,
        actionUrl: '/team',
      });

      for (const offId of officerIds) {
        await createNotification({
          recipientId: offId,
          title: 'Supervisor Reassigned',
          message: `Your direct supervisor has been reassigned to ${targetSupName}.`,
          type: 'SUPERVISOR_REASSIGNED',
          priority: NotificationPriority.IMPORTANT,
          actionUrl: '/profile',
        });
      }
    }

    if (req) {
      await recordAuditEvent({
        req,
        action: 'SUPERVISOR_OFFICERS_TRANSFERRED',
        entityType: 'User',
        entityId: currentSupervisor.id,
        summary: `${req.user?.fullName || 'Manager'} transferred ${transferList.length} field officer(s) from ${currentSupervisor.fullName} across ${uniqueTargetSupIds.length} supervisor(s) due to ${reason}`,
        metadata: {
          fromSupervisorId: currentSupervisor.id,
          reason,
          transfers: transferList,
        },
      });
    }
  } catch (notifErr: any) {
    console.warn('Notification/audit warning during officer transfer:', notifErr.message);
  }

  return { transferredCount: transferList.length, transfers: transferList };
}

/**
 * Common handler for updating user details via PATCH or PUT
 */
async function handleUpdateUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const validated = adminUpdateUserSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id }, { email: id }],
      },
    });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    if (validated.email && validated.email !== user.email) {
      const emailExists = await prisma.user.findUnique({ where: { email: validated.email } });
      if (emailExists) {
        res.status(400).json({ success: false, error: 'Email address already in use' });
        return;
      }
    }

    const targetRole = validated.role || user.role;

    // Guard: System is restricted to a single Manager (manager@fieldsync.com)
    if (targetRole === Role.MANAGER && user.role !== Role.MANAGER) {
      res.status(400).json({
        success: false,
        error: 'System is restricted to a single System Manager (manager@fieldsync.com). Users cannot be promoted to Manager.',
      });
      return;
    }

    if (user.role === Role.MANAGER && targetRole !== Role.MANAGER) {
      res.status(400).json({
        success: false,
        error: 'The System Manager role is permanent and cannot be modified.',
      });
      return;
    }

    if (user.role === Role.MANAGER && validated.isActive === false) {
      res.status(400).json({
        success: false,
        error: 'The System Manager account is permanent and cannot be deactivated.',
      });
      return;
    }

    // If role or any location fields were provided, validate location hierarchy
    const hasLocationUpdate =
      validated.role !== undefined ||
      validated.regionId !== undefined ||
      validated.zoneId !== undefined ||
      validated.woredaId !== undefined ||
      validated.supervisorId !== undefined;

    let hierarchy = {
      regionId: validated.regionId !== undefined ? validated.regionId : user.regionId,
      zoneId: validated.zoneId !== undefined ? validated.zoneId : user.zoneId,
      woredaId: validated.woredaId !== undefined ? validated.woredaId : user.woredaId,
      kebeleId: validated.kebeleId !== undefined ? validated.kebeleId : user.kebeleId,
      supervisorId: validated.supervisorId !== undefined ? validated.supervisorId : user.supervisorId,
    };

    if (hasLocationUpdate) {
      hierarchy = await validateLocationHierarchyAndRole(
        targetRole,
        hierarchy.regionId,
        hierarchy.zoneId,
        hierarchy.woredaId,
        hierarchy.kebeleId,
        hierarchy.supervisorId
      );

      // Validation: Supervisors with active field officers cannot change location without reassigning officers first
      if (
        user.role === Role.SUPERVISOR &&
        (hierarchy.zoneId !== user.zoneId || hierarchy.regionId !== user.regionId)
      ) {
        const supervisedOfficers = await prisma.user.findMany({
          where: { supervisorId: user.id, role: Role.FIELD_OFFICER },
          select: { id: true, fullName: true },
        });
        if (supervisedOfficers.length > 0) {
          res.status(400).json({
            success: false,
            code: 'REASSIGNMENT_REQUIRED',
            error: `Supervisor Location Change Blocked: This supervisor currently oversees ${supervisedOfficers.length} Field Officer(s) under their control. You must reassign all field officers to other active supervisors before changing this supervisor's location.`,
            assignedOfficersCount: supervisedOfficers.length,
            assignedOfficers: supervisedOfficers,
          });
          return;
        }
      }
    }

    const rawPhone = validated.phoneNumber || validated.phone;
    const normalizedPhone = rawPhone !== undefined ? normalizeEthiopianPhone(rawPhone) : user.phoneNumber;

    const firstName = validated.firstName !== undefined ? validated.firstName : user.firstName;
    const middleName = validated.middleName !== undefined ? validated.middleName : user.middleName;
    const lastName = validated.lastName !== undefined ? validated.lastName : user.lastName;
    const fullName = validated.fullName || [firstName, middleName, lastName].filter(Boolean).join(' ') || user.fullName;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName,
        middleName,
        lastName,
        fullName,
        email: validated.email || user.email,
        phoneNumber: normalizedPhone,
        role: targetRole,
        isActive: validated.isActive !== undefined ? validated.isActive : user.isActive,
        regionId: hierarchy.regionId,
        zoneId: hierarchy.zoneId,
        woredaId: hierarchy.woredaId,
        kebeleId: hierarchy.kebeleId,
        supervisorId: hierarchy.supervisorId,
      },
      include: userIncludeRelations,
    });

    await recordAuditEvent({
      req,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: user.id,
      zoneId: updated.zoneId,
      summary: `${req.user!.fullName} updated profile details for ${updated.fullName}`,
      previousValues: {
        role: user.role,
        regionId: user.regionId,
        zoneId: user.zoneId,
        woredaId: user.woredaId,
      },
      newValues: {
        role: updated.role,
        regionId: updated.regionId,
        zoneId: updated.zoneId,
        woredaId: updated.woredaId,
      },
      metadata: { updatedFields: Object.keys(validated) },
    });

    await prisma.notification.create({
      data: {
        recipientId: id,
        title: 'Account Information Updated',
        message: 'Your staff account details have been updated by administration.',
        type: 'ACCOUNT_UPDATED',
      },
    });

    const formatted = formatUserResponse(updated);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: formatted,
      user: formatted,
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors[0]?.message || 'Validation error',
      });
      return;
    }
    if (error.message && (error.message.includes('Hierarchy validation') || error.message.includes('required for'))) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update user' });
  }
}

/**
 * @route   PATCH /api/users/:id
 * @desc    Manager updates a user's details
 * @access  Private (Manager Only)
 */
router.patch('/:id', authenticate, requireManager, handleUpdateUser);

/**
 * @route   PUT /api/users/:id
 * @desc    Manager updates a user's details (full / PUT compatibility)
 * @access  Private (Manager Only)
 */
router.put('/:id', authenticate, requireManager, handleUpdateUser);

/**
 * @route   PATCH /api/users/:id/assignment
 * @desc    Manager reassigns Ethiopian administrative location / supervisor
 * @access  Private (Manager Only)
 */
router.patch('/:id/assignment', authenticate, requireManager, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validated = reassignLocationSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id }, { email: id }],
      },
    });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Strictly validate location hierarchy against user's current role
    const hierarchy = await validateLocationHierarchyAndRole(
      user.role,
      validated.regionId !== undefined ? validated.regionId : user.regionId,
      validated.zoneId !== undefined ? validated.zoneId : user.zoneId,
      validated.woredaId !== undefined ? validated.woredaId : user.woredaId,
      validated.kebeleId !== undefined ? validated.kebeleId : user.kebeleId,
      validated.supervisorId !== undefined ? validated.supervisorId : user.supervisorId
    );

    // Validation: If user is SUPERVISOR and their jurisdiction (zone or region) is changing
    let transferredOfficersCount = 0;
    const isRelocatingSupervisor =
      user.role === Role.SUPERVISOR &&
      (hierarchy.zoneId !== user.zoneId || hierarchy.regionId !== user.regionId);

    if (isRelocatingSupervisor) {
      const supervisedOfficers = await prisma.user.findMany({
        where: { supervisorId: user.id, role: Role.FIELD_OFFICER },
        select: { id: true, fullName: true, zoneId: true },
      });

      if (supervisedOfficers.length > 0) {
        const { transferSupervisorId, officerTransfers } = req.body;
        if (!transferSupervisorId && !officerTransfers) {
          res.status(400).json({
            success: false,
            code: 'REASSIGNMENT_REQUIRED',
            error: `Reassignment Required: This Supervisor currently oversees ${supervisedOfficers.length} Field Officers under their control. You must reassign all Field Officers to other active Supervisors before relocating this supervisor to a new location.`,
            assignedOfficersCount: supervisedOfficers.length,
            assignedOfficers: supervisedOfficers,
          });
          return;
        }

        try {
          const transferRes = await executeOfficerTransfers(
            user,
            supervisedOfficers,
            transferSupervisorId,
            officerTransfers,
            req,
            'supervisor jurisdiction relocation'
          );
          transferredOfficersCount = transferRes.transferredCount;
        } catch (transErr: any) {
          res.status(400).json({ success: false, error: transErr.message });
          return;
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        regionId: hierarchy.regionId,
        zoneId: hierarchy.zoneId,
        woredaId: hierarchy.woredaId,
        kebeleId: hierarchy.kebeleId,
        supervisorId: hierarchy.supervisorId,
      },
      include: userIncludeRelations,
    });

    await recordAuditEvent({
      req,
      action: 'USER_ASSIGNMENT_UPDATED',
      entityType: 'User',
      entityId: user.id,
      zoneId: hierarchy.zoneId,
      summary: `${req.user!.fullName} reassigned location/hierarchy for ${updated.fullName}`,
      previousValues: {
        regionId: user.regionId,
        zoneId: user.zoneId,
        woredaId: user.woredaId,
        supervisorId: user.supervisorId,
      },
      newValues: hierarchy,
      metadata: { transferredOfficersCount },
    });

    await createNotification({
      recipientId: id,
      title: 'Work Location / Supervisor Assignment Updated',
      message: 'Your operational administrative location or supervisor assignment has been updated.',
      type: 'ASSIGNMENT',
      priority: NotificationPriority.NORMAL,
      actionUrl: '/profile',
    });

    await notifyManagers({
      title: 'Staff Member Reassigned',
      message: `${updated.fullName} (${updated.role.replace('_', ' ')}) has been reassigned to a new administrative territory.`,
      type: 'ASSIGNMENT',
      priority: NotificationPriority.IMPORTANT,
      relatedRecordId: id,
      actionUrl: '/users',
    });

    if (user.zoneId && hierarchy.zoneId && user.zoneId !== hierarchy.zoneId) {
      // Notify previous supervisor
      await notifySupervisorForZone(user.zoneId, {
        title: 'Field Officer Reassigned from Zone',
        message: `${user.fullName} has been reassigned to another zone.`,
        type: 'ASSIGNMENT',
        priority: NotificationPriority.IMPORTANT,
        relatedRecordId: id,
        actionUrl: '/team',
      });
      // Notify new supervisor
      await notifySupervisorForZone(hierarchy.zoneId, {
        title: 'Field Officer Reassigned to Zone',
        message: `${updated.fullName} has been transferred and assigned to your zone.`,
        type: 'ASSIGNMENT',
        priority: NotificationPriority.IMPORTANT,
        relatedRecordId: id,
        actionUrl: '/team',
      });
    }

    const formatted = formatUserResponse(updated);

    res.json({
      success: true,
      message: 'User assignment updated successfully',
      data: formatted,
      user: formatted,
      affectedOfficersCount: transferredOfficersCount,
    });
  } catch (error: any) {
    if (error.message && (error.message.includes('Hierarchy validation') || error.message.includes('required for'))) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    console.error('Reassign user error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to reassign user location' });
  }
});

/**
 * @route   GET /api/users/:id/supervisees
 * @desc    Get all field officers supervised by a supervisor
 * @access  Private (Manager & Supervisor)
 */
router.get('/:id/supervisees', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const supervisees = await prisma.user.findMany({
      where: {
        supervisorId: id,
        role: Role.FIELD_OFFICER,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        isActive: true,
        woredaId: true,
        zoneId: true,
        regionId: true,
        woreda: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
        region: { select: { id: true, name: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    res.json({
      success: true,
      count: supervisees.length,
      data: supervisees,
    });
  } catch (error: any) {
    console.error('Fetch supervisees error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch supervised officers' });
  }
});

/**
 * @route   POST /api/users/:id/transfer-supervisees
 * @desc    Manager transfers supervised field officers to active replacement supervisor(s)
 * @access  Private (Manager Only)
 */
router.post('/:id/transfer-supervisees', authenticate, requireManager, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newSupervisorId, transferSupervisorId, officerTransfers } = req.body;
    const targetSupId = newSupervisorId || transferSupervisorId;

    const currentSup = await prisma.user.findUnique({
      where: { id },
      select: { id: true, fullName: true, role: true },
    });
    if (!currentSup) {
      res.status(404).json({ success: false, error: 'Current supervisor not found' });
      return;
    }

    const supervisedOfficers = await prisma.user.findMany({
      where: { supervisorId: id, role: Role.FIELD_OFFICER },
      select: { id: true, fullName: true },
    });

    if (supervisedOfficers.length === 0) {
      res.json({
        success: true,
        transferredCount: 0,
        message: 'No supervised officers were assigned to this supervisor.',
      });
      return;
    }

    if (!targetSupId && !officerTransfers) {
      res.status(400).json({
        success: false,
        error: 'Target replacement supervisor or officer assignment map is required.',
      });
      return;
    }

    const transferRes = await executeOfficerTransfers(
      currentSup,
      supervisedOfficers,
      targetSupId,
      officerTransfers,
      req,
      'direct transfer'
    );

    res.json({
      success: true,
      transferredCount: transferRes.transferredCount,
      transfers: transferRes.transfers,
      message: `Successfully transferred ${transferRes.transferredCount} field officer(s).`,
    });
  } catch (error: any) {
    console.error('Transfer supervisees error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to transfer supervised officers' });
  }
});

/**
 * @route   PATCH /api/users/:id/role
 * @desc    Manager updates a user's role
 * @access  Private (Manager Only)
 */
router.patch('/:id/role', authenticate, requireManager, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      role,
      regionId: reqRegionId,
      zoneId: reqZoneId,
      woredaId: reqWoredaId,
      supervisorId: reqSupervisorId,
      transferSupervisorId,
      officerTransfers,
    } = req.body;

    const newRole = normalizeRole(role);

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id }, { email: id }],
      },
    });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Guard: System is restricted to a single Manager (manager@fieldsync.com)
    if (newRole === Role.MANAGER) {
      res.status(400).json({
        success: false,
        error: 'System is restricted to a single System Manager (manager@fieldsync.com). Users cannot be promoted to Manager.',
      });
      return;
    }

    if (user.role === Role.MANAGER) {
      res.status(400).json({
        success: false,
        error: 'The System Manager role is permanent and cannot be modified.',
      });
      return;
    }

    // Role-change validation: If user is currently SUPERVISOR and being changed to non-supervisor
    let transferredOfficersCount = 0;
    if (user.role === Role.SUPERVISOR && newRole !== Role.SUPERVISOR) {
      const supervisedOfficers = await prisma.user.findMany({
        where: { supervisorId: user.id, role: Role.FIELD_OFFICER },
        select: { id: true, fullName: true },
      });

      if (supervisedOfficers.length > 0) {
        if (!transferSupervisorId && !officerTransfers) {
          res.status(400).json({
            success: false,
            code: 'REASSIGNMENT_REQUIRED',
            error: `Reassignment Required: This Supervisor has ${supervisedOfficers.length} assigned Field Officers. Please reassign all Field Officers to other active Supervisors before changing the user's role.`,
            assignedOfficersCount: supervisedOfficers.length,
            assignedOfficers: supervisedOfficers,
          });
          return;
        }

        try {
          const transferRes = await executeOfficerTransfers(
            user,
            supervisedOfficers,
            transferSupervisorId,
            officerTransfers,
            req,
            'role change'
          );
          transferredOfficersCount = transferRes.transferredCount;
        } catch (transErr: any) {
          res.status(400).json({ success: false, error: transErr.message });
          return;
        }
      }
    }

    // Strictly validate Ethiopian Location Hierarchy based on new Role
    // (e.g. Field Officer requires zone with active supervisor, supervisor requires region & zone, manager has none)
    const rawRegionId = reqRegionId !== undefined ? reqRegionId : user.regionId;
    const rawZoneId = reqZoneId !== undefined ? reqZoneId : user.zoneId;
    const rawWoredaId = reqWoredaId !== undefined ? reqWoredaId : user.woredaId;
    const rawKebeleId = user.kebeleId;
    const rawSupervisorId = reqSupervisorId !== undefined ? reqSupervisorId : user.supervisorId;

    const validatedHierarchy = await validateLocationHierarchyAndRole(
      newRole,
      rawRegionId,
      rawZoneId,
      rawWoredaId,
      rawKebeleId,
      rawSupervisorId
    );

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: newRole,
        regionId: validatedHierarchy.regionId,
        zoneId: validatedHierarchy.zoneId,
        woredaId: validatedHierarchy.woredaId,
        kebeleId: validatedHierarchy.kebeleId,
        supervisorId: validatedHierarchy.supervisorId,
      },
      include: userIncludeRelations,
    });

    try {
      await recordAuditEvent({
        req,
        action: 'USER_ROLE_UPDATED',
        entityType: 'User',
        entityId: user.id,
        zoneId: updated.zoneId,
        summary: `${req.user?.fullName || 'Manager'} updated system role for ${updated.fullName} to ${newRole.replace('_', ' ')}`,
        previousValues: { role: user.role },
        newValues: { role: newRole },
        metadata: { oldRole: user.role, newRole, transferredOfficersCount },
      });
    } catch (auditErr: any) {
      console.warn('Audit log failed for role update:', auditErr.message);
    }

    try {
      await createNotification({
        recipientId: user.id,
        title: 'System Role Updated',
        message: `Your system role has been changed to ${newRole.replace('_', ' ')}.`,
        type: 'ACCOUNT',
        priority: NotificationPriority.IMPORTANT,
        actionUrl: '/profile',
      });

      await notifyManagers({
        title: 'User Role Changed',
        message: `${updated.fullName}'s role has been changed from ${user.role} to ${newRole}.`,
        type: 'ACCOUNT',
        priority: NotificationPriority.IMPORTANT,
        relatedRecordId: user.id,
        actionUrl: '/users',
      });
    } catch (notifErr: any) {
      console.warn('Notifications failed for role update:', notifErr.message);
    }

    const formatted = formatUserResponse(updated);

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: formatted,
      user: formatted,
      transferredOfficersCount,
    });
  } catch (error: any) {
    console.error('Update role error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update user role' });
  }
});

/**
 * @route   PATCH /api/users/:id/status
 * @desc    Manager toggles a user's active/inactive status
 * @access  Private (Manager Only)
 */
router.patch('/:id/status', authenticate, requireManager, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, isActive, transferSupervisorId } = req.body;

    const newActiveState = isActive !== undefined ? !!isActive : status === 'active';

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ id }, { email: id }],
      },
    });
    if (!existingUser) {
      res.status(404).json({ success: false, error: 'User record not found in database' });
      return;
    }

    // Guard: Prevent deactivating the single System Manager
    if (existingUser.role === Role.MANAGER && !newActiveState) {
      res.status(400).json({
        success: false,
        error: 'The System Manager account is permanent and cannot be deactivated.',
      });
      return;
    }

    // Departure/Deactivation validation: Check if deactivating a supervisor with active supervisees
    if (existingUser.role === Role.SUPERVISOR && !newActiveState) {
      const supervisedOfficers = await prisma.user.findMany({
        where: { supervisorId: existingUser.id, role: Role.FIELD_OFFICER },
        select: { id: true, fullName: true },
      });

      if (supervisedOfficers.length > 0) {
        if (!transferSupervisorId) {
          res.status(400).json({
            success: false,
            code: 'REASSIGNMENT_REQUIRED',
            error: `Reassignment Required: This Supervisor has ${supervisedOfficers.length} assigned Field Officers. Please reassign all Field Officers to other active Supervisors before deactivating this account.`,
            assignedOfficersCount: supervisedOfficers.length,
            assignedOfficers: supervisedOfficers,
          });
          return;
        }

        const targetSup = await prisma.user.findUnique({
          where: { id: transferSupervisorId },
          select: { id: true, fullName: true, role: true, isActive: true },
        });

        if (!targetSup || targetSup.role !== Role.SUPERVISOR || !targetSup.isActive) {
          res.status(400).json({
            success: false,
            error: 'Replacement supervisor must be an active Supervisor.',
          });
          return;
        }

        await prisma.user.updateMany({
          where: { supervisorId: existingUser.id, role: Role.FIELD_OFFICER },
          data: { supervisorId: transferSupervisorId },
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: { isActive: newActiveState },
      include: userIncludeRelations,
    });

    try {
      await recordAuditEvent({
        req,
        action: 'USER_STATUS_UPDATED',
        entityType: 'User',
        entityId: existingUser.id,
        zoneId: updated.zoneId,
        summary: `${req.user?.fullName || 'Manager'} ${newActiveState ? 'activated' : 'deactivated'} account for ${updated.fullName}`,
        previousValues: { isActive: !newActiveState },
        newValues: { isActive: newActiveState },
      });
    } catch (auditErr: any) {
      console.warn('Audit log failed for status update:', auditErr.message);
    }

    try {
      await createNotification({
        recipientId: existingUser.id,
        title: 'Account Status Updated',
        message: `Your account has been ${newActiveState ? 'reactivated' : 'deactivated'} by management.`,
        type: 'ACCOUNT',
        priority: NotificationPriority.IMPORTANT,
        actionUrl: '/profile',
      });

      await notifyManagers({
        title: `User Account ${newActiveState ? 'Activated' : 'Deactivated'}`,
        message: `${updated.fullName}'s account has been ${newActiveState ? 'activated' : 'deactivated'}.`,
        type: 'ACCOUNT',
        priority: NotificationPriority.IMPORTANT,
        relatedRecordId: existingUser.id,
        actionUrl: '/users',
      });

      if (updated.zoneId) {
        await notifySupervisorForZone(updated.zoneId, {
          title: `Field Officer Account ${newActiveState ? 'Activated' : 'Deactivated'}`,
          message: `${updated.fullName}'s account in your zone has been ${newActiveState ? 'activated' : 'deactivated'}.`,
          type: 'ACCOUNT',
          priority: NotificationPriority.IMPORTANT,
          relatedRecordId: existingUser.id,
          actionUrl: '/team',
        });
      }
    } catch (notifErr: any) {
      console.warn('Notifications failed for status update:', notifErr.message);
    }

    const formatted = formatUserResponse(updated);

    res.json({
      success: true,
      message: `User ${newActiveState ? 'activated' : 'deactivated'} successfully`,
      data: formatted,
      user: formatted,
    });
  } catch (error: any) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update user status' });
  }
});

/**
 * @route   POST /api/users/:id/password-reset
 * @desc    Manager generates a temporary password for a user
 * @access  Private (Manager Only)
 */
router.post('/:id/password-reset', authenticate, requireManager, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { temporaryPassword: customTempPassword, password } = req.body || {};

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id }, { email: id }],
      },
    });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const providedPassword = (typeof customTempPassword === 'string' && customTempPassword.trim().length >= 6)
      ? customTempPassword.trim()
      : (typeof password === 'string' && password.trim().length >= 6 ? password.trim() : null);

    const tempPassword = providedPassword || generateSecureTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    // Never log plain-text temporary password
    await recordAuditEvent({
      req,
      action: 'USER_PASSWORD_RESET',
      entityType: 'User',
      entityId: user.id,
      zoneId: user.zoneId,
      summary: `${req.user!.fullName} reset password for user ${user.fullName} (${user.email})`,
      metadata: { email: user.email },
    });

    await createNotification({
      recipientId: user.id,
      title: 'Password Reset Initiated',
      message: 'A temporary password has been issued for your account. You will be required to change it upon login.',
      type: 'SECURITY',
      priority: NotificationPriority.IMPORTANT,
      actionUrl: '/profile',
    });

    await notifyManagers({
      title: 'User Password Reset',
      message: `A password reset was issued for ${user.fullName} (${user.email}).`,
      type: 'SECURITY',
      priority: NotificationPriority.NORMAL,
      relatedRecordId: user.id,
      actionUrl: '/users',
    });

    res.json({
      success: true,
      message: 'Temporary password generated successfully',
      data: {
        temporaryPassword: tempPassword,
        mustChangePassword: true,
      },
      temporaryPassword: tempPassword,
    });
  } catch (error: any) {
    console.error('Password reset error:', error);
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

export default router;
