import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock,
  RefreshCw,
  CheckCircle2,
  User,
  Search,
  Filter,
  Activity,
  ShieldCheck,
  FileText,
  UserCheck,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { offlineDb } from '../../db/offlineDb';
import { db } from '../../services/database';
import { API_BASE } from '../../config/api';
import { useUserLanguage } from '../../context/UserLanguageContext';
import { translateText } from '../../services/translationEngine';

export default function ActivityTimeline({ user }) {
  const { userT, language } = useUserLanguage();
  const [logs, setLogs] = useState([]);
  const [expandedRowIds, setExpandedRowIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const userRole = String(user?.role || '').toLowerCase();
  const isSupervisor = userRole === 'supervisor';
  const isOfficer = userRole === 'field_officer';
  const isManager = userRole === 'manager' || userRole === 'admin';

  /**
   * canViewLog:
   * STRICT ROLE-BASED WORK SCOPE:
   * - Supervisor: ONLY what the supervisor personally does on their page
   *   (evaluations, supervisor reports, directives/alerts, leave/permission approvals & rejections,
   *   assigned tasks, own profile/security). Excludes all officer fieldwork and manager operations.
   * - Field Officer: ONLY their own fieldwork and personal reports/requests.
   * - Manager: System-wide operations authored by or assigned to them.
   */
  const canViewLog = useCallback((l: any) => {
    if (!l) return false;
    const evt = String(l.eventType || '').toUpperCase();
    const desc = String(l.description || '').toUpperCase();

    // 1. Exclude automated SMS logs
    if (evt.includes('SMS') || desc.includes('SMS')) return false;

    // 2. Exclude internal background sync engine telemetry (not user work)
    if (
      evt.startsWith('SYNC_') ||
      evt === 'DATA_SYNC_SUCCESSFUL' ||
      evt === 'SYNC_COMPLETED' ||
      evt === 'SYNC_FAILED' ||
      evt === 'SYNC_ERROR'
    ) {
      return false;
    }

    if (!user?.id) return false;

    const currentRole = String(user?.role || '').toLowerCase();
    const isSup = currentRole === 'supervisor';
    const isOff = currentRole === 'field_officer';
    const isMgr = currentRole === 'manager' || currentRole === 'admin';

    // Verify ownership ID
    const isSelfId =
      l.officerId === user.id ||
      (user.employeeId && l.officerId === user.employeeId) ||
      (l.userId && l.userId === user.id) ||
      (l.actorId && l.actorId === user.id) ||
      (l.metadata?.userId && l.metadata?.userId === user.id) ||
      (l.metadata?.officerId && l.metadata?.officerId === user.id) ||
      (l.metadata?.actorId && l.metadata?.actorId === user.id) ||
      (l.metadata?.supervisorId && l.metadata?.supervisorId === user.id) ||
      // Supervisor Getiye dual ID alias support:
      ((user.id === 'off24182999' || user.id === 'cb0ba983-e234-4596-9cea-34a157af283e') &&
       (l.officerId === 'off24182999' || l.officerId === 'cb0ba983-e234-4596-9cea-34a157af283e'));

    // Resolve author name
    const authorName = String(
      l.officerName ||
      l.userName ||
      l.actorName ||
      l.metadata?.officerName ||
      l.metadata?.userName ||
      l.metadata?.actorName ||
      l.metadata?.supervisorName ||
      ''
    ).trim().toLowerCase();

    const currentUserName = String(user.fullName || user.name || '').trim().toLowerCase();

    const isOwnName = Boolean(
      currentUserName &&
      authorName &&
      (authorName === currentUserName ||
       authorName.includes(currentUserName) ||
       currentUserName.includes(authorName))
    );

    const isOwnWork = isSelfId || isOwnName;

    // Reject immediately if the log does not belong to the logged-in user
    if (!isOwnWork) return false;

    // -------------------------------------------------------------
    // SUPERVISOR LOG SCOPING:
    // Only contains what the supervisor personally does in his page.
    // Strictly removes officer fieldwork and manager operations.
    // -------------------------------------------------------------
    if (isSup) {
      // Exclude field officer fieldwork (sessions, verifications, daily work reports, subordinate requests)
      if (
        evt.startsWith('WORK_SESSION_') ||
        evt.startsWith('VERIFICATION_') ||
        evt.startsWith('DAILY_REPORT_') ||
        evt.startsWith('ASSIGNMENT_STARTED') ||
        evt.startsWith('ASSIGNMENT_PAUSED') ||
        evt.startsWith('ASSIGNMENT_RESUMED') ||
        evt.startsWith('ASSIGNMENT_COMPLETED') ||
        evt === 'REQUEST_RECEIVED' ||
        evt === 'REQUEST_SENT' ||
        evt === 'LEAVE_REQUESTED' ||
        evt === 'PERMISSION_REQUESTED' ||
        evt === 'SUPERVISOR_CONFIRMATION' ||
        desc.includes('WORK SESSION') ||
        desc.includes('PRESENCE CHECK') ||
        desc.includes('WORK VERIFICATION') ||
        desc.includes('DAILY WORK REPORT') ||
        desc.includes('REQUEST SENT:') ||
        desc.includes('REQUEST RECEIVED:')
      ) {
        return false;
      }

      // Exclude system manager administrative operations
      if (
        evt === 'USER_CREATED' ||
        evt === 'USER_STATUS_CHANGE' ||
        evt === 'ROLE_AND_LOCATION_CHANGE' ||
        evt === 'WORKSTATION_REASSIGNED' ||
        evt === 'USER_ROLE_CHANGED' ||
        evt === 'USER_PASSWORD_RESET' ||
        authorName.includes('system manager') ||
        authorName.includes('manager') ||
        desc.includes('SYSTEM MANAGER') ||
        desc.includes('CREATED NEW STAFF ACCOUNT') ||
        desc.includes('DEACTIVATE ACCOUNT') ||
        desc.includes('ACTIVATE ACCOUNT') ||
        desc.includes('REASSIGNED WORKSTATION') ||
        desc.includes('UPDATED ROLE TO') ||
        l.officerId === 'manager' ||
        l.metadata?.userRole === 'manager'
      ) {
        return false;
      }

      // Exclude logs where author is labeled as subordinate officer
      if (authorName.includes('field officer')) {
        return false;
      }

      return true;
    }

    // -------------------------------------------------------------
    // FIELD OFFICER SCOPING: Only their own work
    // -------------------------------------------------------------
    if (isOff) {
      if (authorName.includes('system manager') || authorName.includes('manager')) return false;
      return true;
    }

    // -------------------------------------------------------------
    // MANAGER SCOPING: Manager personal/system logs
    // -------------------------------------------------------------
    return true;
  }, [user]);

  const loadLogs = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const currentRole = String(user?.role || '').toLowerCase();
    const isSup = currentRole === 'supervisor';

    try {
      // 1. Purge legacy SMS from Dexie cache if any exist
      try {
        const smsLogs = await offlineDb.activityLogs
          .filter((item) =>
            String(item.eventType || '').toUpperCase().includes('SMS') ||
            String(item.description || '').toUpperCase().includes('SMS')
          )
          .toArray();
        if (smsLogs.length > 0) {
          await Promise.all(smsLogs.map((item) => offlineDb.activityLogs.delete(item.id)));
        }
      } catch (_e) {}

      // 2. Query server specifically for the logged-in user's own work
      const authToken =
        localStorage.getItem('fieldsync_token') ||
        localStorage.getItem('token') ||
        sessionStorage.getItem('token');

      if (navigator.onLine && authToken) {
        try {
          const queryParam = `?limit=250`;
          const res = await fetch(`${API_BASE}/activity-logs${queryParam}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });

          if (res.ok) {
            const resData = await res.json();
            if (resData.success && Array.isArray(resData.data)) {
              for (const serverLog of resData.data) {
                // Ensure only own valid work is written to cache
                if (!canViewLog(serverLog)) continue;
                await offlineDb.activityLogs.put({
                  id: serverLog.id,
                  officerId: serverLog.officerId,
                  officerName: serverLog.officerName || serverLog.officer?.fullName,
                  woredaName: serverLog.woredaName || serverLog.officer?.woreda?.name,
                  assignmentId: serverLog.assignmentId,
                  eventType: serverLog.eventType,
                  description: serverLog.description,
                  deviceTimestamp: serverLog.deviceTimestamp,
                  relatedRecordId: serverLog.relatedRecordId,
                  metadata: serverLog.metadata,
                  syncStatus: 'SYNCED',
                });
              }
            }
          }
        } catch (serverErr: any) {
          console.warn('Could not fetch server activity logs, using offline Dexie:', serverErr.message);
        }
      }

      // 3. Read and strictly filter local logs for only the logged-in user's work
      const allLocalLogs = await offlineDb.activityLogs.toArray();
      const userWorkLogs = allLocalLogs
        .filter(canViewLog)
        .sort((a, b) => {
          const tA = a.deviceTimestamp ? new Date(a.deviceTimestamp).getTime() : 0;
          const tB = b.deviceTimestamp ? new Date(b.deviceTimestamp).getTime() : 0;
          return tB - tA;
        });

      setLogs(userWorkLogs);
    } catch (err) {
      console.error('Error loading activity logs:', err);
      toast.error('Failed to load activity logs');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [canViewLog, user?.id, user?.role]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Reactive listener for immediate activity updates across the app
  useEffect(() => {
    const handleReactiveUpdate = () => {
      loadLogs();
    };

    window.addEventListener('fieldsync-activity-logged', handleReactiveUpdate);
    window.addEventListener('fieldsync-status-updated', handleReactiveUpdate);
    window.addEventListener('fieldsync-queue-updated', handleReactiveUpdate);

    return () => {
      window.removeEventListener('fieldsync-activity-logged', handleReactiveUpdate);
      window.removeEventListener('fieldsync-status-updated', handleReactiveUpdate);
      window.removeEventListener('fieldsync-queue-updated', handleReactiveUpdate);
    };
  }, [loadLogs]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadLogs();
    toast.success(userT('Activity logs refreshed'));
  };

  const toggleRowExpanded = (id: string) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Event Semantic Classifier & Badging
  const getEventMeta = (eventType: string) => {
    switch (eventType) {
      // Registrations
      case 'CITIZEN_REGISTERED':
      case 'CITIZEN_REGISTRATION_COMPLETED':
        return {
          label: 'Citizen Registered',
          category: 'REGISTRATIONS',
          bgClass: 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60',
        };
      case 'CITIZEN_REGISTRATION_STARTED':
      case 'CITIZEN_REGISTRATION_SAVED_OFFLINE':
        return {
          label: 'Registration Saved Offline',
          category: 'REGISTRATIONS',
          bgClass: 'bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-900/40',
        };

      // Work Sessions & Attendance
      case 'WORK_SESSION_STARTED':
      case 'WORK_SESSION_RESUMED':
        return {
          label: eventType === 'WORK_SESSION_STARTED' ? 'Session Started' : 'Session Resumed',
          category: 'SESSIONS',
          bgClass: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60',
        };
      case 'WORK_SESSION_PAUSED':
      case 'WORK_SESSION_ENDED':
        return {
          label: eventType === 'WORK_SESSION_PAUSED' ? 'Session Paused' : 'Session Finalized',
          category: 'SESSIONS',
          bgClass: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60',
        };
      case 'ATTENDANCE_RECORDED':
      case 'ATTENDANCE_CHECK_IN':
        return {
          label: 'Clocked In',
          category: 'SESSIONS',
          bgClass: 'bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-900/60',
        };
      case 'ATTENDANCE_CHECK_OUT':
        return {
          label: 'Clocked Out',
          category: 'SESSIONS',
          bgClass: 'bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-900/60',
        };
      case 'VERIFICATION_CONFIRMED':
      case 'VERIFICATION_SUBMITTED':
        return {
          label: 'Verification Confirmed',
          category: 'SESSIONS',
          bgClass: 'bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-900/60',
        };
      case 'VERIFICATION_MISSED':
        return {
          label: 'Verification Missed',
          category: 'SESSIONS',
          bgClass: 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60',
        };

      // Reports & Tasks
      case 'DAILY_REPORT_SUBMITTED':
      case 'REPORT_CREATED':
        return {
          label: 'Daily Report Submitted',
          category: 'REPORTS',
          bgClass: 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/60',
        };
      case 'DAILY_REPORT_SAVED':
      case 'DAILY_REPORT_DRAFTED':
        return {
          label: 'Daily Report Drafted',
          category: 'REPORTS',
          bgClass: 'bg-purple-50/50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 border-purple-200 dark:border-purple-900/40',
        };
      case 'TASK_ASSIGNED':
      case 'ASSIGNMENT_STARTED':
      case 'ASSIGNMENT_PAUSED':
      case 'ASSIGNMENT_RESUMED':
      case 'ASSIGNMENT_COMPLETED':
        return {
          label: eventType === 'TASK_ASSIGNED' ? 'Task Assigned' : eventType.replace(/_/g, ' '),
          category: 'TASKS',
          bgClass: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60',
        };
      case 'SUPERVISOR_EVALUATION':
      case 'SUPERVISOR_REPORT':
      case 'OFFICER_ALERT_SENT':
        return {
          label: eventType === 'SUPERVISOR_EVALUATION' ? 'Officer Evaluated' : eventType === 'SUPERVISOR_REPORT' ? 'Supervisor Report' : 'Directive Issued',
          category: 'SUPERVISION',
          bgClass: 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/60',
        };

      // Requests & Decisions
      case 'REQUEST_SENT':
      case 'LEAVE_REQUESTED':
      case 'PERMISSION_REQUESTED':
        return {
          label: 'Request Sent',
          category: 'REQUESTS',
          bgClass: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60',
        };
      case 'REQUEST_RECEIVED':
        return {
          label: 'Request Received',
          category: 'REQUESTS',
          bgClass: 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60',
        };
      case 'SUPERVISOR_CONFIRMATION':
      case 'REQUEST_APPROVED':
      case 'LEAVE_APPROVED':
      case 'PERMISSION_APPROVED':
        return {
          label: 'Request Approved',
          category: 'REQUESTS',
          bgClass: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60',
        };
      case 'REQUEST_REJECTED':
      case 'LEAVE_REJECTED':
      case 'PERMISSION_REJECTED':
        return {
          label: 'Request Rejected',
          category: 'REQUESTS',
          bgClass: 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60',
        };
      case 'LEAVE_REVIEWED':
      case 'PERMISSION_REVIEWED':
        return {
          label: 'Request Reviewed',
          category: 'REQUESTS',
          bgClass: 'bg-violet-50 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-900/60',
        };

      // Account & Staff Management
      case 'USER_CREATED':
        return {
          label: 'Staff Account Created',
          category: 'MANAGEMENT',
          bgClass: 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-900/60',
        };
      case 'USER_STATUS_CHANGE':
        return {
          label: 'Account Status Changed',
          category: 'MANAGEMENT',
          bgClass: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60',
        };
      case 'USER_ROLE_CHANGED':
        return {
          label: 'User Role Changed',
          category: 'MANAGEMENT',
          bgClass: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60',
        };
      case 'WORKSTATION_REASSIGNED':
      case 'ROLE_AND_LOCATION_CHANGE':
        return {
          label: 'Location Reassigned',
          category: 'MANAGEMENT',
          bgClass: 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60',
        };
      case 'USER_PASSWORD_RESET':
        return {
          label: 'Password Reset Issued',
          category: 'MANAGEMENT',
          bgClass: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60',
        };

      // Profile & Security
      case 'USER_PROFILE_UPDATED':
      case 'PROFILE_UPDATED':
        return {
          label: 'Profile Updated',
          category: 'PROFILE',
          bgClass: 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900/60',
        };
      case 'PASSWORD_CHANGED':
        return {
          label: 'Password Changed',
          category: 'SECURITY',
          bgClass: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60',
        };
      case 'USER_LOGIN':
        return {
          label: 'Logged In',
          category: 'SESSIONS',
          bgClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
      case 'USER_LOGOUT':
        return {
          label: 'Logged Out',
          category: 'SESSIONS',
          bgClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };

      default:
        return {
          label: (eventType || 'ACTIVITY').replace(/_/g, ' '),
          category: 'GENERAL',
          bgClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
    }
  };

  const categoryPills = useMemo(() => {
    if (isSupervisor) {
      return [
        { id: 'ALL', label: 'All Actions' },
        { id: 'REPORTS', label: 'Reports & Evaluations' },
        { id: 'REQUESTS', label: 'Leave & Permissions' },
        { id: 'TASKS', label: 'Directives & Tasks' },
        { id: 'MANAGEMENT', label: 'Profile & Security' },
      ];
    }
    if (isOfficer) {
      return [
        { id: 'ALL', label: 'All Work' },
        { id: 'REGISTRATIONS', label: 'Registrations' },
        { id: 'SESSIONS', label: 'Sessions & Attendance' },
        { id: 'REPORTS', label: 'Reports & Tasks' },
        { id: 'REQUESTS', label: 'Requests & Decisions' },
        { id: 'MANAGEMENT', label: 'Profile' },
      ];
    }
    return [
      { id: 'ALL', label: 'All Operations' },
      { id: 'MANAGEMENT', label: 'User Operations' },
      { id: 'REPORTS', label: 'Reports' },
      { id: 'REQUESTS', label: 'Requests & Decisions' },
      { id: 'SECURITY', label: 'Profile & Security' },
    ];
  }, [isSupervisor, isOfficer]);

  // Filter logs by search term and selected category
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const meta = getEventMeta(log.eventType);

      if (categoryFilter !== 'ALL') {
        if (categoryFilter === 'REGISTRATIONS' && meta.category !== 'REGISTRATIONS') return false;
        if (categoryFilter === 'SESSIONS' && meta.category !== 'SESSIONS') return false;
        if (categoryFilter === 'REPORTS' && meta.category !== 'REPORTS' && meta.category !== 'SUPERVISION') return false;
        if (categoryFilter === 'TASKS' && meta.category !== 'TASKS' && meta.category !== 'SUPERVISION') return false;
        if (categoryFilter === 'REQUESTS' && meta.category !== 'REQUESTS') return false;
        if (categoryFilter === 'MANAGEMENT' && meta.category !== 'MANAGEMENT' && meta.category !== 'PROFILE' && meta.category !== 'SECURITY') return false;
        if (categoryFilter === 'SECURITY' && meta.category !== 'SECURITY' && meta.category !== 'PROFILE') return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const descMatch = (log.description || '').toLowerCase().includes(query);
        const eventMatch = (log.eventType || '').toLowerCase().includes(query);
        const labelMatch = meta.label.toLowerCase().includes(query);
        if (!descMatch && !eventMatch && !labelMatch) return false;
      }

      return true;
    });
  }, [logs, categoryFilter, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>{userT('Activity Logs')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isSupervisor
              ? userT('Activity timeline of your supervisor actions and operational decisions.')
              : isOfficer
              ? userT('Chronological audit log containing only your fieldwork, registrations, and daily reports.')
              : userT('Chronological audit log containing only your management operations and system actions.')}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title={userT('Refresh activity logs')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{userT('Refresh')}</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Category Filters */}
      <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={userT('Search your activities by keyword or action...')}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Records Count Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">
            <span>{isSupervisor ? userT('Your Actions') : userT('Your Work Records')}:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
              {filteredLogs.length} / {logs.length}
            </span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
          {categoryPills.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
              }`}
            >
              {userT(cat.label)}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Activity Records Table */}
      <div className="rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2563EB]" />
            <p className="text-xs font-medium">{userT('Loading activity logs...')}</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center">
            <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {logs.length === 0 ? userT('No Work Activities Recorded Yet') : userT('No Activities Match Filters')}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              {logs.length === 0
                ? userT('Activities are captured automatically in real-time as you complete work.')
                : userT('Try adjusting your search keyword or selecting a different category.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">{userT('Date & Time')}</th>
                  <th className="py-3 px-4">{userT('Action / Event')}</th>
                  <th className="py-3 px-4">{userT('Description')}</th>
                  <th className="py-3 px-4">{userT('Status')}</th>
                  <th className="py-3 px-4 text-right">{userT('Details')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredLogs.map((log) => {
                  const meta = getEventMeta(log.eventType);
                  const isSynced = log.syncStatus === 'SYNCED';
                  const isDetailsExpanded = expandedRowIds.has(log.id);

                  const dateObj = log.deviceTimestamp ? new Date(log.deviceTimestamp) : null;
                  const timeFormatted = dateObj
                    ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : '—';
                  const dateFormatted = dateObj
                    ? dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—';

                  const metadataEntries = log.metadata
                    ? Object.entries(log.metadata).filter(
                        ([k, v]) => v !== null && v !== undefined && typeof v !== 'object'
                      )
                    : [];

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                        {/* Date & Time */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {timeFormatted}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {dateFormatted}
                          </div>
                        </td>

                        {/* Action / Event Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${meta.bgClass}`}>
                            {userT(meta.label)}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 max-w-md">
                          <p className="font-medium text-xs leading-relaxed">{translateText(log.description, language)}</p>
                        </td>

                        {/* Sync Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isSynced ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                              <CheckCircle2 className="w-3 h-3" />
                              {userT('Synced')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
                              <Clock className="w-3 h-3" />
                              {userT('Local')}
                            </span>
                          )}
                        </td>

                        {/* Details */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {metadataEntries.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => toggleRowExpanded(log.id)}
                              className="px-2 py-1 rounded-md text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 transition-colors cursor-pointer"
                            >
                              {isDetailsExpanded ? userT('Hide') : userT('Details')}
                            </button>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Metadata Detail Row */}
                      {isDetailsExpanded && metadataEntries.length > 0 && (
                        <tr className="bg-slate-50/50 dark:bg-slate-900/40">
                          <td colSpan={5} className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700">
                            <div className="flex flex-wrap gap-2 text-xs">
                              {metadataEntries.map(([key, value]) => (
                                <div
                                  key={key}
                                  className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-medium text-[11px]"
                                >
                                  <span className="text-slate-400 font-semibold">{key}:</span>
                                  <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
