// Dedicated "My Report" View: Displays all historical daily reports submitted by the field officer with clean filters, executive compact table/list, and modernized details modal

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Calendar, Clock, RefreshCw, Eye,
  FilePlus2, ArrowRight, ShieldCheck, CheckCircle2,
  CalendarDays, MapPin, User, Check, Copy, AlertCircle, Wrench,
  Users, Smartphone, Database, Layers, Search
} from 'lucide-react';
import toast from 'react-hot-toast';

import { offlineDb } from '../../db/offlineDb';
import { API_BASE } from '../../config/api';

import { Card } from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

export default function MyReportsView({ user, setActiveTab }: { user?: any; setActiveTab?: (tab: string) => void }) {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [filterSyncStatus, setFilterSyncStatus] = useState('ALL');
  const [inspectReport, setInspectReport] = useState<any>(null);
  const [copiedId, setCopiedId] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Format seconds helper
  const formatTime = (totalSecs = 0) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper to extract structured fields from a report
  const parseReportDetails = (report: any) => {
    if (!report) return { summary: '', challenges: '', resources: '', nextDayPlan: '' };
    let structured: Record<string, any> = {};
    if (report.comments) {
      try {
        structured = JSON.parse(report.comments);
      } catch {
        structured = { summary: report.comments };
      }
    }
    return {
      summary: report.summary || structured.summary || report.comments || 'No narrative provided',
      challenges: report.challenges || structured.challenges || '',
      resources: report.resources || structured.resources || '',
      nextDayPlan: report.nextDayPlan || structured.nextDayPlan || '',
    };
  };

  // Load officer's reports from Dexie and sync with central API
  const loadReports = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch from local Dexie store
      const localReports = await offlineDb.dailyWorkReports.orderBy('reportDate').reverse().toArray();

      // 2. If online, fetch central server reports
      const authToken = localStorage.getItem('fieldsync_token');
      if (navigator.onLine && authToken) {
        try {
          const res = await fetch(`${API_BASE}/reports/daily`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (res.ok) {
            const resData = await res.json();
            if (resData.success && Array.isArray(resData.data)) {
              for (const r of resData.data) {
                await offlineDb.dailyWorkReports.put({
                  ...r,
                  syncStatus: 'SYNCED',
                });
              }
            }
          }
        } catch (serverErr: any) {
          console.warn('Could not fetch server reports, using offline Dexie:', serverErr.message);
        }
      }

      // Re-read updated reports from Dexie
      const updatedReports = await offlineDb.dailyWorkReports.orderBy('reportDate').reverse().toArray();
      setReports(updatedReports);
    } catch (err) {
      console.error('Error loading reports:', err);
      toast.error('Failed to load daily reports');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadReports();
    toast.success('Reports list refreshed');
  };

  // Performance KPI Metrics
  const stats = useMemo(() => {
    const totalReports = reports.length;
    const totalCitizens = reports.reduce((acc, r) => acc + (Number(r.citizenCountLocal) || 0), 0);
    const totalScreenSecs = reports.reduce((acc, r) => acc + (Number(r.screenTimeSeconds) || 0), 0);
    const syncedCount = reports.filter((r) => r.syncStatus === 'SYNCED').length;
    return {
      totalReports,
      totalCitizens,
      totalScreenTime: formatTime(totalScreenSecs),
      syncedCount,
    };
  }, [reports]);

  // Filtering by Date and Sync Status
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (selectedDate && r.reportDate !== selectedDate) {
        return false;
      }
      if (filterSyncStatus !== 'ALL' && r.syncStatus !== filterSyncStatus) {
        return false;
      }
      return true;
    });
  }, [reports, selectedDate, filterSyncStatus]);

  const clearAllFilters = () => {
    setSelectedDate('');
    setFilterSyncStatus('ALL');
  };

  const hasActiveFilters = selectedDate || filterSyncStatus !== 'ALL';

  const copyReportId = (id: string) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    toast.success('Report ID copied');
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Format date helper
  const formatDatePretty = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#1E293B] p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1E3A8A] to-[#2563EB] text-white flex items-center justify-center shadow-xs shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
              My Reports
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Historical daily work submissions, citizen intake, and device screen-time telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {setActiveTab && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setActiveTab('daily_report')}
              className="text-xs h-9 px-3.5 rounded-xl shadow-xs"
            >
              <FilePlus2 className="w-4 h-4 mr-1.5" />
              Daily Work Report
            </Button>
          )}
        </div>
      </div>

      {/* 2. Compact Executive KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Submissions */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Total Reports
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-[#F8FAFC] font-mono leading-none">
              {stats.totalReports}
            </span>
          </div>
        </div>

        {/* Total Citizens Registered */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Citizens Intake
            </span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono leading-none">
              {stats.totalCitizens}
            </span>
          </div>
        </div>

        {/* Total Screen-Time */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Active Time
            </span>
            <span className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono leading-none">
              {stats.totalScreenTime}
            </span>
          </div>
        </div>

        {/* Cloud Sync Status */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Cloud Synced
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-[#F8FAFC] font-mono leading-none">
              {stats.syncedCount} <span className="text-xs text-slate-400 font-normal">/ {stats.totalReports}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Picker */}
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              title="Filter by submission date"
              className="h-8 pl-8 pr-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
            />
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate(selectedDate === todayStr ? '' : todayStr)}
            className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
              selectedDate === todayStr
                ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-2xs'
                : 'bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 border-[#E2E8F0] dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Today
          </button>

          {/* Sync Status Filter */}
          <select
            value={filterSyncStatus}
            onChange={(e) => setFilterSyncStatus(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer min-w-[120px]"
          >
            <option value="ALL">All Sync States</option>
            <option value="SYNCED">Synced to Cloud</option>
            <option value="PENDING">Pending Sync</option>
          </select>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="h-8 px-2.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#0F172A] hover:bg-slate-200 dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-[#334155] transition-all whitespace-nowrap cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="text-xs font-bold text-slate-500 dark:text-[#94A3B8]">
          {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'}
        </div>
      </div>

      {/* 4. Professional Enterprise Data Table / Streamlined Reports View */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-[#2563EB] dark:text-[#60A5FA] animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Loading your submitted reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#0F172A] flex items-center justify-center mx-auto mb-2.5 text-slate-400 dark:text-slate-500">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-sm mb-1">
              {hasActiveFilters ? 'No Reports Match Your Filter' : 'No Daily Reports Submitted Yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-3">
              {hasActiveFilters
                ? 'Try resetting your date or sync status filter.'
                : 'Submitted daily operational reports will appear here.'}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={clearAllFilters} className="text-xs">
                Reset Filters
              </Button>
            ) : (
              setActiveTab && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveTab('daily_report')}
                  className="text-xs px-4 rounded-xl"
                >
                  <FilePlus2 className="w-4 h-4 mr-1.5" />
                  Submit Today's Report
                </Button>
              )
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#334155] bg-slate-50/70 dark:bg-[#182234] text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Report Date</th>
                  <th className="py-3.5 px-5 text-center">Citizens</th>
                  <th className="py-3.5 px-5 text-center">Screen Time</th>
                  <th className="py-3.5 px-5 text-center">Sync Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155] text-xs">
                {filteredReports.map((report) => {
                  const details = parseReportDetails(report);
                  const isToday = report.reportDate === todayStr;
                  const isSynced = report.syncStatus === 'SYNCED';
                  const timeStr = report.submittedAt
                    ? new Date(report.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <tr
                      key={report.id || report.reportDate}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Date & Time */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                            {formatDatePretty(report.reportDate)}
                          </span>
                          {isToday && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-[#2563EB] dark:text-blue-300">
                              Today
                            </span>
                          )}
                        </div>
                        {timeStr && (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">
                            {timeStr}
                          </span>
                        )}
                      </td>

                      {/* Citizens */}
                      <td className="py-3.5 px-5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA]">
                          <Users className="w-3.5 h-3.5" />
                          {report.citizenCountLocal || 0}
                        </span>
                      </td>

                      {/* Screen Time */}
                      <td className="py-3.5 px-5 text-center whitespace-nowrap">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 px-3 py-1 rounded-full">
                          {report.screenTimeFormatted || formatTime(report.screenTimeSeconds)}
                        </span>
                      </td>

                      {/* Sync Status */}
                      <td className="py-3.5 px-5 text-center whitespace-nowrap">
                        {isSynced ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Synced
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3 h-3 text-amber-500" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setInspectReport(report)}
                          className="h-8 px-3 text-xs rounded-lg border-[#E2E8F0] dark:border-[#334155] text-[#2563EB] dark:text-[#60A5FA] hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer font-bold"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. View Report Details Modal */}
      {inspectReport && (
        <Modal
          isOpen={!!inspectReport}
          onClose={() => setInspectReport(null)}
          title="Daily Work Report Details"
          size="lg"
        >
          {(() => {
            const details = parseReportDetails(inspectReport);
            const isSynced = inspectReport.syncStatus === 'SYNCED';

            return (
              <div className="space-y-4 text-xs">
                {/* Hero Header Card */}
                <div className="p-4 bg-slate-50 dark:bg-[#182234] rounded-xl border border-[#E2E8F0] dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-[#F8FAFC]">
                      Report Date: {inspectReport.reportDate}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Reporting Officer: <strong className="text-slate-800 dark:text-slate-200">{user?.fullName || user?.name || user?.email || 'Field Staff'}</strong>
                      {user?.employeeId && <span className="font-mono text-slate-400"> ({user.employeeId})</span>}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {isSynced ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Synced to Cloud
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        Pending Sync
                      </span>
                    )}
                  </div>
                </div>

                {/* 2 Clean Telemetry Metric Tiles */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-1">
                        Citizens Registered
                      </span>
                      <span className="text-2xl font-black text-[#2563EB] dark:text-[#60A5FA] font-mono block">
                        {inspectReport.citizenCountLocal || 0}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-1">
                        Screen Time
                      </span>
                      <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono block">
                        {inspectReport.screenTimeFormatted || formatTime(inspectReport.screenTimeSeconds)}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Section 1: Work Summary & Narrative */}
                <div className="p-3.5 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
                    <h4 className="font-extrabold text-slate-900 dark:text-[#F8FAFC] text-xs uppercase tracking-wider">
                      Daily Work Summary & Completed Deliverables
                    </h4>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-[#0F172A] rounded-lg border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                    {details.summary || 'No narrative provided'}
                  </div>
                </div>

                {/* Section 2: Roadblocks & Challenges (if recorded) */}
                {details.challenges && (
                  <div className="p-3.5 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-2xs space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <AlertCircle className="w-4 h-4" />
                      <h4 className="font-extrabold text-slate-900 dark:text-[#F8FAFC] text-xs uppercase tracking-wider">
                        Roadblocks & Operational Challenges
                      </h4>
                    </div>
                    <div className="p-2.5 bg-amber-50/50 dark:bg-[#0F172A] rounded-lg border border-amber-200/50 dark:border-amber-900/40 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                      {details.challenges}
                    </div>
                  </div>
                )}

                {/* Section 3: Resources & Tomorrow's Strategy Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <Wrench className="w-3.5 h-3.5 text-blue-500" />
                      <h4 className="font-extrabold text-slate-900 dark:text-[#F8FAFC] text-[11px] uppercase tracking-wider">
                        Resources & Logistics
                      </h4>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-[#0F172A] rounded-lg border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {details.resources || 'Standard field kit'}
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                      <h4 className="font-extrabold text-slate-900 dark:text-[#F8FAFC] text-[11px] uppercase tracking-wider">
                        Tomorrow's Priorities
                      </h4>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-[#0F172A] rounded-lg border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {details.nextDayPlan || 'Continue scheduled intake'}
                    </div>
                  </div>
                </div>

                {/* Audit & Device Provenance Footer Strip */}
                <div className="p-2.5 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span>Report ID:</span>
                    <code className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {(inspectReport.id || 'local_report').slice(0, 18)}...
                    </code>
                    <button
                      type="button"
                      onClick={() => copyReportId(inspectReport.id)}
                      className="p-1 rounded text-slate-400 hover:text-[#2563EB] transition-colors cursor-pointer"
                      title="Copy full Report ID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div>
                    Submitted: <strong className="text-slate-700 dark:text-slate-300">{inspectReport.submittedAt ? new Date(inspectReport.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}</strong>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end pt-2 border-t border-[#E2E8F0] dark:border-[#334155]">
                  <Button
                    variant="secondary"
                    onClick={() => setInspectReport(null)}
                    className="text-xs font-bold px-5 rounded-xl dark:bg-[#1E293B] dark:border-[#334155] dark:text-[#F8FAFC]"
                  >
                    Close
                  </Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
