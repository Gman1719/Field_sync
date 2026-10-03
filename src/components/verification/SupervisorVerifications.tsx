// src/components/verification/SupervisorVerifications.tsx
// Supervisor-only page: Shows ALL verification events (both answered & missed) for all
// field officers under this supervisor's command. Displayed as a rich table with
// per-officer drill-down, full records table view, search, filters, and aggregate stats.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck, ShieldAlert, CheckCircle2,
  XCircle, Clock, AlertTriangle, User, MapPin, ChevronDown, ChevronUp,
  Calendar, Activity, Filter, Download, Users, HelpCircle,
  UserCheck
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import { offlineDb } from '../../db/offlineDb';
import { db } from '../../services/database';
import { getZonedTimeComponents } from '../../config/workingHours';
import { useUserLanguage } from '../../context/UserLanguageContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import StatCard from '../ui/StatCard';

export interface VerificationRecord {
  id: string;
  officerId: string;
  officerName: string;
  officerEmployeeId?: string;
  officerZone?: string;
  scheduledAt: string;
  respondedAt?: string;
  status: string; // OFFICER_CONFIRMED | CONFIRMED | MISSED | EXPIRED | NO_RESPONSE
  isAnswered: boolean;
  question: string;
  answer: string;
  responseTimeSeconds?: number | null;
  connectionState?: string;
  failureReason?: string;
  syncStatus?: string;
  workedDate?: string;
}

interface SupervisorVerificationsProps {
  user: any;
  users?: any[];
}

export default function SupervisorVerifications({ user, users = [] }: SupervisorVerificationsProps) {
  const { userT } = useUserLanguage();
  const { dateStr: todayDateStr } = getZonedTimeComponents();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [assignedOfficers, setAssignedOfficers] = useState<any[]>([]);
  const [selectedOfficerFilter, setSelectedOfficerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'missed'>('all');
  const [dateFilterMode, setDateFilterMode] = useState<'today' | '7d' | 'custom'>('7d');
  const [selectedDatePickerDate, setSelectedDatePickerDate] = useState<string>(todayDateStr);
  const [expandedOfficer, setExpandedOfficer] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch officer verifications from Dexie (offline-first) + LocalStorage + API
  const loadVerifications = useCallback(async () => {
    setLoading(true);
    try {
      const isManager = user?.role === 'manager';
      let myOfficers: any[] = [];

      // 1. First fetch strictly assigned officers from backend DB
      try {
        const token = localStorage.getItem('fieldsync_token') || localStorage.getItem('token');
        if (token && navigator.onLine) {
          const oRes = await fetch(`${API_BASE}/work-monitoring/officers`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (oRes.ok) {
            const oJson = await oRes.json();
            if (oJson.success && Array.isArray(oJson.data)) {
              myOfficers = oJson.data;
            }
          }
        }
      } catch (_e) {}

      // 2. If offline or empty, strictly filter from offlineDb or users where supervisorId === user.id
      if (myOfficers.length === 0) {
        const pool = (offlineDb?.users ? await offlineDb.users.toArray().catch(() => []) : [])
          .concat(users || []);

        const seen = new Set<string>();
        for (const u of pool) {
          const isOfficer = u.role === 'field_officer' || u.role === 'FIELD_OFFICER';
          if (!isOfficer || seen.has(u.id)) continue;
          if (isManager || u.supervisorId === user?.id || (user?.employeeId && u.supervisorEmployeeId === user?.employeeId)) {
            seen.add(u.id);
            myOfficers.push(u);
          }
        }
      }

      const officerIds = new Set(myOfficers.map(o => o.id));
      const officerEmpIds = new Set(myOfficers.map(o => o.employeeId).filter(Boolean));
      setAssignedOfficers(myOfficers);
      const isOfficerInScope = (id?: string) => {
        if (isManager) return true;
        if (!id) return false;
        return officerIds.has(id) || officerEmpIds.has(id);
      };

      const recordMap = new Map<string, VerificationRecord>();

      // 1. Load from Dexie offlineDb.workVerifications
      if (offlineDb.workVerifications) {
        try {
          const dexieRecs = await offlineDb.workVerifications.toArray();
          for (const rec of dexieRecs) {
            if (!isOfficerInScope(rec.officerId)) continue;
            const officer = myOfficers.find(o => o.id === rec.officerId || o.employeeId === rec.officerId) ||
              users.find(u => u.id === rec.officerId || u.employeeId === rec.officerId);

            const isAnswered = Boolean(
              String(rec.status).includes('CONFIRMED') ||
              rec.respondedAt
            );

            const isLoggedOut = rec.loginState === 'LOGGED_OUT' ||
              rec.failureReason === 'NO_ACTIVE_SESSION' ||
              (rec.notes && rec.notes.toLowerCase().includes('logged out'));

            const questionText = rec.notes && rec.notes.includes('?')
              ? rec.notes
              : userT('Random Identity & Presence Verification');

            const answerText = isAnswered
              ? (rec.notes || userT('Presence Confirmed'))
              : isLoggedOut
                ? userT('Missed — Officer Logged Out During Working Hours')
                : (rec.failureReason === 'NO_RESPONSE'
                    ? userT('Missed — No Response (15s Timeout)')
                    : (rec.failureReason || userT('Missed / Unanswered')));

            recordMap.set(rec.id, {
              id: rec.id,
              officerId: rec.officerId,
              officerName: officer?.name || officer?.fullName || rec.officerName || rec.officerId,
              officerEmployeeId: officer?.employeeId || rec.officerId,
              officerZone: officer?.zone || officer?.region,
              scheduledAt: rec.scheduledAt,
              respondedAt: rec.respondedAt || undefined,
              status: String(rec.status || (isAnswered ? 'OFFICER_CONFIRMED' : 'MISSED')),
              isAnswered,
              question: questionText,
              answer: answerText,
              responseTimeSeconds: rec.responseTimeSeconds ?? null,
              connectionState: rec.connectionState || 'ONLINE',
              failureReason: rec.failureReason || undefined,
              syncStatus: rec.syncStatus || 'PENDING',
              workedDate: rec.scheduledAt?.slice(0, 10),
            });
          }
        } catch (_err) {
          console.warn('Error reading offlineDb.workVerifications:', _err);
        }
      }

      // 2. Load from db.verification_history (legacy/challenge IndexedDB)
      if (db && db.verification_history) {
        try {
          const vHistory = await db.verification_history.toArray();
          for (const item of vHistory) {
            if (!isOfficerInScope(item.officerId)) continue;
            if (!recordMap.has(item.id)) {
              const officer = myOfficers.find(o => o.id === item.officerId || o.employeeId === item.officerId) ||
                users.find(u => u.id === item.officerId || u.employeeId === item.officerId);

              const isAnswered = item.success === true;
              recordMap.set(item.id, {
                id: item.id || `vh_${Math.random()}`,
                officerId: item.officerId,
                officerName: officer?.name || item.officerName || item.officerId,
                officerEmployeeId: officer?.employeeId || item.officerId,
                officerZone: officer?.zone || officer?.region,
                scheduledAt: item.timestamp || new Date().toISOString(),
                respondedAt: isAnswered ? item.timestamp : undefined,
                status: isAnswered ? 'OFFICER_CONFIRMED' : 'MISSED',
                isAnswered,
                question: item.question || userT('Security Verification Challenge'),
                answer: item.answer || (isAnswered ? userT('Correct / Confirmed') : userT('Missed / No Response')),
                responseTimeSeconds: item.responseTime || null,
                connectionState: 'ONLINE',
                syncStatus: item.synced ? 'SYNCED' : 'PENDING',
                workedDate: (item.timestamp || '').slice(0, 10),
              });
            }
          }
        } catch (_err) {
          console.warn('Error reading db.verification_history:', _err);
        }
      }

      // 3. Load from localStorage verification cache
      for (const officer of myOfficers) {
        try {
          const saved = localStorage.getItem(`verification_${officer.id}`) || localStorage.getItem(`verification_${officer.employeeId}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed.history)) {
              for (const item of parsed.history) {
                if (!recordMap.has(item.id)) {
                  const isAnswered = item.success === true;
                  recordMap.set(item.id, {
                    id: item.id || `loc_${Math.random()}`,
                    officerId: officer.id,
                    officerName: officer.name || officer.id,
                    officerEmployeeId: officer.employeeId,
                    officerZone: officer.zone || officer.region,
                    scheduledAt: item.timestamp || new Date().toISOString(),
                    respondedAt: isAnswered ? item.timestamp : undefined,
                    status: isAnswered ? 'OFFICER_CONFIRMED' : 'MISSED',
                    isAnswered,
                    question: item.question || userT('Security Verification Challenge'),
                    answer: item.answer || (isAnswered ? userT('Correct / Confirmed') : userT('Missed / No Response')),
                    responseTimeSeconds: item.responseTime || null,
                    connectionState: 'ONLINE',
                    syncStatus: item.synced ? 'SYNCED' : 'PENDING',
                    workedDate: (item.timestamp || '').slice(0, 10),
                  });
                }
              }
            }
          }
        } catch (_e) {}
      }

      // 4. Load from backend API if online
      if (navigator.onLine) {
        const token = localStorage.getItem('fieldsync_token') || localStorage.getItem('token');
        if (token) {
          try {
            const res = await fetch(`${API_BASE}/work-monitoring/verifications`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              const apiRecords: any[] = Array.isArray(data) ? data : (data?.data || []);
              for (const rec of apiRecords) {
                const offId = rec.officerId || rec.officer_id;
                if (!isOfficerInScope(offId)) continue;

                const officer = myOfficers.find(o => o.id === offId || o.employeeId === offId) ||
                  rec.officer ||
                  users.find(u => u.id === offId || u.employeeId === offId);

                const isAnswered = rec.status === 'CONFIRMED' ||
                  rec.status === 'CONFIRMED_OFFLINE' ||
                  Boolean(rec.respondedAt);

                const isLoggedOut = rec.loginState === 'LOGGED_OUT' ||
                  rec.failureReason === 'NO_ACTIVE_SESSION' ||
                  (rec.notes && rec.notes.toLowerCase().includes('logged out'));

                const questionText = rec.notes && rec.notes.includes('?')
                  ? rec.notes
                  : (rec.question || userT('Work Verification Check'));

                const answerText = isAnswered
                  ? (rec.notes || userT('Presence Confirmed'))
                  : isLoggedOut
                    ? userT('Missed — Officer Logged Out During Working Hours')
                    : (rec.failureReason === 'NO_RESPONSE'
                        ? userT('Missed — No Response (15s Timeout)')
                        : (rec.failureReason || userT('Missed / Unanswered')));

                recordMap.set(rec.id, {
                  id: rec.id,
                  officerId: offId,
                  officerName: officer?.fullName || officer?.name || rec.officerName || offId,
                  officerEmployeeId: officer?.employeeId || rec.officerEmployeeId || offId,
                  officerZone: officer?.zone?.name || officer?.zone || officer?.region?.name || officer?.region,
                  scheduledAt: rec.scheduledAt || rec.timestamp || new Date().toISOString(),
                  respondedAt: rec.respondedAt || (isAnswered ? (rec.timestamp || rec.scheduledAt) : undefined),
                  status: isAnswered ? 'OFFICER_CONFIRMED' : 'MISSED',
                  isAnswered,
                  question: questionText,
                  answer: answerText,
                  responseTimeSeconds: rec.responseTimeSeconds ?? null,
                  connectionState: rec.connectionState || 'ONLINE',
                  failureReason: isLoggedOut ? 'LOGGED_OUT' : (rec.failureReason || undefined),
                  syncStatus: rec.syncStatus || 'SYNCED',
                  workedDate: rec.date || (rec.scheduledAt || rec.timestamp || '').slice(0, 10),
                });
              }
            }
          } catch (_e) {
            console.warn('Failed to load /work-monitoring/verifications:', _e);
          }
        }
      }

      const allRecords = Array.from(recordMap.values());
      // Sort most recent first
      allRecords.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
      setRecords(allRecords);
    } catch (e) {
      console.error('Failed to load verifications:', e);
    } finally {
      setLoading(false);
    }
  }, [user, users, refreshKey, userT]);

  useEffect(() => {
    loadVerifications();
  }, [loadVerifications]);

  // Listen for sync and verification events
  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener('sync-complete', handler);
    window.addEventListener('verification-update', handler);
    return () => {
      window.removeEventListener('sync-complete', handler);
      window.removeEventListener('verification-update', handler);
    };
  }, []);

  // Filtered records
  const filteredRecords = useMemo(() => {
    let list = records;

    // 1. Date filter (Today, 7 days, or Custom Date Picker)
    if (dateFilterMode === 'today') {
      list = list.filter(r => (r.workedDate || r.scheduledAt?.slice(0, 10)) === todayDateStr);
    } else if (dateFilterMode === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      d.setHours(0, 0, 0, 0);
      list = list.filter(r => new Date(r.scheduledAt) >= d);
    } else if (dateFilterMode === 'custom' && selectedDatePickerDate) {
      list = list.filter(r => (r.workedDate || r.scheduledAt?.slice(0, 10)) === selectedDatePickerDate);
    }

    // 2. Status filter
    if (statusFilter === 'confirmed') {
      list = list.filter(r => r.isAnswered);
    } else if (statusFilter === 'missed') {
      list = list.filter(r => !r.isAnswered);
    }

    // 3. Officer filter (by dropdown)
    if (selectedOfficerFilter) {
      list = list.filter(r => r.officerId === selectedOfficerFilter);
    }

    return list;
  }, [records, dateFilterMode, selectedDatePickerDate, statusFilter, selectedOfficerFilter, todayDateStr]);

  // Group by officer
  const officerGroups = useMemo(() => {
    const map = new Map<string, { officer: { id: string; name: string; employeeId?: string; zone?: string }; records: VerificationRecord[] }>();
    for (const rec of filteredRecords) {
      if (!map.has(rec.officerId)) {
        map.set(rec.officerId, {
          officer: {
            id: rec.officerId,
            name: rec.officerName,
            employeeId: rec.officerEmployeeId,
            zone: rec.officerZone
          },
          records: [],
        });
      }
      map.get(rec.officerId)!.records.push(rec);
    }
    return Array.from(map.values()).sort((a, b) => b.records.length - a.records.length);
  }, [filteredRecords]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const confirmed = filteredRecords.filter(r => r.isAnswered).length;
    const missed = total - confirmed;
    const rate = total > 0 ? Math.round((confirmed / total) * 100) : 0;
    return { total, confirmed, missed, rate, officers: officerGroups.length };
  }, [filteredRecords, officerGroups]);

  // CSV Export
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = ['Officer Name', 'Employee ID', 'Scheduled At', 'Responded At', 'Status', 'Question', 'Officer Answer', 'Response Time (s)', 'Connection', 'Sync Status'];
    const rows = filteredRecords.map(r => [
      `"${r.officerName.replace(/"/g, '""')}"`,
      `"${(r.officerEmployeeId || '').replace(/"/g, '""')}"`,
      `"${r.scheduledAt}"`,
      `"${r.respondedAt || ''}"`,
      `"${r.isAnswered ? 'CONFIRMED' : 'MISSED'}"`,
      `"${(r.question || '').replace(/"/g, '""')}"`,
      `"${(r.answer || '').replace(/"/g, '""')}"`,
      r.responseTimeSeconds !== null && r.responseTimeSeconds !== undefined ? r.responseTimeSeconds : '',
      `"${r.connectionState || ''}"`,
      `"${r.syncStatus || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `officer_verifications_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (rec: VerificationRecord) => {
    if (rec.isAnswered) {
      return (
        <Badge variant="success" className="px-2 py-0.5 text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          {userT('Confirmed')}
        </Badge>
      );
    }

    const isLoggedOut = rec.failureReason === 'LOGGED_OUT' ||
      rec.failureReason === 'NO_ACTIVE_SESSION' ||
      (rec.answer && rec.answer.toLowerCase().includes('logged out'));

    if (isLoggedOut) {
      return (
        <Badge variant="error" className="px-2 py-0.5 text-xs font-semibold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50">
          <XCircle className="w-3.5 h-3.5 mr-1" />
          {userT('Missed (Logged Out)')}
        </Badge>
      );
    }

    return (
      <Badge variant="error" className="px-2 py-0.5 text-xs font-semibold">
        <XCircle className="w-3.5 h-3.5 mr-1" />
        {userT('Missed')}
      </Badge>
    );
  };

  const formatTime = (iso: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <div className="w-9 h-9 border-2 border-[#1E3A8A] dark:border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{userT('Loading officer verifications...')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#1E3A8A] dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {userT('Officer Verification Monitor')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {userT('All verification checks — answered and missed — for all your field officers')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filteredRecords.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{userT('Export')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard
          title={userT('Total Checks')}
          value={stats.total}
          icon={Activity}
          subtitle={userT('Total verification events')}
        />
        <StatCard
          title={userT('Confirmed')}
          value={stats.confirmed}
          icon={CheckCircle2}
          variant="success"
          subtitle={userT('Officer answered')}
        />
        <StatCard
          title={userT('Missed')}
          value={stats.missed}
          icon={XCircle}
          variant="danger"
          subtitle={userT('No response or expired')}
        />
        <StatCard
          title={userT('Response Rate')}
          value={`${stats.rate}%`}
          icon={ShieldCheck}
          variant={stats.rate >= 80 ? 'success' : stats.rate >= 60 ? 'warning' : 'danger'}
          subtitle={userT('Team compliance rate')}
        />
        <StatCard
          title={userT('Supervised Officers')}
          value={stats.officers}
          icon={User}
          subtitle={userT('Field officers with activity')}
        />
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          {/* Officer dropdown filter */}
          <div className="relative w-full lg:w-72">
            <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={selectedOfficerFilter}
              onChange={e => setSelectedOfficerFilter(e.target.value)}
              className="w-full h-9 pl-9 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] appearance-none cursor-pointer"
            >
              <option value="">{userT('Filter by officers (All Officers)')}</option>
              {assignedOfficers.map((off: any) => (
                <option key={off.id} value={off.id}>
                  {off.fullName || off.name || off.id} {off.employeeId ? `(${off.employeeId})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status filters */}
            {(['all', 'confirmed', 'missed'] as const).map(s => {
              const count = s === 'all' ? records.length : (s === 'confirmed' ? records.filter(r => r.isAnswered).length : records.filter(r => !r.isAnswered).length);
              const label = s === 'all'
                ? `${userT('All')} (${count})`
                : s === 'confirmed'
                ? `${userT('Confirmed')} (${count})`
                : `${userT('Missed')} (${count})`;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === s
                      ? (s === 'confirmed'
                          ? 'bg-emerald-600 text-white font-bold'
                          : s === 'missed'
                          ? 'bg-rose-600 text-white font-bold'
                          : 'bg-[#2563EB] text-white font-bold')
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}

            <div className="w-px bg-slate-200 dark:bg-slate-700 mx-1 h-6 self-center hidden sm:block" />

            {/* Date Picker Filter with Today & 7 Days buttons next to it */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                <Calendar className="w-3.5 h-3.5 text-[#1E3A8A] dark:text-blue-400 shrink-0" />
                <input
                  type="date"
                  value={selectedDatePickerDate}
                  onChange={(e) => {
                    setSelectedDatePickerDate(e.target.value);
                    setDateFilterMode('custom');
                  }}
                  className="text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                  title={userT('Select date to filter verifications')}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setDateFilterMode('today');
                  setSelectedDatePickerDate(todayDateStr);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  dateFilterMode === 'today'
                    ? 'bg-[#1E3A8A] text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                }`}
              >
                {userT('Today')}
              </button>

              <button
                type="button"
                onClick={() => setDateFilterMode('7d')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  dateFilterMode === '7d'
                    ? 'bg-[#1E3A8A] text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                }`}
              >
                7 {userT('days')}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {filteredRecords.length === 0 ? (
        <Card className="py-16 text-center">
          <ShieldAlert className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-200">{userT('No verification records found')}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {userT('Verification data and officer responses will appear here as field officers perform daily sessions.')}
          </p>
        </Card>
      ) : (
        /* Grouped by officer view (Cards with accordion details) */
        <div className="space-y-3">
          {officerGroups.map(({ officer, records: oRecs }) => {
            const isExpanded = expandedOfficer === officer.id;
            const confirmed = oRecs.filter(r => r.isAnswered).length;
            const missed = oRecs.length - confirmed;
            const rate = oRecs.length > 0 ? Math.round((confirmed / oRecs.length) * 100) : 0;

            return (
              <Card
                key={officer.id}
                className="transition-all overflow-hidden border border-slate-200 dark:border-slate-700"
              >
                {/* Officer Header Row */}
                <div
                  className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  onClick={() => setExpandedOfficer(isExpanded ? null : officer.id)}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-[#1E3A8A]/10 dark:bg-blue-900/40 text-[#1E3A8A] dark:text-blue-300 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100 dark:border-blue-900/50">
                      {officer.name?.charAt(0).toUpperCase() || 'O'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{officer.name}</h4>
                        {officer.zone && (
                          <span className="hidden sm:inline px-2 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-500">
                            {officer.zone}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{officer.employeeId || officer.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* Mini stats */}
                    <div className="hidden sm:flex items-center gap-4 text-xs">
                      <div className="text-center px-2">
                        <div className="text-slate-400 font-medium">{userT('Total')}</div>
                        <div className="font-bold text-slate-900 dark:text-white">{oRecs.length}</div>
                      </div>
                      <div className="text-center px-2">
                        <div className="text-emerald-500 font-medium">{userT('Confirmed')}</div>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">{confirmed}</div>
                      </div>
                      <div className="text-center px-2">
                        <div className="text-rose-500 font-medium">{userT('Missed')}</div>
                        <div className="font-bold text-rose-600 dark:text-rose-400">{missed}</div>
                      </div>
                      <div className="text-center px-2">
                        <div className="text-slate-400 font-medium">{userT('Rate')}</div>
                        <div className={`font-bold ${rate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : rate >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {rate}%
                        </div>
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-slate-500 dark:text-slate-300">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded detail table */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-700">
                    {/* Mobile mini stats */}
                    <div className="flex sm:hidden items-center justify-around gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 text-xs border-b border-slate-100 dark:border-slate-700">
                      <div className="text-center"><div className="text-slate-400">{userT('Total')}</div><div className="font-bold">{oRecs.length}</div></div>
                      <div className="text-center"><div className="text-emerald-500">{userT('Confirmed')}</div><div className="font-bold text-emerald-600">{confirmed}</div></div>
                      <div className="text-center"><div className="text-rose-500">{userT('Missed')}</div><div className="font-bold text-rose-600">{missed}</div></div>
                      <div className="text-center"><div className="text-slate-400">{userT('Rate')}</div><div className="font-bold">{rate}%</div></div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                          <tr className="text-slate-500 dark:text-slate-400">
                            <th className="py-2.5 px-4 font-semibold">{userT('Scheduled Time')}</th>
                            <th className="py-2.5 px-4 font-semibold">{userT('Question / Verification')}</th>
                            <th className="py-2.5 px-4 font-semibold">{userT('Officer Answer')}</th>
                            <th className="py-2.5 px-4 font-semibold">{userT('Status')}</th>
                            <th className="py-2.5 px-4 font-semibold">{userT('Response Time')}</th>
                            <th className="py-2.5 px-4 font-semibold">{userT('Connection')}</th>
                            <th className="py-2.5 px-4 font-semibold">{userT('Sync')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                          {oRecs.map(rec => (
                            <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                                {formatTime(rec.scheduledAt)}
                              </td>
                              <td className="py-2.5 px-4 max-w-xs text-slate-700 dark:text-slate-300">
                                <span className="font-medium line-clamp-1" title={rec.question}>{rec.question}</span>
                              </td>
                              <td className="py-2.5 px-4 max-w-xs">
                                {rec.isAnswered ? (
                                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate" title={rec.answer}>{rec.answer}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate" title={rec.answer}>{rec.answer}</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-4 whitespace-nowrap">{getStatusBadge(rec)}</td>
                              <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {rec.responseTimeSeconds !== null && rec.responseTimeSeconds !== undefined ? (
                                  `${rec.responseTimeSeconds}s`
                                ) : rec.isAnswered ? (
                                  '—'
                                ) : (
                                  <span className="text-rose-500">{userT('Expired (15s)')}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {rec.connectionState || '—'}
                              </td>
                              <td className="py-2.5 px-4 whitespace-nowrap">
                                <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                                  {rec.syncStatus || 'SYNCED'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
