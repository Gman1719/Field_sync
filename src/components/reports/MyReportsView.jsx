// src/components/reports/MyReportsView.jsx
// Dedicated "My Report" View: Displays all historical daily reports submitted by the field officer with clean filters, executive card feed, and modernized attractive details modal

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Calendar, Clock, RefreshCw, Eye,
  FilePlus2, ArrowRight, ShieldCheck, CheckCircle2,
  CalendarDays, MapPin, User, Check, Copy, AlertCircle, Wrench
} from 'lucide-react';
import toast from 'react-hot-toast';

import { offlineDb } from '../../db/offlineDb';
import { API_BASE } from '../../config/api';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';

export default function MyReportsView({ user, setActiveTab }) {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [filterSyncStatus, setFilterSyncStatus] = useState('ALL');
  const [inspectReport, setInspectReport] = useState(null);
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
  const parseReportDetails = (report) => {
    if (!report) return {};
    let structured = {};
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
        } catch (serverErr) {
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

  // Filtering by Date and Sync Status only (search removed per requirement)
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // Date filter
      if (selectedDate && r.reportDate !== selectedDate) {
        return false;
      }

      // Sync status filter
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

  const copyReportId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    toast.success('Report ID copied');
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Format date helper for structured timeline display
  const formatDateParts = (dateStr) => {
    if (!dateStr) return { day: '--', month: '---', year: '----', weekday: '' };
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, monthIdx, day);
        const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
        return { day: String(day).padStart(2, '0'), month, year: String(year), weekday };
      }
    } catch {
      // fallback
    }
    return { day: dateStr, month: '', year: '', weekday: '' };
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#1E293B] p-5 sm:p-6 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#1E3A8A] to-[#2563EB] text-white flex items-center justify-center shadow-xs shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
                My Reports
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">
                Historical daily work submissions, screen-time telemetry, and synchronization records
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={isRefreshing}
            className="text-xs h-10 px-4 rounded-xl border-[#E2E8F0] dark:border-[#334155] text-slate-700 dark:text-[#F8FAFC] dark:hover:bg-[#0F172A]"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>

          {setActiveTab && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setActiveTab('daily_report')}
              className="text-xs h-10 px-4 rounded-xl shadow-xs"
            >
              <FilePlus2 className="w-4 h-4 mr-1.5" />
              Submit Daily Report
            </Button>
          )}
        </div>
      </div>

      {/* 2. Filter Bar (Search removed, Date and Sync Status filters kept intact) */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Picker */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              title="Filter by submission date"
              className="h-10 pl-9 pr-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all cursor-pointer font-medium"
            />
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate(selectedDate === todayStr ? '' : todayStr)}
            className={`h-10 px-3.5 rounded-xl text-xs font-bold transition-all border ${
              selectedDate === todayStr
                ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                : 'bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 border-[#E2E8F0] dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Filter today's report"
          >
            Today
          </button>

          {/* Sync Status Filter */}
          <select
            value={filterSyncStatus}
            onChange={(e) => setFilterSyncStatus(e.target.value)}
            className="h-10 px-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all cursor-pointer min-w-[130px]"
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
              className="h-10 px-3.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#0F172A] hover:bg-slate-200 dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-[#334155] transition-all whitespace-nowrap cursor-pointer shadow-2xs"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="text-xs font-bold text-slate-500 dark:text-[#94A3B8]">
          Showing {filteredReports.length} of {reports.length} {reports.length === 1 ? 'record' : 'records'}
        </div>
      </div>

      {/* 3. Modernized & Structured Report Cards List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] p-16 text-center">
            <RefreshCw className="w-8 h-8 text-[#2563EB] dark:text-[#60A5FA] animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Loading your submitted reports...</p>
          </Card>
        ) : filteredReports.length === 0 ? (
          <Card className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[#0F172A] flex items-center justify-center mx-auto mb-3 text-slate-400 dark:text-slate-500">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-base mb-1">
              {hasActiveFilters ? 'No Reports Match Your Filter' : 'No Daily Reports Submitted Yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
              {hasActiveFilters
                ? 'Try clearing your selected date or sync status filter to view more records.'
                : 'When you finalize and submit daily operational reports from the Daily Work Report console, they will appear here with full telemetry.'}
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
                  className="text-xs px-5 rounded-xl shadow-xs"
                >
                  <FilePlus2 className="w-4 h-4 mr-1.5" />
                  Submit Today's Report
                </Button>
              )
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredReports.map((report) => {
              const details = parseReportDetails(report);
              const isToday = report.reportDate === todayStr;
              const isSynced = report.syncStatus === 'SYNCED';
              const dateParts = formatDateParts(report.reportDate);

              return (
                <div
                  key={report.id || report.reportDate}
                  className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] p-5 sm:p-6 shadow-xs hover:border-blue-300 dark:hover:border-blue-700/60 hover:shadow-md transition-all space-y-4"
                >
                  {/* Top Bar: Date Tile, Telemetry Badges & Action */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Left: Date Block & Info */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Modern Date Calendar Tile */}
                      <div className="w-14 h-16 sm:w-16 sm:h-18 rounded-2xl bg-gradient-to-b from-blue-50 to-slate-50 dark:from-blue-950/40 dark:to-[#0F172A] border border-blue-100 dark:border-blue-900/50 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA]">
                          {dateParts.month || 'DAY'}
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F8FAFC] leading-none my-0.5 font-mono">
                          {dateParts.day}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
                          {dateParts.year}
                        </span>
                      </div>

                      {/* Header and Telemetry Chips */}
                      <div className="space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                            {dateParts.weekday ? `${dateParts.weekday}, ${dateParts.month} ${dateParts.day}, ${dateParts.year}` : report.reportDate}
                          </h3>
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 dark:bg-blue-900/70 text-[#2563EB] dark:text-blue-300 uppercase tracking-wide">
                              Today
                            </span>
                          )}
                          <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {report.submittedAt
                              ? `Submitted ${new Date(report.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : 'Shift Finalized'}
                          </span>
                        </div>

                        {/* Telemetry Chips Bar */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100/70 dark:border-blue-900/40">
                            <span className="text-slate-500 dark:text-slate-400">Citizens:</span>
                            <strong className="text-[#2563EB] dark:text-[#60A5FA] font-bold">
                              {report.citizenCountLocal || 0}
                            </strong>
                          </div>

                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100/70 dark:border-indigo-900/40">
                            <span className="text-slate-500 dark:text-slate-400">Screen Time:</span>
                            <strong className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                              {report.screenTimeFormatted || formatTime(report.screenTimeSeconds)}
                            </strong>
                          </div>

                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800">
                            <span className="text-slate-500 dark:text-slate-400">Sessions:</span>
                            <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                              {report.sessionCount || 1}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Cloud Sync Pill & Action Button */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end md:self-start">
                      {isSynced ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Synced to Cloud
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          Pending Sync
                        </span>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setInspectReport(report)}
                        className="text-xs h-9 px-3.5 rounded-xl border-[#E2E8F0] dark:border-[#334155] text-[#2563EB] dark:text-[#60A5FA] hover:bg-blue-50 dark:hover:bg-blue-950/40"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        View Report Details
                      </Button>
                    </div>
                  </div>

                  {/* Work Narrative Quote Excerpt */}
                  <div className="p-3.5 bg-slate-50/80 dark:bg-[#0F172A]/70 rounded-xl border-l-4 border-l-[#2563EB] border-t border-r border-b border-slate-100 dark:border-slate-800/80 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      Work Summary & Deliverables:
                    </span>
                    <p className="text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {details.summary || 'No narrative provided'}
                    </p>
                  </div>

                  {/* Roadblocks Callout if reported */}
                  {details.challenges && (
                    <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border-l-4 border-l-amber-500 border-t border-r border-b border-amber-200/50 dark:border-amber-900/40 text-xs">
                      <span className="font-bold text-amber-900 dark:text-amber-300 block mb-0.5">
                        Roadblocks Encountered:
                      </span>
                      <p className="text-amber-800 dark:text-amber-400 line-clamp-2 leading-relaxed">
                        {details.challenges}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Highly Attractive, Modern Executive Report Details Modal */}
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
              <div className="space-y-5 text-xs">
                {/* Ethiopian Flag Accent Top Ribbon */}
                <div className="h-1.5 w-full -mt-2 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 opacity-95" />

                {/* Hero Header Card */}
                <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-[#0F172A] dark:via-[#1E293B] dark:to-[#0F172A] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#1E3A8A] to-[#2563EB] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider">
                          Official Shift Report
                        </span>
                        {inspectReport.reportDate === todayStr && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-[#2563EB] dark:text-blue-300">
                            Today
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-[#F8FAFC]">
                        Report Date: {inspectReport.reportDate}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Officer: <strong className="text-slate-800 dark:text-slate-200">{user?.fullName || user?.name || 'Field Officer'}</strong>
                        {user?.employeeId && <span className="font-mono text-slate-400"> ({user.employeeId})</span>}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 self-start sm:self-center">
                    {isSynced ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Synced to Cloud
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        Buffered on Device
                      </span>
                    )}
                  </div>
                </div>

                {/* Telemetry Metric Tiles */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-2xs">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-0.5">
                      Citizens Registered
                    </span>
                    <span className="text-lg font-black text-[#2563EB] dark:text-[#60A5FA] font-mono block">
                      {inspectReport.citizenCountLocal || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Verified intake</span>
                  </div>

                  <div className="p-3.5 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-2xs">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-0.5">
                      Screen-Time Telemetry
                    </span>
                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono block">
                      {inspectReport.screenTimeFormatted || formatTime(inspectReport.screenTimeSeconds)}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Active device usage</span>
                  </div>

                  <div className="p-3.5 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-2xs">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-0.5">
                      Work Sessions
                    </span>
                    <span className="text-lg font-black text-slate-900 dark:text-[#F8FAFC] font-mono block">
                      {inspectReport.sessionCount || 1}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Logged session count</span>
                  </div>
                </div>

                {/* Section 1: Work Summary & Narrative */}
                <div className="p-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-2xs space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold">
                      <FileText className="w-4 h-4" />
                    </div>
                    <h4 className="font-extrabold text-slate-900 dark:text-[#F8FAFC] text-xs uppercase tracking-wider">
                      Daily Work Summary & Completed Deliverables
                    </h4>
                  </div>
                  <div className="p-3 bg-slate-50/70 dark:bg-[#0F172A] rounded-lg border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                    {details.summary || 'No narrative provided'}
                  </div>
                </div>

                {/* Section 2: Roadblocks & Challenges (if recorded) */}
                {details.challenges && (
                  <div className="p-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-2xs space-y-2">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <h4 className="font-extrabold text-slate-900 dark:text-[#F8FAFC] text-xs uppercase tracking-wider">
                        Roadblocks & Operational Challenges
                      </h4>
                    </div>
                    <div className="p-3 bg-amber-50/40 dark:bg-[#0F172A] rounded-lg border border-amber-200/50 dark:border-amber-900/40 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                      {details.challenges}
                    </div>
                  </div>
                )}

                {/* Section 3: Resources & Tomorrow's Strategy Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-2xs space-y-2">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Wrench className="w-4 h-4 text-blue-500" />
                      <h4 className="font-extrabold text-slate-900 dark:text-[#F8FAFC] text-xs uppercase tracking-wider">
                        Resources & Logistics
                      </h4>
                    </div>
                    <div className="p-3 bg-slate-50/70 dark:bg-[#0F172A] rounded-lg border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed font-medium min-h-[60px]">
                      {details.resources || 'Standard equipment used'}
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-2xs space-y-2">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                      <ArrowRight className="w-4 h-4 text-indigo-500" />
                      <h4 className="font-extrabold text-slate-900 dark:text-[#F8FAFC] text-xs uppercase tracking-wider">
                        Tomorrow's Priorities
                      </h4>
                    </div>
                    <div className="p-3 bg-slate-50/70 dark:bg-[#0F172A] rounded-lg border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed font-medium min-h-[60px]">
                      {details.nextDayPlan || 'Scheduled operational continuation'}
                    </div>
                  </div>
                </div>

                {/* Audit & Device Provenance Footer Strip */}
                <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span>Report ID:</span>
                    <code className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {(inspectReport.id || 'local_report').slice(0, 18)}...
                    </code>
                    <button
                      type="button"
                      onClick={() => copyReportId(inspectReport.id)}
                      className="p-1 rounded text-slate-400 hover:text-[#2563EB] transition-colors"
                      title="Copy full Report ID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div>
                    Submitted: <strong className="text-slate-700 dark:text-slate-300">{inspectReport.submittedAt ? new Date(inspectReport.submittedAt).toLocaleString() : 'Today'}</strong>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end pt-3 border-t border-[#E2E8F0] dark:border-[#334155]">
                  <Button
                    variant="secondary"
                    onClick={() => setInspectReport(null)}
                    className="text-xs font-bold px-6 rounded-xl dark:bg-[#1E293B] dark:border-[#334155] dark:text-[#F8FAFC]"
                  >
                    Close Report Details
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
