// server/src/middleware/auth.middleware.ts
// Authentication and Role-Based Authorization Middleware for FieldSync

import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { verifyToken, TokenPayload } from '../utils/jwt.js';
import prisma from '../config/db.js';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  phoneNumber: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  regionId: string | null;
  zoneId: string | null;
  woredaId: string | null;
  kebeleId: string | null;
  regionName?: string;
  zoneName?: string;
  woredaName?: string;
  kebeleName?: string;
  supervisorId?: string | null;
  supervisorName?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Authenticates incoming request via Bearer JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authentication token required',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    let payload: TokenPayload;

    try {
      payload = verifyToken(token);
    } catch (jwtErr: any) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired authentication token',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
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
        error: 'User account no longer exists',
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: 'Account is deactivated. Please contact your manager.',
      });
      return;
    }

    // Backend enforcement for mandatory first-login password change
    if (
      user.mustChangePassword &&
      !req.originalUrl.includes('/change-password') &&
      !req.originalUrl.includes('/auth/me') &&
      !req.originalUrl.includes('/logout')
    ) {
      res.status(403).json({
        success: false,
        error: 'Password change required before accessing system resources',
        mustChangePassword: true,
      });
      return;
    }

    req.user = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      regionId: user.regionId,
      zoneId: user.zoneId,
      woredaId: user.woredaId,
      kebeleId: user.kebeleId,
      regionName: user.region?.name,
      zoneName: user.zone?.name,
      woredaName: user.woreda?.name,
      kebeleName: user.kebele?.name,
      supervisorId: user.supervisorId,
      supervisorName: user.supervisor?.fullName,
    };

    next();
  } catch (error: any) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed due to server error',
    });
  }
};

/**
 * Role-Based Access Control (RBAC) guard
 */
export const requireRoles = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access forbidden: Insufficient privileges. Requires one of [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
};

// Convenience role middleware helpers
export const requireManager = requireRoles(Role.MANAGER);
export const requireSupervisor = requireRoles(Role.SUPERVISOR, Role.MANAGER);
export const requireOfficer = requireRoles(Role.FIELD_OFFICER, Role.SUPERVISOR, Role.MANAGER);
