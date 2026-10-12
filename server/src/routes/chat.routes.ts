import { Router, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const CHAT_FILE = path.join(DATA_DIR, 'chat_messages.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (_e) {}
}

export interface StoredChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  receiverId: string;
  receiverName?: string;
  conversationId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  attachment?: {
    name: string;
    type: string;
    size?: string;
    url?: string;
    dataUrl?: string;
  };
  reactions?: Record<string, string[]>;
}

export function normalizeId(id: string | undefined | null): string {
  if (!id) return '';
  const s = String(id).trim();
  const lower = s.toLowerCase();
  if (lower === 'manager@fieldsync.com' || s === 'u_mgr' || lower === 'manager' || s === 'MGR000') {
    return 'u_mgr';
  }
  if (lower === 'supervisor@fieldsync.com' || s === 'u_sup' || lower === 'supervisor') {
    return 'u_sup';
  }
  return s;
}

export function getConversationId(userIdA: string, userIdB: string): string {
  return [normalizeId(userIdA), normalizeId(userIdB)].sort().join('__');
}

// Fallback disk helpers
function readFallbackFile(): StoredChatMessage[] {
  try {
    if (fs.existsSync(CHAT_FILE)) {
      const content = fs.readFileSync(CHAT_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading chat fallback file:', err);
  }
  return [];
}

function writeFallbackFile(messages: StoredChatMessage[]): void {
  try {
    fs.writeFileSync(CHAT_FILE, JSON.stringify(messages, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving chat fallback file:', err);
  }
}

// Format DB record to StoredChatMessage
function formatDbMessage(m: any): StoredChatMessage {
  return {
    id: m.id,
    senderId: m.senderId,
    senderName: m.senderName,
    senderRole: m.senderRole || undefined,
    receiverId: m.receiverId,
    receiverName: m.receiverName || undefined,
    conversationId: m.conversationId,
    text: m.text,
    timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
    isRead: Boolean(m.isRead),
    status: (m.status as any) || 'delivered',
    replyTo: m.replyTo ? (m.replyTo as any) : undefined,
    attachment: m.attachment ? (m.attachment as any) : undefined,
    reactions: m.reactions ? (m.reactions as any) : undefined,
  };
}

// Startup migration: Sync existing disk messages into PostgreSQL database
async function migrateDiskMessagesToDb(): Promise<void> {
  try {
    const disk = readFallbackFile();
    if (disk.length === 0) return;

    for (const msg of disk) {
      const normSender = normalizeId(msg.senderId);
      const normReceiver = normalizeId(msg.receiverId);
      const convId = msg.conversationId || getConversationId(normSender, normReceiver);

      await prisma.chatMessage.upsert({
        where: { id: msg.id },
        create: {
          id: msg.id,
          senderId: normSender,
          senderName: msg.senderName,
          senderRole: msg.senderRole,
          receiverId: normReceiver,
          receiverName: msg.receiverName,
          conversationId: convId,
          text: msg.text,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          isRead: Boolean(msg.isRead),
          status: msg.status || 'delivered',
          replyTo: msg.replyTo ? (msg.replyTo as any) : undefined,
          attachment: msg.attachment ? (msg.attachment as any) : undefined,
          reactions: msg.reactions ? (msg.reactions as any) : undefined,
        },
        update: {
          text: msg.text,
          isRead: Boolean(msg.isRead),
          status: msg.status || 'delivered',
          replyTo: msg.replyTo ? (msg.replyTo as any) : undefined,
          attachment: msg.attachment ? (msg.attachment as any) : undefined,
          reactions: msg.reactions ? (msg.reactions as any) : undefined,
        },
      });
    }
    console.log(`[Chat] Synchronized ${disk.length} messages into PostgreSQL.`);
  } catch (err: any) {
    console.warn('[Chat] Startup migration warning:', err.message);
  }
}

migrateDiskMessagesToDb().catch(() => {});

const router = Router();

/**
 * GET /api/chat/messages
 * Retrieves conversation messages from PostgreSQL database with disk fallback
 */
router.get('/messages', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userIdA, userIdB, currentUserId } = req.query as {
      userIdA?: string;
      userIdB?: string;
      currentUserId?: string;
    };

    if (userIdA && userIdB) {
      const normA = normalizeId(userIdA);
      const normB = normalizeId(userIdB);
      const convId = getConversationId(normA, normB);

      try {
        const dbMsgs = await prisma.chatMessage.findMany({
          where: {
            OR: [
              { conversationId: convId },
              { senderId: normA, receiverId: normB },
              { senderId: normB, receiverId: normA },
              { senderId: userIdA, receiverId: userIdB },
              { senderId: userIdB, receiverId: userIdA },
            ],
          },
          orderBy: { timestamp: 'asc' },
        });

        res.json({ success: true, data: dbMsgs.map(formatDbMessage) });
        return;
      } catch (dbErr: any) {
        console.warn('[Chat] DB fetch error, falling back to disk:', dbErr.message);
        const all = readFallbackFile();
        const filtered = all.filter((m) => {
          const s = normalizeId(m.senderId);
          const r = normalizeId(m.receiverId);
          return (s === normA && r === normB) || (s === normB && r === normA);
        });
        res.json({ success: true, data: filtered });
        return;
      }
    }

    if (currentUserId) {
      const normCurrent = normalizeId(currentUserId);
      try {
        const dbMsgs = await prisma.chatMessage.findMany({
          where: {
            OR: [
              { senderId: normCurrent },
              { receiverId: normCurrent },
              { senderId: currentUserId },
              { receiverId: currentUserId },
            ],
          },
          orderBy: { timestamp: 'asc' },
        });

        res.json({ success: true, data: dbMsgs.map(formatDbMessage) });
        return;
      } catch (dbErr: any) {
        console.warn('[Chat] DB fetch error, falling back to disk:', dbErr.message);
        const all = readFallbackFile();
        const userMessages = all.filter((m) => {
          const s = normalizeId(m.senderId);
          const r = normalizeId(m.receiverId);
          return s === normCurrent || r === normCurrent;
        });
        res.json({ success: true, data: userMessages });
        return;
      }
    }

    try {
      const allDb = await prisma.chatMessage.findMany({
        orderBy: { timestamp: 'asc' },
      });
      res.json({ success: true, data: allDb.map(formatDbMessage) });
    } catch (_dbErr) {
      const all = readFallbackFile();
      res.json({ success: true, data: all });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/chat/messages
 * Stores new chat message permanently into PostgreSQL database
 */
router.post('/messages', async (req: Request, res: Response): Promise<void> => {
  try {
    const msg: StoredChatMessage = req.body;
    if (!msg || !msg.id || !msg.senderId || !msg.receiverId) {
      res.status(400).json({ success: false, error: 'Invalid message payload' });
      return;
    }

    const normSender = normalizeId(msg.senderId);
    const normReceiver = normalizeId(msg.receiverId);
    const convId = msg.conversationId || getConversationId(normSender, normReceiver);

    const formattedDate = msg.timestamp ? new Date(msg.timestamp) : new Date();

    // 1. Store permanently in PostgreSQL database
    try {
      await prisma.chatMessage.upsert({
        where: { id: msg.id },
        create: {
          id: msg.id,
          senderId: normSender,
          senderName: msg.senderName,
          senderRole: msg.senderRole,
          receiverId: normReceiver,
          receiverName: msg.receiverName,
          conversationId: convId,
          text: msg.text,
          timestamp: formattedDate,
          isRead: Boolean(msg.isRead),
          status: msg.status || 'delivered',
          replyTo: msg.replyTo ? (msg.replyTo as any) : undefined,
          attachment: msg.attachment ? (msg.attachment as any) : undefined,
          reactions: msg.reactions ? (msg.reactions as any) : undefined,
        },
        update: {
          text: msg.text,
          isRead: Boolean(msg.isRead),
          status: msg.status || 'delivered',
          replyTo: msg.replyTo ? (msg.replyTo as any) : undefined,
          attachment: msg.attachment ? (msg.attachment as any) : undefined,
          reactions: msg.reactions ? (msg.reactions as any) : undefined,
        },
      });
    } catch (dbErr: any) {
      console.error('[Chat] DB save error:', dbErr.message);
    }

    // 2. Backup to disk JSON
    try {
      const all = readFallbackFile();
      const existingIndex = all.findIndex((m) => m.id === msg.id);
      if (existingIndex >= 0) {
        all[existingIndex] = { ...all[existingIndex], ...msg, senderId: normSender, receiverId: normReceiver, conversationId: convId };
      } else {
        all.push({ ...msg, senderId: normSender, receiverId: normReceiver, conversationId: convId });
      }
      writeFallbackFile(all);
    } catch (_fileErr) {}

    res.json({ success: true, data: msg });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/chat/read
 * Marks messages as read in PostgreSQL database
 */
router.post('/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userIdA, userIdB, currentUserId, conversationId } = req.body;
    const normCurrent = normalizeId(currentUserId);
    const normOther = normalizeId(userIdA === currentUserId ? userIdB : userIdA);
    const convId = conversationId || (normCurrent && normOther ? getConversationId(normCurrent, normOther) : undefined);

    let updatedCount = 0;

    try {
      const receiverIds = [normCurrent, currentUserId].filter(Boolean) as string[];
      const senderIds = [normOther, userIdA, userIdB].filter(Boolean) as string[];

      const result = await prisma.chatMessage.updateMany({
        where: {
          receiverId: { in: receiverIds },
          isRead: false,
          ...(convId
            ? {
                OR: [
                  { conversationId: convId },
                  { senderId: { in: senderIds } },
                ],
              }
            : {
                senderId: { in: senderIds },
              }),
        },
        data: {
          isRead: true,
          status: 'read',
        },
      });
      updatedCount = result.count;
    } catch (dbErr: any) {
      console.warn('[Chat] DB mark read error:', dbErr.message);
    }

    // Also update disk fallback
    try {
      const all = readFallbackFile();
      let diskUpdated = 0;
      for (const m of all) {
        const s = normalizeId(m.senderId);
        const r = normalizeId(m.receiverId);
        const matchesPair = normCurrent && normOther && r === normCurrent && s === normOther;
        const matchesConv = convId && m.conversationId === convId && normCurrent && r === normCurrent;

        if ((matchesPair || matchesConv) && !m.isRead) {
          m.isRead = true;
          m.status = 'read';
          diskUpdated++;
        }
      }
      if (diskUpdated > 0) {
        writeFallbackFile(all);
        if (updatedCount === 0) updatedCount = diskUpdated;
      }
    } catch (_fileErr) {}

    res.json({ success: true, updatedCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/chat/reaction
 * Updates emoji reaction in PostgreSQL database
 */
router.post('/reaction', async (req: Request, res: Response): Promise<void> => {
  try {
    const { messageId, emoji, userId } = req.body;
    if (!messageId || !emoji || !userId) {
      res.status(400).json({ success: false, error: 'Missing parameters' });
      return;
    }

    const normUser = normalizeId(userId);

    // Fetch existing message from DB
    let reactions: Record<string, string[]> = {};
    try {
      const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
      if (msg && msg.reactions) {
        reactions = { ...(msg.reactions as any) };
      }
    } catch (_dbErr) {
      const all = readFallbackFile();
      const msg = all.find((m) => m.id === messageId);
      if (msg && msg.reactions) {
        reactions = { ...msg.reactions };
      }
    }

    let previousEmoji: string | null = null;
    for (const [e, users] of Object.entries(reactions)) {
      if (Array.isArray(users) && users.includes(normUser)) {
        previousEmoji = e;
        break;
      }
    }

    if (previousEmoji === emoji) {
      reactions[emoji] = (reactions[emoji] || []).filter((u) => u !== normUser);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      if (previousEmoji && reactions[previousEmoji]) {
        reactions[previousEmoji] = reactions[previousEmoji].filter((u) => u !== normUser);
        if (reactions[previousEmoji].length === 0) delete reactions[previousEmoji];
      }
      reactions[emoji] = [...(reactions[emoji] || []), normUser];
    }

    // Update in DB
    try {
      await prisma.chatMessage.update({
        where: { id: messageId },
        data: { reactions: reactions as any },
      });
    } catch (dbErr: any) {
      console.warn('[Chat] DB update reaction error:', dbErr.message);
    }

    // Update fallback file
    try {
      const all = readFallbackFile();
      const m = all.find((x) => x.id === messageId);
      if (m) {
        m.reactions = reactions;
        writeFallbackFile(all);
      }
    } catch (_fileErr) {}

    res.json({ success: true, reactions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/chat/messages
 * Deletes selected messages from PostgreSQL database and disk
 */
router.delete('/messages', async (req: Request, res: Response): Promise<void> => {
  try {
    const { messageIds } = req.body;
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      res.status(400).json({ success: false, error: 'messageIds array required' });
      return;
    }

    let deletedCount = 0;
    try {
      const result = await prisma.chatMessage.deleteMany({
        where: { id: { in: messageIds } },
      });
      deletedCount = result.count;
    } catch (dbErr: any) {
      console.warn('[Chat] DB delete error:', dbErr.message);
    }

    try {
      const set = new Set(messageIds);
      const all = readFallbackFile();
      const remaining = all.filter((m) => !set.has(m.id));
      writeFallbackFile(remaining);
      if (deletedCount === 0) deletedCount = all.length - remaining.length;
    } catch (_fileErr) {}

    res.json({ success: true, deletedCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
