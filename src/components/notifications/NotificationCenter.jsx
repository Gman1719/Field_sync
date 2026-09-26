// src/components/notifications/NotificationCenter.jsx
// Modern, Ultra-Clean Notification Center for FieldSync
// Features: Real-time alerts, category filters, unread management, deep links, dark-mode ready

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Search,
  CheckCheck,
  Trash2,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Shield,
  ArrowRight,
  Layers,
  FileText,
  UserCheck,
  X,
  Check
} from 'lucide-react';
import {
  fetchNotifications,
  markNotificationRead,
  markNotificationUnread,
  markAllNotificationsRead,
  deleteNotification,
} from '../../services/notificationApi';
import toast from 'react-hot-toast';

const CATEGORY_CHIPS = [
  { id: 'ALL', label: 'All', icon: Layers },
  { id: 'REPORT', label: 'Reports', icon: FileText },
  { id: 'SYNC', label: 'Sync', icon: Layers },
  { id: 'ASSIGNMENT', label: 'Assignments', icon: UserCheck },
  { id: 'SECURITY', label: 'Security', icon: Shield },
  { id: 'SYSTEM', label: 'System', icon: Bell },
];

export default function NotificationCenter({ user, setActiveTab }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });

  // Load notifications from server/local store
  const loadData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);

      try {
        const res = await fetchNotifications({
          page,
          limit: 15,
          status: statusFilter,
          priority: 'ALL',
          category: categoryFilter,
          search: searchQuery,
        });

        if (res && res.success) {
          setNotifications(res.notifications || []);
          if (res.pagination) {
            setPagination(res.pagination);
          }
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    },
    [page, statusFilter, categoryFilter, searchQuery]
  );

  useEffect(() => {
    loadData();
    // Auto-refresh interval (React background live polling)
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Handler for marking single read
  const handleMarkRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      toast.success('Marked as read', { duration: 1200 });
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch {
      toast.error('Failed to update notification');
    }
  };

  // Handler for marking single unread
  const handleMarkUnread = async (id, e) => {
    e?.stopPropagation();
    try {
      await markNotificationUnread(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false, readAt: null } : n))
      );
      toast.success('Marked as unread', { duration: 1200 });
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch {
      toast.error('Failed to update notification');
    }
  };

  // Handler for mark all as read
  const handleMarkAllRead = async () => {
    try {
      const count = await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      toast.success(`All marked as read (${count || 'done'})`);
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  // Handler for deletion
  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      toast.success('Notification removed', { duration: 1200 });
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  // Deep-link action navigation
  const handleActionClick = (notification) => {
    if (!notification.isRead) {
      handleMarkRead(notification.id);
    }

    const actionUrl = notification.actionUrl || '';
    if (!actionUrl || !setActiveTab) return;

    const cleanRoute = actionUrl.replace(/^\//, '');
    if (cleanRoute) {
      setActiveTab(cleanRoute);
    }
  };

  // Format date helper with time ago
  const formatTimeAgo = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Clean White Modern Header Card */}
      <div className="p-6 rounded-2xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-[#3B82F6] border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white dark:border-[#14161D]" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-[#3B82F6] border border-blue-200 dark:border-blue-900/40">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Operational updates, verifications, and system events
            </p>
          </div>
        </div>

        {/* Action Toolbar (Refresh button removed - auto-refreshes automatically) */}
        {unreadCount > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All Read</span>
            </button>
          </div>
        )}
      </div>

      {/* Control Bar: Modern Segmented Tabs & Search */}
      <div className="p-4 rounded-2xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Segmented Status Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#1E222D] border border-slate-200/60 dark:border-[#272A35] text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-[#14161D] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('unread');
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'unread'
                  ? 'bg-white dark:bg-[#14161D] text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-600 text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('read');
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'read'
                  ? 'bg-white dark:bg-[#14161D] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Read
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search notifications..."
              className="w-full pl-10 pr-9 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#1E222D] border border-slate-200 dark:border-[#272A35] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-[#272A35]">
          {CATEGORY_CHIPS.map((chip) => {
            const Icon = chip.icon;
            const isSelected = categoryFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  setCategoryFilter(chip.id);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                    : 'bg-slate-50 dark:bg-[#1E222D] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{chip.label}</span>
              </button>
            );
          })}

          {(categoryFilter !== 'ALL' || searchQuery.trim()) && (
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('ALL');
                setSearchQuery('');
                setPage(1);
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold ml-auto"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Notifications List Container */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="py-20 text-center rounded-2xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] p-6 space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Loading notifications...
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] p-8 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-[#1E222D] border border-blue-100 dark:border-[#272A35] flex items-center justify-center mx-auto text-blue-500">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              You're All Caught Up
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              {searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'all'
                ? 'No notifications match your current filter or search criteria.'
                : 'No unread alerts or operational notifications at this time.'}
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const isUnread = !n.isRead;

            return (
              <div
                key={n.id}
                onClick={() => handleActionClick(n)}
                className={`relative rounded-2xl border transition-all cursor-pointer p-4 sm:p-5 flex items-start justify-between gap-4 group ${
                  isUnread
                    ? 'bg-blue-50/60 dark:bg-blue-950/30 border-slate-200 dark:border-[#272A35] shadow-xs hover:bg-blue-50/80 dark:hover:bg-blue-950/50'
                    : 'bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Content Block (Image/icon on left removed per user request; background color distinguishes read vs unread) */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4
                      className={`text-xs sm:text-sm font-bold tracking-tight ${
                        isUnread ? 'text-slate-900 dark:text-white font-extrabold' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {n.title}
                    </h4>

                    {n.type && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 dark:bg-[#1E222D] text-slate-600 dark:text-slate-300">
                        {n.type}
                      </span>
                    )}

                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block shrink-0" title="Unread" />
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                    {n.message}
                  </p>

                  {/* Metadata Row */}
                  <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatTimeAgo(n.createdAt)}
                    </span>

                    {n.actionUrl && (
                      <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold group-hover:underline">
                        <span>Open Detail</span>
                        <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Action Buttons on Hover */}
                <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  {isUnread ? (
                    <button
                      type="button"
                      onClick={(e) => handleMarkRead(n.id, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleMarkUnread(n.id, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E222D] transition-colors"
                      title="Mark as unread"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDelete(n.id, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between p-4 rounded-xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] text-xs">
          <span className="text-slate-500">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} notifications)
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#272A35] disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-[#1E222D]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#272A35] disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-[#1E222D]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
