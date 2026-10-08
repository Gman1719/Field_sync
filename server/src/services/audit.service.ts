// server/src/services/audit.service.ts
// Enterprise Persistent Audit Trail Service for Manager and Supervisor Operations

import { Request } from 'express';
import prisma from '../config/db.js';
import { Role } from '@prisma/client';
import { generateAuditId } from '../utils/idGenerator.js';

export interface AuditEventParams {
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  zoneId?: string | null;
  summary?: string | null;
  previousValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  req?: Request;
}

export interface AuditQueryFilters {
  user: { id: string; role: Role; zoneId?: string | null; fullName?: string };
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  action?: string;
  entityType?: string;
  zoneId?: string;
  startDate?: string;
  endDate?: string;
}

// Sensitive key filter - never store credentials or authentication secrets in audit trails
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'temppassword',
  'temporarypassword',
  'token',
  'jwt',
  'refreshtoken',
  'secret',
  'authorization',
  'creditcard',
  'apikey',
]);

/**
 * Recursively sanitize objects to redact sensitive keys
 */
export function sanitizeAuditData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditData(item));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeAuditData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Record a persistent audit event on the backend
 */
export async function recordAuditEvent(params: AuditEventParams): Promise<any> {
  try {
    let {
      actorId,
      actorName,
      actorRole,
      action,
      entityType,
      entityId,
      zoneId,
      summary,
      previousValues,
      newValues,
      metadata,
      ipAddress,
      req,
    } = params;

    // Extract caller info from Express Request if available
    if (req) {
      if (!actorId && req.user) actorId = req.user.id;
      if (!actorName && req.user) actorName = req.user.fullName;
      if (!actorRole && req.user) actorRole = req.user.role;
      if (!ipAddress) {
        const forwarded = req.headers['x-forwarded-for'];
        if (typeof forwarded === 'string') {
          ipAddress = forwarded.split(',')[0].trim();
        } else {
          ipAddress = req.socket?.remoteAddress || req.ip || null;
        }
      }
    }

    // Default summary if omitted
    if (!summary) {
      const actorLabel = actorName ? `${actorName} (${actorRole || 'User'})` : 'System';
      summary = `${actorLabel} performed ${action} on ${entityType} #${entityId}`;
    }

    // Sanitize previous and new values
    const safePrevious = previousValues ? sanitizeAuditData(previousValues) : null;
    const safeNew = newValues ? sanitizeAuditData(newValues) : null;
    const safeMetadata = metadata ? sanitizeAuditData(metadata) : null;

    const log = await prisma.auditLog.create({
      data: {
        id: generateAuditId(),
        actorId: actorId || null,
        actorName: actorName || null,
        actorRole: actorRole || null,
        action: action.toUpperCase(),
        entityType,
        entityId: String(entityId),
        zoneId: zoneId || null,
        summary,
        previousValues: safePrevious,
        newValues: safeNew,
        metadata: safeMetadata,
        ipAddress: ipAddress || null,
      },
    });

    return log;
  } catch (err: any) {
    console.error('Failed to record audit event:', err.message);
    return null;
  }
}

/**
 * Query audit logs with strict role and assignment scoping
 */
export async function queryAuditLogs(filters: AuditQueryFilters) {
  const {
    user,
    page = 1,
    limit = 20,
    search,
    role,
    action,
    entityType,
    zoneId,
    startDate,
    endDate,
  } = filters;

  // Officers are strictly denied access to audit logs
  if (user.role === Role.FIELD_OFFICER) {
    throw new Error('Access denied: Field Officers are not permitted to view audit logs.');
  }

  const whereClause: any = {};

  // 1. Role Scoping
  if (user.role === Role.SUPERVISOR) {
    // Supervisor can only view audit logs associated with their assigned Zone,
    // or actions performed by themselves, or actions where they are the actor.
    if (user.zoneId) {
      whereClause.OR = [
        { zoneId: user.zoneId },
        { actorId: user.id },
      ];
    } else {
      whereClause.actorId = user.id;
    }
  } else if (user.role === Role.MANAGER) {
    // Manager has organization-wide access, can optionally filter by zoneId
    if (zoneId && zoneId !== 'all') {
      whereClause.zoneId = zoneId;
    }
  }

  // 2. Action Filter
  if (action && action !== 'ALL') {
    whereClause.action = action.toUpperCase();
  }

  // 3. Entity Type Filter
  if (entityType && entityType !== 'ALL') {
    whereClause.entityType = entityType;
  }

  // 4. Role Filter
  if (role && role !== 'ALL') {
    whereClause.actorRole = role.toUpperCase();
  }

  // 5. Date Range Filter
  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) {
      whereClause.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      whereClause.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
    }
  }

  // 6. Search Filter
  if (search && search.trim()) {
    const q = search.trim();
    const searchConditions = [
      { summary: { contains: q, mode: 'insensitive' } },
      { actorName: { contains: q, mode: 'insensitive' } },
      { entityId: { contains: q, mode: 'insensitive' } },
      { action: { contains: q, mode: 'insensitive' } },
    ];

    if (whereClause.OR) {
      whereClause.AND = [
        { OR: whereClause.OR },
        { OR: searchConditions },
      ];
      delete whereClause.OR;
    } else {
      whereClause.OR = searchConditions;
    }
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where: whereClause }),
    prisma.auditLog.findMany({
      where: whereClause,
      take: limitNum,
      skip,
      orderBy: { createdAt: 'desc' },
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
    }),
  ]);

  return {
    logs: logs.map((log) => ({
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
    })),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * Fetch distinct audit actions recorded in database
 */
export async function getDistinctAuditActions(userRole: Role, userZoneId?: string | null): Promise<string[]> {
  const where: any = {};
  if (userRole === Role.SUPERVISOR) {
    if (userZoneId) {
      where.OR = [{ zoneId: userZoneId }];
    }
  }
  const results = await prisma.auditLog.findMany({
    where,
    distinct: ['action'],
    select: { action: true },
    orderBy: { action: 'asc' },
  });
  return results.map((r) => r.action);
}
