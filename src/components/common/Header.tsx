import React, { useState, useEffect, useCallback } from 'react';
import {
  Menu,
  Bell,
  Clock,
  ChevronRight,
  User,
  LogOut,
  Check,
  Sun,
  Moon,
} from 'lucide-react';
import SyncBadge from '../ui/SyncBadge';
import LanguageSelector from './LanguageSelector';
import { useUserLanguage } from '../../context/UserLanguageContext';
import { useTheme } from '../../context/ThemeContext';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead as apiMarkRead,
  markAllNotificationsRead as apiMarkAllRead,
} from '../../services/notificationApi';

export interface HeaderProps {
  user: any;
  isOnline?: boolean;
  syncing?: boolean;
  pendingSync?: number;
  screenTimeDisplay?: string;
  isScreenTimeRunning?: boolean;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  notifications?: any[];
  markNotificationRead?: (id: string) => void;
  markAllNotificationsRead?: () => void;
  setIsMobileOpen?: (open: boolean) => void;
  onLogout?: () => void;
  [key: string]: any;
}

export default function Header({
  user,
  isOnline = true,
  syncing = false,
  pendingSync = 0,
  screenTimeDisplay = '00:00:00',
  isScreenTimeRunning = false,
  activeTab = 'dashboard',
  setActiveTab,
  setIsMobileOpen,
  onLogout,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { currentUserLanguage, changeUserLanguage, userLanguages, userT } = useUserLanguage();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isOfficer = user?.role === 'field_officer';

  const tabTitles: Record<string, string> = {
    dashboard: 'Dashboard Overview',
    register: 'Citizen Registration',
    reports: 'Daily Field Reports',
    report_new: 'Submit Daily Report',
    attendance: 'Attendance Management',
    manager_attendance: 'Attendance Review',
    tasks: 'Tasks & Assignments',
    screentime: 'Screen Time & Activity',
    supervisor_reports: 'Supervisor Evaluations',
    team: 'Field Team Directory',
    users: 'User Management',
    analytics: 'Analysis and Detail',
    citizens: 'Citizen Database',
    audit: 'System Audit Trail',
    all_reports: 'All Daily Reports',
    alerts: 'Emergency Alerts',
    verification: 'Officer Security Verification',
    send_alert: 'Send Alert',
    requests: isOfficer ? 'My Requests' : 'Leave & Permission Requests',
    leaves: 'Leave Management',
    permissions: 'Permission Management',
    notifications: 'Notifications & Alerts',
    profile: 'My Profile & Workstation',
    profile_security: 'Security & Change Password',
    activity_logs: 'Activity Logs',
    chat: user?.role === 'supervisor' ? 'Manager Chat' : 'Supervisor Chat',
  };

  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [liveUnreadCount, setLiveUnreadCount] = useState(0);

  const loadNotificationsData = useCallback(async () => {
    try {
      const [count, listRes] = await Promise.all([
        fetchUnreadCount(),
        fetchNotifications({ page: 1, limit: 6, status: 'all' }),
      ]);
      if (typeof count === 'number') {
        setLiveUnreadCount(count);
      }
      if (listRes?.success && Array.isArray(listRes.notifications)) {
        setRecentNotifications(listRes.notifications);
      }
    } catch (err) {
      console.warn('Failed to load notifications in Header:', err);
    }
  }, []);

  useEffect(() => {
    loadNotificationsData();

    const handleUpdate = () => {
      loadNotificationsData();
    };

    window.addEventListener('notifications-updated', handleUpdate);
    const interval = setInterval(loadNotificationsData, 20000);

    return () => {
      window.removeEventListener('notifications-updated', handleUpdate);
      clearInterval(interval);
    };
  }, [loadNotificationsData]);

  const handleItemClick = async (item: any) => {
    if (!item.isRead) {
      await apiMarkRead(item.id);
      setRecentNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      setLiveUnreadCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    }
    setShowNotifications(false);
    if (item.actionUrl && setActiveTab) {
      setActiveTab(item.actionUrl.replace(/^\//, ''));
    } else if (setActiveTab) {
      setActiveTab('notifications');
    }
  };

  const handleMarkAllHeader = async () => {
    await apiMarkAllRead();
    setRecentNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setLiveUnreadCount(0);
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shadow-xs transition-colors duration-200">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => setIsMobileOpen && setIsMobileOpen(true)}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-400 dark:text-slate-500">
            <span className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">FieldSync</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
            <span className="text-slate-600 dark:text-slate-400 font-medium capitalize truncate">
              {userT(user?.role?.replace('_', ' ') || 'Staff')}
            </span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate tracking-tight">
            {userT(tabTitles[activeTab] || 'Overview')}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <SyncBadge
          isOnline={isOnline}
          syncing={syncing}
          pendingSync={pendingSync}
          onClick={() => window.dispatchEvent(new CustomEvent('force-sync'))}
        />

        {isOfficer && (
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border shadow-xs ${
              isScreenTimeRunning
                ? 'bg-blue-50 text-[#2563EB] border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900/60'
                : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            }`}
            title="Today's Cumulative Screen Time"
          >
            <Clock
              className={`w-3.5 h-3.5 ${
                isScreenTimeRunning ? 'text-[#2563EB] dark:text-blue-400 animate-pulse' : 'text-slate-400 dark:text-slate-500'
              }`}
            />
            <span className="font-semibold">{screenTimeDisplay || '00:00:00'}</span>
          </div>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle color theme"
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        <LanguageSelector />

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            {liveUnreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-bold ring-2 ring-white dark:ring-[#111827] flex items-center justify-center">
                {liveUnreadCount > 9 ? '9+' : liveUnreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-0 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
              onMouseLeave={() => setShowNotifications(false)}
            >
              <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Notifications</span>
                  {liveUnreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold">
                      {liveUnreadCount} new
                    </span>
                  )}
                </div>
                {liveUnreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllHeader}
                    className="text-[11px] text-[#2563EB] dark:text-blue-400 hover:underline font-semibold"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-[#334155]">
                {recentNotifications.length === 0 ? (
                  <div className="py-10 text-center space-y-1">
                    <Bell className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No notifications yet</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Updates for your workstation will appear here.
                    </p>
                  </div>
                ) : (
                  recentNotifications.map((n) => {
                    const isUnread = !n.isRead;
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleItemClick(n)}
                        className={`p-3.5 text-left text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                          isUnread ? 'bg-blue-50/40 dark:bg-blue-950/20' : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {n.priority === 'URGENT' ? (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 shrink-0">
                                URGENT
                              </span>
                            ) : n.priority === 'IMPORTANT' ? (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 shrink-0">
                                IMPORTANT
                              </span>
                            ) : null}
                            <span
                              className={`font-semibold truncate ${
                                isUnread ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {n.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-mono">
                            {n.createdAt
                              ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(false);
                    if (setActiveTab) setActiveTab('notifications');
                  }}
                  className="w-full py-1.5 text-center text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Open Notification Center</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-[#2563EB] text-white font-bold text-sm flex items-center justify-center shadow-xs overflow-hidden">
              {(user?.profilePhotoUrl || (user?.id ? localStorage.getItem(`fieldsync_avatar_${user.id}`) : null)) ? (
                <img
                  src={user?.profilePhotoUrl || (user?.id ? localStorage.getItem(`fieldsync_avatar_${user.id}`) : null) || ''}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : user?.name ? (
                user.name.charAt(0).toUpperCase()
              ) : (
                'U'
              )}
            </div>
            <span className="hidden md:inline text-sm font-bold text-slate-800 dark:text-slate-200">
              {user?.name?.split(' ')[0] || 'User'}
            </span>
          </button>

          {showUserMenu && (
            <div
              className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-modal border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
              onMouseLeave={() => setShowUserMenu(false)}
            >
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email || ''}</p>
                <span className="inline-block mt-1 text-xs uppercase font-bold tracking-wider text-[#2563EB] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/70 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  {user?.role?.replace('_', ' ') || 'Staff'}
                </span>
              </div>

              <div className="p-1.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (setActiveTab) setActiveTab('profile');
                    setShowUserMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
                  {userT('My Profile')}
                </button>
                <div className="h-px bg-slate-100 dark:bg-[#334155] my-1" />
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full px-3 py-2 text-left text-sm font-medium text-red-600 dark:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  {userT('Sign Out')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
