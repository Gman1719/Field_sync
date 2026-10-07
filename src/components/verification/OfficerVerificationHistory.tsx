// src/components/verification/OfficerVerificationHistory.tsx
// Dedicated Field Officer Random Presence Verification History & Performance Console

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Calendar,
  Award,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { offlineDb } from '../../db/offlineDb';
import { API_BASE } from '../../config/api';
import { useUserLanguage } from '../../context/UserLanguageContext';
import { getZonedTimeComponents } from '../../config/workingHours';
import type { WorkVerification } from '../../types/index';

interface OfficerVerificationHistoryProps {
  user: any;
}

export default function OfficerVerificationHistory({ user }: OfficerVerificationHistoryProps) {
  const { userT } = useUserLanguage();
  const [verifications, setVerifications] = useState<WorkVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'missed'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week'>('all');

  const officerId = user?.id || user?.employeeId;

  // Fetch from Dexie and optionally sync from backend
  const loadVerifications = useCallback(
    async (fetchRemote = false) => {
      if (!officerId) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch from server if online and remote requested
        if (fetchRemote && navigator.onLine) {
          const token = localStorage.getItem('fieldsync_token');
          if (token) {
            try {
              const res = await fetch(`${API_BASE}/work-monitoring/verifications`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.data) && offlineDb.workVerifications) {
                  for (const sRec of json.data) {
                    await offlineDb.workVerifications.put({
                      id: sRec.id,
                      officerId: sRec.officerId || officerId,
                      officerName: sRec.officer?.fullName || sRec.officerName || user?.fullName || user?.name,
                      scheduledAt: typeof sRec.scheduledAt === 'string' ? sRec.scheduledAt : new Date(sRec.scheduledAt).toISOString(),
                      triggeredAt: sRec.triggeredAt ? new Date(sRec.triggeredAt).toISOString() : undefined,
                      respondedAt: sRec.respondedAt ? new Date(sRec.respondedAt).toISOString() : null,
                      deadlineAt: typeof sRec.deadlineAt === 'string' ? sRec.deadlineAt : new Date(sRec.deadlineAt).toISOString(),
                      status: sRec.status,
                      responseTimeSeconds: sRec.responseTimeSeconds ?? null,
                      failureReason: sRec.failureReason ?? null,
                      connectionState: sRec.connectionState || 'ONLINE',
                      loginState: sRec.loginState || 'LOGGED_IN',
                      offlineCreated: Boolean(sRec.offlineCreated),
                      syncStatus: 'SYNCED',
                      syncedAt: sRec.syncedAt || new Date().toISOString(),
                      date: sRec.date || sRec.scheduledAt?.split('T')[0],
                      notes: sRec.notes || undefined,
                    });
                  }
                }
              }
            } catch (netErr) {
              console.warn('Could not fetch server verifications:', netErr);
            }
          }
        }

        // 2. Read all from local Dexie
        if (offlineDb.workVerifications) {
          const records = await offlineDb.workVerifications
            .where('officerId')
            .equals(officerId)
            .toArray();

          // Sort strictly by scheduledAt descending
          records.sort(
            (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
          );
          setVerifications(records);
        }
      } catch (err) {
        console.error('Error loading officer verifications:', err);
      } finally {
        setLoading(false);
      }
    },
    [officerId, user?.fullName, user?.name]
  );

  // Initial load + background remote fetch
  useEffect(() => {
    loadVerifications(true);
  }, [loadVerifications]);

  // Live event listeners (updates when verification modal completes or times out)
  useEffect(() => {
    const handleUpdate = () => {
      loadVerifications(false);
    };

    window.addEventListener('verification-update', handleUpdate);
    window.addEventListener('verification-missed', handleUpdate);
    window.addEventListener('fieldsync-sync-complete', handleUpdate);

    return () => {
      window.removeEventListener('verification-update', handleUpdate);
      window.removeEventListener('verification-missed', handleUpdate);
      window.removeEventListener('fieldsync-sync-complete', handleUpdate);
    };
  }, [loadVerifications]);

  // Date helpers
  const { dateStr: todayStr } = getZonedTimeComponents();

  // Verifications filtered strictly by date selection
  const dateFilteredVerifications = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    return verifications.filter((v) => {
      if (timeFilter === 'today' && v.date !== todayStr) return false;
      if (timeFilter === 'week' && (v.date || v.scheduledAt) < sevenDaysAgoStr) return false;
      return true;
    });
  }, [verifications, timeFilter, todayStr]);

  // Metrics dynamically calculated based on the selected date range
  const metrics = useMemo(() => {
    const total = dateFilteredVerifications.length;
    const confirmed = dateFilteredVerifications.filter((v) => v.status.includes('CONFIRMED')).length;
    const missed = dateFilteredVerifications.filter((v) => !v.status.includes('CONFIRMED')).length;
    const responseRate = total > 0 ? Math.round((confirmed / total) * 100) : 100;

    return {
      total,
      confirmed,
      missed,
      responseRate,
    };
  }, [dateFilteredVerifications]);

  // Table rows filtered by both date range and active card status selection
  const filteredVerifications = useMemo(() => {
    return dateFilteredVerifications.filter((v) => {
      if (statusFilter === 'confirmed' && !v.status.includes('CONFIRMED')) return false;
      if (statusFilter === 'missed' && v.status.includes('CONFIRMED')) return false;
      return true;
    });
  }, [dateFilteredVerifications, statusFilter]);

  const getStatusBadge = (status: string) => {
    const isConfirmed = status.includes('CONFIRMED');

    if (isConfirmed) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {userT(status)}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
        <AlertTriangle className="w-3.5 h-3.5" />
        {userT(status)}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-[#3B82F6] flex items-center justify-center border border-blue-100 dark:border-blue-900/40 shadow-xs shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {userT('Verification History')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {userT('Official random presence check-ins during working hours (08:30 – 17:30)')}
            </p>
          </div>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setTimeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              timeFilter === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {userT('All Time')}
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              timeFilter === 'today'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {userT('Today')}
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              timeFilter === 'week'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {userT('Past 7 Days')}
          </button>
        </div>
      </div>

      {/* Interactive Responsive Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Checks */}
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs select-none hover:shadow-md hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between ${
            statusFilter === 'all'
              ? 'bg-blue-50/40 dark:bg-blue-950/25 border-blue-500 ring-2 ring-blue-500/20'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {userT('Total Checks')}
            </span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="my-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {metrics.total}
            </div>
          </div>
          <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 pt-1">
            {statusFilter === 'all' ? (
              <span className="text-blue-600 dark:text-blue-400 font-semibold">● {userT('Showing All')}</span>
            ) : (
              <span>{userT('Click to show all')}</span>
            )}
          </div>
        </button>

        {/* Metric 2: Confirmed Checks */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'confirmed' ? 'all' : 'confirmed')}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs select-none hover:shadow-md hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between ${
            statusFilter === 'confirmed'
              ? 'bg-emerald-50/40 dark:bg-emerald-950/25 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {userT('Confirmed')}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="my-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
              {metrics.confirmed}
            </div>
          </div>
          <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 pt-1">
            {statusFilter === 'confirmed' ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">● {userT('Filtered')}</span>
            ) : (
              <span>{userT('Click to filter')}</span>
            )}
          </div>
        </button>

        {/* Metric 3: Missed Checks */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'missed' ? 'all' : 'missed')}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs select-none hover:shadow-md hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between ${
            statusFilter === 'missed'
              ? 'bg-amber-50/40 dark:bg-amber-950/25 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {userT('Missed')}
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="my-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
              {metrics.missed}
            </div>
          </div>
          <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 pt-1">
            {statusFilter === 'missed' ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">● {userT('Filtered')}</span>
            ) : (
              <span>{userT('Click to filter')}</span>
            )}
          </div>
        </button>

        {/* Metric 4: Response Rate */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'confirmed' ? 'all' : 'confirmed')}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs select-none hover:shadow-md hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between ${
            statusFilter === 'confirmed'
              ? 'bg-purple-50/40 dark:bg-purple-950/25 border-purple-500 ring-2 ring-purple-500/20'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {userT('Response Rate')}
            </span>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <div className="my-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-purple-600 dark:text-purple-400">
              {metrics.responseRate}%
            </div>
          </div>
          <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 pt-1">
            <span>{userT('Presence compliance')}</span>
          </div>
        </button>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 mx-auto border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              {userT('Loading verification records...')}
            </p>
          </div>
        ) : filteredVerifications.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {userT('No verification records found')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              {statusFilter !== 'all' || timeFilter !== 'all'
                ? userT('No checks match your current filter parameters. Try clearing your filters.')
                : userT('Random check-ins occur automatically during your active daily work sessions between 08:30 and 17:30.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 font-semibold">{userT('Scheduled Time')}</th>
                  <th className="py-3 px-4 font-semibold">{userT('Status')}</th>
                  <th className="py-3 px-4 font-semibold">{userT('Connection')}</th>
                  <th className="py-3 px-4 font-semibold">{userT('Sync')}</th>
                  <th className="py-3 px-4 font-semibold">{userT('Details & Reason')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredVerifications.map((v) => {
                  const scheduledDate = new Date(v.scheduledAt);
                  const isConfirmed = v.status.includes('CONFIRMED');

                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      {/* Scheduled Time */}
                      <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {scheduledDate.toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="font-mono text-slate-500 dark:text-slate-400">
                            {scheduledDate.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(v.status)}
                      </td>

                      {/* Connection */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                            v.connectionState === 'ONLINE'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {v.connectionState === 'ONLINE' ? (
                            <Wifi className="w-3 h-3" />
                          ) : (
                            <WifiOff className="w-3 h-3" />
                          )}
                          {userT(v.connectionState)}
                        </span>
                      </td>

                      {/* Sync Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                            v.syncStatus === 'SYNCED'
                              ? 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {userT(v.syncStatus || 'SYNCED')}
                        </span>
                      </td>

                      {/* Notes / Details */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {v.notes ? (
                          <span title={v.notes}>{userT(v.notes)}</span>
                        ) : isConfirmed ? (
                          <span className="text-slate-400 dark:text-slate-500 italic">
                            {userT('Verified presence confirmed')}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            {v.failureReason ? userT(v.failureReason) : userT('Missed presence check')}
                          </span>
                        )}
                      </td>
                    </tr>
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
