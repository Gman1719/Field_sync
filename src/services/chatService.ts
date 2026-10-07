// src/services/chatService.ts
// Offline-first enterprise chat service for Manager <-> Supervisor communication (Strict TypeScript)

import { offlineDb } from '../db/offlineDb';
import type { ChatMessage } from '../types/index';
import { SAMPLE_USERS } from '../utils/constants';
import { checkRealInternet } from './database';
import { generateMessageId } from '../utils/idGenerator';

const CHAT_CHANNEL_NAME = 'fieldsync_chat_channel';
let broadcastChannel: BroadcastChannel | null = null;

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHAT_CHANNEL_NAME);
    // Real-time cross-tab receiver: forwards incoming broadcast messages to local window events
    broadcastChannel.onmessage = (event) => {
      if (typeof window !== 'undefined' && event?.data) {
        if (event.data.type === 'NEW_MESSAGE') {
          window.dispatchEvent(new CustomEvent('fieldsync-chat-update', { detail: { message: event.data.message } }));
        } else if (event.data.type === 'READ_UPDATE') {
          window.dispatchEvent(new CustomEvent('fieldsync-chat-read', { detail: { conversationId: event.data.conversationId } }));
        } else if (event.data.type === 'STATUS_UPDATE') {
          window.dispatchEvent(new CustomEvent('fieldsync-chat-update', { detail: event.data }));
        } else if (event.data.type === 'REACTION_UPDATE') {
          window.dispatchEvent(new CustomEvent('fieldsync-chat-reaction', { detail: event.data }));
        } else if (event.data.type === 'DELETE_MESSAGES') {
          window.dispatchEvent(new CustomEvent('fieldsync-chat-update', { detail: { deletedIds: event.data.messageIds } }));
        }
      }
    };
  }
} catch {
  // BroadcastChannel unavailable in this environment
}

// Canonical User ID Normalizer: Harmonizes API IDs, DB IDs (m1 / s1), and demo emails/roles
export function normalizeUserId(id?: string | null): string {
  if (!id) return '';
  const s = String(id).trim();
  const lower = s.toLowerCase();
  if (
    s === 'u_mgr' ||
    s === 'u_demo_mgr' ||
    s === 'MGR000' ||
    s === 'MGR001' ||
    lower === 'abebe@fieldsync.com' ||
    lower === 'manager@fieldsync.com'
  ) {
    return 'u_mgr';
  }
  if (
    s === 'u_sup' ||
    lower === 'supervisor@fieldsync.com'
  ) {
    return 'u_sup';
  }
  return s;
}

export function getConversationId(userIdA: string, userIdB: string): string {
  return [normalizeUserId(userIdA), normalizeUserId(userIdB)].sort().join('__');
}

// Real internet connectivity state tracking
let _lastOnlineVerified = typeof navigator !== 'undefined' ? navigator.onLine : true;
let _lastCheckTimestamp = 0;

/**
 * Actively probes real internet connectivity (not just local network interface).
 * Essential for localhost testing and real offline detection.
 */
export async function verifyChatOnline(force = false): Promise<boolean> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return true;

  if (!navigator.onLine) {
    _lastOnlineVerified = false;
    return false;
  }

  if (
    localStorage.getItem('fieldsync_simulated_offline') === 'true' ||
    localStorage.getItem('fieldsync_offline_toggle') === 'true' ||
    sessionStorage.getItem('fieldsync_offline') === 'true'
  ) {
    _lastOnlineVerified = false;
    return false;
  }

  const now = Date.now();
  if (!force && now - _lastCheckTimestamp < 2000) {
    return _lastOnlineVerified;
  }

  _lastCheckTimestamp = now;

  try {
    const isOnline = await checkRealInternet();
    _lastOnlineVerified = Boolean(isOnline);
    return _lastOnlineVerified;
  } catch {
    _lastOnlineVerified = false;
    return false;
  }
}

/**
 * Synchronous network status check leveraging actively verified state.
 */
export function isChatOnline(): boolean {
  if (typeof window !== 'undefined') {
    if (!navigator.onLine) return false;
    if (localStorage.getItem('fieldsync_simulated_offline') === 'true') return false;
    if (localStorage.getItem('fieldsync_offline_toggle') === 'true') return false;
    if (sessionStorage.getItem('fieldsync_offline') === 'true') return false;
    return _lastOnlineVerified;
  }
  return typeof navigator !== 'undefined' ? Boolean(navigator.onLine) : true;
}

// Global window event listeners and background connectivity polling
if (typeof window !== 'undefined') {
  // Initial active probe
  verifyChatOnline(true).catch(() => {});

  // Periodic active polling every 2.5s
  setInterval(() => {
    verifyChatOnline().catch(() => {});
  }, 2500);

  window.addEventListener('online', async () => {
    const online = await verifyChatOnline(true);
    if (online) {
      deliverPendingChatMessages().catch(() => {});
    }
  });

  window.addEventListener('offline', () => {
    _lastOnlineVerified = false;
  });
}

export async function getConversationMessages(
  userIdA: string,
  userIdB: string,
  viewerId?: string
): Promise<ChatMessage[]> {
  const normA = normalizeUserId(userIdA);
  const normB = normalizeUserId(userIdB);
  const normViewer = viewerId ? normalizeUserId(viewerId) : '';
  const convId = getConversationId(normA, normB);

  await seedInitialChatIfEmpty();

  // Robust bidirectional lookup: matches conversationId or direct normalized sender-receiver pairings
  const all = await offlineDb.chatMessages.toArray();
  const msgs = all
    .filter((m) => {
      const s = normalizeUserId(m.senderId);
      const r = normalizeUserId(m.receiverId);
      const isInConv = m.conversationId === convId || (s === normA && r === normB) || (s === normB && r === normA);
      if (!isInConv) return false;

      // Messages with status 'sending' (offline pending) are ONLY visible to the sender who drafted them,
      // and NEVER delivered or visible to the receiver until real internet connection is restored!
      if (m.status === 'sending') {
        if (!normViewer || s !== normViewer) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return msgs;
}

export async function sendMessage(params: {
  senderId: string;
  senderName: string;
  senderRole: 'manager' | 'supervisor';
  receiverId: string;
  receiverName: string;
  text: string;
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
}): Promise<ChatMessage> {
  const normSenderId = normalizeUserId(params.senderId);
  const normReceiverId = normalizeUserId(params.receiverId);
  const convId = getConversationId(normSenderId, normReceiverId);

  // CRITICAL: Actively verify real internet connectivity before deciding delivery status
  const online = await verifyChatOnline(true);

  const newMsg: ChatMessage = {
    id: generateMessageId(),
    senderId: normSenderId,
    senderName: params.senderName,
    senderRole: params.senderRole,
    receiverId: normReceiverId,
    conversationId: convId,
    text: params.text.trim(),
    timestamp: new Date().toISOString(),
    isRead: false,
    status: online ? 'delivered' : 'sending', // Offline messages are held in 'sending' state
    replyTo: params.replyTo,
    attachment: params.attachment,
    reactions: {},
  };

  await offlineDb.chatMessages.put(newMsg);

  // Dispatch local window event for the sender's UI so they see the queued message with clock icon
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fieldsync-chat-update', { detail: { message: newMsg } }));

    // ONLY broadcast/deliver to receiver across tabs/network if actually online!
    if (online) {
      if (broadcastChannel) {
        try {
          broadcastChannel.postMessage({ type: 'NEW_MESSAGE', message: newMsg });
        } catch (_e) {}
      }

      // Universal multi-window/multi-tab sync trigger
      try {
        localStorage.setItem('fieldsync_chat_sync', JSON.stringify({ id: newMsg.id, timestamp: Date.now() }));
      } catch (_e) {}
    }
  }

  return newMsg;
}

// Delivers all pending/queued messages when back online with real internet
export async function deliverPendingChatMessages(currentUserId?: string): Promise<number> {
  const online = await verifyChatOnline(true);
  if (!online) return 0;

  const all = await offlineDb.chatMessages.toArray();
  const normCurrent = currentUserId ? normalizeUserId(currentUserId) : '';

  const pending = all.filter((m) => {
    if (m.status !== 'sending') return false;
    if (normCurrent) return normalizeUserId(m.senderId) === normCurrent;
    return true;
  });

  if (pending.length === 0) return 0;

  for (const msg of pending) {
    const updated: ChatMessage = {
      ...msg,
      status: 'delivered',
    };
    await offlineDb.chatMessages.put(updated);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fieldsync-chat-update', { detail: { message: updated } }));
      if (broadcastChannel) {
        try {
          broadcastChannel.postMessage({ type: 'NEW_MESSAGE', message: updated });
        } catch (_e) {}
      }
      try {
        localStorage.setItem('fieldsync_chat_sync', JSON.stringify({ id: updated.id, timestamp: Date.now() }));
      } catch (_e) {}
    }
  }

  return pending.length;
}

export async function markConversationAsRead(userIdA: string, userIdB: string, currentUserId: string): Promise<void> {
  const normCurrentUserId = normalizeUserId(currentUserId);
  const normOtherUserId = normalizeUserId(userIdA === currentUserId ? userIdB : userIdA);
  const convId = getConversationId(normCurrentUserId, normOtherUserId);

  // Only messages where current user is the recipient are marked as read
  const all = await offlineDb.chatMessages.toArray();
  const unread = all.filter((m) => {
    const s = normalizeUserId(m.senderId);
    const r = normalizeUserId(m.receiverId);
    return r === normCurrentUserId && s === normOtherUserId && !m.isRead && m.status !== 'sending';
  });

  if (unread.length > 0) {
    for (const msg of unread) {
      await offlineDb.chatMessages.update(msg.id, {
        isRead: true,
        status: 'read',
      });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fieldsync-chat-read', { detail: { conversationId: convId } }));
      if (broadcastChannel) {
        try {
          broadcastChannel.postMessage({ type: 'READ_UPDATE', conversationId: convId });
        } catch (_e) {}
      }
      try {
        localStorage.setItem('fieldsync_chat_sync', JSON.stringify({ readConv: convId, timestamp: Date.now() }));
      } catch (_e) {}
    }
  }
}

export async function addMessageReaction(messageId: string, emoji: string, userId: string): Promise<void> {
  const msg = await offlineDb.chatMessages.get(messageId);
  if (!msg) return;

  const normUserId = normalizeUserId(userId);
  const currentReactions: Record<string, string[]> = { ...(msg.reactions || {}) };

  // Check if this user already reacted with any emoji on this message
  let previousEmoji: string | null = null;
  for (const [e, users] of Object.entries(currentReactions)) {
    if (Array.isArray(users) && users.includes(normUserId)) {
      previousEmoji = e;
      break;
    }
  }

  if (previousEmoji === emoji) {
    // User clicked the same emoji again -> remove reaction (toggle off)
    const filtered = (currentReactions[emoji] || []).filter((u) => u !== normUserId);
    if (filtered.length > 0) {
      currentReactions[emoji] = filtered;
    } else {
      delete currentReactions[emoji];
    }
  } else {
    // If user previously reacted with a different emoji, remove their previous reaction
    if (previousEmoji && currentReactions[previousEmoji]) {
      const prevFiltered = currentReactions[previousEmoji].filter((u) => u !== normUserId);
      if (prevFiltered.length > 0) {
        currentReactions[previousEmoji] = prevFiltered;
      } else {
        delete currentReactions[previousEmoji];
      }
    }
    // Add user to the new emoji (enforces only one emoji per user per message)
    const currentList = currentReactions[emoji] || [];
    currentReactions[emoji] = [...currentList, normUserId];
  }

  await offlineDb.chatMessages.update(messageId, {
    reactions: currentReactions,
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fieldsync-chat-reaction', { detail: { messageId, reactions: currentReactions } }));
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: 'REACTION_UPDATE', messageId, reactions: currentReactions });
      } catch (_e) {}
    }
    try {
      localStorage.setItem('fieldsync_chat_sync', JSON.stringify({ reactionMsg: messageId, timestamp: Date.now() }));
    } catch (_e) {}
  }
}

export async function deleteMessages(messageIds: string[]): Promise<void> {
  if (!messageIds || messageIds.length === 0) return;
  await offlineDb.chatMessages.bulkDelete(messageIds);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fieldsync-chat-update', { detail: { deletedIds: messageIds } }));
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: 'DELETE_MESSAGES', messageIds });
      } catch (_e) {}
    }
    try {
      localStorage.setItem('fieldsync_chat_sync', JSON.stringify({ deleted: messageIds, timestamp: Date.now() }));
    } catch (_e) {}
  }
}

export async function getTotalUnreadCount(currentUserId: string): Promise<number> {
  try {
    const normUserId = normalizeUserId(currentUserId);
    return await offlineDb.chatMessages
      .filter((m) => normalizeUserId(m.receiverId) === normUserId && !m.isRead && m.status !== 'sending')
      .count();
  } catch {
    return 0;
  }
}

// Seed realistic field operational dialogue on initialization
export async function seedInitialChatIfEmpty(): Promise<void> {
  const count = await offlineDb.chatMessages.count();

  // Normalize legacy placeholder ids (u_mgr / u_sup) and reset existing seed messages
  if (count > 0) {
    const allMsgs = await offlineDb.chatMessages.toArray();
    for (const msg of allMsgs) {
      let changed = false;
      const sId = normalizeUserId(msg.senderId);
      const rId = normalizeUserId(msg.receiverId);

      if (msg.senderId !== sId || msg.receiverId !== rId) {
        changed = true;
      }

      if (changed) {
        await offlineDb.chatMessages.update(msg.id, {
          senderId: sId,
          receiverId: rId,
          conversationId: getConversationId(sId, rId),
        });
      }
    }

    const mgrSupCount = await offlineDb.chatMessages.where('conversationId').equals('u_mgr__u_sup').count();
    if (mgrSupCount > 0) return;
  }

  const manager = SAMPLE_USERS.find((u) => u.id === 'u_mgr' || u.role === 'manager') || {
    id: 'u_mgr',
    name: 'System Manager',
    role: 'manager' as const,
  };

  const supervisor = SAMPLE_USERS.find((u) => u.id === 'u_sup' || u.role === 'supervisor') || {
    id: 'u_sup',
    name: 'alemu kebede ayele',
    role: 'supervisor' as const,
  };

  const now = Date.now();
  const convId = getConversationId(manager.id, supervisor.id);

  const seedMessages: ChatMessage[] = [
    {
      id: 'seed_msg_1',
      senderId: supervisor.id,
      senderName: supervisor.name,
      senderRole: 'supervisor',
      receiverId: manager.id,
      conversationId: convId,
      text: 'Good morning Manager. We have deployed biometric intake kits to Bole Woreda 01. Citizen turnout is strong today.',
      timestamp: new Date(now - 1000 * 60 * 120).toISOString(),
      isRead: false,
      status: 'delivered',
    },
    {
      id: 'seed_msg_2',
      senderId: manager.id,
      senderName: manager.name,
      senderRole: 'manager',
      receiverId: supervisor.id,
      conversationId: convId,
      text: 'Well done Alemu. Please ensure all field officers monitor tablet battery levels and submit their daily work reports before 6:00 PM.',
      timestamp: new Date(now - 1000 * 60 * 90).toISOString(),
      isRead: false,
      status: 'delivered',
      reactions: { '👍': [supervisor.id] },
    },
    {
      id: 'seed_msg_3',
      senderId: supervisor.id,
      senderName: supervisor.name,
      senderRole: 'supervisor',
      receiverId: manager.id,
      conversationId: convId,
      text: 'Understood. Road access to Bole Woreda 01 registration center is clear. All officers are synchronized.',
      timestamp: new Date(now - 1000 * 60 * 25).toISOString(),
      isRead: false,
      status: 'delivered',
    },
  ];

  await offlineDb.chatMessages.bulkPut(seedMessages);
}
