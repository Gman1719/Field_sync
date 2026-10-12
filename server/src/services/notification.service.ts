import prisma from '../config/db.js';
import { Role, NotificationPriority } from '@prisma/client';
import { generateNotificationId } from '../utils/idGenerator.js';

export interface CreateNotificationParams {
  recipientId: string;
  title: string;
  message: string;
  type: string; 
  priority?: NotificationPriority;
  relatedRecordId?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, any> | null;
}

export interface BroadcastNotificationParams {
  title: string;
  message: string;
  type: string;
  priority?: NotificationPriority;
  relatedRecordId?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, any> | null;
}

function isNotificationExcluded(role: Role, type: string, title: string): boolean {
  const normType = (type || '').toUpperCase();
  const normTitle = (title || '').toUpperCase();

  if (normType.includes('CORRECTION') || normTitle.includes('CORRECTION')) {
    return true;
  }

  if (role === Role.SUPERVISOR) {
    if (
      normType === 'CITIZEN_REGISTERED' ||
      normType === 'CITIZEN_VERIFIED' ||
      normType === 'TASK' ||
      normType === 'TASK_ASSIGNED'
    ) {
      return true;
    }
  }

  if (role === Role.FIELD_OFFICER) {
    if (
      normType.startsWith('ATTENDANCE') ||
      normType === 'DAILY_REPORT_SUBMITTED' 
    ) {
      return true;
    }
  }

  return false;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const {
      recipientId,
      title,
      message,
      type,
      priority = NotificationPriority.NORMAL,
      relatedRecordId = null,
      actionUrl = null,
      metadata = null,
    } = params;

    let recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, role: true, isActive: true },
    });

    if (!recipient) {
      recipient = await prisma.user.findFirst({
        where: { email: { equals: recipientId, mode: 'insensitive' } },
        select: { id: true, role: true, isActive: true },
      });
    }

    if (!recipient) {
      const aliasMap: Record<string, string> = {
        'fo000': 'officer@fieldsync.com',
        'u_off': 'officer@fieldsync.com',
        'sup000': 'supervisor@fieldsync.com',
        'u_sup': 'supervisor@fieldsync.com',
        'mgr000': 'manager@fieldsync.com',
        'u_mgr': 'manager@fieldsync.com',
      };
      const email = aliasMap[recipientId?.toLowerCase()];
      if (email) {
        recipient = await prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
          select: { id: true, role: true, isActive: true },
        });
      }
    }

    if (!recipient || !recipient.isActive) {
      return null;
    }

    const resolvedRecipientId = recipient.id;

    if (isNotificationExcluded(recipient.role, type, title)) {
      return null;
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingRecent = await prisma.notification.findFirst({
      where: {
        recipientId: resolvedRecipientId,
        title,
        type,
        createdAt: { gte: fiveMinutesAgo },
      },
    });

    if (existingRecent) {
      return existingRecent;
    }

    const notification = await prisma.notification.create({
      data: {
        id: generateNotificationId(),
        recipientId: resolvedRecipientId,
        title,
        message,
        type,
        priority,
        isRead: false,
        relatedRecordId,
        actionUrl,
        metadata: metadata || undefined,
      },
    });

    return notification;
  } catch (error: any) {
    console.error('Failed to create notification:', error.message);
    return null;
  }
}

export async function notifyManagers(params: BroadcastNotificationParams) {
  try {
    const managers = await prisma.user.findMany({
      where: { role: Role.MANAGER, isActive: true },
      select: { id: true },
    });

    const results = await Promise.all(
      managers.map((m) =>
        createNotification({
          ...params,
          recipientId: m.id,
        })
      )
    );

    return results.filter(Boolean);
  } catch (error: any) {
    console.error('Failed to notify managers:', error.message);
    return [];
  }
}

export async function notifySupervisorForZone(zoneId: string, params: BroadcastNotificationParams) {
  if (!zoneId) return [];

  try {
    const supervisors = await prisma.user.findMany({
      where: {
        role: Role.SUPERVISOR,
        zoneId,
        isActive: true,
      },
      select: { id: true },
    });

    const results = await Promise.all(
      supervisors.map((s) =>
        createNotification({
          ...params,
          recipientId: s.id,
        })
      )
    );

    return results.filter(Boolean);
  } catch (error: any) {
    console.error(`Failed to notify supervisor for zone ${zoneId}:`, error.message);
    return [];
  }
}

/**
 * Dispatches a notification to an individual Field Officer.
 */
export async function notifyOfficer(officerId: string, params: BroadcastNotificationParams) {
  return createNotification({
    ...params,
    recipientId: officerId,
  });
}
