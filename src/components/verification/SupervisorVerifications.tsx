// src/components/verification/SupervisorVerifications.tsx
// Supervisor-only page: Shows ALL verification events (both answered & missed) for all
// field officers under this supervisor's command. Displayed as a rich table with
// per-officer drill-down, full records table view, search, filters, and aggregate stats.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck, ShieldAlert, RefreshCw, Search, CheckCircle2,
  XCircle, Clock, AlertTriangle, User, MapPin, ChevronDown, ChevronUp,
  Calendar, Activity, Filter, Download, LayoutList, Users, HelpCircle
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import { offlineDb } from '../../db/offlineDb';
import { db } from '../../services/database';
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
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'missed'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [viewMode, setViewMode] = useState<'officers' | 'table'>('officers');
  const [expandedOfficer, setExpandedOfficer] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch officer verifications from Dexie (offline-first) + LocalStorage + API
  const loadVerifications = useCallback(async () => {
    setLoading(true);
    try {
      const isManager = user?.role === 'manager';
      let myOfficers = users.filter(u =>
        u.role === 'field_officer' && (
          isManager ||
          u.supervisorId === user?.id ||
          u.supervisorEmployeeId === user?.employeeId ||
          (user?.zone && u.zone === user?.zone) ||
          (user?.region && u.region === user?.region)
        )
      );

      // Fallback: If no officer specifically matched supervisor id/zone, show all field officers
      if (myOfficers.length === 0) {
        myOfficers = users.filter(u => u.role === 'field_officer');
      }

      const officerIds = new Set(myOfficers.map(o => o.id));
      const officerEmpIds = new Set(myOfficers.map(o => o.employeeId).filter(Boolean));
      const isOfficerInScope = (id?: string) => {
        if (!id) return false;
        if (myOfficers.length === 0) return true;
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

            const questionText = rec.notes && rec.notes.includes('?')
              ? rec.notes
              : userT('Random Identity & Presence Verification');

            const answerText = isAnswered
              ? (rec.notes || userT('Presence Confirmed'))
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
        const token = localStorage.getItem('fieldsync_token');
        if (token) {
          try {
            const res = await fetch(`${API_BASE}/work-verifications?supervisorId=${user?.id || ''}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              const apiRecords: any[] = Array.isArray(data) ? data : (data?.data || data?.verifications || []);
              for (const rec of apiRecords) {
                const offId = rec.officerId || rec.officer_id;
                if (!isOfficerInScope(offId)) continue;

                const officer = myOfficers.find(o => o.id === offId || o.employeeId === offId) ||
                  users.find(u => u.id === offId || u.employeeId === offId);

                const isAnswered = rec.success === true ||
                  String(rec.status || '').includes('CONFIRMED');

                const questionText = rec.question || userT('Work Verification Check');
                const answerText = rec.answer || (isAnswered ? userT('Presence Confirmed') : userT('Missed / No Response'));

                recordMap.set(rec.id, {
                  id: rec.id,
                  officerId: offId,
                  officerName: officer?.name || rec.officerName || rec.officer_name || offId,
                  officerEmployeeId: officer?.employeeId || rec.officerEmployeeId || rec.officer_employee_id,
                  officerZone: officer?.zone || officer?.region,
                  scheduledAt: rec.scheduledAt || rec.timestamp || new Date().toISOString(),
                  respondedAt: rec.respondedAt || (isAnswered ? (rec.timestamp || rec.scheduledAt) : undefined),
                  status: String(rec.status || (isAnswered ? 'OFFICER_CONFIRMED' : 'MISSED')),
                  isAnswered,
                  question: questionText,
                  answer: answerText,
                  responseTimeSeconds: rec.responseTimeSeconds ?? rec.response_time ?? null,
                  connectionState: rec.connectionState || rec.connection_state || 'ONLINE',
                  failureReason: rec.failureReason || rec.failure_reason,
                  syncStatus: rec.syncStatus || 'SYNCED',
                  workedDate: (rec.scheduledAt || rec.timestamp || '').slice(0, 10),
                });
              }
            }
          } catch (_e) {
            /* offline fallback */
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

  // Date filtering
  const cutoffDate = useMemo(() => {
    const d = new Date();
    if (dateFilter === 'today') d.setHours(0, 0, 0, 0);
    else if (dateFilter === '7d') d.setDate(d.getDate() - 7);
    else if (dateFilter === '30d') d.setDate(d.getDate() - 30);
    return dateFilter === 'all' ? null : d;
  }, [dateFilter]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    let list = records;
    if (cutoffDate) {
      list = list.filter(r => new Date(r.scheduledAt) >= cutoffDate!);
    }
    if (statusFilter === 'confirmed') {
      list = list.filter(r => r.isAnswered);
    } else if (statusFilter === 'missed') {
      list = list.filter(r => !r.isAnswered);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(r =>
        r.officerName?.toLowerCase().includes(q) ||
        r.officerEmployeeId?.toLowerCase().includes(q) ||
        r.question?.toLowerCase().includes(q) ||
        r.answer?.toLowerCase().includes(q) ||
        r.workedDate?.includes(q)
      );
    }
    return list;
  }, [records, cutoffDate, statusFilter, searchTerm]);

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
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('officers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'officers'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={userT('Group by Officer')}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{userT('Officers')}</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={userT('All Verifications Table')}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>{userT('All Records')}</span>
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={filteredRecords.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{userT('Export')}</span>
          </button>

          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{userT('Refresh')}</span>
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
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={userT('Search officer, employee ID, question, or answer...')}
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
            />
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

            <div className="w-px bg-slate-200 dark:bg-slate-700 mx-1 h-6 self-center" />

            {/* Date filters */}
            {([['today', userT('Today')], ['7d', `7 ${userT('days')}`], ['30d', `30 ${userT('days')}`], ['all', userT('All time')]] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setDateFilter(k as any)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  dateFilter === k
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
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
      ) : viewMode === 'table' ? (
        /* Flat unified table view showing all verifications */
        <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <LayoutList className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{userT('All Verification Records')}</span>
              <span className="text-xs font-normal text-slate-400">({filteredRecords.length} {userT('events')})</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                <tr className="text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 font-semibold">{userT('Officer')}</th>
                  <th className="py-3 px-4 font-semibold">{userT('Scheduled Time')}</th>
                  <th className="py-3 px-4 font-semibold">{userT('Question / Verification')}</th>
                  <th className="py-3 px-4 font-semibold">{userT('Officer Answer')}</th>
                  <th className="py-3 px-4 font-semibold">{userT('Status')}</th>
                  <th className="py-3 px-4 font-semibold">{userT('Response Time')}</th>
                  <th className="py-3 px-4 font-semibold">{userT('Connection')}</th>
                  <th className="py-3 px-4 font-semibold">{userT('Sync')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredRecords.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    {/* Officer info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#1E3A8A]/10 dark:bg-blue-900/40 text-[#1E3A8A] dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {rec.officerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{rec.officerName}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{rec.officerEmployeeId || '—'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Scheduled Time */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                      {formatTime(rec.scheduledAt)}
                    </td>

                    {/* Question / Challenge */}
                    <td className="py-3 px-4 max-w-xs text-slate-800 dark:text-slate-200">
                      <div className="line-clamp-2 font-medium" title={rec.question}>
                        {rec.question}
                      </div>
                    </td>

                    {/* Officer Answer */}
                    <td className="py-3 px-4 max-w-xs">
                      {rec.isAnswered ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate" title={rec.answer}>{rec.answer}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate" title={rec.answer}>{rec.answer}</span>
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(rec)}
                    </td>

                    {/* Response Time */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600 dark:text-slate-300">
                      {rec.responseTimeSeconds !== null && rec.responseTimeSeconds !== undefined ? (
                        <span>{rec.responseTimeSeconds}s</span>
                      ) : rec.isAnswered ? (
                        <span>&lt;15s</span>
                      ) : (
                        <span className="text-rose-500">{userT('Timed Out (15s)')}</span>
                      )}
                    </td>

                    {/* Connection */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rec.connectionState === 'ONLINE'
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                          : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                      }`}>
                        {rec.connectionState || 'ONLINE'}
                      </span>
                    </td>

                    {/* Sync Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-semibold ${
                        rec.syncStatus === 'SYNCED'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {rec.syncStatus || 'SYNCED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
