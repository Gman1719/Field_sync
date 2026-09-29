// src/components/screentime/ScreenTimeManagement.tsx
// Supervisor & Manager Field Officer Screen Time Telemetry Dashboard
// Displays cumulative daily screen time in clean tabular layout with officer and date filters.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  Search,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import { getZonedTimeComponents } from '../../config/workingHours';

interface ScreenTimeManagementProps {
  user: any;
  isManager?: boolean;
  isSupervisor?: boolean;
}

export default function ScreenTimeManagement({
  user,
  isManager = false,
  isSupervisor = false,
}: ScreenTimeManagementProps) {
  const { dateStr: todayDateStr } = getZonedTimeComponents();
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [officers, setOfficers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load live officers screen time from server
  const loadOfficers = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('fieldsync_token') || localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${API_BASE}/work-monitoring/officers?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const list = json.data || [];
          setOfficers(list);
        }
      }
    } catch (err) {
      console.error('Failed to load officer monitoring data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadOfficers();
    const interval = setInterval(loadOfficers, 15000);
    return () => clearInterval(interval);
  }, [loadOfficers]);

  // Filter officers by name / officer search query
  const filteredOfficers = useMemo(() => {
    return officers.filter((off) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const name = (off.name || off.fullName || '').toLowerCase();
      const email = (off.email || '').toLowerCase();
      const zone = (off.zone?.name || off.zone || '').toLowerCase();
      const woreda = (off.woreda?.name || off.woreda || '').toLowerCase();
      return name.includes(q) || email.includes(q) || zone.includes(q) || woreda.includes(q);
    });
  }, [officers, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header & Filter Controls (Officer & Date Only) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Officers Screen Time
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Cumulative daily screen time sent with official daily reports
          </p>
        </div>

        {/* Dedicated Filters: Officer & Date */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter by Officer */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by officer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Filter by Date */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-medium bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* TABLE VIEW ONLY */}
      <div className="rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        {isLoading && officers.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2563EB]" />
            <p className="text-xs font-medium">Loading officers screen time...</p>
          </div>
        ) : filteredOfficers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No Field Officers Found
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {searchQuery ? 'Try changing your officer filter' : 'No officers assigned to this territory.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Field Officer</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Screen Time</th>
                  <th className="py-3 px-4">Report Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredOfficers.map((off) => {
                  const screenTimeFmt = off.todayScreenTimeFormatted || off.screenTimeFormatted || '00:00:00';
                  const isReportSubmitted = off.dailyReportSubmitted;

                  return (
                    <tr
                      key={off.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      {/* Field Officer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {off.name || off.fullName}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">
                          {off.email}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                          {off.date || selectedDate}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {off.zone?.name || off.zone || 'Zone'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {off.woreda?.name || off.woreda || 'Woreda'}
                        </div>
                      </td>

                      {/* Screen Time */}
                      <td className="py-3.5 px-4 font-mono font-bold text-sm text-[#2563EB] dark:text-blue-400">
                        {screenTimeFmt}
                      </td>

                      {/* Report Status */}
                      <td className="py-3.5 px-4">
                        {isReportSubmitted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Submitted with Report
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <Clock className="w-3.5 h-3.5" />
                            In Progress
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