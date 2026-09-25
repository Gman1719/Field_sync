// src/components/notifications/NotificationCenter.jsx
// Dedicated Role-Based Notification Center for FieldSync

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  CheckCheck,
  AlertTriangle,
  AlertOctagon,
  Info,
  ExternalLink,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Inbox,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  fetchNotifications,
  markNotificationRead,
  markNotificationUnread,
  markAllNotificationsRead,
  deleteNotification
} from '../../services/notificationApi';
import toast from 'react-hot-toast';

export default function NotificationCenter({ user, setActiveTab }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'unread', 'read'
  const [priorityFilter, setPriorityFilter] = useState('ALL'); // 'ALL', 'NORMAL', 'IMPORTANT', 'URGENT'
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL', 'REPORT', 'SYNC', 'DUPLICATE', 'ASSIGNMENT', 'SECURITY', 'USER'
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });

  // Load notifications from server/local store
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetchNotifications({
        page,
        limit: 15,
        status: statusFilter,
        priority: priorityFilter,
        category: categoryFilter,
        search: searchQuery,
      });

      if (res.success) {
        setNotifications(res.notifications || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, statusFilter, priorityFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler for marking single read
  const handleMarkRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
      );
      toast.success('Marked as read', { duration: 1500 });
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
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: false, readAt: null } : n)
      );
      toast.success('Marked as unread', { duration: 1500 });
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch {
      toast.error('Failed to update notification');
    }
  };

  // Handler for mark all as read
  const handleMarkAllRead = async () => {
    try {
      const count = await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      toast.success(`Marked all as read (${count || 'done'})`);
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
      setNotifications(prev => prev.filter(n => n.id !== id));
      setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      toast.success('Notification removed', { duration: 1500 });
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

    // Convert route to tab ID
    const cleanRoute = actionUrl.replace(/^\//, '');
    if (cleanRoute) {
      setActiveTab(cleanRoute);
    }
  };

  // Priority Badge rendering
  const renderPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse">
            <AlertOctagon className="w-3 h-3 text-rose-600 dark:text-rose-400" />
            Urgent
          </span>
        );
      case 'IMPORTANT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            Important
          </span>
        );
      case 'NORMAL':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Info className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            Normal
          </span>
        );
    }
  };

  // Type / Category Badge rendering
  const renderCategoryIcon = (type, priority) => {
    const isUrgent = priority === 'URGENT';
    const isImportant = priority === 'IMPORTANT';

    let bg = 'bg-blue-100 text-[#1E3A8A]';
    if (isUrgent) bg = 'bg-rose-100 text-rose-700';
    else if (isImportant) bg = 'bg-amber-100 text-amber-700';

    return (
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${bg}`}>
        {isUrgent ? (
          <AlertOctagon className="w-4 h-4" />
        ) : isImportant ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
      </div>
    );
  };

  // Format date helper
  const formatDate = (isoString) => {
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

  const unreadOnScreen = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#1E3A8A] to-blue-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-200 border border-white/10 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Role-Scoped Notification Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">System Alerts & Notifications</h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Real-time audit alerts, sync events, daily report reviews, and operational notifications tailored to your{' '}
              <span className="font-semibold text-white capitalize">{user?.role?.replace('_', ' ') || 'Staff'}</span> workstation.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              title="Refresh notifications"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All as Read</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-xs border border-slate-200 dark:border-[#334155] p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-[#0F172A] rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setStatusFilter('all'); setPage(1); }}
              className={`px-4 py-2 rounded-lg transition-all ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Notifications
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('unread'); setPage(1); }}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                statusFilter === 'unread'
                  ? 'bg-white dark:bg-[#1E293B] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Unread</span>
              {unreadOnScreen > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-bold">
                  {unreadOnScreen}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('read'); setPage(1); }}
              className={`px-4 py-2 rounded-lg transition-all ${
                statusFilter === 'read'
                  ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Read
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search notifications by title, details or dates..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all"
            />
          </div>
        </div>

        {/* Secondary Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-[#334155] text-xs">
          <span className="text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </span>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-lg text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6]"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent Only</option>
            <option value="IMPORTANT">Important Only</option>
            <option value="NORMAL">Normal Only</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-lg text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6]"
          >
            <option value="ALL">All Categories</option>
            <option value="REPORT">Daily Reports</option>
            <option value="SYNC">Synchronization</option>
            <option value="DUPLICATE">Duplicate Reviews</option>
            <option value="ASSIGNMENT">Field Assignments</option>
            <option value="SECURITY">Security & Auth</option>
            <option value="USER">User Management</option>
          </select>

          {(priorityFilter !== 'ALL' || categoryFilter !== 'ALL' || searchQuery.trim()) && (
            <button
              type="button"
              onClick={() => {
                setPriorityFilter('ALL');
                setCategoryFilter('ALL');
                setSearchQuery('');
                setPage(1);
              }}
              className="text-xs text-blue-600 dark:text-[#60A5FA] hover:text-blue-800 dark:hover:text-blue-300 font-semibold hover:underline ml-2"
            >
              Reset Filters
            </button>
          )}

          <div className="ml-auto text-xs text-slate-400 dark:text-slate-500">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{notifications.length}</span> of{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{pagination.total}</span>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-xs border border-slate-200 dark:border-[#334155] overflow-hidden divide-y divide-slate-100 dark:divide-[#334155]">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#2563EB] dark:text-[#60A5FA] animate-spin mx-auto" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center space-y-3 px-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">No Notifications Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery || priorityFilter !== 'ALL' || categoryFilter !== 'ALL' || statusFilter !== 'all'
                ? 'Try adjusting your search query or filters to find what you are looking for.'
                : 'You are all caught up! When updates or alerts occur in your jurisdiction, they will appear here.'}
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const isUnread = !n.isRead;
            return (
              <div
                key={n.id}
                onClick={() => handleActionClick(n)}
                className={`p-4 sm:p-5 flex items-start gap-4 transition-colors cursor-pointer group ${
                  isUnread ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {/* Icon */}
                {renderCategoryIcon(n.type, n.priority)}

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-semibold tracking-tight ${isUnread ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-800 dark:text-slate-200'}`}>
                      {n.title}
                    </span>
                    {renderPriorityBadge(n.priority)}
                    {n.type && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 dark:bg-[#0F172A] text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-[#334155]">
                        {n.type}
                      </span>
                    )}
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" title="Unread" />
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                    {n.message}
                  </p>

                  <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      {formatDate(n.createdAt)}
                    </span>

                    {n.actionUrl && (
                      <span className="inline-flex items-center gap-1 text-[#2563EB] dark:text-[#60A5FA] font-semibold group-hover:underline">
                        <span>View details</span>
                        <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                  {isUnread ? (
                    <button
                      type="button"
                      onClick={(e) => handleMarkRead(n.id, e)}
                      className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleMarkUnread(n.id, e)}
                      className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Mark as unread"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDelete(n.id, e)}
                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                    title="Delete notification"
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
        <div className="flex items-center justify-between bg-white dark:bg-[#1E293B] px-4 py-3 rounded-xl border border-slate-200 dark:border-[#334155] text-xs shadow-xs">
          <div className="text-slate-500 dark:text-slate-400">
            Page <span className="font-semibold text-slate-800 dark:text-slate-200">{pagination.page}</span> of{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{pagination.totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-2 border border-slate-200 dark:border-[#334155] rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              className="p-2 border border-slate-200 dark:border-[#334155] rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
