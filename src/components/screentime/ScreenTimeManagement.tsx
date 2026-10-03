// src/components/screentime/ScreenTimeManagement.tsx
// Supervisor & Manager Field Officer Screen Time Telemetry Dashboard
// Displays cumulative daily screen time in clean tabular layout with officer and date filters.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  Calendar,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  UserCheck,
} from 'lucide-react';
import { offlineDb } from '../../db/offlineDb';
import { API_BASE } from '../../config/api';
import { getZonedTimeComponents } from '../../config/workingHours';
import { useUserLanguage } from '../../context/UserLanguageContext';

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
  const { userT } = useUserLanguage();
  const { dateStr: todayDateStr } = getZonedTimeComponents();
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('');
  const [officers, setOfficers] = useState<any[]>([]);
  const [officerRoster, setOfficerRoster] = useState<{ id: string; name: string }[]>([]);
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

  // Load supervisor officers roster (from local DB and server)
  useEffect(() => {
    let isMounted = true;
    const loadRoster = async () => {
      const map = new Map<string, string>();

      // 1. From offline DB
      try {
        if (offlineDb.users) {
          const dbUsers = await offlineDb.users.toArray();
          dbUsers
            .filter((u: any) => u.role === 'field_officer' && (!isSupervisor || u.supervisorId === user?.id || (user?.zoneId && u.zoneId === user?.zoneId)))
            .forEach((u: any) => map.set(u.id, u.fullName || u.name || u.email));
        }
      } catch (err) {
        console.error('Failed reading offline users:', err);
      }

      // 2. From server users API
      try {
        const token = localStorage.getItem('fieldsync_token') || localStorage.getItem('token');
        if (token && navigator.onLine) {
          const res = await fetch(`${API_BASE}/users`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const json = await res.json();
            const list = Array.isArray(json) ? json : (json.data || []);
            list
              .filter((u: any) => u.role === 'field_officer' && (!isSupervisor || u.supervisorId === user?.id || (user?.zoneId && u.zoneId === user?.zoneId)))
              .forEach((u: any) => map.set(u.id, u.fullName || u.name || u.email));
          }
        }
      } catch (err) {
        console.error('Failed fetching users from server:', err);
      }

      // 3. Merge with current loaded officers
      officers.forEach((o: any) => {
        if (o.id && !map.has(o.id)) {
          map.set(o.id, o.name || o.fullName || o.email || 'Field Officer');
        }
      });

      if (isMounted && map.size > 0) {
        setOfficerRoster(Array.from(map.entries()).map(([id, name]) => ({ id, name })));
      }
    };

    loadRoster();
    return () => {
      isMounted = false;
    };
  }, [user, isSupervisor, officers]);

  // Dropdown list combining roster and loaded officers
  const officerDropdownList = useMemo(() => {
    const map = new Map<string, string>();
    officerRoster.forEach((o) => map.set(o.id, o.name));
    officers.forEach((o: any) => {
      if (o.id && !map.has(o.id)) {
        map.set(o.id, o.name || o.fullName || o.email || 'Field Officer');
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [officerRoster, officers]);

  // Filter officers by selected officer dropdown
  const filteredOfficers = useMemo(() => {
    return officers.filter((off) => {
      if (!selectedOfficerId) return true;
      return off.id === selectedOfficerId;
    });
  }, [officers, selectedOfficerId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header & Filter Controls (Officer Dropdown & Date Only) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {userT('Officers Screen Time')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {userT('Cumulative daily screen time sent with official daily reports')}
          </p>
        </div>

        {/* Dedicated Filters: Officer Dropdown & Date */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dropdown Filter by Officer */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedOfficerId}
              onChange={(e) => setSelectedOfficerId(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 appearance-none cursor-pointer"
            >
              <option value="">{userT('All Officers')}</option>
              {officerDropdownList.map((off) => (
                <option key={off.id} value={off.id}>
                  {off.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
            <p className="text-xs font-medium">{userT('Loading officers screen time...')}</p>
          </div>
        ) : filteredOfficers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {userT('No Field Officers Found')}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {selectedOfficerId
                ? userT('No records found for the selected officer on this date.')
                : userT('No officers assigned to this territory.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">{userT('Field Officer')}</th>
                  <th className="py-3 px-4">{userT('Date')}</th>
                  <th className="py-3 px-4">{userT('Location')}</th>
                  <th className="py-3 px-4">{userT('Screen Time')}</th>
                  <th className="py-3 px-4">{userT('Report Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredOfficers.map((off) => {
                  const screenTimeFmt = off.todayScreenTimeFormatted || off.screenTimeFormatted || '00:00:00';
                  const isReportSubmitted = !!off.dailyReportSubmitted;
                  const rowDate = off.date || selectedDate;
                  const isPastDate = rowDate < todayDateStr;
                  const isToday = rowDate === todayDateStr;

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
                          {rowDate}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {off.zone?.name || off.zone || userT('Zone')}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {off.woreda?.name || off.woreda || userT('Woreda')}
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
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            {userT('Submitted with Report')}
                          </span>
                        ) : isPastDate ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            {userT('Missed')}
                          </span>
                        ) : isToday ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {userT('In Progress')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {userT('Scheduled')}
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