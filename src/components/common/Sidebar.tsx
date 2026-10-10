import React, { useState, useEffect, type ElementType } from 'react';
import {
  LayoutDashboard,
  UserPlus,
  FileText,
  FilePlus2,
  FileSpreadsheet,
  Users,
  UserCog,
  BarChart3,
  Database,
  History,
  Bell,
  LogOut,
  Radio,
  RefreshCw,
  Activity,
  Smartphone,
  MessageSquare,
  ShieldCheck,
  CalendarClock,
  AlertTriangle,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { useUserLanguage } from '../../context/UserLanguageContext';
import { useTheme } from '../../context/ThemeContext';
import LanguageSelector from './LanguageSelector';
import { getTotalUnreadCount } from '../../services/chatService';

export interface NavItem {
  id: string;
  label: string;
  icon: ElementType;
  badge?: string | number | null;
  badgeColor?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  pendingSync?: number;
  notificationsCount?: number;
  onLogout?: () => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  [key: string]: any;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  user,
  pendingSync = 0,
  notificationsCount = 0,
  onLogout,
  isMobileOpen = false,
  setIsMobileOpen,
}: SidebarProps) {
  const { userT } = useUserLanguage();
  const { theme, toggleTheme } = useTheme();
  const isOfficer = user?.role === 'field_officer';
  const isSupervisor = user?.role === 'supervisor';
  const isManager = user?.role === 'manager';

  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [_avatarVersion, setAvatarVersion] = useState(0);

  useEffect(() => {
    const updateChatCount = async () => {
      if (!user?.id) return;
      if (activeTab === 'chat') {
        setUnreadChatCount(0);
        return;
      }
      try {
        const count = await getTotalUnreadCount(user.id);
        setUnreadChatCount(count);
      } catch (_e) {
        setUnreadChatCount(0);
      }
    };

    updateChatCount();

    const handleProfileUpdate = () => {
      setAvatarVersion((v) => v + 1);
    };

    window.addEventListener('fieldsync-chat-read', updateChatCount);
    window.addEventListener('fieldsync-chat-update', updateChatCount);
    window.addEventListener('fieldsync-unread-count-changed', updateChatCount);
    window.addEventListener('fieldsync-profile-updated', handleProfileUpdate);
    window.addEventListener('user-profile-updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);

    return () => {
      window.removeEventListener('fieldsync-chat-read', updateChatCount);
      window.removeEventListener('fieldsync-chat-update', updateChatCount);
      window.removeEventListener('fieldsync-unread-count-changed', updateChatCount);
      window.removeEventListener('fieldsync-profile-updated', handleProfileUpdate);
      window.removeEventListener('user-profile-updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, [user?.id, activeTab]);

  const getNavSections = (): NavSection[] => {
    const sections: NavSection[] = [];

    sections.push({
      title: '',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: Bell,
          badge: notificationsCount > 0 ? (notificationsCount > 9 ? '9+' : notificationsCount) : null,
          badgeColor: 'bg-red-600',
        },
      ],
    });

    if (isOfficer) {
      sections[0].items.push(
        { id: 'register', label: 'Register Citizen', icon: UserPlus },
        { id: 'citizens', label: 'Registered Citizens', icon: Database },
        { id: 'daily_report', label: 'Daily Work Report', icon: FilePlus2 },
        {
          id: 'my_reports',
          label: 'My Report',
          icon: FileText,
          badge: pendingSync > 0 ? pendingSync : null,
          badgeColor: 'bg-amber-500',
        },
        { id: 'requests', label: 'My Requests', icon: CalendarClock },
        { id: 'activity_logs', label: 'Activity Logs', icon: Activity },
        { id: 'screentime', label: 'Work Sessions & Time', icon: Smartphone },
        { id: 'verification', label: 'Verification History', icon: ShieldCheck }
      );
    }

    if (isSupervisor) {
      sections[0].items.push(
        {
          id: 'chat',
          label: 'Manager Chat',
          icon: MessageSquare,
          badge: unreadChatCount > 0 ? (unreadChatCount > 9 ? '9+' : unreadChatCount) : null,
          badgeColor: 'bg-blue-600',
        },
        { id: 'citizens', label: 'Registered Citizens', icon: Database },
        { id: 'team', label: 'Officers', icon: Users },
        { id: 'requests', label: 'Leave & Permissions', icon: CalendarClock },
        {
          id: 'reports',
          label: 'Officer Daily Reports',
          icon: FileText,
          badge: pendingSync > 0 ? pendingSync : null,
          badgeColor: 'bg-amber-500',
        },
        { id: 'verification', label: 'Officer Verifications', icon: ShieldCheck },
        { id: 'activity_logs', label: 'Activity Logs', icon: Activity },
        { id: 'screentime', label: 'Officers Screen Time', icon: Smartphone },
        { id: 'send_alert', label: 'Send Alert', icon: AlertTriangle },
        { id: 'analytics', label: 'Analysis and Detail', icon: BarChart3 }
      );
    }

    if (isManager) {
      sections[0].items.push(
        { id: 'users', label: 'User Management', icon: UserCog },
        {
          id: 'chat',
          label: 'Supervisor Chat',
          icon: MessageSquare,
          badge: unreadChatCount > 0 ? (unreadChatCount > 9 ? '9+' : unreadChatCount) : null,
          badgeColor: 'bg-blue-600',
        },
        { id: 'citizens', label: 'Registered Citizens', icon: Database },
        { id: 'team', label: 'Team', icon: Users },
        { id: 'activity_logs', label: 'Activity Logs', icon: Activity },
        { id: 'analytics', label: 'Analysis and Detail', icon: BarChart3 }
      );
    }

    return sections;
  };

  const navSections = getNavSections();

  const handleNavClick = (id: string) => {
    if (id === 'chat') {
      setUnreadChatCount(0);
    }
    try {
      localStorage.setItem('fieldsync_active_tab', id);
      window.dispatchEvent(new CustomEvent('fieldsync-tab-change', { detail: { tab: id } }));
    } catch (_e) {}
    setActiveTab(id);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-700 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none lg:w-64 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div
            onClick={() => {
              window.location.hash = '#home';
              window.dispatchEvent(new HashChangeEvent('hashchange'));
              if (setIsMobileOpen) setIsMobileOpen(false);
            }}
            className="flex items-center gap-3 cursor-pointer group"
            title={userT('View Home Page')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2563EB] to-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight block leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                FieldSync
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">
                {userT('Offline-First System')}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors lg:hidden cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Quick Action Strip (Theme + Language + Quick Role indicator) */}
        <div className="lg:hidden px-4 py-2.5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shadow-xs"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-blue-500" />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <div className="scale-90 origin-left">
              <LanguageSelector />
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
            {user?.role?.replace('_', ' ') || 'Staff'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          {navSections.map((section, idx) => (
            <div key={idx} className={section.title ? 'space-y-1.5' : 'space-y-1'}>
              {section.title ? (
                <h3 className="px-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {userT(section.title)}
                </h3>
              ) : null}
              <div className="space-y-1 pt-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-[#2563EB] text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon
                          className={`w-5 h-5 shrink-0 ${
                            isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                          }`}
                        />
                        <span className="truncate">{userT(item.label)}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${
                            item.badgeColor || 'bg-blue-600'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/70 pb-safe">
          <div className="flex items-center justify-between gap-3">
            <div
              className="flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleNavClick('profile')}
              title="View My Profile"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-[#2563EB] dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                {(() => {
                  const resolvedPhoto =
                    (user?.id ? localStorage.getItem(`fieldsync_avatar_${user.id}`) : null) ||
                    (user?.email ? localStorage.getItem(`fieldsync_avatar_${user.email.toLowerCase()}`) : null) ||
                    (user?.role === 'manager' || (user?.email || '').toLowerCase() === 'manager@fieldsync.com'
                      ? localStorage.getItem('fieldsync_avatar_u_mgr')
                      : null) ||
                    (user?.role === 'supervisor' || (user?.email || '').toLowerCase() === 'supervisor@fieldsync.com'
                      ? localStorage.getItem('fieldsync_avatar_u_sup')
                      : null) ||
                    user?.profilePhotoUrl;

                  return resolvedPhoto ? (
                    <img
                      src={resolvedPhoto}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (user?.fullName || user?.name || user?.email || 'U')[0].toUpperCase()
                  );
                })()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {user?.fullName || user?.name || 'Authorized Staff'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate font-medium">
                  {userT(user?.role?.replace('_', ' ') || 'Staff')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              title={userT('Sign Out')}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
