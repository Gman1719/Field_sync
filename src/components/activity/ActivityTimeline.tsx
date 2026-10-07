// src/components/activity/ActivityTimeline.tsx
// Comprehensive Audit Trail & Real-Time Event Feed for FieldSync
// Catches and displays all user activities across all roles (Officers, Supervisors, Managers, Admins)
// Supports multi-role scoping, category filters, user filters, date picker, search, and real-time reactive updates.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock,
  RefreshCw,
  CheckCircle2,
  User,
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
  const [usersList, setUsersList] = useState([]);

  const role = (user?.role || '').toLowerCase();
  const isOfficer = role === 'field_officer';
  const isSupervisor = role === 'supervisor';
  const isManagerOrAdmin = role === 'manager' || role === 'admin' || !role;

  // Load all system users to build ID-to-Name maps and populate the user filter dropdown
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const localUsers = await db.users.toArray();
        if (localUsers && localUsers.length > 0) {
          setUsersList(localUsers);
        }
      } catch (_err) {}
    };
    loadUsers();
  }, []);

  // Build a lookup map from ID -> Name / Role
  const usersMap = useMemo(() => {
    const map: Record<string, any> = {};
    for (const u of usersList) {
      if (u.id) map[u.id] = u;
      if (u.employeeId) map[u.employeeId] = u;
    }
    return map;
  }, [usersList]);

  // Set of officer IDs assigned to this supervisor
  const teamOfficerIds = useMemo(() => {
    const ids = new Set<string>();
    if (!isSupervisor || !user) return ids;
    for (const u of usersList) {
      if (u.supervisorId === user.id || u.supervisorId === user.employeeId) {
        if (u.id) ids.add(u.id);
        if (u.employeeId) ids.add(u.employeeId);
      }
    }
    return ids;
  }, [isSupervisor, user, usersList]);

  // Helper to determine if a log is permitted for this viewing user
  const canViewLog = useCallback((l: any) => {
    if (!l) return false;
    const evt = String(l.eventType || '').toUpperCase();
    const desc = String(l.description || '').toUpperCase();

    // 1. Never display SMS logs anywhere in activity logs
    if (evt.includes('SMS') || desc.includes('SMS')) return false;

    // 2. Only work users do each day: eliminate pure network sync & session technical events
    if (
      evt.startsWith('SYNC_') ||
      evt === 'DATA_SYNC_SUCCESSFUL' ||
      evt === 'SYNC_COMPLETED' ||
      evt === 'SYNC_FAILED' ||
      evt === 'SYNC_ERROR' ||
      evt === 'USER_LOGIN' ||
      evt === 'USER_LOGOUT' ||
      evt === 'USER_PASSWORD_RESET' ||
      evt === 'PASSWORD_CHANGED'
    ) {
      return false;
    }

    // 3. Managers & Admins have full system-wide visibility of all user work
    if (isManagerOrAdmin) return true;
    if (!user?.id) return true;

    // 4. Check if the log belongs to this user directly (or addressed to them)
    const isOwn =
      l.officerId === user.id ||
      l.officerId === user.employeeId ||
      l.userId === user.id ||
      l.actorId === user.id ||
      l.metadata?.officerId === user.id ||
      l.metadata?.targetOfficerId === user.id ||
      l.metadata?.targetEmployeeId === user.employeeId ||
      l.metadata?.fromOfficerId === user.id ||
      (isOfficer && (!l.officerId || l.officerId === 'officer' || l.officerId === 'staff'));

    if (isOwn) return true;

    // 5. Supervisors can see actions by their supervised officers and incoming requests
    if (isSupervisor) {
      if (
        teamOfficerIds.has(l.officerId) ||
        teamOfficerIds.has(l.metadata?.targetOfficerId) ||
        teamOfficerIds.has(l.metadata?.targetEmployeeId) ||
        teamOfficerIds.has(l.metadata?.fromOfficerId)
      ) {
        return true;
      }
      if (
        l.officerId === user.id ||
        l.metadata?.supervisorId === user.id ||
        l.metadata?.supervisorId === user.employeeId
      ) {
        return true;
      }
      // If team list is empty or log has generic officer tag, allow supervisor team view
      if (teamOfficerIds.size === 0 && (l.officerId === 'officer' || l.officerId === 'staff')) {
        return true;
      }
    }

    return false;
  }, [isManagerOrAdmin, isSupervisor, isOfficer, user, teamOfficerIds]);

  // 1. Load activity logs from Dexie and central server
  const loadLogs = useCallback(async () => {
    try {
      // Step 0: Ensure any residual SMS logs are purged from Dexie offlineDb
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

      // Step A: Load from Dexie first (read all logs and filter by viewing permissions)
      const allLocalLogs = await offlineDb.activityLogs.toArray();
      let visibleLogs = allLocalLogs.filter(canViewLog);

      // Step B: If online, fetch from backend API
      const authToken = localStorage.getItem('fieldsync_token');
      if (navigator.onLine && authToken) {
        try {
          // Officers query their own logs; Supervisors & Managers query central feed
          const queryParam = isOfficer && user?.id ? `?officerId=${user.id}&limit=250` : '?limit=250';
          const res = await fetch(`${API_BASE}/activity-logs${queryParam}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });

          if (res.ok) {
            const resData = await res.json();
            if (resData.success && Array.isArray(resData.data)) {
              for (const serverLog of resData.data) {
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

      // Re-read updated logs from Dexie and sort chronologically descending
      const updatedLogs = await offlineDb.activityLogs.toArray();
      const filteredSorted = updatedLogs
        .filter(canViewLog)
        .sort((a, b) => {
          const tA = a.deviceTimestamp ? new Date(a.deviceTimestamp).getTime() : 0;
          const tB = b.deviceTimestamp ? new Date(b.deviceTimestamp).getTime() : 0;
          return tB - tA;
        });

      setLogs(filteredSorted);
    } catch (err) {
      console.error('Error loading activity logs:', err);
      toast.error('Failed to load activity logs');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [canViewLog, isOfficer, user]);

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
    toast.success('Activity logs refreshed');
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

  // 2. Event Semantic Classifier
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
          label: 'Registration Saved',
          category: 'REGISTRATIONS',
          bgClass: 'bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-900/40',
        };

      // Sessions & Attendance
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
      case 'ATTENDANCE_CHECK_OUT':
        return {
          label: eventType === 'ATTENDANCE_RECORDED' ? 'Attendance Logged' : (eventType === 'ATTENDANCE_CHECK_IN' ? 'Clocked In' : 'Clocked Out'),
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

      // Reports, Tasks, Leaves & Permissions
      case 'DAILY_REPORT_SUBMITTED':
      case 'REPORT_CREATED':
      case 'DAILY_REPORT_SAVED':
      case 'DAILY_REPORT_DRAFTED':
        return {
          label: 'Daily Report Submitted',
          category: 'REPORTS',
          bgClass: 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/60',
        };
      case 'TASK_ASSIGNED':
      case 'ASSIGNMENT_STARTED':
      case 'ASSIGNMENT_PAUSED':
      case 'ASSIGNMENT_RESUMED':
      case 'ASSIGNMENT_COMPLETED':
        return {
          label: eventType === 'TASK_ASSIGNED' ? 'Task Assigned' : eventType.replace(/_/g, ' '),
          category: 'REPORTS',
          bgClass: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60',
        };
      case 'SUPERVISOR_EVALUATION':
      case 'SUPERVISOR_REPORT':
      case 'OFFICER_ALERT_SENT':
        return {
          label: eventType === 'SUPERVISOR_EVALUATION' ? 'Officer Evaluated' : eventType === 'SUPERVISOR_REPORT' ? 'Supervisor Report' : 'Directive Issued',
          category: 'REPORTS',
          bgClass: 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/60',
        };
      // Requests and Supervisor Decisions
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
          label: 'Supervisor Confirmed',
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
      default:
        return {
          label: (eventType || 'ACTIVITY').replace(/_/g, ' '),
          category: 'REPORTS',
          bgClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {userT('Activity Logs')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isManagerOrAdmin
              ? userT('Central audit feed of all fieldwork submissions, work sessions, registrations, and staff operations')
              : isSupervisor
              ? userT('Activity timeline of your supervisor actions and your assigned field officers’ fieldwork')
              : userT('Chronological audit log of your citizen registrations, work sessions, and fieldwork reports')}
          </p>
        </div>
      </div>

      {/* Main Activity Records Table */}
      <div className="rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2563EB]" />
            <p className="text-xs font-medium">{userT('Loading activity logs...')}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {userT('No Activity Logged Yet')}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              {userT('Activities are captured automatically in real-time as users work.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">{userT('Date & Time')}</th>
                  <th className="py-3 px-4">{userT('USER / STAFF')}</th>
                  <th className="py-3 px-4">{userT('Description')}</th>
                  <th className="py-3 px-4">{userT('Status')}</th>
                  <th className="py-3 px-4 text-right">{userT('Details')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {logs.map((log) => {
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

                  // Robustly resolve the user name who performed the action
                  const displayedUserName =
                    log.officerName ||
                    usersMap[log.officerId]?.name ||
                    usersMap[log.officerId]?.fullName ||
                    log.metadata?.userName ||
                    log.metadata?.officerName ||
                    (log.officerId === user?.id ? user?.name || user?.fullName || userT('Me') : log.officerId || userT('Staff Member'));

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

                        {/* User / Staff Name */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{translateText(displayedUserName, language)}</span>
                          </div>
                          {log.woredaName && (
                            <div className="text-[10px] text-slate-400 pl-4.5">
                              {translateText(log.woredaName, language)}
                            </div>
                          )}
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
