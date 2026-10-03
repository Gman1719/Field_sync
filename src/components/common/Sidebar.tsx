import React, { type ElementType } from 'react';
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
} from 'lucide-react';
import { useUserLanguage } from '../../context/UserLanguageContext';

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
  const isOfficer = user?.role === 'field_officer';
  const isSupervisor = user?.role === 'supervisor';
  const isManager = user?.role === 'manager';

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
      sections.push({
        title: 'Citizen Registration',
        items: [
          { id: 'register', label: 'Register Citizen', icon: UserPlus },
          { id: 'citizens', label: 'Registered Citizens', icon: Database },
        ],
      });

      sections.push({
        title: 'Reporting & Logs',
        items: [
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
        ],
      });
    }

    if (isSupervisor) {
      sections.push({
        title: '',
        items: [
          { id: 'chat', label: 'Manager Chat', icon: MessageSquare },
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
        ],
      });

      sections.push({
        title: '',
        items: [
          { id: 'verification', label: 'Officer Verifications', icon: ShieldCheck },
          { id: 'activity_logs', label: 'Activity Logs', icon: Activity },
          { id: 'screentime', label: 'Officers Screen Time', icon: Smartphone },
          { id: 'send_alert', label: 'Send Alert', icon: AlertTriangle },
          { id: 'analytics', label: 'Analysis and Detail', icon: BarChart3 },
        ],
      });
    }

    if (isManager) {
      sections.push({
        title: '',
        items: [
          { id: 'users', label: 'User Management', icon: UserCog },
          { id: 'chat', label: 'Supervisor Chat', icon: MessageSquare },
          { id: 'citizens', label: 'Registered Citizens', icon: Database },
          { id: 'team', label: 'Team', icon: Users },
        ],
      });

      sections.push({
        title: '',
        items: [
          { id: 'activity_logs', label: 'Activity Logs', icon: Activity },
          { id: 'analytics', label: 'Analysis and Detail', icon: BarChart3 },
          { id: 'audit', label: 'System Audit Trail', icon: History },
        ],
      });
    }

    return sections;
  };

  const navSections = getNavSections();

  const handleNavClick = (id: string) => {
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
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-700 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-xs">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight block leading-tight">
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
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

        <div className="p-3.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/70">
          <div className="flex items-center justify-between gap-3">
            <div
              className="flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleNavClick('profile')}
              title="View My Profile"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-[#2563EB] dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                {(user?.profilePhotoUrl || (user?.id ? localStorage.getItem(`fieldsync_avatar_${user.id}`) : null)) ? (
                  <img
                    src={user?.profilePhotoUrl || (user?.id ? localStorage.getItem(`fieldsync_avatar_${user.id}`) : null) || ''}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (user?.fullName || user?.name || user?.email || 'U')[0].toUpperCase()
                )}
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
