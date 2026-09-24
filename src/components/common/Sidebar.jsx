// src/components/common/Sidebar.jsx – Enterprise Sidebar with Lucide Icons & Grouping

import React from 'react';
import {
  LayoutDashboard,
  UserPlus,
  FileText,
  FilePlus2,
  CalendarCheck,
  ClipboardCheck,
  Clock,
  Smartphone,
  FileSpreadsheet,
  Users,
  UserCog,
  BarChart3,
  Database,
  History,
  Bell,
  ShieldCheck,
  LogOut,
  Radio,
  RefreshCw,
  Activity,
  X
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  user,
  pendingSync = 0,
  notificationsCount = 0,
  onLogout,
  isMobileOpen = false,
  setIsMobileOpen
}) {
  const isOfficer = user?.role === 'field_officer';
  const isSupervisor = user?.role === 'supervisor';
  const isManager = user?.role === 'manager';

  // Navigation structure organized into logical groups based on role (Tasks completely removed)
  const getNavSections = () => {
    const sections = [];

    // 1. Overview (All Roles)
    sections.push({
      title: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: Bell,
          badge: notificationsCount > 0 ? (notificationsCount > 9 ? '9+' : notificationsCount) : null,
          badgeColor: 'bg-red-600',
        },
      ]
    });

    // 2. Field Operations (Field Officer)
    if (isOfficer) {
      sections.push({
        title: 'Citizen Registration',
        items: [
          { id: 'register', label: 'Register Citizen', icon: UserPlus },
          { id: 'citizens', label: 'Registered Citizens', icon: Database },
        ]
      });

      sections.push({
        title: 'Reporting & Logs',
        items: [
          { id: 'reports', label: 'Daily Work Reports', icon: FileText, badge: pendingSync > 0 ? pendingSync : null, badgeColor: 'bg-amber-500' },
          { id: 'report_new', label: 'Submit Daily Report', icon: FilePlus2 },
          { id: 'activity_logs', label: 'Activity Timeline', icon: Activity },
          { id: 'screentime', label: 'Work Sessions & Time', icon: Smartphone },
          { id: 'sync_center', label: 'Sync Center', icon: RefreshCw, badge: pendingSync > 0 ? pendingSync : null, badgeColor: 'bg-amber-500' },
        ]
      });
    }

    // 3. Field Oversight (Supervisor)
    if (isSupervisor) {
      sections.push({
        title: 'Field Oversight',
        items: [
          { id: 'citizens', label: 'Citizen Registrations', icon: Database },
          { id: 'duplicates', label: 'Duplicate Reviews', icon: ShieldCheck },
          { id: 'team', label: 'Field Officers', icon: Users },
          { id: 'reports', label: 'Officer Daily Reports', icon: FileText, badge: pendingSync > 0 ? pendingSync : null, badgeColor: 'bg-amber-500' },
          { id: 'supervisor_reports', label: 'Supervisor Evaluations', icon: FileSpreadsheet }
        ]
      });

      sections.push({
        title: 'Activity & Synchronization',
        items: [
          { id: 'activity_logs', label: 'Officer Activity Timeline', icon: Activity },
          { id: 'screentime', label: 'Screen Time Telemetry', icon: Smartphone },
          { id: 'analytics', label: 'Field Analytics & Telemetry', icon: BarChart3 },
          { id: 'sync_center', label: 'Sync Health Monitor', icon: RefreshCw, badge: pendingSync > 0 ? pendingSync : null, badgeColor: 'bg-amber-500' },
          { id: 'audit', label: 'Zone Audit Trail', icon: History },
        ]
      });
    }

    // 4. Organization Management (Manager)
    if (isManager) {
      sections.push({
        title: 'Workforce & Registry',
        items: [
          { id: 'users', label: 'User Directory', icon: UserCog },
          { id: 'citizens', label: 'National Registry', icon: Database },
          { id: 'duplicates', label: 'Duplicate Adjudication', icon: ShieldCheck },
          { id: 'team', label: 'Team Overview', icon: Users },
          { id: 'all_reports', label: 'All Daily Reports', icon: FileText },
        ]
      });

      sections.push({
        title: 'Telemetry & Analytics',
        items: [
          { id: 'activity_logs', label: 'Organization Activity Log', icon: Activity },
          { id: 'screentime', label: 'Screen Time Tracking', icon: Smartphone },
          { id: 'analytics', label: 'Analytics & Insights', icon: BarChart3 },
          { id: 'sync_center', label: 'System Sync Health', icon: RefreshCw },
          { id: 'audit', label: 'System Audit Trail', icon: History },
        ]
      });
    }

    return sections;
  };

  const navSections = getNavSections();

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] flex items-center justify-center text-white shadow-xs">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm tracking-tight block">
                FieldSync
              </span>
              <span className="text-[10px] text-slate-400 font-medium -mt-1 block">
                Offline-First System
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <h3 className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {section.title}
              </h3>
              <div className="space-y-0.5 pt-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-[#1E3A8A] text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white ${item.badgeColor || 'bg-blue-600'}`}>
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

        {/* User Footer Profile */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between gap-3">
            <div
              className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleNavClick('profile')}
              title="View My Profile"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1E3A8A] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                {user?.profilePhotoUrl ? (
                  <img src={user.profilePhotoUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (user?.fullName || user?.name || user?.email || 'U')[0].toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {user?.fullName || user?.name || 'Authorized Staff'}
                </p>
                <p className="text-[10px] text-slate-500 capitalize truncate">
                  {user?.role?.replace('_', ' ') || 'Staff'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}