// src/components/activity/ActivityTimeline.jsx
// Offline-First Chronological Activity Logger & Timeline View (Phase 5)

import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity, Search, Filter, Calendar, Clock, User,
  CheckCircle2, AlertCircle, RefreshCw, UserPlus, FileText,
  Play, Pause, LogIn, LogOut, Wifi, WifiOff
} from 'lucide-react';
import toast from 'react-hot-toast';

import { offlineDb } from '../../db/offlineDb';
import { API_BASE } from '../../config/api';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function ActivityTimeline({ user }) {
  const [logs, setLogs] = useState([]);
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isOfficer = user?.role === 'field_officer';

  // 1. Load activity logs from Dexie and Server
  const loadLogs = async () => {
    setIsLoading(true);
    try {
      // Step A: Load from Dexie first
      let localLogs = await offlineDb.activityLogs.orderBy('deviceTimestamp').reverse().toArray();

      // Step B: If online, fetch from backend API
      const authToken = localStorage.getItem('fieldsync_token');
      if (navigator.onLine && authToken) {
        try {
          const res = await fetch(`${API_BASE}/activity-logs?limit=100`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (res.ok) {
            const resData = await res.json();
            if (resData.success && resData.data) {
              for (const serverLog of resData.data) {
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

      // Re-read from Dexie
      const updatedLogs = await offlineDb.activityLogs.orderBy('deviceTimestamp').reverse().toArray();
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

  // 2. Event Icon & Color Helper
  const getEventBadge = (eventType) => {
    switch (eventType) {
      case 'CITIZEN_REGISTERED':
        return {
          icon: UserPlus,
          label: 'Citizen Registered',
          variant: 'primary',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'WORK_SESSION_STARTED':
      case 'WORK_SESSION_RESUMED':
        return {
          icon: Play,
          label: 'Session Active',
          variant: 'success',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'WORK_SESSION_PAUSED':
      case 'WORK_SESSION_ENDED':
        return {
          icon: Pause,
          label: 'Session Paused/Ended',
          variant: 'warning',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'DAILY_REPORT_SUBMITTED':
        return {
          icon: FileText,
          label: 'Daily Report Submitted',
          variant: 'info',
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'USER_LOGIN':
        return {
          icon: LogIn,
          label: 'User Sign In',
          variant: 'default',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
        };
      case 'DEVICE_ONLINE':
        return {
          icon: Wifi,
          label: 'Device Online',
          variant: 'success',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'DEVICE_OFFLINE':
        return {
          icon: WifiOff,
          label: 'Device Offline',
          variant: 'warning',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      default:
        return {
          icon: Activity,
          label: eventType?.replace(/_/g, ' ') || 'Activity',
          variant: 'default',
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
        };
    }
  };

  // 3. Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterType !== 'ALL' && log.eventType !== filterType) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const descMatch = log.description?.toLowerCase().includes(q);
        const eventMatch = log.eventType?.toLowerCase().includes(q);
        if (!descMatch && !eventMatch) return false;
      }
      return true;
    });
  }, [logs, filterType, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-card">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {isOfficer ? 'My Activity Timeline' : 'Field Activity Timeline'}
              </h1>
              <p className="text-xs text-slate-500">
                Automatic chronological logging of field citizen registrations, work sessions, and reports
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setIsRefreshing(true);
            loadLogs();
          }}
          loading={isRefreshing}
          className="text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh Timeline
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search activity events..."
                className="w-full h-10 pl-9 pr-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
              />
            </div>

            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
              >
                <option value="ALL">All Event Types</option>
                <option value="CITIZEN_REGISTERED">Citizen Registrations</option>
                <option value="WORK_SESSION_STARTED">Work Sessions Started</option>
                <option value="WORK_SESSION_PAUSED">Work Sessions Paused</option>
                <option value="WORK_SESSION_RESUMED">Work Sessions Resumed</option>
                <option value="WORK_SESSION_ENDED">Work Sessions Ended</option>
                <option value="DAILY_REPORT_SUBMITTED">Daily Reports Submitted</option>
                <option value="USER_LOGIN">User Sign Ins</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline List */}
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <RefreshCw className="w-6 h-6 text-[#1E3A8A] animate-spin mx-auto mb-2" />
              Loading activity timeline...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 space-y-2">
              <Activity className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700 text-sm">No Activity Events Recorded</p>
              <p className="text-slate-400">
                Field activity logs will be recorded automatically as you register citizens and manage work sessions.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {filteredLogs.map((log) => {
                const badge = getEventBadge(log.eventType);
                const Icon = badge.icon;
                const dateStr = log.deviceTimestamp ? new Date(log.deviceTimestamp).toLocaleString() : '—';
                const isSynced = log.syncStatus === 'SYNCED';

                return (
                  <div key={log.id} className="relative flex items-start gap-4 group">
                    {/* Bullet marker */}
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-[#1E3A8A] flex items-center justify-center shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A8A]" />
                    </div>

                    <div className="flex-1 p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${badge.bg}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {badge.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{dateStr}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${isSynced ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {isSynced ? 'Synced' : 'Pending Sync'}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-800 font-medium leading-relaxed">
                        {log.description}
                      </p>

                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="text-[11px] text-slate-500 font-mono bg-white p-2 rounded-lg border border-slate-100 truncate">
                          {JSON.stringify(log.metadata)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
