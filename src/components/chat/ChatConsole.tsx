// src/components/chat/ChatConsole.tsx
// Modern Enterprise Field-Operations Communication Console (Strict TypeScript)
// Visual identity: Clean white/light SaaS aesthetic with full Dark Mode support
// Features: Click-to-Action (Reactions, Reply, Select), Bulk Selection/Deletion,
// Visual Media Cards (Photos/Videos/Audio/Docs), Auto-hiding Starter Templates,
// Minimalist Input Bar matching User Mockup, Profile Photo Display, and Categorized Media in Details Panel.

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send, Search, Paperclip, Smile, Download,
  Check, CheckCheck, Clock, MapPin, Phone, Mail,
  FileText, Image as ImageIcon, X, Sparkles,
  Users, MessageSquare, ArrowLeft, MoreVertical,
  CheckCircle2, AlertTriangle, Briefcase, Zap, Info,
  Bell, BellOff, ExternalLink, ShieldCheck, ChevronRight,
  Filter, FileSpreadsheet, Eye, AlertCircle,
  CornerUpLeft, CheckSquare, Square, Trash2, Copy, MoreHorizontal,
  Link2, Play, Volume2, Maximize2, WifiOff
} from 'lucide-react';
import toast from 'react-hot-toast';

import { SAMPLE_USERS } from '../../utils/constants';
import type { ChatMessage } from '../../types/index';
import {
  getConversationMessages,
  sendMessage,
  deleteMessages,
  markConversationAsRead,
  addMessageReaction,
  getTotalUnreadCount,
  normalizeUserId,
  isChatOnline,
  verifyChatOnline,
  deliverPendingChatMessages
} from '../../services/chatService';
import { useUserLanguage } from '../../context/UserLanguageContext';
import { translateText } from '../../services/translationEngine';

interface ChatConsoleProps {
  user: any;
  users?: any[];
  setActiveTab?: (tab: string) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '✅', '🎯', '⚠️', '🚀', '🔥', '👏'];

// Telegram-style quick reaction emojis with scrollable drawer
const TELEGRAM_QUICK_REACTIONS = [
  '🔥', '👏', '😢', '😁', '❤️',
  '👍', '👎', '🎉', '🤩', '😮',
  '🙏', '💯', '🚀', '😍', '🤔',
  '💪', '⚡', '✨', '💩', '🥳'
];

// Helper to detect if a message contains only emoji characters
function isOnlyEmojis(text?: string | null): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  try {
    const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|\p{Emoji_Modifier}|\u200d|\ufe0f|\s)+$/u;
    return emojiRegex.test(trimmed);
  } catch {
    return false;
  }
}

const EMOJI_CATEGORIES = [
  {
    name: 'Quick Reactions',
    emojis: ['👍', '❤️', '✅', '🎯', '⚠️', '🚀', '🔥', '👏', '😂', '😍', '🙏', '🎉', '💪', '💯', '✨', '🙌']
  },
  {
    name: 'Smileys & People',
    emojis: ['😀', '😃', '😄', '😁', '😅', '🤣', '🙂', '😉', '😌', '🥰', '😘', '😋', '😎', '🤩', '🥳', '🤔', '🤨', '🙄', '😮', '🥺', '😢', '😭', '😱', '😴']
  },
  {
    name: 'Hands & Gestures',
    emojis: ['👋', '🤚', '✋', '👌', '✌️', '🤞', '🤙', '🤝', '🙌', '👐', '🤲', '👈', '👉', '👆', '👇', '☝️', '👊', '🤛', '🤜']
  },
  {
    name: 'Operations & Work',
    emojis: ['📍', '📌', '📊', '📋', '📁', '📂', '📝', '💼', '📱', '💻', '🔋', '⚡', '🛠️', '🛡️', '🚨', '⭐', '🌟', '🔔', '💡', '⏰', '⏳', '🔍', '⚙️', '📈']
  }
];

const QUICK_TEMPLATES = [
  'All field registration kits deployed and operational.',
  'Urgent: road closure impediment reported at kebele field site.',
  'Daily shift report and citizen intake totals submitted for review.',
  'Battery packs and mobile equipment running low; requesting backup.',
  'Field verification completed with 100% telemetry fidelity.',
  'Quota reached ahead of schedule; transitioning to secondary kebele.',
];

// Helper to resolve contact profile photo
function getContactPhoto(c: any): string | null {
  if (!c) return null;
  const cId = c.id;
  const normId = normalizeUserId(cId);

  // Check persistent photo in localStorage across all possible aliases
  const keys = [
    cId ? `fieldsync_avatar_${cId}` : null,
    normId ? `fieldsync_avatar_${normId}` : null,
    c.email ? `fieldsync_avatar_${c.email.toLowerCase()}` : null,
    normId === 'u_mgr' || c.role === 'manager' || (c.email || '').toLowerCase() === 'manager@fieldsync.com' ? 'fieldsync_avatar_u_mgr' : null,
    normId === 'u_mgr' || c.role === 'manager' || (c.email || '').toLowerCase() === 'manager@fieldsync.com' ? 'fieldsync_avatar_manager@fieldsync.com' : null,
    normId === 'u_sup' || c.role === 'supervisor' || (c.email || '').toLowerCase() === 'supervisor@fieldsync.com' ? 'fieldsync_avatar_u_sup' : null,
  ].filter(Boolean) as string[];

  for (const k of keys) {
    const val = localStorage.getItem(k);
    if (val && val.trim().length > 0) return val;
  }

  // Direct properties
  if (c.profilePhotoUrl) return c.profilePhotoUrl;
  if (c.avatar) return c.avatar;
  if (c.photo) return c.photo;
  if (c.photoUrl) return c.photoUrl;

  // Default professional avatars for executive demo roles
  if (normId === 'u_mgr' || c.role === 'manager' || (c.email || '').toLowerCase() === 'manager@fieldsync.com') {
    return 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80';
  }
  if (normId === 'u_sup' || c.role === 'supervisor' || (c.email || '').toLowerCase() === 'supervisor@fieldsync.com') {
    return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80';
  }

  return null;
}

export default function ChatConsole({ user, users = [] }: ChatConsoleProps) {
  const { userT, language } = useUserLanguage();
  const isManager = user?.role === 'manager';
  const isSupervisor = user?.role === 'supervisor';

  // Resolved Manager contact for Supervisor (Only one Manager: manager@fieldsync.com)
  const defaultManager = useMemo(() => {
    const list = users && users.length > 0 ? users : SAMPLE_USERS;
    const found = list.find((u) => {
      const uId = normalizeUserId(u.id);
      const email = (u.email || '').toLowerCase();
      return uId === 'u_mgr' || email === 'manager@fieldsync.com' || u.role === 'manager';
    });
    const mgr = found || {
      id: 'u_mgr',
      name: 'System Manager',
      email: 'manager@fieldsync.com',
      role: 'manager',
      phone: '+251-911-000000',
      department: 'Administration',
    };
    return {
      ...mgr,
      id: normalizeUserId(mgr.id) || 'u_mgr',
    };
  }, [users]);

  // Deduplicated list of supervisors for Manager view
  const supervisorsList = useMemo(() => {
    const list = users && users.length > 0 ? users : SAMPLE_USERS;
    const sups = list.filter((u) => {
      const role = (u.role || '').toLowerCase();
      if (role !== 'supervisor') return false;
      const reg = (u.region || '').trim().toLowerCase();
      const zone = (u.zone || '').trim().toLowerCase();
      const name = (u.name || u.fullName || '').trim().toLowerCase();
      const isDirectionalReg = ['north', 'south', 'east', 'west', 'all'].includes(reg);
      const isZonalDummy = zone.includes('zonal jurisdiction') || reg.includes('organization-wide');
      const isLegacyMockId = /^([so]\d+|m1)$/i.test(u.id) || /^FO00[1-9]/i.test(u.employeeId || '') || /^SUP00[1-9]/i.test(u.employeeId || '');
      const isMockName = ['ብርሃን ገብረእግዚአብሔር', 'ሣህለ ሙሉጌታ', 'ኪዳን ጥላሁን', 'dawit haile mariam'].includes(name);
      return !isDirectionalReg && !isZonalDummy && !isLegacyMockId && !isMockName;
    });

    const seen = new Set<string>();
    const deduplicated: any[] = [];
    for (const sup of sups) {
      const normId = normalizeUserId(sup.id) || (sup.email || '').toLowerCase();
      if (!seen.has(normId)) {
        seen.add(normId);
        deduplicated.push({
          ...sup,
          id: normalizeUserId(sup.id) || sup.id,
        });
      }
    }

    return deduplicated;
  }, [users]);

  // Active contact selection
  const [selectedContact, setSelectedContact] = useState<any>(
    isSupervisor ? defaultManager : (supervisorsList[0] || null)
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<{
    name: string;
    type: string;
    size: string;
    dataUrl?: string;
  } | null>(null);

  // Replying state
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // In-thread search & details panel states
  const [inMessageSearch, setInMessageSearch] = useState('');
  const [showInMessageSearch, setShowInMessageSearch] = useState(false);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [priorityAlerts, setPriorityAlerts] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean>(() => isChatOnline());

  // Click-to-action menu state for individual message
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);

  // Multi-message selection mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  // Telegram-style hover-to-react vertical capsule state (triggers after hover duration)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMessageMouseEnter = (msgId: string) => {
    if (isSelectionMode) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredMessageId(msgId);
    }, 1200); // Deliberate hover delay (1200ms) before displaying emoji capsule
  };

  const handleMessageMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredMessageId(null);
    }, 450); // Generous grace period to move into the floating vertical reaction bar
  };

  const handlePillMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const handlePillMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredMessageId(null);
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Lightbox modal for high-res photo/video viewing
  const [lightboxMedia, setLightboxMedia] = useState<{
    url: string;
    name: string;
    size?: string;
    isVideo?: boolean;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize composer textarea up to 3 lines (max ~76px), scrollable thereafter
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 76; // Exactly 3 lines (line-height 20px + py-1)
    if (scrollHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.height = `${Math.max(24, scrollHeight)}px`;
      textarea.style.overflowY = 'hidden';
    }
  }, [inputText]);

  // Close message action menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-message-menu]')) {
        setActiveMenuMessageId(null);
      }
    };
    if (activeMenuMessageId) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [activeMenuMessageId]);

  // Synchronize target contact when role or user changes
  useEffect(() => {
    if (isSupervisor) {
      setSelectedContact(defaultManager);
    } else if (isManager) {
      if (!selectedContact || selectedContact.role !== 'supervisor' || normalizeUserId(selectedContact.id) === normalizeUserId(user?.id)) {
        if (supervisorsList.length > 0) {
          setSelectedContact(supervisorsList[0]);
        }
      }
    }
  }, [isSupervisor, isManager, defaultManager, supervisorsList, user?.id]);

  // Reactive profile avatar version (reloads pictures when supervisor/manager changes dashboard photo)
  const [avatarVersion, setAvatarVersion] = useState(0);

  useEffect(() => {
    const handleProfileUpdate = () => {
      setAvatarVersion((v) => v + 1);
    };

    window.addEventListener('fieldsync-profile-updated', handleProfileUpdate);
    window.addEventListener('user-profile-updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);

    return () => {
      window.removeEventListener('fieldsync-profile-updated', handleProfileUpdate);
      window.removeEventListener('user-profile-updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);

  // Load active conversation messages
  const loadMessages = async () => {
    if (!selectedContact || !user?.id) return;
    try {
      const myId = normalizeUserId(user.id);
      const theirId = normalizeUserId(selectedContact.id);
      const msgs = await getConversationMessages(myId, theirId, myId);
      setMessages(msgs);
      await markConversationAsRead(myId, theirId, myId);

      // Immediately discard/clear unread count for this contact when seen
      setUnreadMap((prev) => ({
        ...prev,
        [selectedContact.id]: 0,
        [theirId]: 0,
      }));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fieldsync-unread-count-changed', { detail: { unread: 0 } }));
      }
    } catch (err) {
      console.warn('Failed to load conversation messages:', err);
    }
  };

  // Recalculate unread message counts per contact (for manager & supervisor)
  const refreshUnreadCounts = async () => {
    if (!user?.id) return;
    try {
      const counts: Record<string, number> = {};
      const myId = normalizeUserId(user.id);
      const activeContactId = selectedContact ? normalizeUserId(selectedContact.id) : '';

      if (isManager) {
        for (const sup of supervisorsList) {
          const theirId = normalizeUserId(sup.id);
          // If viewing this conversation right now, discard unread count to 0!
          if (activeContactId && (activeContactId === theirId || activeContactId === sup.id)) {
            counts[sup.id] = 0;
            continue;
          }
          const msgs = await getConversationMessages(myId, theirId, myId);
          const unread = msgs.filter((m) => normalizeUserId(m.receiverId) === myId && !m.isRead).length;
          counts[sup.id] = unread;
        }
      } else if (isSupervisor) {
        const mgrId = normalizeUserId(defaultManager.id);
        if (activeContactId && (activeContactId === mgrId || activeContactId === defaultManager.id)) {
          counts[defaultManager.id] = 0;
        } else {
          const msgs = await getConversationMessages(myId, mgrId, myId);
          const unread = msgs.filter((m) => normalizeUserId(m.receiverId) === myId && !m.isRead).length;
          counts[defaultManager.id] = unread;
        }
      }
      setUnreadMap(counts);
    } catch (err) {
      console.warn('Failed to calculate unread counts:', err);
    }
  };

  // Initial load on contact change
  useEffect(() => {
    loadMessages();
    refreshUnreadCounts();
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());
    setReplyingTo(null);
    setActiveMenuMessageId(null);
  }, [selectedContact?.id, user?.id]);

  // Multi-channel cross-tab, window event, and storage listeners
  useEffect(() => {
    const handleChatUpdate = () => {
      loadMessages();
      refreshUnreadCounts();
    };

    const handleChatReaction = () => {
      loadMessages();
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'fieldsync_chat_sync') {
        loadMessages();
        refreshUnreadCounts();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadMessages();
        refreshUnreadCounts();
      }
    };

    window.addEventListener('fieldsync-chat-update', handleChatUpdate);
    window.addEventListener('fieldsync-chat-read', handleChatUpdate);
    window.addEventListener('fieldsync-chat-reaction', handleChatReaction);
    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('focus', handleChatUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Online & Offline lifecycle: automatically deliver pending messages when reconnecting with real internet
    const handleOnline = async () => {
      const isReallyOnline = await verifyChatOnline(true);
      setIsOnline(isReallyOnline);
      if (isReallyOnline) {
        const count = await deliverPendingChatMessages(user?.id);
        await loadMessages();
        refreshUnreadCounts();
        if (count > 0) {
          toast.success(`${count} pending message${count > 1 ? 's' : ''} delivered.`);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast('You are offline. New messages will be queued and delivered once you reconnect.', { icon: '⚠️' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    verifyChatOnline().then((online) => setIsOnline(online));

    // Active network monitor: detects real internet loss/return even when navigator.onLine is stuck
    const netCheckTimer = setInterval(async () => {
      const reallyOnline = await verifyChatOnline();
      setIsOnline((prev) => {
        if (!prev && reallyOnline) {
          deliverPendingChatMessages(user?.id).then((count) => {
            if (count > 0) {
              loadMessages();
              refreshUnreadCounts();
              toast.success(`${count} pending message${count > 1 ? 's' : ''} delivered.`);
            }
          });
        }
        return reallyOnline;
      });
    }, 2500);

    const pollTimer = setInterval(() => {
      loadMessages();
      refreshUnreadCounts();
    }, 1500);

    return () => {
      window.removeEventListener('fieldsync-chat-update', handleChatUpdate);
      window.removeEventListener('fieldsync-chat-read', handleChatUpdate);
      window.removeEventListener('fieldsync-chat-reaction', handleChatReaction);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('focus', handleChatUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(netCheckTimer);
      clearInterval(pollTimer);
    };
  }, [selectedContact?.id, user?.id]);

  // Auto scroll to bottom on new messages (only when not in selection mode)
  useEffect(() => {
    if (!isSelectionMode) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isSelectionMode]);

  // File selection with FileReader for real downloadable data
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error('File size exceeds 15MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedAttachment({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size < 1024 * 1024
          ? `${(file.size / 1024).toFixed(1)} KB`
          : `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        dataUrl: reader.result as string,
      });
      toast.success(`Attached ${file.name}`);
    };
    reader.onerror = () => {
      toast.error('Failed to read attachment file');
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  // Download attachment handler
  const handleDownloadFile = (att: { name: string; url?: string; dataUrl?: string }) => {
    const downloadUrl = att.dataUrl || att.url || `data:text/plain;charset=utf-8,${encodeURIComponent(`FieldSync Attachment: ${att.name}`)}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = att.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloaded ${att.name}`);
  };

  // Preview attachment in new tab
  const handlePreviewFile = (att: { name: string; url?: string; dataUrl?: string }) => {
    if (att.dataUrl || att.url) {
      const win = window.open();
      if (win) {
        win.document.write(`
          <html>
            <head><title>Preview - ${att.name}</title></head>
            <body style="margin:0; background:#0F172A; display:flex; align-items:center; justify-content:center; height:100vh;">
              <iframe src="${att.dataUrl || att.url}" frameborder="0" style="width:100%; height:100%; border:none;"></iframe>
            </body>
          </html>
        `);
      }
    } else {
      toast.error('Preview not available for this file');
    }
  };

  // Send message handler (supports replyTo)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !selectedAttachment) || !selectedContact || !user?.id) return;

    setIsSending(true);
    const textToSend = inputText.trim();
    const attToSend = selectedAttachment ? { ...selectedAttachment } : undefined;
    const replyContext = replyingTo ? {
      id: replyingTo.id,
      senderName: replyingTo.senderName,
      text: replyingTo.text || (replyingTo.attachment ? replyingTo.attachment.name : ''),
    } : undefined;

    setInputText('');
    setSelectedAttachment(null);
    setShowEmojiPicker(false);
    setReplyingTo(null);

    try {
      const currentSenderId = normalizeUserId(user.id);
      const currentReceiverId = normalizeUserId(selectedContact.id);

      await sendMessage({
        senderId: currentSenderId,
        senderName: user.fullName || user.name || (isManager ? 'አበበ በቀለ' : 'Supervisor'),
        senderRole: isManager ? 'manager' : 'supervisor',
        receiverId: currentReceiverId,
        receiverName: selectedContact.fullName || selectedContact.name || 'Recipient',
        text: textToSend || (attToSend ? `Shared an operational attachment: ${attToSend.name}` : ''),
        replyTo: replyContext,
        attachment: attToSend,
      });

      if (!isChatOnline()) {
        toast('Offline: Message queued. It will be delivered once back online.', { icon: '⏳' });
      }

      await loadMessages();
      refreshUnreadCounts();
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  // Keydown handler for textarea: Enter to send, Shift+Enter for new line
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Send an operational starter template immediately
  const handleSendStarterTemplate = async (templateText: string) => {
    if (!selectedContact || !user?.id) return;
    setIsSending(true);
    try {
      const currentSenderId = normalizeUserId(user.id);
      const currentReceiverId = normalizeUserId(selectedContact.id);

      await sendMessage({
        senderId: currentSenderId,
        senderName: user.fullName || user.name || (isManager ? 'አበበ በቀለ' : 'Supervisor'),
        senderRole: isManager ? 'manager' : 'supervisor',
        receiverId: currentReceiverId,
        receiverName: selectedContact.fullName || selectedContact.name || 'Recipient',
        text: templateText,
      });

      if (!isChatOnline()) {
        toast('Offline: Template queued. It will be delivered once back online.', { icon: '⏳' });
      }

      await loadMessages();
      refreshUnreadCounts();
    } catch (err) {
      console.error('Failed to send starter template:', err);
      toast.error('Failed to send template');
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  // Reaction click handler
  const handleReactionClick = async (messageId: string, emoji: string) => {
    if (!user?.id) return;
    try {
      await addMessageReaction(messageId, emoji, user.id);
      await loadMessages();
    } catch (err) {
      console.warn('Failed to add reaction:', err);
    } finally {
      setActiveMenuMessageId(null);
    }
  };

  // Copy message text to clipboard
  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Message copied to clipboard');
    setActiveMenuMessageId(null);
  };

  // Toggle multi-select mode from a specific message
  const handleStartSelection = (msgId: string) => {
    setIsSelectionMode(true);
    setSelectedMessageIds(new Set([msgId]));
    setActiveMenuMessageId(null);
  };

  // Toggle individual message selection
  const handleToggleSelectMessage = (msgId: string) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  // Select all or deselect all
  const handleToggleSelectAll = () => {
    if (selectedMessageIds.size === visibleMessages.length) {
      setSelectedMessageIds(new Set());
    } else {
      setSelectedMessageIds(new Set(visibleMessages.map((m) => m.id)));
    }
  };

  // Delete selected messages
  const handleDeleteSelected = async () => {
    if (selectedMessageIds.size === 0) return;
    const count = selectedMessageIds.size;
    const confirmed = window.confirm(`Are you sure you want to delete ${count} selected message${count > 1 ? 's' : ''}?`);
    if (!confirmed) return;

    try {
      await deleteMessages(Array.from(selectedMessageIds));
      toast.success(`Deleted ${count} message${count > 1 ? 's' : ''}`);
      setIsSelectionMode(false);
      setSelectedMessageIds(new Set());
      await loadMessages();
      refreshUnreadCounts();
    } catch (err) {
      console.error('Failed to delete messages:', err);
      toast.error('Failed to delete selected messages');
    }
  };

  // Cancel selection mode
  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());
  };

  // Format message time
  const formatMsgTime = (isoString: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Format message date separator
  const formatMsgDate = (isoString: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) return 'Today';
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // Render text with clickable URL links
  const renderMessageContent = (text: string, isMine: boolean) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`underline hover:opacity-85 break-all font-medium inline-flex items-center gap-0.5 ${
              isMine ? 'text-blue-600 dark:text-[#64B5F6] underline decoration-blue-500/60 dark:decoration-[#64B5F6]/70' : 'text-[#2563EB] dark:text-[#64B5F6]'
            }`}
          >
            <span>{part}</span>
            <ExternalLink className="w-3 h-3 inline shrink-0" />
          </a>
        );
      }
      return part;
    });
  };

  // Helper for document badge & icon
  const getFileBadgeInfo = (filename: string, fileType?: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf' || fileType?.includes('pdf')) {
      return {
        label: 'PDF Document',
        icon: <FileText className="w-5 h-5 text-rose-600 dark:text-rose-300" />,
        bg: 'bg-rose-50 dark:bg-rose-500/25 border-rose-100 dark:border-rose-400/30 text-rose-700 dark:text-rose-200',
      };
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return {
        label: 'Data Spreadsheet',
        icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />,
        bg: 'bg-emerald-50 dark:bg-emerald-500/25 border-emerald-100 dark:border-emerald-400/30 text-emerald-700 dark:text-emerald-200',
      };
    }
    return {
      label: 'Field Document',
      icon: <FileText className="w-5 h-5 text-[#2563EB] dark:text-blue-300" />,
      bg: 'bg-blue-50 dark:bg-blue-500/25 border-blue-100 dark:border-blue-400/30 text-blue-700 dark:text-blue-200',
    };
  };

  // Filter supervisors for Manager sidebar
  const filteredSupervisors = useMemo(() => {
    return supervisorsList.filter((sup) => {
      const name = (sup.fullName || sup.name || '').toLowerCase();
      const region = (sup.region || '').toLowerCase();
      const empId = (sup.employeeId || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch = name.includes(q) || region.includes(q) || empId.includes(q);

      if (filterUnreadOnly) {
        return matchesSearch && (unreadMap[sup.id] || 0) > 0;
      }
      return matchesSearch;
    });
  }, [supervisorsList, searchQuery, filterUnreadOnly, unreadMap]);

  // Messages filtered by in-thread search
  const visibleMessages = useMemo(() => {
    if (!inMessageSearch.trim()) return messages;
    return messages.filter((m) => m.text.toLowerCase().includes(inMessageSearch.toLowerCase()));
  }, [messages, inMessageSearch]);

  // 1. Shared Photos & Videos
  const sharedMedia = useMemo(() => {
    return messages
      .filter((m) => {
        const att = m.attachment;
        if (!att) return false;
        const isImg = att.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(att.name);
        const isVid = att.type?.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(att.name);
        return isImg || isVid;
      })
      .map((m) => ({
        ...m.attachment!,
        msgId: m.id,
        timestamp: m.timestamp,
        senderName: m.senderName,
        isVideo: m.attachment?.type?.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(m.attachment!.name),
      }))
      .reverse();
  }, [messages]);

  // 2. Shared Documents & Files
  const sharedDocs = useMemo(() => {
    return messages
      .filter((m) => {
        const att = m.attachment;
        if (!att) return false;
        const isImg = att.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(att.name);
        const isVid = att.type?.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(att.name);
        const isAud = att.type?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(att.name);
        return !isImg && !isVid && !isAud;
      })
      .map((m) => ({
        ...m.attachment!,
        msgId: m.id,
        timestamp: m.timestamp,
        senderName: m.senderName,
      }))
      .reverse();
  }, [messages]);

  // 3. Shared Web Links extracted from messages
  const sharedLinks = useMemo(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const links: { url: string; domain: string; msgTimestamp: string; senderName: string }[] = [];

    for (const m of messages) {
      if (!m.text) continue;
      const matches = m.text.match(urlRegex);
      if (matches) {
        for (const u of matches) {
          try {
            const parsed = new URL(u);
            links.push({
              url: u,
              domain: parsed.hostname.replace(/^www\./, ''),
              msgTimestamp: m.timestamp,
              senderName: m.senderName,
            });
          } catch {
            links.push({
              url: u,
              domain: 'link',
              msgTimestamp: m.timestamp,
              senderName: m.senderName,
            });
          }
        }
      }
    }
    return links.reverse();
  }, [messages]);

  // Field Officer role guard
  if (!isManager && !isSupervisor) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 shadow-sm max-w-lg mx-auto mt-12 transition-colors">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-[#0F172A] dark:text-slate-100 mb-2">
          Chat Access Restricted
        </h3>
        <p className="text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">
          The Operational Chat is strictly reserved for communications between Field Supervisors and the Executive Manager. Frontline Field Officers manage operations via Daily Work Reports.
        </p>
      </div>
    );
  }

  // Active contact & current user profile photo resolution
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const contactPhoto = useMemo(() => getContactPhoto(selectedContact), [selectedContact, avatarVersion]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const currentUserPhoto = useMemo(() => getContactPhoto(user), [user, avatarVersion]);

  const selectedContactInitials = (selectedContact?.fullName || selectedContact?.name || (isSupervisor ? 'Manager' : 'Supervisor'))
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('');

  const currentUserInitials = (user?.fullName || user?.name || (isManager ? 'Manager' : 'Supervisor'))
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('');

  return (
    <div className="h-[calc(100vh-7.5rem)] min-h-[640px] flex bg-white dark:bg-[#160F0D] rounded-2xl border border-slate-200/90 dark:border-slate-700/60 shadow-sm overflow-hidden transition-all duration-200">
      
      {/* ============================================================== */}
      {/* LEFT SIDEBAR: Supervisors List (Manager Only)                  */}
      {/* ============================================================== */}
      {isManager && (
        <div
          className={`w-80 shrink-0 border-r border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-[#140E0B] flex flex-col transition-all duration-200 ${
            showMobileSidebar ? 'fixed inset-y-0 left-0 z-40 w-80 shadow-2xl md:relative md:shadow-none' : 'hidden md:flex'
          }`}
        >
          {/* Sidebar Header & Search */}
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-[#140E0B] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#0F172A] dark:text-white tracking-tight">
                  {userT('Supervisors')}
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-slate-400 border border-transparent dark:border-slate-700">
                  {supervisorsList.length} {userT('Total')}
                </span>
                {showMobileSidebar && (
                  <button
                    type="button"
                    onClick={() => setShowMobileSidebar(false)}
                    className="md:hidden p-1 text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#64748B] dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={userT('Search by name, region, ID...')}
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#1F1511] text-xs text-[#0F172A] dark:text-white placeholder-[#64748B] dark:placeholder-[#8C7A70] focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-[#2563EB] dark:focus:border-[#D4A373] transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 text-xs pt-0.5">
              <button
                type="button"
                onClick={() => setFilterUnreadOnly(false)}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  !filterUnreadOnly
                    ? 'bg-[#2563EB] text-white shadow-2xs'
                    : 'bg-[#F8FAFC] dark:bg-[#1F1511] text-[#64748B] dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#2A1D17]'
                }`}
              >
                {userT('All')}
              </button>
              <button
                type="button"
                onClick={() => setFilterUnreadOnly(true)}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                  filterUnreadOnly
                    ? 'bg-[#2563EB] text-white shadow-2xs'
                    : 'bg-[#F8FAFC] dark:bg-[#1F1511] text-[#64748B] dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#2A1D17]'
                }`}
              >
                <span>{userT('Unread')}</span>
                {Object.values(unreadMap).reduce((a, b) => a + b, 0) > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>
            </div>
          </div>

          {/* Supervisors Directory List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#241712]">
            {filteredSupervisors.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs font-medium text-[#64748B] dark:text-slate-400">{userT('No supervisors found')}</p>
                <p className="text-[11px] text-slate-400 dark:text-[#8C7A70]">{userT('Try modifying your search criteria')}</p>
              </div>
            ) : (
              filteredSupervisors.map((sup) => {
                const isSelected = normalizeUserId(selectedContact?.id) === normalizeUserId(sup.id);
                const unreadCount = unreadMap[sup.id] || 0;
                const initials = (sup.fullName || sup.name || 'S')
                  .split(' ')
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join('');
                const supPhoto = getContactPhoto(sup);

                return (
                  <button
                    key={sup.id}
                    type="button"
                    onClick={() => {
                      setSelectedContact(sup);
                      setUnreadMap((prev) => ({ ...prev, [sup.id]: 0 }));
                      setShowMobileSidebar(false);
                    }}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-slate-800 border-l-4 border-[#2563EB] dark:border-blue-500'
                        : 'hover:bg-slate-50/80 dark:hover:bg-[#1C1410] border-l-4 border-transparent'
                    }`}
                  >
                    {/* Avatar with Online Status */}
                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold text-xs ${
                        isSelected
                          ? 'bg-[#2563EB] text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}>
                        {supPhoto ? (
                          <img
                            src={supPhoto}
                            alt={sup.fullName || sup.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-xs font-bold truncate ${
                          isSelected ? 'text-[#2563EB] dark:text-blue-400' : 'text-[#0F172A] dark:text-white'
                        }`}>
                          {sup.fullName || sup.name}
                        </span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2563EB] text-white shrink-0">
                            {unreadCount}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] dark:text-slate-400">
                        <span className="truncate">{translateText(sup.region, language) || sup.region || userT('Regional Supervisor')}</span>
                        <span>•</span>
                        <span className="text-[10px] text-slate-400 dark:text-[#8C7A70] font-mono">{sup.employeeId || 'SUP'}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MAIN CHAT CONVERSATION WORKSPACE                               */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] dark:bg-[#0E1621] transition-colors">
        
        {/* Sticky Header or Multi-Select Action Bar */}
        {isSelectionMode ? (
          /* Multi-Select Bulk Action Header */
          <div className="sticky top-0 z-30 h-16 px-5 border-b border-blue-200 dark:border-slate-700 bg-blue-50/95 dark:bg-[#1A120E]/95 backdrop-blur-sm shadow-sm flex items-center justify-between shrink-0 animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-[#2563EB] dark:text-blue-400">
                {selectedMessageIds.size} {selectedMessageIds.size === 1 ? userT('message selected') : userT('messages selected')}
              </span>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-[#0F172A] dark:text-white hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {selectedMessageIds.size === visibleMessages.length ? userT('Deselect All') : userT('Select All')}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selectedMessageIds.size === 0}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{userT('Delete')} ({selectedMessageIds.size})</span>
              </button>
              <button
                type="button"
                onClick={handleCancelSelection}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#64748B] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                {userT('Cancel')}
              </button>
            </div>
          </div>
        ) : (
          /* Normal Sticky Conversation Header */
          <div className="sticky top-0 z-20 h-16 px-5 border-b border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between shrink-0 bg-white/95 dark:bg-[#160F0D]/95 backdrop-blur-sm shadow-2xs transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile Sidebar Toggle Button for Manager */}
              {isManager && (
                <button
                  type="button"
                  onClick={() => setShowMobileSidebar(true)}
                  className="md:hidden p-1.5 -ml-1 text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#251A14] cursor-pointer"
                  title="Supervisors list"
                >
                  <Users className="w-4.5 h-4.5" />
                </button>
              )}

              {/* Contact Avatar displaying profile photo */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-2xs border border-slate-200 dark:border-slate-700">
                  {contactPhoto ? (
                    <img
                      src={contactPhoto}
                      alt={selectedContact?.fullName || selectedContact?.name || 'Contact'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span>{selectedContactInitials}</span>
                  )}
                </div>
              </div>

              {/* Name & Role */}
              <div className="min-w-0">
                <h4 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-white tracking-tight truncate">
                  {selectedContact?.fullName || selectedContact?.name || (isSupervisor ? 'አበበ በቀለ' : userT('Supervisor'))}
                </h4>
                <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium truncate">
                  {isSupervisor
                    ? userT('Executive Operations Manager')
                    : translateText(`${selectedContact?.region || 'Regional'} Supervisor`, language)}
                </p>
              </div>
            </div>

            {/* Header Action Tools */}
            <div className="flex items-center gap-1.5">
              {/* In-Thread Search */}
              {showInMessageSearch ? (
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#1C1410] border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1">
                  <Search className="w-3.5 h-3.5 text-[#64748B] dark:text-slate-400" />
                  <input
                    type="text"
                    value={inMessageSearch}
                    onChange={(e) => setInMessageSearch(e.target.value)}
                    placeholder={userT('Find in this chat...')}
                    className="w-32 sm:w-48 bg-transparent text-xs text-[#0F172A] dark:text-white placeholder-[#64748B] dark:placeholder-[#8C7A70] focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setInMessageSearch('');
                      setShowInMessageSearch(false);
                    }}
                    className="text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowInMessageSearch(true)}
                  className="p-2 text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-[#251A14] transition-colors cursor-pointer"
                  title="Search conversation"
                >
                  <Search className="w-4.5 h-4.5" />
                </button>
              )}

              {/* Information Panel Toggle Button */}
              <button
                type="button"
                onClick={() => setShowInfoPanel(!showInfoPanel)}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  showInfoPanel
                    ? 'bg-blue-50 dark:bg-[#2A1D17] text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-slate-700'
                    : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#251A14] border border-transparent'
                }`}
                title="Conversation details"
              >
                <Info className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MESSAGES FEED AREA (#F8FAFC / dark:bg-[#100B09])               */}
        {/* ============================================================== */}
        {/* Offline Banner */}
        {!isOnline && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between font-medium animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>You are currently offline. Messages will be queued and delivered once you are back online.</span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
              Offline
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          {visibleMessages.length === 0 ? (
            /* Empty State with Operational Starter Templates (Auto-disappears once messages exist) */
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-5 animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-slate-800 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shadow-2xs border border-blue-100 dark:border-slate-700">
                <MessageSquare className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className="text-base font-bold text-[#0F172A] dark:text-[#F3EAE4]">
                  {translateText(`Direct Line with ${selectedContact?.fullName || selectedContact?.name}`, language)}
                </h4>
                <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
                  {userT('Start your operational conversation. Select an operational starter template below to send immediately, or compose a custom message.')}
                </p>
              </div>

              {/* Starter Templates Grid - ONLY VISIBLE WHEN EMPTY */}
              <div className="w-full max-w-xl text-left pt-2">
                <div className="flex items-center gap-1.5 mb-2.5 text-xs font-bold text-[#64748B] dark:text-slate-400">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>{userT('Suggested Operational Starters')}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_TEMPLATES.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendStarterTemplate(translateText(tpl, language))}
                      className="p-3 text-left text-xs bg-white dark:bg-[#1A120E] rounded-xl border border-[#E2E8F0] dark:border-slate-700/60 text-[#0F172A] dark:text-[#F3EAE4] hover:border-[#2563EB] dark:hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-[#261C16] shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-start gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
                      <span className="leading-snug">{translateText(tpl, language)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            visibleMessages.map((msg, index) => {
              const prevMsg = visibleMessages[index - 1];
              const nextMsg = visibleMessages[index + 1];

              const normCurrentUserId = normalizeUserId(user?.id);
              const normMsgSenderId = normalizeUserId(msg.senderId);
              const isMine = normMsgSenderId === normCurrentUserId;
              const isSelected = selectedMessageIds.has(msg.id);
              const isMenuOpen = activeMenuMessageId === msg.id;

              // Centered date separator
              const currentDateStr = new Date(msg.timestamp).toDateString();
              const prevDateStr = prevMsg ? new Date(prevMsg.timestamp).toDateString() : null;
              const showDateHeader = !prevDateStr || currentDateStr !== prevDateStr;

              // Proximity & Gestalt Sequence Calculations (slack/telegram standard)
              const isPrevSameSender = !showDateHeader && prevMsg && normalizeUserId(prevMsg.senderId) === normMsgSenderId;
              const timeDiffWithPrev = prevMsg ? Math.abs(new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime()) : Infinity;
              const isGroupedWithPrev = isPrevSameSender && timeDiffWithPrev < 5 * 60 * 1000;

              const nextDateStr = nextMsg ? new Date(nextMsg.timestamp).toDateString() : null;
              const isNextSameDate = nextDateStr === currentDateStr;
              const isNextSameSender = isNextSameDate && nextMsg && normalizeUserId(nextMsg.senderId) === normMsgSenderId;
              const timeDiffWithNext = nextMsg ? Math.abs(new Date(nextMsg.timestamp).getTime() - new Date(msg.timestamp).getTime()) : Infinity;
              const isGroupedWithNext = isNextSameSender && timeDiffWithNext < 5 * 60 * 1000;

              const isFirstInGroup = !isGroupedWithPrev;
              const isLastInGroup = !isGroupedWithNext;

              // UI / UX Distance Principle:
              // - 20px gap (mt-5) between different speakers or >5min gaps
              // - 5px gap (mt-1.5) between rapid consecutive messages from same speaker
              const messageSpacing = showDateHeader ? 'mt-2' : isFirstInGroup ? 'mt-4 sm:mt-5' : 'mt-1 sm:mt-1.5';

              // Dynamic corner radius stacking for Gestalt proximity
              const bubbleRadius = isMine
                ? (isFirstInGroup && isLastInGroup
                    ? 'rounded-2xl rounded-br-xs'
                    : isFirstInGroup
                    ? 'rounded-2xl rounded-br-md'
                    : isLastInGroup
                    ? 'rounded-2xl rounded-tr-md rounded-br-xs'
                    : 'rounded-2xl rounded-tr-md rounded-br-md')
                : (isFirstInGroup && isLastInGroup
                    ? 'rounded-2xl rounded-bl-xs'
                    : isFirstInGroup
                    ? 'rounded-2xl rounded-bl-md'
                    : isLastInGroup
                    ? 'rounded-2xl rounded-tl-md rounded-bl-xs'
                    : 'rounded-2xl rounded-tl-md rounded-bl-md');

              // Check if attachment is visual media
              const isImage = msg.attachment && (
                msg.attachment.type?.startsWith('image/') ||
                /\.(png|jpe?g|webp|gif|svg)$/i.test(msg.attachment.name)
              );
              const isVideo = msg.attachment && (
                msg.attachment.type?.startsWith('video/') ||
                /\.(mp4|webm|mov)$/i.test(msg.attachment.name)
              );
              const isAudio = msg.attachment && (
                msg.attachment.type?.startsWith('audio/') ||
                /\.(mp3|wav|ogg|m4a)$/i.test(msg.attachment.name)
              );

              // Detect if message is pure emoji content without attachment or reply
              const isEmojiOnly = isOnlyEmojis(msg.text) && !msg.attachment && !msg.replyTo;

              return (
                <React.Fragment key={msg.id}>
                  {showDateHeader && (
                    <div className="flex items-center justify-center my-6">
                      <div className="relative flex items-center justify-center w-full">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-200/80 dark:border-[#261C16]" />
                        </div>
                        <span className="relative z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-white dark:bg-[#1C1410] border border-slate-200/90 dark:border-[#35251E] text-slate-500 dark:text-[#C5B3A7] shadow-2xs">
                          <Clock className="w-3 h-3 text-slate-400 dark:text-[#8C7A70]" />
                          <span>{formatMsgDate(msg.timestamp)}</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Message Item Wrapper with Gestalt Dynamic Distance */}
                  <div className={`flex items-end gap-2.5 ${isMine ? 'justify-end' : 'justify-start'} ${messageSpacing} group relative`}>
                    
                    {/* Multi-Select Checkbox when in Selection Mode (left for received) */}
                    {isSelectionMode && !isMine && (
                      <button
                        type="button"
                        onClick={() => handleToggleSelectMessage(msg.id)}
                        className="mb-2 text-[#2563EB] dark:text-blue-400 cursor-pointer p-0.5"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 fill-blue-600 text-white dark:fill-[#D4A373] dark:text-[#100B09]" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300 dark:text-[#5A4032]" />
                        )}
                      </button>
                    )}

                    {/* Sender Avatar for Received Messages (Anchor at bottom of cluster) */}
                    {!isMine && (
                      <div className="w-8 h-8 shrink-0 self-end mb-0.5">
                        {isLastInGroup ? (
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-2xs">
                            {contactPhoto ? (
                              <img
                                src={contactPhoto}
                                alt={msg.senderName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <span>{msg.senderName ? msg.senderName.slice(0, 2).toUpperCase() : 'FS'}</span>
                            )}
                          </div>
                        ) : (
                          <div className="w-8 h-8" aria-hidden="true" />
                        )}
                      </div>
                    )}

                    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[70%]`}>
                      
                      {/* Message Container with Click-to-Open & Hover Action Menu */}
                      <div
                        data-message-menu={msg.id}
                        onMouseEnter={() => handleMessageMouseEnter(msg.id)}
                        onMouseLeave={handleMessageMouseLeave}
                        onClick={(e) => {
                          if (isSelectionMode) {
                            handleToggleSelectMessage(msg.id);
                          } else {
                            const target = e.target as HTMLElement;
                            if (!target.closest('button') && !target.closest('a') && !target.closest('video') && !target.closest('audio')) {
                              setActiveMenuMessageId(isMenuOpen ? null : msg.id);
                            }
                          }
                        }}
                        className={`relative cursor-pointer transition-all duration-150 ${
                          isSelected ? 'ring-2 ring-[#2563EB] dark:ring-[#D4A373] rounded-2xl' : ''
                        }`}
                      >
                        {/* Telegram-style Vertical Hover Reaction Capsule (White in white theme, dark in dark theme) */}
                        {hoveredMessageId === msg.id && !isSelectionMode && (
                          <div
                            onMouseEnter={handlePillMouseEnter}
                            onMouseLeave={handlePillMouseLeave}
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute z-40 ${
                              isMine ? 'right-full mr-2.5 before:-right-4' : 'left-full ml-2.5 before:-left-4'
                            } before:absolute before:inset-y-0 before:w-5 before:content-[''] top-1/2 -translate-y-1/2 max-h-56 sm:max-h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] overscroll-contain bg-white/95 dark:bg-[#17212B]/95 backdrop-blur-md border border-slate-200/90 dark:border-[#2B394A] shadow-2xl rounded-3xl py-2 px-1 flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 duration-200 select-none`}
                          >
                            {TELEGRAM_QUICK_REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  handleReactionClick(msg.id, emoji);
                                  setHoveredMessageId(null);
                                }}
                                className="w-10 h-10 shrink-0 flex items-center justify-center text-2xl sm:text-[26px] hover:scale-130 active:scale-110 transition-all duration-150 rounded-full hover:bg-slate-100 dark:hover:bg-white/15 cursor-pointer"
                                title={`React with ${emoji}`}
                              >
                                <span>{emoji}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {/* 1. VISUAL PHOTO / IMAGE CARD */}
                        {isImage && msg.attachment ? (
                          <div className={`w-full max-w-[360px] bg-white dark:bg-[#2B5278] border border-slate-200/90 dark:border-[#38628B] text-slate-900 dark:text-white ${bubbleRadius} p-2 shadow-xs hover:shadow-md transition-all`}>
                            {!isMine && isFirstInGroup && (
                              <div className="flex items-center gap-1.5 px-1 py-1 mb-1">
                                <span className="text-xs font-bold text-[#1E40AF] dark:text-[#93C5FD]">
                                  {msg.senderName}
                                </span>
                              </div>
                            )}

                            {/* Image Container with Hover Overlay & Lightbox Click */}
                            <div className="relative group/media overflow-hidden rounded-xl bg-slate-900 aspect-video sm:aspect-auto max-h-72">
                              <img
                                src={msg.attachment.dataUrl || msg.attachment.url}
                                alt={msg.attachment.name}
                                className="w-full h-full max-h-72 object-cover cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxMedia({
                                    url: msg.attachment!.dataUrl || msg.attachment!.url!,
                                    name: msg.attachment!.name,
                                    size: msg.attachment!.size,
                                  });
                                }}
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 flex items-center justify-between text-white">
                                <span className="text-xs font-semibold truncate max-w-[200px]" title={msg.attachment.name}>
                                  {msg.attachment.name}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadFile(msg.attachment!);
                                    }}
                                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-colors cursor-pointer"
                                    title="Download photo"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLightboxMedia({
                                        url: msg.attachment!.dataUrl || msg.attachment!.url!,
                                        name: msg.attachment!.name,
                                        size: msg.attachment!.size,
                                      });
                                    }}
                                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-colors cursor-pointer"
                                    title="Expand full screen"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Optional Text Caption */}
                            {msg.text && !msg.text.startsWith('Shared an operational attachment') && (
                              <p className="text-xs text-slate-900 dark:text-white px-1 pt-2 leading-relaxed whitespace-pre-wrap">
                                {renderMessageContent(msg.text, false)}
                              </p>
                            )}

                            {/* Footer Timestamp & Delivery Status */}
                            <div className="flex items-center justify-between px-1 pt-2 text-[11px] text-slate-500 dark:text-[#93C5FD]/80">
                              <span className="font-mono text-[10px]">{msg.attachment.size}</span>
                              <div className="flex items-center gap-1">
                                <span>{formatMsgTime(msg.timestamp)}</span>
                                {isMine && (
                                  msg.status === 'sending' ? (
                                    <span title="Waiting for network" className="text-amber-500/90 dark:text-amber-400/90 flex items-center gap-1 ml-1 text-[10px] font-medium">
                                      <Clock className="w-3 h-3 animate-spin" />
                                      <span>Sending...</span>
                                    </span>
                                  ) : msg.status === 'read' ? (
                                    <span title="Seen" className="text-blue-600 dark:text-blue-400 flex items-center gap-0.5 font-medium ml-1">
                                      <CheckCheck className="w-3.5 h-3.5" />
                                      <span className="text-[10px]">Seen</span>
                                    </span>
                                  ) : (
                                    <span title="Delivered" className="text-slate-400 dark:text-[#93C5FD]/70 flex items-center gap-0.5 ml-1">
                                      <CheckCheck className="w-3.5 h-3.5" />
                                      <span className="text-[10px]">Delivered</span>
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        ) : isVideo && msg.attachment ? (
                          /* 2. VIDEO PLAYER CARD */
                          <div className={`w-full max-w-[360px] bg-white dark:bg-[#2B5278] border border-slate-200/90 dark:border-[#38628B] text-slate-900 dark:text-white ${bubbleRadius} p-2 shadow-xs`}>
                            {!isMine && isFirstInGroup && (
                              <div className="flex items-center gap-1.5 px-1 py-1 mb-1">
                                <span className="text-xs font-bold text-[#1E40AF] dark:text-[#93C5FD]">
                                  {msg.senderName}
                                </span>
                              </div>
                            )}
                            <video
                              controls
                              src={msg.attachment.dataUrl || msg.attachment.url}
                              className="w-full max-h-64 object-contain rounded-xl bg-black"
                            />
                            {msg.text && !msg.text.startsWith('Shared an operational attachment') && (
                              <p className="text-xs text-slate-900 dark:text-white px-1 pt-2">
                                {renderMessageContent(msg.text, false)}
                              </p>
                            )}
                            <div className="flex items-center justify-between px-1 pt-1.5 text-[11px] text-slate-500 dark:text-[#93C5FD]/80">
                              <span>{msg.attachment.name}</span>
                              <span>{formatMsgTime(msg.timestamp)}</span>
                            </div>
                          </div>
                        ) : isAudio && msg.attachment ? (
                          /* 3. AUDIO / VOICE PLAYER CARD */
                          <div className={`w-full max-w-[340px] bg-white dark:bg-[#2B5278] border border-slate-200/90 dark:border-[#38628B] text-slate-900 dark:text-white ${bubbleRadius} p-3 shadow-xs`}>
                            {!isMine && isFirstInGroup && (
                              <div className="flex items-center gap-1.5 px-1 py-0.5 mb-1.5">
                                <span className="text-xs font-bold text-[#1E40AF] dark:text-[#93C5FD]">
                                  {msg.senderName}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mb-2">
                              <Volume2 className="w-4 h-4 text-blue-600 dark:text-[#64B5F6]" />
                              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">{msg.attachment.name}</span>
                            </div>
                            <audio controls src={msg.attachment.dataUrl || msg.attachment.url} className="w-full h-8" />
                          </div>
                        ) : msg.attachment ? (
                          /* 4. DOCUMENT CARD (PDF, Excel, Reports) */
                          <div
                            className={`w-full max-w-[380px] bg-white dark:bg-[#2B5278] border border-slate-200/90 dark:border-[#38628B] text-slate-900 dark:text-white ${bubbleRadius} p-4 shadow-xs hover:shadow-sm transition-all duration-150`}
                          >
                            {msg.replyTo && (
                              <div className="mb-2.5 p-2 bg-slate-50 dark:bg-black/30 border-l-2 border-blue-600 dark:border-[#64B5F6] rounded-r text-xs">
                                <span className="font-bold text-blue-700 dark:text-[#64B5F6] block text-[11px]">
                                  {msg.replyTo.senderName}
                                </span>
                                <span className="text-slate-600 dark:text-blue-100 truncate block">
                                  {msg.replyTo.text}
                                </span>
                              </div>
                            )}

                            {!isMine && isFirstInGroup && (
                              <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-slate-100 dark:border-[#38628B]/60">
                                <span className="text-xs font-bold text-[#1E40AF] dark:text-[#93C5FD]">
                                  {msg.senderName}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-[#93C5FD]/80">shared an operational document</span>
                              </div>
                            )}

                            {(() => {
                              const badge = getFileBadgeInfo(msg.attachment.name, msg.attachment.type);
                              return (
                                <div className="flex items-start gap-3">
                                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${badge.bg}`}>
                                    {badge.icon}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate" title={msg.attachment.name}>
                                      {msg.attachment.name}
                                    </h5>
                                    <p className="text-[11px] text-slate-500 dark:text-[#93C5FD]/80 flex items-center gap-1 mt-0.5">
                                      <span>{badge.label}</span>
                                      <span>•</span>
                                      <span className="font-mono">{msg.attachment.size || 'Attached file'}</span>
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}

                            {msg.text && !msg.text.startsWith('Shared an operational attachment') && (
                              <p className="text-xs text-slate-900 dark:text-white mt-2.5 pt-2 border-t border-slate-100 dark:border-[#38628B]/60 leading-relaxed whitespace-pre-wrap">
                                {renderMessageContent(msg.text, false)}
                              </p>
                            )}

                            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#38628B]/60 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadFile(msg.attachment!);
                                  }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                  title={`Download ${msg.attachment.name}`}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download</span>
                                </button>

                                {(msg.attachment.dataUrl || msg.attachment.url) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePreviewFile(msg.attachment!);
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                    title="Preview document"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Preview</span>
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-[#93C5FD]/80">
                                <span>{formatMsgTime(msg.timestamp)}</span>
                                {isMine && (
                                  msg.status === 'sending' ? (
                                    <span title="Waiting for network" className="text-amber-500/90 dark:text-amber-400/90 flex items-center gap-1 ml-1 text-[10px] font-medium">
                                      <Clock className="w-3 h-3 animate-spin" />
                                      <span>Sending...</span>
                                    </span>
                                  ) : msg.status === 'read' ? (
                                    <span title="Seen" className="text-blue-600 dark:text-blue-400 flex items-center gap-0.5 font-medium ml-1">
                                      <CheckCheck className="w-3.5 h-3.5" />
                                      <span className="text-[10px]">Seen</span>
                                    </span>
                                  ) : (
                                    <span title="Delivered" className="text-slate-400 dark:text-[#93C5FD]/70 flex items-center gap-0.5 ml-1">
                                      <CheckCheck className="w-3.5 h-3.5" />
                                      <span className="text-[10px]">Delivered</span>
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        ) : isEmojiOnly ? (
                          /* EMOJI-ONLY TELEGRAM STYLE (Image 1 reference: No bubble card, big emoji, floating timestamp pill) */
                          <div className="relative inline-flex items-end gap-2.5 py-1 px-1">
                            <span className="text-6xl sm:text-7xl leading-none select-none filter drop-shadow-sm transition-transform duration-200 hover:scale-105 inline-block">
                              {msg.text}
                            </span>
                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900/60 dark:bg-black/60 backdrop-blur-md text-white text-[10.5px] font-mono shadow-xs select-none mb-1">
                              <span>{formatMsgTime(msg.timestamp)}</span>
                              {isMine && (
                                msg.status === 'sending' ? (
                                  <Clock className="w-3.5 h-3.5 text-white/60 animate-spin" />
                                ) : msg.status === 'read' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-white/80" />
                                )
                              )}
                            </div>
                          </div>
                        ) : (
                          /* 5. TEXT MESSAGE BUBBLE - CLEAN WHITE IN LIGHT THEME, #2B5278 IN DARK THEME FOR ALL (MATCHING IMAGES) */
                          <div
                            className={`px-4 py-2.5 shadow-2xs transition-all duration-150 ${bubbleRadius} ${
                              isMine
                                ? 'bg-white dark:bg-[#2B5278] border border-slate-200/90 dark:border-[#38628B] text-slate-900 dark:text-white'
                                : 'bg-white dark:bg-[#2B5278] border border-slate-200/90 dark:border-[#38628B] text-slate-900 dark:text-white'
                            }`}
                          >
                            {msg.replyTo && (
                              <div className={`mb-1.5 p-1.5 rounded-lg border-l-2 text-xs ${
                                isMine
                                  ? 'bg-slate-50 dark:bg-black/30 border-blue-600 dark:border-[#64B5F6] text-slate-700 dark:text-blue-100'
                                  : 'bg-slate-100 dark:bg-black/30 border-[#2563EB] dark:border-[#64B5F6] text-[#64748B] dark:text-blue-100'
                              }`}>
                                <span className={`font-bold block text-[11px] ${isMine ? 'text-blue-700 dark:text-[#64B5F6]' : 'text-[#2563EB] dark:text-[#64B5F6]'}`}>
                                  {msg.replyTo.senderName}
                                </span>
                                <span className="truncate block opacity-90">
                                  {msg.replyTo.text}
                                </span>
                              </div>
                            )}

                            {!isMine && isFirstInGroup && (
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-xs font-bold text-[#1E40AF] dark:text-[#93C5FD]">
                                  {msg.senderName}
                                </span>
                              </div>
                            )}

                            <p className="text-[13.5px] sm:text-[14px] leading-relaxed whitespace-pre-wrap font-normal text-slate-900 dark:text-white">
                              {renderMessageContent(msg.text, isMine)}
                            </p>

                            <div className={`flex items-center justify-end gap-1 text-[10.5px] sm:text-[11px] mt-1 ${
                              isMine ? 'text-slate-400 dark:text-[#93C5FD]/80 font-medium' : 'text-[#64748B] dark:text-[#93C5FD]/80'
                            }`}>
                              <span>{formatMsgTime(msg.timestamp)}</span>
                              {isMine && (
                                msg.status === 'sending' ? (
                                  <span title="Waiting for network" className="text-amber-500/90 dark:text-amber-400/90 flex items-center gap-1 ml-1 font-medium">
                                    <Clock className="w-3 h-3 animate-spin" />
                                    <span className="text-[10px]">Sending...</span>
                                  </span>
                                ) : msg.status === 'read' ? (
                                  <span title="Read / Seen" className="text-blue-600 dark:text-blue-400 flex items-center gap-0.5 font-medium ml-1">
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    <span className="text-[10px]">Seen</span>
                                  </span>
                                ) : (
                                  <span title="Delivered" className="text-slate-400 dark:text-[#93C5FD]/70 flex items-center gap-0.5 ml-1">
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    <span className="text-[10px]">Delivered</span>
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {/* Interactive Click Action Popover Menu (Reactions, Reply, Select, Copy) */}
                        {isMenuOpen && !isSelectionMode && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute z-30 ${
                              isMine ? 'right-0' : 'left-0'
                            } -top-16 bg-white dark:bg-[#1A120E] border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl p-1.5 flex flex-col gap-1 min-w-[260px] animate-in fade-in zoom-in-95 duration-150`}
                          >
                            <div className="flex items-center justify-between gap-1 px-1 py-1 border-b border-slate-100 dark:border-slate-700/60">
                              {COMMON_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleReactionClick(msg.id, emoji)}
                                  className="text-base hover:scale-130 transition-transform p-1 cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-[#261C16]"
                                  title={`React with ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center justify-around gap-1 pt-1 text-xs font-semibold text-[#0F172A] dark:text-[#F3EAE4]">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo(msg);
                                  setActiveMenuMessageId(null);
                                  textareaRef.current?.focus();
                                }}
                                className="flex-1 py-1 px-2 rounded-lg hover:bg-blue-50 dark:hover:bg-[#2A1D17] hover:text-[#2563EB] dark:hover:text-[#D4A373] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                <CornerUpLeft className="w-3.5 h-3.5" />
                                <span>Reply</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleStartSelection(msg.id)}
                                className="flex-1 py-1 px-2 rounded-lg hover:bg-blue-50 dark:hover:bg-[#2A1D17] hover:text-[#2563EB] dark:hover:text-[#D4A373] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                <CheckSquare className="w-3.5 h-3.5" />
                                <span>Select</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg.text)}
                                className="flex-1 py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#261C16] flex items-center justify-center gap-1 transition-colors cursor-pointer text-[#64748B] dark:text-slate-400 dark:hover:text-white"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Compact Reaction Chips */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className={`flex flex-wrap gap-1.5 mt-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          {Object.entries(msg.reactions).map(([emoji, usersArr]) => {
                            const hasReacted = usersArr.includes(normCurrentUserId);
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleReactionClick(msg.id, emoji)}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                                  hasReacted
                                    ? 'bg-blue-50 dark:bg-[#1E3A5F] border-blue-300 dark:border-[#3E70A6] text-[#2563EB] dark:text-[#93C5FD] shadow-2xs'
                                    : 'bg-white dark:bg-[#182635] border-slate-200 dark:border-[#2A3F54] text-slate-800 dark:text-white hover:border-slate-300 dark:hover:border-[#385472] dark:hover:bg-[#203244]'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span className="text-[11px] font-medium">{usersArr.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Multi-Select Checkbox for My Messages (right side) */}
                    {isSelectionMode && isMine && (
                      <button
                        type="button"
                        onClick={() => handleToggleSelectMessage(msg.id)}
                        className="mb-2 text-[#2563EB] dark:text-blue-400 cursor-pointer p-0.5"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 fill-blue-600 text-white dark:fill-[#D4A373] dark:text-[#100B09]" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300 dark:text-[#5A4032]" />
                        )}
                      </button>
                    )}

                    {/* Sender Avatar for My Sent Messages */}
                    {isMine && !isSelectionMode && (
                      <div className="w-8 h-8 shrink-0 self-end mb-0.5">
                        {isLastInGroup ? (
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-2xs">
                            {currentUserPhoto ? (
                              <img
                                src={currentUserPhoto}
                                alt={user?.name || user?.fullName || 'Me'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <span>{currentUserInitials || 'ME'}</span>
                            )}
                          </div>
                        ) : (
                          <div className="w-8 h-8" aria-hidden="true" />
                        )}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ============================================================== */}
        {/* MESSAGE COMPOSER BAR (Matching User Mockup Image 1)             */}
        {/* ============================================================== */}
        <div className="sticky bottom-0 bg-[#F8FAFC] dark:bg-[#0B0F17] px-4 sm:px-6 pb-4 pt-1 shrink-0 transition-colors">
          <div className="w-full max-w-3xl mr-auto">
            {/* Replying Banner (if active) */}
            {replyingTo && (
              <div className="mb-2 px-3.5 py-1.5 bg-white dark:bg-slate-800 border-l-3 border-[#2563EB] rounded-r-xl border border-l-0 border-[#E2E8F0] dark:border-slate-800 shadow-2xs flex items-center justify-between animate-in fade-in duration-150">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#2563EB] dark:text-blue-400">
                    <CornerUpLeft className="w-3.5 h-3.5" />
                    <span>Replying to {replyingTo.senderName}</span>
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                    {replyingTo.text || (replyingTo.attachment ? replyingTo.attachment.name : 'Attachment')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200 p-1 cursor-pointer"
                  title="Cancel reply"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Attached File Preview Badge (if pending) */}
            {selectedAttachment && (
              <div className="mb-2 px-3 py-1.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#2563EB] dark:text-blue-300 font-semibold truncate">
                  <FileText className="w-4 h-4 text-[#2563EB] dark:text-blue-400 shrink-0" />
                  <span className="truncate">{selectedAttachment.name}</span>
                  <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-mono shrink-0">
                    ({selectedAttachment.size})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAttachment(null)}
                  className="text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  title="Remove attachment"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Clean Single-Line Bar matching Image 1: [Paperclip] [Auto-growing Textarea] [Smile] [Send] */}
            <form
              onSubmit={handleSendMessage}
              className="flex items-end gap-2.5 bg-white dark:bg-slate-800 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 shadow-sm px-4 py-2 focus-within:border-[#2563EB] dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all duration-150"
            >
              {/* Paperclip Button on left */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0 p-1 mb-0.5"
                title="Attach photo, video or document"
              >
                <Paperclip className="w-5 h-5 -rotate-45" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Textarea with right-side spacing that auto-expands up to 3 lines, scrollable above */}
              <div className="flex-1 min-w-0 pr-4 mr-1.5">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder={userT('Write a message...')}
                  className="w-full bg-transparent text-sm leading-5 text-[#0F172A] dark:text-slate-100 placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none resize-none overflow-y-hidden py-1 max-h-[76px] transition-all block"
                  style={{ minHeight: '24px' }}
                />
              </div>

              {/* Right icons: Smile & Send button */}
              <div className="flex items-center gap-2 shrink-0 relative mb-0.5">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    showEmojiPicker ? 'text-[#2563EB] dark:text-blue-400' : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200'
                  }`}
                  title="Insert emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>

                {/* Categorized Rich Emoji Selector Drawer */}
                {showEmojiPicker && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 bottom-12 z-40 w-72 sm:w-80 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-2xl rounded-2xl p-3 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-bold text-[#0F172A] dark:text-slate-100">Emojis</span>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(false)}
                        className="p-1 text-[#64748B] hover:text-[#0F172A] dark:hover:text-slate-200 rounded-lg cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                      {EMOJI_CATEGORIES.map((cat) => (
                        <div key={cat.name}>
                          <span className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block mb-1">
                            {cat.name}
                          </span>
                          <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                            {cat.emojis.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  setInputText((prev) => prev + emoji);
                                  textareaRef.current?.focus();
                                }}
                                className="p-1 text-base hover:scale-130 transition-transform cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Circular Send Button (shown when user types or has an attachment) */}
                {(inputText.trim() || selectedAttachment) && (
                  <button
                    type="submit"
                    disabled={isSending}
                    className="w-8 h-8 rounded-full bg-[#2563EB] hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center shadow-xs transition-all cursor-pointer animate-in zoom-in-75 duration-150"
                    title="Send message"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT INFORMATION PANEL (Slide-in Conversation Details)        */}
      {/* ============================================================== */}
      {showInfoPanel && (
        <div className="w-80 shrink-0 border-l border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-800 flex flex-col h-full overflow-y-auto animate-in slide-in-from-right-2 duration-200 transition-colors">
          
          {/* Header */}
          <div className="h-16 px-5 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between shrink-0">
            <h4 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">
              {userT('Conversation Details')}
            </h4>
            <button
              type="button"
              onClick={() => setShowInfoPanel(false)}
              className="p-1.5 text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-6">
            
            {/* Contact Profile Overview with Profile Photo */}
            <div className="text-center space-y-2 pb-5 border-b border-[#E2E8F0] dark:border-slate-800">
              <div className="relative inline-block">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-xs mx-auto border-2 border-white dark:border-slate-700">
                  {contactPhoto ? (
                    <img
                      src={contactPhoto}
                      alt={selectedContact?.fullName || selectedContact?.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span>{selectedContactInitials}</span>
                  )}
                </div>
              </div>

              <div>
                <h5 className="text-base font-bold text-[#0F172A] dark:text-slate-100">
                  {selectedContact?.fullName || selectedContact?.name}
                </h5>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-100 dark:border-blue-900">
                  {selectedContact?.role === 'manager' ? userT('Executive Operations Manager') : userT('Regional Field Supervisor')}
                </span>
              </div>
            </div>

            {/* Contact Details (Cleaned: removed 'All' and 'Day Operations Shift') */}
            <div className="space-y-3 pb-5 border-b border-[#E2E8F0] dark:border-slate-800">
              <h6 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                {userT('Contact Details')}
              </h6>

              <div className="space-y-2.5 text-xs text-[#0F172A] dark:text-slate-200">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#64748B] dark:text-slate-400 shrink-0" />
                  <span className="truncate">{selectedContact?.email || 'operations@fieldsync.com'}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#64748B] dark:text-slate-400 shrink-0" />
                  <span>{selectedContact?.phone || '+251-911-000000'}</span>
                </div>
                {selectedContact?.region && selectedContact.region !== 'All' && selectedContact.region !== 'All Zones' && (
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-[#64748B] dark:text-slate-400 shrink-0" />
                    <span>{translateText(selectedContact.region, language)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 1. SHARED MEDIA (Photos & Videos Grid) */}
            <div className="space-y-3 pb-5 border-b border-[#E2E8F0] dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h6 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                  {userT('Shared Media')}
                </h6>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-slate-400">
                  {sharedMedia.length}
                </span>
              </div>

              {sharedMedia.length === 0 ? (
                <p className="text-xs text-[#64748B] dark:text-slate-400 py-1">{userT('No photos or videos shared yet.')}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {sharedMedia.map((media, idx) => (
                    <div
                      key={idx}
                      onClick={() => setLightboxMedia({
                        url: media.dataUrl || media.url!,
                        name: media.name,
                        size: media.size,
                        isVideo: media.isVideo,
                      })}
                      className="group/thumb relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 cursor-pointer shadow-2xs"
                    >
                      {media.isVideo ? (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white">
                          <Play className="w-6 h-6 fill-white" />
                        </div>
                      ) : (
                        <img
                          src={media.dataUrl || media.url}
                          alt={media.name}
                          className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-200"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                        <Download
                          className="w-4 h-4 text-white hover:scale-125 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFile(media);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. SHARED DOCUMENTS & FILES */}
            <div className="space-y-3 pb-5 border-b border-[#E2E8F0] dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h6 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                  {userT('Shared Documents')}
                </h6>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-slate-400">
                  {sharedDocs.length}
                </span>
              </div>

              {sharedDocs.length === 0 ? (
                <p className="text-xs text-[#64748B] dark:text-slate-400 py-1">{userT('No documents shared yet.')}</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {sharedDocs.map((file, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#111827] flex items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-[#2563EB] dark:text-blue-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#0F172A] dark:text-slate-100 truncate" title={file.name}>
                            {file.name}
                          </p>
                          <span className="text-[10px] text-[#64748B] dark:text-slate-400">{file.size}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadFile(file)}
                        className="p-1.5 text-[#2563EB] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg cursor-pointer"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. SHARED WEB LINKS */}
            <div className="space-y-3 pb-5 border-b border-[#E2E8F0] dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h6 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                  {userT('Shared Links')}
                </h6>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-slate-400">
                  {sharedLinks.length}
                </span>
              </div>

              {sharedLinks.length === 0 ? (
                <p className="text-xs text-[#64748B] dark:text-slate-400 py-1">{userT('No shared links in this conversation yet.')}</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {sharedLinks.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#111827] flex items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group/link"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Link2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#0F172A] dark:text-slate-100 truncate group-hover/link:text-[#2563EB] dark:group-hover/link:text-blue-400">
                            {item.url}
                          </p>
                          <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-mono">{item.domain}</span>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[#64748B] dark:text-slate-400 group-hover/link:text-[#2563EB] shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* 4. NOTIFICATION & ALERT SETTINGS */}
            <div className="space-y-3">
              <h6 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                {userT('Alert Preferences')}
              </h6>

              <div className="space-y-2.5 text-xs text-[#0F172A] dark:text-slate-200">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    {isMuted ? <BellOff className="w-4 h-4 text-[#64748B] dark:text-slate-400" /> : <Bell className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />}
                    <span>{userT('Mute Thread Alerts')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isMuted}
                    onChange={(e) => setIsMuted(e.target.checked)}
                    className="w-4 h-4 text-[#2563EB] rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>{userT('High Priority Sound')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={priorityAlerts}
                    onChange={(e) => setPriorityAlerts(e.target.checked)}
                    className="w-4 h-4 text-[#2563EB] rounded focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FULLSCREEN MEDIA LIGHTBOX MODAL                                */}
      {/* ============================================================== */}
      {lightboxMedia && (
        <div
          onClick={() => setLightboxMedia(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
        >
          {/* Top Bar */}
          <div className="w-full max-w-4xl flex items-center justify-between text-white mb-3" onClick={(e) => e.stopPropagation()}>
            <div className="min-w-0">
              <h5 className="text-sm font-bold truncate">{lightboxMedia.name}</h5>
              {lightboxMedia.size && <span className="text-xs text-slate-400">{lightboxMedia.size}</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadFile(lightboxMedia)}
                className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
              <button
                type="button"
                onClick={() => setLightboxMedia(null)}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Media View */}
          <div className="max-w-4xl max-h-[80vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {lightboxMedia.isVideo ? (
              <video controls autoPlay src={lightboxMedia.url} className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl" />
            ) : (
              <img
                src={lightboxMedia.url}
                alt={lightboxMedia.name}
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
              />
            )}
          </div>
        </div>
      )}

    </div>
  );
}
