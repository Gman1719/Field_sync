// server/src/routes/auth.routes.ts
// REST API Authentication Routes for FieldSync (Phase 2)

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { ZodError } from 'zod';
import prisma from '../config/db.js';
import { signToken } from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { loginSchema, changePasswordSchema } from '../validators/auth.validator.js';
import { Role } from '@prisma/client';

const router = Router();

/**
 * Format Prisma user model into normalized response object
 */
export const formatUserResponse = (user: any) => {
  const roleMap: Record<string, string> = {
    FIELD_OFFICER: 'field_officer',
    SUPERVISOR: 'supervisor',
    MANAGER: 'manager',
  };

  const frontendRole = roleMap[user.role] || user.role.toLowerCase();

  const parts = (user.fullName || '').trim().split(/\s+/);
  const firstName = user.firstName || parts[0] || 'User';
  const middleName = user.middleName || (parts.length > 2 ? parts.slice(1, -1).join(' ') : null);
  const lastName = user.lastName || (parts.length > 1 ? parts[parts.length - 1] : '');

  return {
    id: user.id,
    fullName: user.fullName || [firstName, middleName, lastName].filter(Boolean).join(' '),
    name: user.fullName || [firstName, middleName, lastName].filter(Boolean).join(' '),
    firstName,
    middleName,
    lastName,
    email: user.email,
    role: frontendRole,
    systemRole: user.role,
    phoneNumber: user.phoneNumber,
    phone: user.phoneNumber,
    profilePhotoUrl: user.profilePhotoUrl || null,
    isActive: user.isActive,
    status: user.isActive ? 'active' : 'inactive',
    mustChangePassword: user.mustChangePassword,
    regionId: user.regionId,
    zoneId: user.zoneId,
    woredaId: user.woredaId,
    kebeleId: user.kebeleId,
    region: user.region?.name || (user.role === 'MANAGER' ? 'Organization-wide' : ''),
    zone: user.zone?.name || (user.role === 'MANAGER' ? 'Organization-wide' : ''),
    woreda: user.woreda?.name || (user.role === 'MANAGER' ? 'Organization-wide' : ''),
    kebele: user.kebele?.name || (user.role === 'MANAGER' ? 'Organization-wide' : ''),
    registeredCitizensCount: user.registeredCitizensCount ?? user._count?.registeredCitizens ?? 0,
    supervisorId: user.supervisorId,
    supervisorName: user.supervisor?.fullName || null,
    supervisorEmail: user.supervisor?.email || null,
    supervisorPhone: user.supervisor?.phoneNumber || null,
    lastLogin: user.lastLogin || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user credentials, return JWT & profile
 * @access  Public
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
      include: {
        region: { select: { id: true, name: true, code: true } },
        zone: { select: { id: true, name: true, code: true } },
        woreda: { select: { id: true, name: true, code: true } },
        kebele: { select: { id: true, name: true, code: true } },
        supervisor: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
      return;
    }

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
      return;
    }

    // Check account status
    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: 'Account is deactivated. Please contact your manager.',
      });
      return;
    }

    // Update lastLogin timestamp
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
      include: {
        region: { select: { id: true, name: true, code: true } },
        zone: { select: { id: true, name: true, code: true } },
        woreda: { select: { id: true, name: true, code: true } },
        kebele: { select: { id: true, name: true, code: true } },
        supervisor: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
      },
    });

    // Issue JWT token
    const token = signToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    });

    // Record login audit log
    await prisma.auditLog.create({
      data: {
        actorId: updatedUser.id,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: updatedUser.id,
        metadata: {
          email: updatedUser.email,
          role: updatedUser.role,
          ip: req.ip,
        },
      },
    });

    res.json({
      success: true,
      data: {
        token,
        user: formatUserResponse(updatedUser),
      },
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

    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'An internal server error occurred during login',
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user profile
 * @access  Private (JWT)
 */
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    res.json({
      success: true,
      data: {
        user: formatUserResponse(req.user),
      },
    });
  } catch (error: any) {
    console.error('Fetch me error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user profile',
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Mandatory or voluntary password change
 * @access  Private (JWT or userId)
 */
router.post('/change-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = changePasswordSchema.parse(req.body);

    let targetUserId = req.body.userId;

    // If Bearer token is provided, extract user from token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const { verifyToken } = await import('../utils/jwt.js');
        const payload = verifyToken(authHeader.split(' ')[1]);
        targetUserId = payload.userId;
      } catch (e) {
        // Fall back to targetUserId in body if valid
      }
    }

    if (!targetUserId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required to change password',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        region: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
        woreda: { select: { id: true, name: true } },
        kebele: { select: { id: true, name: true } },
        supervisor: { select: { id: true, fullName: true } },
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(validated.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      res.status(400).json({
        success: false,
        error: 'Current password is incorrect',
      });
      return;
    }

    // Ensure new password is not identical to current password
    if (validated.currentPassword === validated.newPassword) {
      res.status(400).json({
        success: false,
        error: 'New password cannot be identical to current password',
      });
      return;
    }

    // Hash new password and clear mustChangePassword flag
    const newPasswordHash = await bcrypt.hash(validated.newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
      include: {
        region: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
        woreda: { select: { id: true, name: true } },
        kebele: { select: { id: true, name: true } },
        supervisor: { select: { id: true, fullName: true } },
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        actorId: updatedUser.id,
        action: 'PASSWORD_CHANGED',
        entityType: 'User',
        entityId: updatedUser.id,
        metadata: {
          email: updatedUser.email,
        },
      },
    });

    // Generate fresh JWT token
    const token = signToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
      data: {
        token,
        user: formatUserResponse(updatedUser),
      },
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

    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      error: 'An internal server error occurred while updating password',
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Log out session and record audit
 * @access  Private / Public
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const { verifyToken } = await import('../utils/jwt.js');
      const payload = verifyToken(authHeader.split(' ')[1]);
      await prisma.auditLog.create({
        data: {
          actorId: payload.userId,
          action: 'USER_LOGOUT',
          entityType: 'User',
          entityId: payload.userId,
        },
      });
      // Explicitly mark client disconnected & logged out for verification tracking
      const { VerificationSchedulerService } = await import('../services/verificationScheduler.service.js');
      VerificationSchedulerService.unregisterClient(payload.userId);
    } catch (e) {
      // Ignore token parse failures on logout
    }
  }

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default router;
