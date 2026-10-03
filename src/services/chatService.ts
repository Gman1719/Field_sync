// src/services/chatService.ts
// Offline-first enterprise chat service for Manager <-> Supervisor communication (Strict TypeScript)

import { offlineDb } from '../db/offlineDb';
import type { ChatMessage } from '../types/index';
import { SAMPLE_USERS } from '../utils/constants';

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

// Canonical User ID Normalizer: Harmonizes API IDs (u_demo_mgr / u_demo_sup), DB IDs (m1 / s1), and demo IDs (u_mgr / u_sup)
export function normalizeUserId(id?: string | null): string {
  if (!id) return '';
  const s = String(id).trim();
  if (s === 'u_mgr' || s === 'u_demo_mgr' || s === 'MGR000' || s === 'MGR001') return 'm1';
  if (s === 'u_sup' || s === 'u_demo_sup' || s === 'SUP000' || s === 'SUP001') return 's1';
  return s;
}

export function getConversationId(userIdA: string, userIdB: string): string {
  return [normalizeUserId(userIdA), normalizeUserId(userIdB)].sort().join('__');
}

export function isChatOnline(): boolean {
  if (typeof window !== 'undefined') {
    if (!navigator.onLine) return false;
    if (localStorage.getItem('fieldsync_simulated_offline') === 'true') return false;
    if (localStorage.getItem('fieldsync_offline_toggle') === 'true') return false;
    if (sessionStorage.getItem('fieldsync_offline') === 'true') return false;
  }
  return typeof navigator !== 'undefined' ? Boolean(navigator.onLine) : true;
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
      // and NOT delivered to the receiver until connection is restored!
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
  const online = isChatOnline();

  const newMsg: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
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

  // Dispatch local window event for the sender's UI
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fieldsync-chat-update', { detail: { message: newMsg } }));

    // ONLY broadcast/deliver to receiver if online!
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

// Delivers all pending/queued messages when back online
export async function deliverPendingChatMessages(currentUserId?: string): Promise<number> {
  if (!isChatOnline()) return 0;

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

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    deliverPendingChatMessages().catch(() => {});
  });
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
    return r === normCurrentUserId && s === normOtherUserId && !m.isRead;
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
      .filter((m) => normalizeUserId(m.receiverId) === normUserId && !m.isRead)
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

    const m1s1Count = await offlineDb.chatMessages.where('conversationId').equals('m1__s1').count();
    if (m1s1Count > 0) return;
  }

  const manager = SAMPLE_USERS.find((u) => u.id === 'm1' || u.email === 'abebe@fieldsync.com') || {
    id: 'm1',
    name: 'አበበ በቀለ',
    role: 'manager' as const,
  };

  const supervisorNorth = SAMPLE_USERS.find((u) => u.id === 's1' || u.email === 'birhan@fieldsync.com') || {
    id: 's1',
    name: 'ብርሃን ገብረእግዚአብሔር',
    role: 'supervisor' as const,
  };

  const supervisorSouth = SAMPLE_USERS.find((u) => u.id === 's2') || {
    id: 's2',
    name: 'ሣህለ ሙሉጌታ',
    role: 'supervisor' as const,
  };

  const now = Date.now();
  const convIdNorth = getConversationId(manager.id, supervisorNorth.id);
  const convIdSouth = getConversationId(manager.id, supervisorSouth.id);

  const seedMessages: ChatMessage[] = [
    // Thread with Supervisor North (s1)
    {
      id: 'seed_msg_1',
      senderId: supervisorNorth.id,
      senderName: supervisorNorth.name,
      senderRole: 'supervisor',
      receiverId: manager.id,
      conversationId: convIdNorth,
      text: 'Good morning Manager Abebe. We have deployed all 4 biometric intake kits to Bole Woreda 01. Citizen turnout is very strong today.',
      timestamp: new Date(now - 1000 * 60 * 120).toISOString(),
      isRead: false,
      status: 'delivered',
    },
    {
      id: 'seed_msg_2',
      senderId: manager.id,
      senderName: manager.name,
      senderRole: 'manager',
      receiverId: supervisorNorth.id,
      conversationId: convIdNorth,
      text: 'Well done Birhan. Please ensure all field officers monitor tablet battery levels and submit their daily work reports before 6:00 PM.',
      timestamp: new Date(now - 1000 * 60 * 90).toISOString(),
      isRead: false,
      status: 'delivered',
      reactions: { '👍': [supervisorNorth.id] },
    },
    {
      id: 'seed_msg_3',
      senderId: supervisorNorth.id,
      senderName: supervisorNorth.name,
      senderRole: 'supervisor',
      receiverId: manager.id,
      conversationId: convIdNorth,
      text: 'Understood. Road access to Kebele 04 field site is clear now after the morning rain. All officers are synchronized.',
      timestamp: new Date(now - 1000 * 60 * 25).toISOString(),
      isRead: false,
      status: 'delivered',
    },

    // Thread with Supervisor South (s2)
    {
      id: 'seed_msg_4',
      senderId: supervisorSouth.id,
      senderName: supervisorSouth.name,
      senderRole: 'supervisor',
      receiverId: manager.id,
      conversationId: convIdSouth,
      text: 'Manager Abebe, Sidama Zone registration team has completed morning quota early. Requesting backup battery packs for afternoon intake.',
      timestamp: new Date(now - 1000 * 60 * 180).toISOString(),
      isRead: false,
      status: 'delivered',
    },
    {
      id: 'seed_msg_5',
      senderId: manager.id,
      senderName: manager.name,
      senderRole: 'manager',
      receiverId: supervisorSouth.id,
      conversationId: convIdSouth,
      text: 'Logistics dispatched 2 additional battery packs via regional dispatch courier. ETA 30 minutes.',
      timestamp: new Date(now - 1000 * 60 * 140).toISOString(),
      isRead: false,
      status: 'delivered',
      reactions: { '🎯': [supervisorSouth.id] },
    },
  ];

  await offlineDb.chatMessages.bulkPut(seedMessages);
}
