// src/components/supervisor/SupervisorSendAlertPage.tsx
// Dedicated supervisor page to send direct operational alerts and notifications to specific field officers
// based on their real-time daily screen time and periodic verification history.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  Search,
  Users,
  Clock,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  Calendar,
  Radio,
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import { offlineDb } from '../../db/offlineDb';
import { db } from '../../services/database';
import { getZonedTimeComponents } from '../../config/workingHours';
import { useUserLanguage } from '../../context/UserLanguageContext';
import SendOfficerAlertModal from './SendOfficerAlertModal';
import { Card } from '../ui/Card';

interface SupervisorSendAlertPageProps {
  user: any;
  users?: any[];
}

interface OfficerTelemetry {
  id: string;
  name: string;
  fullName: string;
  email: string;
  employeeId?: string;
  zone?: string;
  woreda?: string;
  screenTimeFmt: string;
  screenTimeMinutes: number;
  reportSubmitted: boolean;
  verifTotal: number;
  verifConfirmed: number;
  verifMissed: number;
  verifRate: number;
  verificationRecords: any[];
}

export default function SupervisorSendAlertPage({
  user,
  users = [],
}: SupervisorSendAlertPageProps) {
  const { userT } = useUserLanguage();
  const { dateStr: todayDateStr } = getZonedTimeComponents();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'low_screentime' | 'missed_verif'>('all');
  const [loading, setLoading] = useState(true);
  const [officerData, setOfficerData] = useState<OfficerTelemetry[]>([]);
  const [alertingOfficer, setAlertingOfficer] = useState<OfficerTelemetry | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load supervised officers, their screen time, and verification records
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const isManager = user?.role === 'manager';
      let myOfficers = users.filter(
        (u) =>
          u.role === 'field_officer' &&
          (isManager ||
            u.supervisorId === user?.id ||
            u.supervisorEmployeeId === user?.employeeId ||
            (user?.zone && u.zone === user?.zone) ||
            (user?.region && u.region === user?.region))
      );

      if (myOfficers.length === 0) {
        myOfficers = users.filter((u) => u.role === 'field_officer');
      }

      // Try fetching live screen time monitoring from server if available
      let liveScreenTimeMap: Record<string, any> = {};
      try {
        const token = localStorage.getItem('fieldsync_token') || localStorage.getItem('token');
        if (token && navigator.onLine) {
          const res = await fetch(`${API_BASE}/work-monitoring/officers?date=${todayDateStr}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
              for (const off of json.data) {
                liveScreenTimeMap[off.id] = off;
              }
            }
          }
        }
      } catch (_e) {}

      // Load all verification records
      let allVerifs: any[] = [];
      if (offlineDb.workVerifications) {
        try {
          allVerifs = await offlineDb.workVerifications.toArray();
        } catch (_e) {}
      }
      if (allVerifs.length === 0 && db?.verification_history) {
        try {
          allVerifs = await db.verification_history.toArray();
        } catch (_e) {}
      }

      // Load all daily screen time records
      let allScreenTimes: any[] = [];
      if (offlineDb.dailyScreenTimes) {
        try {
          allScreenTimes = await offlineDb.dailyScreenTimes
            .filter((r) => r.date === todayDateStr)
            .toArray();
        } catch (_e) {}
      }

      const telemetryList: OfficerTelemetry[] = [];

      for (const off of myOfficers) {
        const offId = off.id;
        const offEmpId = off.employeeId;

        // 1. Screen Time calculation
        let screenTimeFmt = '00:00:00';
        let screenTimeMinutes = 0;
        let reportSubmitted = Boolean(off.dailyReportSubmitted);

        const liveOff = liveScreenTimeMap[offId];
        if (liveOff) {
          screenTimeFmt = liveOff.todayScreenTimeFormatted || liveOff.screenTimeFormatted || '00:00:00';
          screenTimeMinutes = liveOff.screenTimeMinutes || 0;
          reportSubmitted = Boolean(liveOff.dailyReportSubmitted);
        } else {
          const localDst = allScreenTimes.find((r) => r.officerId === offId);
          if (localDst) {
            const sec = localDst.totalEligibleSeconds || (localDst as any).totalSeconds || 0;
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            const s = sec % 60;
            screenTimeFmt = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            screenTimeMinutes = Math.floor(sec / 60);
          }
        }

        // 2. Verification History calculation
        const officerVerifs = allVerifs.filter(
          (v) =>
            v.officerId === offId ||
            (offEmpId && (v.officerEmployeeId === offEmpId || v.officerId === offEmpId))
        );

        const verifTotal = officerVerifs.length;
        const verifConfirmed = officerVerifs.filter(
          (v) =>
            v.isAnswered ||
            v.success ||
            String(v.status || '').includes('CONFIRMED') ||
            v.respondedAt
        ).length;
        const verifMissed = verifTotal - verifConfirmed;
        const verifRate = verifTotal > 0 ? Math.round((verifConfirmed / verifTotal) * 100) : 100;

        telemetryList.push({
          id: off.id,
          name: off.fullName || off.name || 'Field Officer',
          fullName: off.fullName || off.name || 'Field Officer',
          email: off.email || '',
          employeeId: off.employeeId,
          zone: typeof off.zone === 'object' ? off.zone?.name : off.zone,
          woreda: typeof off.woreda === 'object' ? off.woreda?.name : off.woreda,
          screenTimeFmt,
          screenTimeMinutes,
          reportSubmitted,
          verifTotal,
          verifConfirmed,
          verifMissed,
          verifRate,
          verificationRecords: officerVerifs,
        });
      }

      setOfficerData(telemetryList);
    } catch (err) {
      console.error('Failed to load supervisor alert data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, users, todayDateStr]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  // Filtered officers list
  const filteredOfficers = useMemo(() => {
    return officerData.filter((off) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        off.name.toLowerCase().includes(q) ||
        off.email.toLowerCase().includes(q) ||
        (off.employeeId && off.employeeId.toLowerCase().includes(q)) ||
        (off.zone && off.zone.toLowerCase().includes(q)) ||
        (off.woreda && off.woreda.toLowerCase().includes(q));

      if (!matchesQuery) return false;

      if (filterType === 'low_screentime') {
        // Less than 2 hours (120 min) or 00:00:00
        return off.screenTimeMinutes < 120;
      }
      if (filterType === 'missed_verif') {
        return off.verifMissed > 0;
      }
      return true;
    });
  }, [officerData, searchQuery, filterType]);

  // Quick stats
  const stats = useMemo(() => {
    const total = officerData.length;
    const lowScreenTimeCount = officerData.filter((o) => o.screenTimeMinutes < 120).length;
    const missedVerifCount = officerData.filter((o) => o.verifMissed > 0).length;
    return { total, lowScreenTimeCount, missedVerifCount };
  }, [officerData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {userT('Send Alert')}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {userT('Send direct operational alert messages to field officers based on their screen time and verification history')}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{userT('Refresh')}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={userT('Search officer, employee ID, territory...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {userT('All Officers')} ({stats.total})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('low_screentime')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'low_screentime'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{userT('Low Screen Time')} ({stats.lowScreenTimeCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('missed_verif')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'missed_verif'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{userT('Missed Verif.')} ({stats.missedVerifCount})</span>
          </button>
        </div>
      </div>

      {/* Officers List Table */}
      <div className="rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        {loading && officerData.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2563EB]" />
            <p className="text-xs font-medium">{userT('Loading officers telemetry...')}</p>
          </div>
        ) : filteredOfficers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {userT('No Field Officers Found')}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {searchQuery ? userT('Try adjusting your search query') : userT('No officers assigned to this territory.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">{userT('Field Officer')}</th>
                  <th className="py-3 px-4">{userT('Territory')}</th>
                  <th className="py-3 px-4">{userT('Screen Time (Today)')}</th>
                  <th className="py-3 px-4">{userT('Verification History')}</th>
                  <th className="py-3 px-4 text-right">{userT('Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredOfficers.map((off) => {
                  const isLowScreenTime = off.screenTimeMinutes < 120;
                  const hasMissedVerif = off.verifMissed > 0;

                  return (
                    <tr
                      key={off.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      {/* Officer Identity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {(off.name[0] || 'O').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              {off.name}
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                              {off.employeeId || off.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Territory */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {off.zone || '—'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {off.woreda || ''}
                        </div>
                      </td>

                      {/* Screen Time Telemetry */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold text-sm ${
                              isLowScreenTime
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-[#2563EB] dark:text-blue-400'
                            }`}
                          >
                            {off.screenTimeFmt}
                          </span>
                          {isLowScreenTime && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                              {userT('Low')}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {off.reportSubmitted ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              ✓ {userT('Report Submitted')}
                            </span>
                          ) : (
                            <span>{userT('Report In Progress')}</span>
                          )}
                        </div>
                      </td>

                      {/* Verification Telemetry */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold text-sm ${
                              off.verifRate >= 80
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : off.verifRate >= 60
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {off.verifRate}%
                          </span>
                          {hasMissedVerif && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 flex items-center gap-0.5">
                              <XCircle className="w-2.5 h-2.5" />
                              {off.verifMissed} {userT('missed')}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {off.verifTotal} {userT('total events')}
                        </div>
                      </td>

                      {/* Action: Send Alert */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setAlertingOfficer(off)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white transition-colors shadow-2xs cursor-pointer active:scale-95"
                          title={userT('Send Alert')}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{userT('Send Alert')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Targeted Officer Alert Modal */}
      {alertingOfficer && (
        <SendOfficerAlertModal
          isOpen={Boolean(alertingOfficer)}
          onClose={() => setAlertingOfficer(null)}
          officer={alertingOfficer}
          currentUser={user}
        />
      )}
    </div>
  );
}
