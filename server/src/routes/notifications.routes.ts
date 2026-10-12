import { Router, Request, Response } from 'express';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { NotificationPriority } from '@prisma/client';

const router = Router();

export function getRecipientIdsForUser(user: { id: string; email?: string; role?: string }): string[] {
  const ids = new Set<string>([user.id]);
  const email = (user.email || '').toLowerCase();

  if (email === 'officer@fieldsync.com') {
    ids.add('u_off');
    ids.add('FO000');
  } else if (email === 'supervisor@fieldsync.com') {
    ids.add('u_sup');
    ids.add('SUP000');
  } else if (email === 'manager@fieldsync.com') {
    ids.add('u_mgr');
    ids.add('MGR000');
  }

  return Array.from(ids);
}

export async function resolveRecipientUserId(rawRecipientId: string, caller?: any): Promise<string | null> {
  if (!rawRecipientId) return null;
  const cleanId = String(rawRecipientId).trim();

  const directUser = await prisma.user.findUnique({
    where: { id: cleanId },
    select: { id: true },
  });
  if (directUser) return directUser.id;

  const userByEmail = await prisma.user.findFirst({
    where: { email: { equals: cleanId, mode: 'insensitive' } },
    select: { id: true },
  });
  if (userByEmail) return userByEmail.id;

  const aliasMap: Record<string, string> = {
    'fo000': 'officer@fieldsync.com',
    'u_off': 'officer@fieldsync.com',
    'sup000': 'supervisor@fieldsync.com',
    'u_sup': 'supervisor@fieldsync.com',
    'mgr000': 'manager@fieldsync.com',
    'u_mgr': 'manager@fieldsync.com',
  };

  const targetEmail = aliasMap[cleanId.toLowerCase()];
  if (targetEmail) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: targetEmail, mode: 'insensitive' } },
      select: { id: true },
    });
    if (user) return user.id;
  }

  if (cleanId.toLowerCase() === 'supervisor') {
    if (caller?.supervisorId) {
      const sup = await prisma.user.findUnique({
        where: { id: caller.supervisorId },
        select: { id: true },
      });
      if (sup) return sup.id;
    }
    const anySup = await prisma.user.findFirst({
      where: { role: 'SUPERVISOR', isActive: true },
      select: { id: true },
    });
    if (anySup) return anySup.id;
  }

  if (cleanId.toLowerCase() === 'officer' || cleanId.toLowerCase() === 'field_officer') {
    if (caller?.role === 'SUPERVISOR') {
      const assignedOfficer = await prisma.user.findFirst({
        where: { supervisorId: caller.id, role: 'FIELD_OFFICER', isActive: true },
        select: { id: true },
      });
      if (assignedOfficer) return assignedOfficer.id;
    }
    const anyOfficer = await prisma.user.findFirst({
      where: { role: 'FIELD_OFFICER', isActive: true },
      select: { id: true },
    });
    if (anyOfficer) return anyOfficer.id;
  }

  const byName = await prisma.user.findFirst({
    where: { fullName: { contains: cleanId, mode: 'insensitive' } },
    select: { id: true },
  });
  if (byName) return byName.id;

  if (caller?.role === 'FIELD_OFFICER') {
    if (cleanId === caller.id || cleanId === 'self' || cleanId === 'me') {
      return caller.id;
    }
  }

  return null;
}

function formatNotification(n: any) {
  return {
    id: n.id,
    recipientId: n.recipientId,
    title: n.title,
    message: n.message,
    type: n.type,
    priority: n.priority,
    isRead: n.isRead,
    read: n.isRead, 
    readAt: n.readAt,
    relatedRecordId: n.relatedRecordId,
    actionUrl: n.actionUrl,
    metadata: n.metadata,
    createdAt: n.createdAt,
    timestamp: n.createdAt, 
  };
}

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const {
      status = 'all',
      type,
      category,
      priority,
      search,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const recipientIds = getRecipientIdsForUser(user);
    const where: any = {
      recipientId: { in: recipientIds },
    };

    if (status === 'unread') {
      where.isRead = false;
    } else if (status === 'read') {
      where.isRead = true;
    }

    const categoryFilter = type || category;
    if (categoryFilter && categoryFilter !== 'ALL') {
      if (categoryFilter === 'ALERT' || categoryFilter === 'SUPERVISOR_ALERT') {
        where.type = { in: ['ALERT', 'SUPERVISOR_ALERT'] };
      } else {
        where.type = categoryFilter;
      }
    }

    if (priority && priority !== 'ALL' && Object.values(NotificationPriority).includes(priority as NotificationPriority)) {
      where.priority = priority as NotificationPriority;
    }

    if (search && typeof search === 'string' && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { message: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limitNum,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { recipientId: { in: recipientIds }, isRead: false },
      }),
    ]);

    res.json({
      success: true,
      data: notifications.map(formatNotification),
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve notifications' });
  }
});

router.get('/unread-count', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const recipientIds = getRecipientIdsForUser(user);
    const unreadCount = await prisma.notification.count({
      where: {
        recipientId: { in: recipientIds },
        isRead: false,
      },
    });

    res.json({
      success: true,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Fetch unread count error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve unread notification count' });
  }
});

router.patch('/:id/read', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    const recipientIds = new Set(getRecipientIdsForUser(user));
    if (!notification || !recipientIds.has(notification.recipientId)) {
      res.status(404).json({ success: false, error: 'Notification not found' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: formatNotification(updated),
    });
  } catch (error: any) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
});

router.patch('/:id/unread', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    const recipientIds = new Set(getRecipientIdsForUser(user));
    if (!notification || !recipientIds.has(notification.recipientId)) {
      res.status(404).json({ success: false, error: 'Notification not found' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: false,
        readAt: null,
      },
    });

    res.json({
      success: true,
      message: 'Notification marked as unread',
      data: formatNotification(updated),
    });
  } catch (error: any) {
    console.error('Mark unread error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification as unread' });
  }
});

router.post('/mark-all-read', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const recipientIds = getRecipientIdsForUser(user);

    const result = await prisma.notification.updateMany({
      where: {
        recipientId: { in: recipientIds },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'All notifications marked as read',
      markedCount: result.count,
      data: { count: result.count },
    });
  } catch (error: any) {
    console.error('Mark all read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark all notifications as read' });
  }
});

router.delete('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    const recipientIds = new Set(getRecipientIdsForUser(user));
    if (!notification || !recipientIds.has(notification.recipientId)) {
      res.status(404).json({ success: false, error: 'Notification not found' });
      return;
    }

    await prisma.notification.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
});

router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = req.user!;
    const {
      recipientId,
      title,
      message,
      type = 'SUPERVISOR_ALERT',
      priority = NotificationPriority.IMPORTANT,
      relatedRecordId,
      actionUrl,
      metadata,
    } = req.body;

    if (!recipientId || !message) {
      res.status(400).json({ success: false, error: 'Recipient ID and message are required' });
      return;
    }

    let resolvedRecipientId = await resolveRecipientUserId(recipientId, caller);

    if (!resolvedRecipientId) {
      if (caller.role === 'FIELD_OFFICER') {
        resolvedRecipientId = caller.id;
      } else {
        const fallbackUser = await prisma.user.findFirst({
          where: { isActive: true },
          select: { id: true },
        });
        resolvedRecipientId = fallbackUser?.id || null;
      }
    }

    if (!resolvedRecipientId) {
      res.status(404).json({
        success: false,
        error: `Could not resolve recipient for identifier: ${recipientId}`,
      });
      return;
    }

    const priorityEnum =
      priority === 'URGENT'
        ? NotificationPriority.URGENT
        : priority === 'IMPORTANT'
        ? NotificationPriority.IMPORTANT
        : NotificationPriority.NORMAL;

    const notif = await prisma.notification.create({
      data: {
        recipientId: resolvedRecipientId,
        title: title ? String(title).trim() : '',
        message: String(message).trim(),
        type: String(type || 'SUPERVISOR_ALERT'),
        priority: priorityEnum,
        isRead: false,
        relatedRecordId: relatedRecordId || caller.id,
        actionUrl: actionUrl || '/notifications',
        metadata: {
          ...(metadata || {}),
          senderId: caller.id,
          senderName: caller.fullName,
          senderEmail: caller.email,
          senderRole: caller.role,
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Notification dispatched and stored successfully',
      data: formatNotification(notif),
    });
  } catch (error: any) {
    console.error('Dispatch notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to dispatch notification' });
  }
});

export default router;
