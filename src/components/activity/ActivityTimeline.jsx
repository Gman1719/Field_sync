// src/components/activity/ActivityTimeline.jsx
// Enterprise Audit Trail & Real-Time Event Feed (Activity Logs)

import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity, Search, Filter, Calendar, Clock, User,
  CheckCircle2, AlertCircle, RefreshCw, UserPlus, FileText,
  Play, Pause, LogIn, LogOut, Wifi, WifiOff, ChevronDown, ChevronUp,
  SlidersHorizontal, Check, Database, MapPin, Tag, Smartphone,
  Layers, List, LayoutGrid, ArrowUpDown
} from 'lucide-react';
import toast from 'react-hot-toast';

import { offlineDb } from '../../db/offlineDb';
import { API_BASE } from '../../config/api';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function ActivityTimeline({ user }) {
  const [logs, setLogs] = useState([]);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [viewMode, setViewMode] = useState('expanded'); // 'expanded' | 'compact'
  const [expandedRowIds, setExpandedRowIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const role = (user?.role || '').toLowerCase();
  const isOfficer = role === 'field_officer';
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  // 1. Load activity logs from Dexie and Server
  const loadLogs = async () => {
    setIsLoading(true);
    try {
      // Step A: Load from Dexie first
      let localLogs = await offlineDb.activityLogs.orderBy('deviceTimestamp').reverse().toArray();

      // For field officers, ensure scope isolation
      if (isOfficer && user?.id) {
        localLogs = localLogs.filter(
          (l) => !l.officerId || l.officerId === user.id || l.officerId === 'officer'
        );
      }

      // Step B: If online, fetch from backend API
      const authToken = localStorage.getItem('fieldsync_token');
      if (navigator.onLine && authToken) {
        try {
          const res = await fetch(`${API_BASE}/activity-logs?limit=150`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (res.ok) {
            const resData = await res.json();
            if (resData.success && Array.isArray(resData.data)) {
              for (const serverLog of resData.data) {
                // If officer, only store logs for this officer
                if (isOfficer && user?.id && serverLog.officerId && serverLog.officerId !== user.id) {
                  continue;
                }
                await offlineDb.activityLogs.put({
                  id: serverLog.id,
                  officerId: serverLog.officerId,
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

      // Re-read updated logs from Dexie
      let updatedLogs = await offlineDb.activityLogs.orderBy('deviceTimestamp').reverse().toArray();
      if (isOfficer && user?.id) {
        updatedLogs = updatedLogs.filter(
          (l) => !l.officerId || l.officerId === user.id || l.officerId === 'officer'
        );
      }
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

  // 2. Event Semantic Classifier & Icon Provider
  const getEventMeta = (eventType) => {
    switch (eventType) {
      case 'CITIZEN_REGISTERED':
      case 'CITIZEN_REGISTRATION_COMPLETED':
        return {
          label: 'Citizen Registered',
          category: 'REGISTRATIONS',
          icon: UserPlus,
          colorClass: 'text-[#2563EB] dark:text-[#60A5FA]',
          bgClass: 'bg-blue-50 dark:bg-blue-950/70 border-blue-200 dark:border-blue-900/60',
          nodeBg: 'bg-[#2563EB] text-white shadow-blue-500/20',
          dotBorder: 'border-blue-500',
        };
      case 'CITIZEN_REGISTRATION_STARTED':
        return {
          label: 'Registration Initiated',
          category: 'REGISTRATIONS',
          icon: User,
          colorClass: 'text-blue-500 dark:text-blue-400',
          bgClass: 'bg-blue-50/50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/40',
          nodeBg: 'bg-blue-500 text-white',
          dotBorder: 'border-blue-400',
        };
      case 'WORK_SESSION_STARTED':
      case 'WORK_SESSION_RESUMED':
        return {
          label: eventType === 'WORK_SESSION_STARTED' ? 'Session Started' : 'Session Resumed',
          category: 'SESSIONS',
          icon: Play,
          colorClass: 'text-emerald-700 dark:text-emerald-300',
          bgClass: 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-900/60',
          nodeBg: 'bg-emerald-600 text-white shadow-emerald-500/20',
          dotBorder: 'border-emerald-500',
        };
      case 'WORK_SESSION_PAUSED':
      case 'WORK_SESSION_ENDED':
        return {
          label: eventType === 'WORK_SESSION_PAUSED' ? 'Session Paused' : 'Session Ended',
          category: 'SESSIONS',
          icon: Pause,
          colorClass: 'text-amber-700 dark:text-amber-300',
          bgClass: 'bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-900/60',
          nodeBg: 'bg-amber-500 text-white shadow-amber-500/20',
          dotBorder: 'border-amber-500',
        };
      case 'DAILY_REPORT_SUBMITTED':
      case 'DAILY_REPORT_DRAFTED':
        return {
          label: eventType === 'DAILY_REPORT_SUBMITTED' ? 'Report Finalized' : 'Report Drafted',
          category: 'REPORTS',
          icon: FileText,
          colorClass: 'text-purple-700 dark:text-purple-300',
          bgClass: 'bg-purple-50 dark:bg-purple-950/70 border-purple-200 dark:border-purple-900/60',
          nodeBg: 'bg-purple-600 text-white shadow-purple-500/20',
          dotBorder: 'border-purple-500',
        };
      case 'USER_LOGIN':
      case 'USER_LOGOUT':
        return {
          label: eventType === 'USER_LOGIN' ? 'Officer Signed In' : 'Officer Signed Out',
          category: 'SYSTEM',
          icon: eventType === 'USER_LOGIN' ? LogIn : LogOut,
          colorClass: 'text-slate-700 dark:text-slate-300',
          bgClass: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
          nodeBg: 'bg-slate-600 text-white',
          dotBorder: 'border-slate-500',
        };
      case 'DEVICE_ONLINE':
      case 'DEVICE_OFFLINE':
        return {
          label: eventType === 'DEVICE_ONLINE' ? 'Device Online' : 'Device Offline',
          category: 'SYSTEM',
          icon: eventType === 'DEVICE_ONLINE' ? Wifi : WifiOff,
          colorClass: eventType === 'DEVICE_ONLINE' ? 'text-teal-700 dark:text-teal-300' : 'text-rose-700 dark:text-rose-300',
          bgClass: eventType === 'DEVICE_ONLINE' ? 'bg-teal-50 dark:bg-teal-950/70 border-teal-200' : 'bg-rose-50 dark:bg-rose-950/70 border-rose-200',
          nodeBg: eventType === 'DEVICE_ONLINE' ? 'bg-teal-600 text-white' : 'bg-rose-600 text-white',
          dotBorder: eventType === 'DEVICE_ONLINE' ? 'border-teal-500' : 'border-rose-500',
        };
      case 'SYNC_COMPLETED':
      case 'SYNC_STARTED':
      case 'SYNC_FAILED':
        return {
          label: eventType === 'SYNC_COMPLETED' ? 'Sync Completed' : eventType === 'SYNC_FAILED' ? 'Sync Failed' : 'Sync Running',
          category: 'SYSTEM',
          icon: RefreshCw,
          colorClass: 'text-indigo-700 dark:text-indigo-300',
          bgClass: 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800',
          nodeBg: 'bg-indigo-600 text-white',
          dotBorder: 'border-indigo-500',
        };
      default:
        return {
          label: eventType?.replace(/_/g, ' ') || 'Activity',
          category: 'SYSTEM',
          icon: Activity,
          colorClass: 'text-slate-700 dark:text-slate-300',
          bgClass: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
          nodeBg: 'bg-slate-500 text-white',
          dotBorder: 'border-slate-400',
        };
    }
  };

  // 3. Category Counts for Pill Filters
  const categoryCounts = useMemo(() => {
    const counts = { ALL: logs.length, REGISTRATIONS: 0, SESSIONS: 0, REPORTS: 0, SYSTEM: 0 };
    for (const log of logs) {
      const meta = getEventMeta(log.eventType);
      if (counts[meta.category] !== undefined) {
        counts[meta.category]++;
      }
    }
    return counts;
  }, [logs]);

  // 4. Filter Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const meta = getEventMeta(log.eventType);

      // Category filter
      if (filterCategory !== 'ALL' && meta.category !== filterCategory) {
        return false;
      }

      // Date filter
      if (selectedDate) {
        const logDate = log.deviceTimestamp ? log.deviceTimestamp.split('T')[0] : '';
        if (logDate !== selectedDate) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const descMatch = (log.description || '').toLowerCase().includes(q);
        const eventMatch = (log.eventType || '').toLowerCase().includes(q);
        const officerMatch = (log.officerName || log.officerId || '').toLowerCase().includes(q);
        let metaMatch = false;
        if (log.metadata) {
          metaMatch = JSON.stringify(log.metadata).toLowerCase().includes(q);
        }
        if (!descMatch && !eventMatch && !officerMatch && !metaMatch) return false;
      }

      return true;
    });
  }, [logs, filterCategory, selectedDate, searchTerm]);

  // 5. Group Filtered Logs by Date
  const groupedLogs = useMemo(() => {
    const groups = [];
    const map = new Map();

    for (const log of filteredLogs) {
      const dateKey = log.deviceTimestamp ? log.deviceTimestamp.split('T')[0] : 'undated';
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
        groups.push({ dateKey, items: map.get(dateKey) });
      }
      map.get(dateKey).push(log);
    }

    return groups;
  }, [filteredLogs]);

  // Format Date Header Label
  const getDateHeaderTitle = (dateKey) => {
    if (dateKey === 'undated') return 'Undated Activity';
    if (dateKey === todayStr) return 'Today';
    if (dateKey === yesterdayStr) return 'Yesterday';

    try {
      const [y, m, d] = dateKey.split('-');
      const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateKey;
    }
  };

  const clearAllFilters = () => {
    setFilterCategory('ALL');
    setSearchTerm('');
    setSelectedDate('');
  };

  const hasActiveFilters = filterCategory !== 'ALL' || searchTerm.trim() !== '' || selectedDate !== '';

  return (
    <div className="space-y-5">
      {/* 1. Consolidated Control & Filter Header */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] p-5 sm:p-6 shadow-xs space-y-5">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#1E3A8A] to-[#2563EB] text-white flex items-center justify-center shadow-xs shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                  Activity Logs
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                  {logs.length} Recorded
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">
                {isOfficer
                  ? 'Complete chronological audit log of your citizen registrations, work sessions, and shift reports'
                  : 'Central verified audit feed of field officer actions, session screen time, and registration logs'}
              </p>
            </div>
          </div>

          {/* Action Tools: View Density Toggle & Refresh */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {/* Density Toggle */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('expanded')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'expanded'
                    ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Expanded detailed view with metadata pills"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Expanded</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'compact'
                    ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Compact single-row list for high scanning speed"
              >
                <List className="w-3.5 h-3.5" />
                <span>Compact</span>
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              loading={isRefreshing}
              className="text-xs h-10 px-3.5 rounded-xl border-[#E2E8F0] dark:border-[#334155] text-slate-700 dark:text-[#F8FAFC] dark:hover:bg-[#0F172A]"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh Logs
            </Button>
          </div>
        </div>

        {/* Lower Toolbar: Segmented Filter Pills & Search */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Segmented Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All Events', count: categoryCounts.ALL },
              { id: 'REGISTRATIONS', label: 'Registrations', count: categoryCounts.REGISTRATIONS },
              { id: 'SESSIONS', label: 'Sessions', count: categoryCounts.SESSIONS },
              { id: 'REPORTS', label: 'Reports', count: categoryCounts.REPORTS },
              { id: 'SYSTEM', label: 'System & Sync', count: categoryCounts.SYSTEM },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  filterCategory === cat.id
                    ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                    : 'bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 border-[#E2E8F0] dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    filterCategory === cat.id
                      ? 'bg-blue-700/60 text-white'
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
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search events, IDs, kebeles..."
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50/50 dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all font-medium placeholder:text-slate-400"
              />
            </div>

            {/* Date Jump */}
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                title="Filter by specific date"
                className="h-9 px-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50/50 dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all cursor-pointer font-medium"
              />
            </div>

            <button
              type="button"
              onClick={() => setSelectedDate(selectedDate === todayStr ? '' : todayStr)}
              className={`h-9 px-3 rounded-xl text-xs font-bold transition-all border ${
                selectedDate === todayStr
                  ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                  : 'bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 border-[#E2E8F0] dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Today
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="h-9 px-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#0F172A] hover:bg-slate-200 dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-[#334155] transition-all whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Streamlined Vertical Timeline Activity Feed */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] p-5 sm:p-7 shadow-xs">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-slate-500">
            <RefreshCw className="w-7 h-7 text-[#2563EB] dark:text-[#60A5FA] animate-spin mx-auto mb-3" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Loading activity logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[#0F172A] flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
              <Activity className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-base">
              {hasActiveFilters ? 'No Activity Matches Current Filters' : 'No Field Activities Logged Yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {hasActiveFilters
                ? 'Try resetting the category filter or search query to see other recorded activities.'
                : 'Activity events are automatically captured when you register citizens, control work sessions, or submit daily reports.'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearAllFilters} className="text-xs">
                Reset Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {groupedLogs.map((group) => {
              const headerTitle = getDateHeaderTitle(group.dateKey);
              const isTodayGroup = group.dateKey === todayStr;

              return (
                <div key={group.dateKey} className="space-y-4">
                  {/* Date Sticky Header Ribbon */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] dark:bg-[#3B82F6]" />
                      <h2 className="text-sm font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                        {headerTitle}
                      </h2>
                      {isTodayGroup && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 dark:bg-blue-900/70 text-[#2563EB] dark:text-blue-300 uppercase tracking-wide">
                          Live Shift
                        </span>
                      )}
                    </div>
                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                      {group.items.length} {group.items.length === 1 ? 'event' : 'events'}
                    </span>
                  </div>

                  {/* Continuous Timeline Stream */}
                  <div className="relative pl-6 sm:pl-8 space-y-3 before:absolute before:left-2.5 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                    {group.items.map((log) => {
                      const meta = getEventMeta(log.eventType);
                      const Icon = meta.icon;
                      const timeStr = log.deviceTimestamp
                        ? new Date(log.deviceTimestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—';
                      const isSynced = log.syncStatus === 'SYNCED';
                      const isDetailsExpanded = expandedRowIds.has(log.id);

                      // Extract clean key-values from metadata
                      const metadataEntries = log.metadata
                        ? Object.entries(log.metadata).filter(
                            ([k, v]) => v !== null && v !== undefined && typeof v !== 'object'
                          )
                        : [];

                      // ----------------------------------------
                      // RENDER: COMPACT ROW
                      // ----------------------------------------
                      if (viewMode === 'compact') {
                        return (
                          <div
                            key={log.id}
                            className="relative flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50/80 dark:hover:bg-[#0F172A]/60 transition-colors group"
                          >
                            {/* Bullet Node */}
                            <div
                              className={`absolute -left-6 sm:-left-8 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full ${meta.nodeBg} flex items-center justify-center ring-4 ring-white dark:ring-[#1E293B] shadow-xs shrink-0`}
                            >
                              <Icon className="w-2.5 h-2.5" />
                            </div>

                            {/* Time */}
                            <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 w-16 shrink-0">
                              {timeStr}
                            </span>

                            {/* Badge */}
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${meta.bgClass}`}
                            >
                              {meta.label}
                            </span>

                            {/* Description text */}
                            <p className="text-xs text-slate-800 dark:text-slate-200 font-medium truncate flex-1 min-w-0">
                              {log.description}
                            </p>

                            {/* Sync Status */}
                            <div className="shrink-0 flex items-center gap-2">
                              {isSynced ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Synced
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                  <Clock className="w-3 h-3" />
                                  Local
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // ----------------------------------------
                      // RENDER: EXPANDED DETAILED ROW
                      // ----------------------------------------
                      return (
                        <div
                          key={log.id}
                          className="relative flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-[#0F172A]/40 hover:bg-slate-50/80 dark:hover:bg-[#0F172A]/80 hover:border-slate-200 dark:hover:border-slate-700/80 transition-all group"
                        >
                          {/* Semantic Node Dot on Continuous Spine */}
                          <div
                            className={`absolute -left-6 sm:-left-8 top-4 w-6 h-6 rounded-full ${meta.nodeBg} flex items-center justify-center ring-4 ring-white dark:ring-[#1E293B] shadow-xs shrink-0`}
                          >
                            <Icon className="w-3 h-3" />
                          </div>

                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Primary Line: Time, Event Badge, Title, Sync Status */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2 min-w-0">
                                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-[#1E293B] px-2 py-0.5 rounded-md border border-slate-200/70 dark:border-slate-800 shadow-2xs">
                                  {timeStr}
                                </span>

                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${meta.bgClass}`}
                                >
                                  <Icon className="w-3 h-3" />
                                  {meta.label}
                                </span>

                                {log.relatedRecordId && (
                                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate">
                                    REF: {log.relatedRecordId}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {isSynced ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                    Synced
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/60">
                                    <Clock className="w-3 h-3 text-amber-500" />
                                    Pending Sync
                                  </span>
                                )}

                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleRowExpanded(log.id)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                                    title={isDetailsExpanded ? 'Hide Raw Details' : 'View Payload Details'}
                                  >
                                    {isDetailsExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Human-Readable Description */}
                            <p className="text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                              {log.description}
                            </p>

                            {/* Clean Metadata Pill Cluster (No Raw JSON leakage!) */}
                            {metadataEntries.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                {metadataEntries.map(([key, val]) => {
                                  // Clean format key names
                                  let cleanKey = key;
                                  if (key === 'clientRecordId') cleanKey = 'Citizen ID';
                                  else if (key === 'kebeleId') cleanKey = 'Kebele';
                                  else if (key === 'woredaId') cleanKey = 'Woreda';
                                  else if (key === 'regionId') cleanKey = 'Region';
                                  else if (key === 'durationSeconds') cleanKey = 'Duration (s)';

                                  return (
                                    <span
                                      key={key}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-400 shadow-2xs"
                                    >
                                      <span className="font-bold text-slate-400 dark:text-slate-500 uppercase text-[9px]">
                                        {cleanKey}:
                                      </span>
                                      <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                                        {String(val)}
                                      </span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {/* Expandable Technical Raw Payload (Only when explicitly clicked) */}
                            {isDetailsExpanded && log.metadata && (
                              <div className="mt-2.5 p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto shadow-inner border border-slate-800">
                                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider">
                                  Raw Event Payload
                                </div>
                                <pre className="leading-relaxed">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
