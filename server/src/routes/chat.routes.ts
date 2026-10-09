// server/src/routes/chat.routes.ts
// Persistent Chat Route for FieldSync (Permanent Manager <-> Supervisor Communication)

import { Router, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const CHAT_FILE = path.join(DATA_DIR, 'chat_messages.json');

// Ensure data directory exists
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

function normalizeId(id: string | undefined): string {
  if (!id) return '';
  const s = String(id).trim().toLowerCase();
  if (s === 'manager@fieldsync.com' || s === 'u_mgr' || s === 'manager') return 'u_mgr';
  if (s === 'supervisor@fieldsync.com' || s === 'u_sup' || s === 'supervisor') return 'u_sup';
  return s;
}

function readMessages(): StoredChatMessage[] {
  try {
    if (fs.existsSync(CHAT_FILE)) {
      const content = fs.readFileSync(CHAT_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading chat file:', err);
  }
  return [];
}

function writeMessages(messages: StoredChatMessage[]): void {
  try {
    fs.writeFileSync(CHAT_FILE, JSON.stringify(messages, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving chat file:', err);
  }
}

const router = Router();

// GET /api/chat/messages
// Retrieve conversation messages between two users or all messages for a user
router.get('/messages', (req: Request, res: Response) => {
  try {
    const { userIdA, userIdB, currentUserId } = req.query as {
      userIdA?: string;
      userIdB?: string;
      currentUserId?: string;
    };

    const all = readMessages();

    if (userIdA && userIdB) {
      const normA = normalizeId(userIdA);
      const normB = normalizeId(userIdB);

      const filtered = all.filter((m) => {
        const s = normalizeId(m.senderId);
        const r = normalizeId(m.receiverId);
        return (s === normA && r === normB) || (s === normB && r === normA);
      });

      res.json({ success: true, data: filtered });
      return;
    }

    if (currentUserId) {
      const normCurrent = normalizeId(currentUserId);
      const userMessages = all.filter((m) => {
        const s = normalizeId(m.senderId);
        const r = normalizeId(m.receiverId);
        return s === normCurrent || r === normCurrent;
      });
      res.json({ success: true, data: userMessages });
      return;
    }

    res.json({ success: true, data: all });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/chat/messages
// Store or sync a message permanently
router.post('/messages', (req: Request, res: Response) => {
  try {
    const msg: StoredChatMessage = req.body;
    if (!msg || !msg.id || !msg.senderId || !msg.receiverId) {
      res.status(400).json({ success: false, error: 'Invalid message payload' });
      return;
    }

    const all = readMessages();
    const existingIndex = all.findIndex((m) => m.id === msg.id);

    if (existingIndex >= 0) {
      all[existingIndex] = { ...all[existingIndex], ...msg };
    } else {
      all.push(msg);
    }

    writeMessages(all);
    res.json({ success: true, data: msg });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/chat/read
// Mark conversation messages as read
router.post('/read', (req: Request, res: Response) => {
  try {
    const { userIdA, userIdB, currentUserId, conversationId } = req.body;
    const all = readMessages();
    let updatedCount = 0;

    const normCurrent = normalizeId(currentUserId);
    const normOther = normalizeId(userIdA === currentUserId ? userIdB : userIdA);

    for (let i = 0; i < all.length; i++) {
      const m = all[i];
      const s = normalizeId(m.senderId);
      const r = normalizeId(m.receiverId);

      const matchesPair = normCurrent && normOther && r === normCurrent && s === normOther;
      const matchesConv = conversationId && m.conversationId === conversationId && normCurrent && r === normCurrent;

      if ((matchesPair || matchesConv) && !m.isRead) {
        m.isRead = true;
        m.status = 'read';
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      writeMessages(all);
    }

    res.json({ success: true, updatedCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/chat/reaction
// React to a message
router.post('/reaction', (req: Request, res: Response) => {
  try {
    const { messageId, emoji, userId } = req.body;
    if (!messageId || !emoji || !userId) {
      res.status(400).json({ success: false, error: 'Missing parameters' });
      return;
    }

    const normUser = normalizeId(userId);
    const all = readMessages();
    const msg = all.find((m) => m.id === messageId);

    if (!msg) {
      res.status(404).json({ success: false, error: 'Message not found' });
      return;
    }

    msg.reactions = msg.reactions || {};
    let previousEmoji: string | null = null;
    for (const [e, users] of Object.entries(msg.reactions)) {
      if (Array.isArray(users) && users.includes(normUser)) {
        previousEmoji = e;
        break;
      }
    }

    if (previousEmoji === emoji) {
      msg.reactions[emoji] = (msg.reactions[emoji] || []).filter((u) => u !== normUser);
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    } else {
      if (previousEmoji && msg.reactions[previousEmoji]) {
        msg.reactions[previousEmoji] = msg.reactions[previousEmoji].filter((u) => u !== normUser);
        if (msg.reactions[previousEmoji].length === 0) delete msg.reactions[previousEmoji];
      }
      msg.reactions[emoji] = [...(msg.reactions[emoji] || []), normUser];
    }

    writeMessages(all);
    res.json({ success: true, reactions: msg.reactions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/chat/messages
// Explicit deletion of messages by the user
router.delete('/messages', (req: Request, res: Response) => {
  try {
    const { messageIds } = req.body;
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      res.status(400).json({ success: false, error: 'messageIds array required' });
      return;
    }

    const set = new Set(messageIds);
    const all = readMessages();
    const remaining = all.filter((m) => !set.has(m.id));

    writeMessages(remaining);
    res.json({ success: true, deletedCount: all.length - remaining.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
