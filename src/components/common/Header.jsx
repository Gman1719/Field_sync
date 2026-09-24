import React, { useState, useEffect, useCallback } from 'react';
import {
  Menu,
  Bell,
  Clock,
  Globe,
  ChevronRight,
  User,
  LogOut,
  Check,
  KeyRound,
  AlertOctagon,
  AlertTriangle,
  Info,
  ArrowRight
} from 'lucide-react';
import SyncBadge from '../ui/SyncBadge';
import { useUserLanguage } from '../../context/UserLanguageContext';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead as apiMarkRead,
  markAllNotificationsRead as apiMarkAllRead
} from '../../services/notificationApi';

export default function Header({
  user,
  isOnline = true,
  syncing = false,
  pendingSync = 0,
  screenTimeDisplay = '00:00:00',
  isScreenTimeRunning = false,
  activeTab = 'dashboard',
  setActiveTab,
  notifications = [],
  markNotificationRead,
  markAllNotificationsRead,
  setIsMobileOpen,
  onLogout
}) {
  const { currentLanguage, changeLanguage, userLanguages } = useUserLanguage();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Tab Titles Map
  const tabTitles = {
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
    analytics: 'Analytics & Insights',
    citizens: 'Citizen Database',
    audit: 'System Audit Trail',
    all_reports: 'All Daily Reports',
    alerts: 'Emergency Alerts',
    verification: 'Officer Security Verification',
    notifications: 'Notifications & Alerts',
    profile: 'My Profile & Workstation',
    profile_security: 'Security & Change Password',
  };

  const isOfficer = user?.role === 'field_officer';

  // Live Role-Based Notifications State
  const [recentNotifications, setRecentNotifications] = useState([]);
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

  const handleItemClick = async (item) => {
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
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => setIsMobileOpen && setIsMobileOpen(true)}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="hover:text-slate-600 transition-colors">FieldSync</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span className="text-slate-600 font-medium capitalize truncate">{user?.role?.replace('_', ' ') || 'Staff'}</span>
          </div>
          <h1 className="text-sm sm:text-base font-semibold text-slate-900 truncate tracking-tight">
            {tabTitles[activeTab] || 'Overview'}
          </h1>
        </div>
      </div>

      {/* Right: Actions, Sync, Language, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Sync Badge */}
        <SyncBadge
          isOnline={isOnline}
          syncing={syncing}
          pendingSync={pendingSync}
          onClick={() => window.dispatchEvent(new CustomEvent('force-sync'))}
        />

        {/* Screen Time Badge (Officers only) */}
        {isOfficer && (
          <div
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border ${
              isScreenTimeRunning
                ? 'bg-blue-50 text-[#1E3A8A] border-blue-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
            title="Active Field Session Timer"
          >
            <Clock className={`w-3.5 h-3.5 ${isScreenTimeRunning ? 'text-[#1E3A8A] animate-pulse' : 'text-slate-400'}`} />
            <span>{screenTimeDisplay}</span>
          </div>
        )}

        {/* Language Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
            title="Change Language"
          >
            <Globe className="w-4 h-4 text-slate-500" />
            <span className="hidden md:inline uppercase">{currentLanguage || 'en'}</span>
          </button>

          {showLangMenu && (
            <div
              className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-modal border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
              onMouseLeave={() => setShowLangMenu(false)}
            >
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Select Language
              </div>
              {Object.entries(userLanguages || {}).map(([code, lang]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    changeLanguage(code);
                    setShowLangMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    currentLanguage === code ? 'text-[#1E3A8A] font-semibold bg-blue-50/50' : 'text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                  </span>
                  {currentLanguage === code && <Check className="w-3.5 h-3.5 text-[#1E3A8A]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-slate-500" />
            {liveUnreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-bold ring-2 ring-white flex items-center justify-center">
                {liveUnreadCount > 9 ? '9+' : liveUnreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-0 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
              onMouseLeave={() => setShowNotifications(false)}
            >
              {/* Header */}
              <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Notifications</span>
                  {liveUnreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 text-red-700 font-bold">
                      {liveUnreadCount} new
                    </span>
                  )}
                </div>
                {liveUnreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllHeader}
                    className="text-[11px] text-[#1E3A8A] hover:underline font-semibold"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {recentNotifications.length === 0 ? (
                  <div className="py-10 text-center space-y-1">
                    <Bell className="w-6 h-6 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500 font-medium">No notifications yet</p>
                    <p className="text-[11px] text-slate-400">Updates for your workstation will appear here.</p>
                  </div>
                ) : (
                  recentNotifications.map((n) => {
                    const isUnread = !n.isRead;
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleItemClick(n)}
                        className={`p-3.5 text-left text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                          isUnread ? 'bg-blue-50/40' : 'text-slate-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {n.priority === 'URGENT' ? (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700 shrink-0">
                                URGENT
                              </span>
                            ) : n.priority === 'IMPORTANT' ? (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 shrink-0">
                                IMPORTANT
                              </span>
                            ) : null}
                            <span className={`font-semibold truncate ${isUnread ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>
                              {n.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">{n.message}</p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer View All Link */}
              <div className="p-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(false);
                    if (setActiveTab) setActiveTab('notifications');
                  }}
                  className="w-full py-1.5 text-center text-xs font-semibold text-[#1E3A8A] hover:text-blue-800 hover:bg-blue-50/60 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <span>Open Notification Center</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#1E3A8A] text-white font-bold text-xs flex items-center justify-center shadow-xs overflow-hidden">
              {user?.profilePhotoUrl ? (
                <img src={user.profilePhotoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name ? user.name.charAt(0).toUpperCase() : 'U'
              )}
            </div>
            <span className="hidden md:inline text-xs font-semibold text-slate-800">{user?.name?.split(' ')[0] || 'User'}</span>
          </button>

          {showUserMenu && (
            <div
              className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-modal border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
              onMouseLeave={() => setShowUserMenu(false)}
            >
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">{user?.name || 'User'}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email || ''}</p>
                <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider text-[#1E3A8A] bg-blue-50 px-1.5 py-0.5 rounded">
                  {user?.role?.replace('_', ' ') || 'Staff'}
                </span>
              </div>

              <div className="p-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (setActiveTab) setActiveTab('profile');
                    setShowUserMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-[#1E3A8A]" />
                  My Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (setActiveTab) setActiveTab('profile_security');
                    setShowUserMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  Change Password
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}