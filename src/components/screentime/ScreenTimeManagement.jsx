// src/components/screentime/ScreenTimeManagement.jsx
// Supervisor & Manager Screen Time Monitoring Dashboard — FieldSync

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Clock, Users, Activity, TrendingUp, RefreshCw,
  BarChart3, Calendar, ChevronDown, ChevronRight,
  Download, Filter, ArrowUp, ArrowDown
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import { offlineDb } from '../../db/offlineDb';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(secs) {
  const s = Math.max(0, Math.floor(secs || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtTimeFull(secs) {
  const s = Math.max(0, Math.floor(secs || 0));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function scoreColor(pct) {
  if (pct >= 80) return 'emerald';
  if (pct >= 50) return 'amber';
  return 'rose';
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ScreenTimeManagement({
  screenTime = [],
  user,
  isManager,
  isSupervisor,
  isOfficer,
  teamMembers = [],
  addNotification,
  setScreenTime
}) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [serverData, setServerData]     = useState([]);
  const [localData, setLocalData]       = useState([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [expandedOfficer, setExpandedOfficer] = useState(null);
  const [sortBy, setSortBy]             = useState('total_seconds');
  const [sortDir, setSortDir]           = useState('desc');
  const [filterRegion, setFilterRegion] = useState('all');
  const [dateRange, setDateRange]       = useState('single'); // 'single' | 'week'

  // Load data from server + local IndexedDB
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try server first
      const token = localStorage.getItem('fieldsync_token');
      const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      let startDate = selectedDate;
      let endDate   = selectedDate;
      if (dateRange === 'week') {
        const d = new Date(selectedDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(d.setDate(diff));
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        startDate = mon.toISOString().split('T')[0];
        endDate   = sun.toISOString().split('T')[0];
      }

      try {
        const url = isManager
          ? `${API_BASE}/work-sessions/analytics?startDate=${startDate}&endDate=${endDate}${filterRegion !== 'all' ? `&region=${filterRegion}` : ''}`
          : `${API_BASE}/work-sessions/team-overview?date=${selectedDate}`;

        const res = await fetch(url, { headers });
        if (res.ok) {
          const json = await res.json();
          if (isManager) {
            setServerData(json.data?.topOfficers || []);
          } else {
            setServerData(json.data || []);
          }
        }
      } catch (netErr) {
        // Fall through to local data
      }

      // Always also load local IndexedDB data
      if (user?.id) {
        const localSessions = await offlineDb.workSessions
          .where('officerId').equals(user.id)
          .filter(s => s.reportDate === selectedDate && !!s.endedAt)
          .toArray();

        const totalSecs = localSessions.reduce((a, s) => a + (s.durationSeconds || 0), 0);
        if (localSessions.length > 0) {
          setLocalData([{
            officer_id: user.id,
            employee_name: user.name || user.fullName || 'Me',
            total_seconds: totalSecs,
            session_count: localSessions.length,
            source: 'local',
          }]);
        }
      }
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, isManager, user, filterRegion, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Merge server + local (deduplicate by officer_id)
  const mergedData = useMemo(() => {
    const map = new Map();
    for (const r of serverData) map.set(r.officer_id || r.officerId, { ...r, source: 'server' });
    for (const r of localData) {
      const key = r.officer_id;
      if (!map.has(key)) map.set(key, r);
    }

    // Also merge legacy screenTime prop
    for (const r of screenTime) {
      const key = r.employeeId || r.employee_id;
      if (key && !map.has(key)) {
        map.set(key, {
          officer_id: key,
          employee_name: r.employeeName || r.employee_name,
          total_seconds: r.totalScreenTime || 0,
          session_count: 0,
          region: r.region,
          source: 'legacy',
        });
      }
    }
    return Array.from(map.values());
  }, [serverData, localData, screenTime]);

  // Filter
  const filtered = useMemo(() => {
    let data = [...mergedData];
    if (filterRegion !== 'all') {
      data = data.filter(r => (r.region || '').toLowerCase() === filterRegion.toLowerCase());
    }
    // Sort
    data.sort((a, b) => {
      const av = a[sortBy] || 0;
      const bv = b[sortBy] || 0;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return data;
  }, [mergedData, filterRegion, sortBy, sortDir]);

  const totalSeconds  = useMemo(() => filtered.reduce((a, r) => a + (r.total_seconds || 0), 0), [filtered]);
  const avgSeconds    = filtered.length > 0 ? Math.round(totalSeconds / filtered.length) : 0;
  const totalSessions = useMemo(() => filtered.reduce((a, r) => a + (r.session_count || 0), 0), [filtered]);

  const regions = useMemo(() => {
    const r = new Set(mergedData.map(d => d.region).filter(Boolean));
    return Array.from(r);
  }, [mergedData]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#1E3A8A]" />
            Screen Time Monitoring
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isManager ? 'Organisation-wide field officer activity' : 'Team field time monitoring'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
          />
          <button
            onClick={() => setSelectedDate(todayStr())}
            className="h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Officers', value: filtered.length,        sub: `on ${selectedDate}`, color: 'blue'    },
          { label: 'Total Field Time', value: fmtTime(totalSeconds), sub: 'cumulative today',   color: 'indigo'  },
          { label: 'Avg. Per Officer', value: fmtTime(avgSeconds),   sub: 'mean active time',  color: 'teal'    },
          { label: 'Total Sessions',   value: totalSessions,         sub: 'completed segments', color: 'emerald' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-xl font-bold font-mono tracking-tight ${
              color === 'blue'    ? 'text-blue-700 dark:text-blue-400'
              : color === 'indigo'? 'text-indigo-700 dark:text-indigo-400'
              : color === 'teal'  ? 'text-teal-700 dark:text-teal-400'
              : 'text-emerald-700 dark:text-emerald-400'
            }`}>{value}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      {(regions.length > 0 || isManager) && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400 font-medium">Region:</span>
          {['all', ...regions].map(r => (
            <button
              key={r}
              onClick={() => setFilterRegion(r)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                filterRegion === r
                  ? 'bg-[#1E3A8A] text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              {r === 'all' ? 'All Regions' : r}
            </button>
          ))}
        </div>
      )}

      {/* ── Officer Table ───────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700 dark:text-[#F8FAFC]">
            Officer Activity — {selectedDate}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-400">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {isLoading ? (
          <div className="py-14 text-center text-xs text-slate-400 dark:text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            Loading field officer data…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-xs text-slate-400 dark:text-slate-500">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-slate-200 dark:text-slate-600" />
            No session data found for this date.
            <div className="mt-1 text-slate-300 dark:text-slate-600">Field officers need to start sessions and sync.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#334155] text-slate-600 dark:text-slate-200 font-bold uppercase tracking-wider bg-slate-50/90 dark:bg-[#0F172A] text-[11px]">
                  <th className="py-3 pl-5">Officer</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none"
                    onClick={() => toggleSort('total_seconds')}
                  >
                    <span className="flex items-center gap-1">Total Time <SortIcon col="total_seconds" /></span>
                  </th>
                  <th className="py-3 px-4">Progress</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none"
                    onClick={() => toggleSort('session_count')}
                  >
                    <span className="flex items-center gap-1">Sessions <SortIcon col="session_count" /></span>
                  </th>
                  <th className="py-3 px-4">Region</th>
                  <th className="py-3 pr-5">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filtered.map(officer => {
                  const pct = Math.min(100, Math.round(((officer.total_seconds || 0) / (8 * 3600)) * 100));
                  const col = scoreColor(pct);
                  const isExpanded = expandedOfficer === officer.officer_id;

                  return (
                    <React.Fragment key={officer.officer_id}>
                      <tr
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                        onClick={() => setExpandedOfficer(isExpanded ? null : officer.officer_id)}
                      >
                        <td className="py-3.5 pl-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#1E3A8A]/10 dark:bg-blue-900/30 flex items-center justify-center text-[11px] font-bold text-[#1E3A8A] dark:text-blue-400 shrink-0">
                              {(officer.employee_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-[#F8FAFC]">{officer.employee_name || 'Unknown Officer'}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{officer.officer_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-800 dark:text-[#F8FAFC] text-sm">
                            {fmtTimeFull(officer.total_seconds)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 min-w-[140px]">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                              <span>{pct}%</span>
                              <span>8h limit</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  col === 'emerald' ? 'bg-emerald-500'
                                  : col === 'amber' ? 'bg-amber-400'
                                  : 'bg-rose-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-semibold">
                            {officer.session_count || 0}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          {officer.region || '—'}
                        </td>
                        <td className="py-3.5 pr-5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            officer.source === 'server'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : officer.source === 'local'
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                            {officer.source === 'server' ? 'Synced' : officer.source === 'local' ? 'Local' : 'Legacy'}
                          </span>
                        </td>
                      </tr>
                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/60 dark:bg-slate-800/30">
                          <td colSpan={6} className="px-5 py-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              {[
                                { label: 'Total Active Time', value: fmtTimeFull(officer.total_seconds) },
                                { label: 'Sessions',          value: officer.session_count || 0 },
                                { label: 'First Active',      value: officer.first_session_start
                                    ? new Date(officer.first_session_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : '—' },
                                { label: 'Last Active',       value: officer.last_activity
                                    ? new Date(officer.last_activity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : '—' },
                              ].map(({ label, value }) => (
                                <div key={label} className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-100 dark:border-slate-700">
                                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">{label}</p>
                                  <p className="font-mono font-bold text-slate-700 dark:text-slate-200">{value}</p>
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