// src/components/activity/ActivityTimeline.tsx
// Audit Trail & Real-Time Event Feed (Activity Logs)
// Clean tabular structure matching system-wide page aesthetics with supervisor scoping and compact view only.

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  RefreshCw,
  Search,
  Calendar,
  Filter,
  CheckCircle2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { offlineDb } from '../../db/offlineDb';
import { API_BASE } from '../../config/api';
import Button from '../ui/Button';

export default function ActivityTimeline({ user }) {
  const [logs, setLogs] = useState([]);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [expandedRowIds, setExpandedRowIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const role = (user?.role || '').toLowerCase();
  const isOfficer = role === 'field_officer';
  const isSupervisor = role === 'supervisor';
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Helper to determine if a log belongs strictly to the currently logged in user
  const isOwnLog = (l: any) => {
    if (!user?.id) return true;
    if (l.officerId === user.id || l.userId === user.id || l.actorId === user.id) return true;
    if (isOfficer && (!l.officerId || l.officerId === 'officer')) return true;
    if (l.metadata?.officerId === user.id || l.metadata?.userId === user.id) return true;
    return false;
  };

  // 1. Load activity logs from Dexie and Server
  const loadLogs = async () => {
    setIsLoading(true);
    try {
      // Step A: Load from Dexie first with strict user scoping
      let localLogs = await offlineDb.activityLogs.orderBy('deviceTimestamp').reverse().toArray();
      localLogs = localLogs.filter(isOwnLog);

      // Step B: If online, fetch from backend API strictly for this user
      const authToken = localStorage.getItem('fieldsync_token');
      if (navigator.onLine && authToken) {
        try {
          const queryParam = user?.id ? `?officerId=${user.id}&limit=150` : '?limit=150';
          const res = await fetch(`${API_BASE}/activity-logs${queryParam}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (res.ok) {
            const resData = await res.json();
            if (resData.success && Array.isArray(resData.data)) {
              for (const serverLog of resData.data) {
                // Strictly keep only logs belonging to this user
                if (!isOwnLog(serverLog)) {
                  continue;
                }
                await offlineDb.activityLogs.put({
                  id: serverLog.id,
                  officerId: serverLog.officerId,
                  officerName: serverLog.officer?.fullName || serverLog.officerName,
                  woredaName: serverLog.officer?.woreda?.name || serverLog.woredaName,
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
        } catch (serverErr) {
          console.warn('Could not fetch server activity logs, using offline Dexie:', serverErr.message);
        }
      }

      // Re-read updated logs from Dexie with strict user scoping
      let updatedLogs = await offlineDb.activityLogs.orderBy('deviceTimestamp').reverse().toArray();
      updatedLogs = updatedLogs.filter(isOwnLog);
      setLogs(updatedLogs);
    } catch (err) {
      console.error('Error loading activity logs:', err);
      toast.error('Failed to load activity logs');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadLogs();
    toast.success('Activity logs refreshed');
  };

  const toggleRowExpanded = (id) => {
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
  const getEventMeta = (eventType) => {
    switch (eventType) {
      case 'CITIZEN_REGISTERED':
      case 'CITIZEN_REGISTRATION_COMPLETED':
        return {
          label: 'Citizen Registered',
          category: 'REGISTRATIONS',
          bgClass: 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60',
        };
      case 'CITIZEN_REGISTRATION_STARTED':
        return {
          label: 'Registration Started',
          category: 'REGISTRATIONS',
          bgClass: 'bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-900/40',
        };
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
          label: eventType === 'WORK_SESSION_PAUSED' ? 'Session Paused' : 'Session Ended',
          category: 'SESSIONS',
          bgClass: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60',
        };
      case 'DAILY_REPORT_SUBMITTED':
      case 'REPORT_CREATED':
      case 'DAILY_REPORT_SAVED':
        return {
          label: 'Daily Report Submitted',
          category: 'REPORTS',
          bgClass: 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/60',
        };
      case 'TASK_ASSIGNED':
        return {
          label: 'Task Assigned',
          category: 'REPORTS',
          bgClass: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60',
        };
      case 'SUPERVISOR_EVALUATION':
        return {
          label: 'Officer Evaluated',
          category: 'REPORTS',
          bgClass: 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/60',
        };
      case 'SUPERVISOR_REPORT':
        return {
          label: 'Supervisor Report',
          category: 'REPORTS',
          bgClass: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60',
        };
      case 'ATTENDANCE_RECORDED':
      case 'ATTENDANCE_CHECK_IN':
      case 'ATTENDANCE_CHECK_OUT':
        return {
          label: eventType === 'ATTENDANCE_RECORDED' ? 'Attendance Recorded' : (eventType === 'ATTENDANCE_CHECK_IN' ? 'Clocked In' : 'Clocked Out'),
          category: 'SESSIONS',
          bgClass: 'bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-900/60',
        };
      case 'PROFILE_UPDATED':
      case 'PASSWORD_CHANGED':
        return {
          label: eventType === 'PROFILE_UPDATED' ? 'Profile Updated' : 'Password Changed',
          category: 'SYSTEM',
          bgClass: 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900/60',
        };
      case 'SYSTEM_ONLINE':
      case 'SYNC_COMPLETED':
      case 'DATA_SYNC_SUCCESSFUL':
        return {
          label: 'Data Synchronized',
          category: 'SYSTEM',
          bgClass: 'bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-900/60',
        };
      case 'SYSTEM_OFFLINE':
      case 'SYNC_FAILED':
      case 'SYNC_ERROR':
        return {
          label: 'Sync Alert',
          category: 'SYSTEM',
          bgClass: 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60',
        };
      case 'USER_LOGIN':
      case 'USER_LOGOUT':
        return {
          label: eventType === 'USER_LOGIN' ? 'User Login' : 'User Logout',
          category: 'SYSTEM',
          bgClass: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60',
        };
      default:
        return {
          label: (eventType || 'ACTIVITY').replace(/_/g, ' '),
          category: 'SYSTEM',
          bgClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
    }
  };

  // 3. Category Counts
  const categoryCounts = useMemo(() => {
    const counts = { ALL: logs.length, REGISTRATIONS: 0, SESSIONS: 0, REPORTS: 0, SYSTEM: 0 };
    for (const log of logs) {
      const meta = getEventMeta(log.eventType);
      if (counts[meta.category] !== undefined) {
        counts[meta.category]++;
      } else {
        counts.SYSTEM++;
      }
    }
    return counts;
  }, [logs]);

  // 4. Filtered Logs (No search by event id)
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Category filter
      if (filterCategory !== 'ALL') {
        const meta = getEventMeta(log.eventType);
        if (meta.category !== filterCategory) return false;
      }

      // Date filter
      if (selectedDate) {
        const logDate = log.deviceTimestamp ? log.deviceTimestamp.split('T')[0] : '';
        if (logDate !== selectedDate) return false;
      }

      // Search term (Only search activities, actions, or officer name - NOT event IDs)
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const descMatch = (log.description || '').toLowerCase().includes(q);
        const eventMatch = (log.eventType || '').toLowerCase().includes(q);
        const officerMatch = (log.officerName || '').toLowerCase().includes(q);
        if (!descMatch && !eventMatch && !officerMatch) return false;
      }

      return true;
    });
  }, [logs, filterCategory, selectedDate, searchTerm]);

  const clearAllFilters = () => {
    setFilterCategory('ALL');
    setSearchTerm('');
    setSelectedDate('');
  };

  const hasActiveFilters = filterCategory !== 'ALL' || searchTerm.trim() !== '' || selectedDate !== '';

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header & Quick Controls */}
      <div className="p-5 rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Activity Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isSupervisor
              ? 'Personal activity log of your supervisor actions, tasks assigned, and evaluations'
              : isOfficer
              ? 'Chronological audit log of your citizen registrations, work sessions, and reports'
              : 'Central audit feed of actions across the system'}
          </p>
        </div>
      </div>

      {/* 2. Filters Bar: Category Pills, Search, Date (No event id search, No View Toggle) */}
      <div className="p-4 rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Segmented Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All Events', count: categoryCounts.ALL },
              { id: 'REGISTRATIONS', label: 'Registrations', count: categoryCounts.REGISTRATIONS },
              { id: 'SESSIONS', label: 'Sessions', count: categoryCounts.SESSIONS },
              { id: 'REPORTS', label: 'Reports', count: categoryCounts.REPORTS },
              { id: 'SYSTEM', label: 'System', count: categoryCounts.SYSTEM },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  filterCategory === cat.id
                    ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    filterCategory === cat.id
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Date Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input (No event ID) */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search activities or officers..."
                className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Date Picker */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-medium bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setSelectedDate(selectedDate === todayStr ? '' : todayStr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                selectedDate === todayStr
                  ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Today
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Activity Records Table (Consistent structure with other pages, No images, Compact only) */}
      <div className="rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2563EB]" />
            <p className="text-xs font-medium">Loading activity logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center">
            <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {hasActiveFilters ? 'No Matching Activities Found' : 'No Activity Logged Yet'}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try clearing the search query or date filter.'
                : isSupervisor
                ? 'Your supervisor actions will be recorded here as you assign tasks and evaluate reports.'
                : 'Activities are captured as field actions occur.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">{isSupervisor ? 'Supervisor' : 'User'}</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
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

                        {/* Event Type */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                            {meta.label}
                          </span>
                        </td>

                        {/* User / Supervisor */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {log.officerName || (isSupervisor ? user?.fullName || user?.name || 'Supervisor' : 'Field Officer')}
                          </div>
                          {log.woredaName && (
                            <div className="text-[10px] text-slate-400">
                              {log.woredaName}
                            </div>
                          )}
                        </td>

                        {/* Description */}
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 max-w-md">
                          <p className="font-medium text-xs leading-relaxed">{log.description}</p>
                        </td>

                        {/* Sync Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isSynced ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                              <CheckCircle2 className="w-3 h-3" />
                              Synced
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
                              <Clock className="w-3 h-3" />
                              Local
                            </span>
                          )}
                        </td>

                        {/* Details */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {metadataEntries.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => toggleRowExpanded(log.id)}
                              className="px-2 py-1 rounded-md text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 transition-colors"
                            >
                              {isDetailsExpanded ? 'Hide' : 'Details'}
                            </button>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Metadata Detail Row */}
                      {isDetailsExpanded && metadataEntries.length > 0 && (
                        <tr className="bg-slate-50/50 dark:bg-slate-900/40">
                          <td colSpan={6} className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700">
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
