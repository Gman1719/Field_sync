// src/components/reports/DailyWorkReportView.jsx
// Enterprise Daily Work Report Submission, Verification & Telemetry Finalization (Phase 6)

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, CheckCircle2, Clock, Calendar, Smartphone,
  Users, Activity, Lock, RefreshCw, Send, AlertTriangle,
  ShieldCheck, Award, Wrench, ArrowRight, Eye, AlertCircle,
  Search, Filter, ChevronRight, CheckCircle, MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';

import { offlineDb } from '../../db/offlineDb';
import { API_BASE } from '../../config/api';
import ActivityLogger from '../../services/activityLogger';
import SessionTracker from '../../services/sessionTracker';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import StatCard from '../ui/StatCard';
import Modal from '../ui/Modal';

export default function DailyWorkReportView({ user, addNotification, setActiveTab }) {
  const role = (user?.role || '').toLowerCase();
  const isOfficer = role === 'field_officer';
  const isSupervisor = role === 'supervisor';
  const isManager = role === 'manager';

  const todayStr = new Date().toISOString().split('T')[0];

  // Officer States
  const [todayReport, setTodayReport] = useState(null);
  const [pastReports, setPastReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Structured Form Input Fields
  const [form, setForm] = useState({
    summary: '',
    achievements: '',
    challenges: '',
    resources: '',
    nextDayPlan: '',
    isUrgent: false,
    urgentReason: '',
  });

  // Live Aggregated Metrics for Today (Officer)
  const [localCitizenCount, setLocalCitizenCount] = useState(0);
  const [serverCitizenCount, setServerCitizenCount] = useState(0);
  const [todayActivityCount, setTodayActivityCount] = useState(0);
  const [todaySessionCount, setTodaySessionCount] = useState(0);
  const [todayScreenTimeSecs, setTodayScreenTimeSecs] = useState(0);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);

  // Supervisor & Manager States
  const [teamReports, setTeamReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [filterUrgentOnly, setFilterUrgentOnly] = useState(false);
  const [inspectModalReport, setInspectModalReport] = useState(null);

  // Format seconds helper
  const formatTime = (totalSecs = 0) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 1. Calculate live daily metrics from Dexie stores (Officer)
  const computeDailyMetrics = async () => {
    setIsLoading(true);
    try {
      // Check if report already submitted for today
      const existingReport = await offlineDb.dailyWorkReports
        .where('reportDate')
        .equals(todayStr)
        .first();

      if (existingReport) {
        setTodayReport(existingReport);

        // Populate structured fields
        let structured = {};
        if (existingReport.comments) {
          try {
            structured = JSON.parse(existingReport.comments);
          } catch {
            structured = { summary: existingReport.comments };
          }
        }
        setForm({
          summary: existingReport.summary || structured.summary || existingReport.comments || '',
          achievements: existingReport.achievements || structured.achievements || '',
          challenges: existingReport.challenges || structured.challenges || '',
          resources: existingReport.resources || structured.resources || '',
          nextDayPlan: existingReport.nextDayPlan || structured.nextDayPlan || '',
          isUrgent: Boolean(existingReport.isUrgent ?? structured.isUrgent),
          urgentReason: existingReport.urgentReason || structured.urgentReason || '',
        });
      }

      // 1. Citizens registered today
      const allCitizens = await offlineDb.citizens.toArray();
      const todayCitizens = allCitizens.filter((c) => {
        const date = (c.registrationTimestamp || c.createdAt || '').slice(0, 10);
        return date === todayStr;
      });
      setLocalCitizenCount(todayCitizens.length);
      setServerCitizenCount(todayCitizens.filter((c) => c.syncStatus === 'SYNCED').length);

      // 2. Activities recorded today
      const allActivities = await offlineDb.activityLogs.toArray();
      const todayActivities = allActivities.filter((a) => {
        const date = (a.deviceTimestamp || '').slice(0, 10);
        return date === todayStr;
      });
      setTodayActivityCount(todayActivities.length);

      // 3. Work sessions & screen time today
      const allSessions = await offlineDb.workSessions
        .where('reportDate')
        .equals(todayStr)
        .toArray();

      setTodaySessionCount(allSessions.length);

      // Use SessionTracker for accurate accumulated screen time
      const accumulatedSecs = await SessionTracker.getAccumulatedScreenTime(user?.id || 'officer', todayStr);
      setTodayScreenTimeSecs(accumulatedSecs);

      // 4. Pending sync queue
      const pendingItems = await offlineDb.syncQueue
        .where('status')
        .equals('PENDING')
        .count();
      setPendingQueueCount(pendingItems);

      // 5. Past submitted reports (Officer's local history)
      const past = await offlineDb.dailyWorkReports.orderBy('reportDate').reverse().toArray();
      setPastReports(past);
    } catch (e) {
      console.error('Error computing daily report metrics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Load Reports for Supervisor & Manager
  const loadSupervisorManagerReports = async () => {
    setIsLoading(true);
    try {
      const authToken = localStorage.getItem('fieldsync_token');
      if (navigator.onLine && authToken) {
        try {
          const res = await fetch(`${API_BASE}/reports/daily`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
              setTeamReports(data.data);
              return;
            }
          }
        } catch (apiErr) {
          console.warn('Backend fetch failed, falling back to local Dexie reports:', apiErr);
        }
      }

      // Offline fallback: load from IndexedDB
      const localReports = await offlineDb.dailyWorkReports.orderBy('reportDate').reverse().toArray();
      setTeamReports(localReports);
    } catch (err) {
      console.error('Failed to load supervisor/manager reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOfficer) {
      computeDailyMetrics();
    } else {
      loadSupervisorManagerReports();
    }
  }, [todayStr, isOfficer]);

  // 3. Submit Daily Report & Finalize Screen Time
  const handleSubmitReport = async (e) => {
    e.preventDefault();

    if (!form.summary.trim()) {
      toast.error('Please enter a summary of today’s field operations');
      return;
    }

    if (form.isUrgent && !form.urgentReason.trim()) {
      toast.error('Please provide a reason for the urgent supervisor escalation');
      return;
    }

    setIsSubmitting(true);
    try {
      const officerId = user?.id || 'officer';
      const submittedAt = new Date().toISOString();

      // Step 1: Strictly finalize daily screen-time telemetry
      const { finalizedScreenTimeSeconds, sessionCount } = await SessionTracker.finalizeDailyScreenTime(
        officerId,
        todayStr
      );

      const finalScreenTime = finalizedScreenTimeSeconds || todayScreenTimeSecs;
      const finalSessions = sessionCount || todaySessionCount;

      // Step 2: Build structured data
      const structuredData = {
        summary: form.summary.trim(),
        achievements: form.achievements.trim(),
        challenges: form.challenges.trim(),
        resources: form.resources.trim(),
        nextDayPlan: form.nextDayPlan.trim(),
        isUrgent: Boolean(form.isUrgent),
        urgentReason: form.urgentReason.trim(),
      };

      const reportId = todayReport?.id || crypto.randomUUID();

      const reportPayload = {
        id: reportId,
        officerId,
        officerName: user?.fullName || user?.name || 'Field Officer',
        officerEmail: user?.email || '',
        officerWoreda: user?.woreda || user?.woredaName || 'Assigned Woreda',
        supervisorId: user?.supervisorId || null,
        reportDate: todayStr,
        citizenCountLocal: localCitizenCount,
        citizenCountServerConfirmed: serverCitizenCount,
        activityCount: todayActivityCount,
        sessionCount: finalSessions,
        screenTimeSeconds: finalScreenTime,
        screenTimeFormatted: formatTime(finalScreenTime),
        comments: JSON.stringify(structuredData),
        summary: structuredData.summary,
        achievements: structuredData.achievements,
        challenges: structuredData.challenges,
        resources: structuredData.resources,
        nextDayPlan: structuredData.nextDayPlan,
        isUrgent: structuredData.isUrgent,
        urgentReason: structuredData.urgentReason,
        submittedAt,
        syncStatus: 'PENDING',
      };

      // Step 3: Save locally to Dexie (locks the report)
      await offlineDb.dailyWorkReports.put(reportPayload);

      // Step 4: Record in local Activity Log
      await ActivityLogger.log(
        'DAILY_REPORT_SUBMITTED',
        `Daily work report submitted for ${todayStr} (Citizens: ${localCitizenCount}, Screen time: ${formatTime(finalScreenTime)})`,
        {
          reportId,
          isUrgent: reportPayload.isUrgent,
          screenTimeSeconds: finalScreenTime,
        }
      );

      // Step 5: Enqueue into offline sync queue
      await offlineDb.syncQueue.put({
        id: crypto.randomUUID(),
        entityType: 'daily_report',
        entityId: reportId,
        payload: reportPayload,
        queuedAt: submittedAt,
        attempts: 0,
        maxRetries: 5,
        status: 'PENDING',
      });

      // Step 6: If online, attempt background sync with backend
      const authToken = localStorage.getItem('fieldsync_token');
      let isSyncedServer = false;

      if (navigator.onLine && authToken) {
        try {
          const res = await fetch(`${API_BASE}/reports/daily`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(reportPayload),
          });

          if (res.ok) {
            const resData = await res.json();
            if (resData.success) {
              isSyncedServer = true;
              await offlineDb.dailyWorkReports.update(reportId, { syncStatus: 'SYNCED' });
              reportPayload.syncStatus = 'SYNCED';
            }
          }
        } catch (apiErr) {
          console.warn('Network sync failed, report preserved locally in Dexie:', apiErr.message);
        }
      }

      setTodayReport(reportPayload);
      setTodayScreenTimeSecs(finalScreenTime);
      setTodaySessionCount(finalSessions);

      if (isSyncedServer) {
        toast.success('Daily Work Report submitted & synchronized with Central Database!');
      } else {
        toast.success('Daily Work Report locked & saved locally — pending sync');
      }

      if (addNotification) {
        addNotification({
          title: 'Daily Report Submitted & Finalized',
          message: `Official report for ${todayStr} recorded (${reportPayload.syncStatus}) with ${formatTime(finalScreenTime)} finalized screen time.`,
          type: 'success',
        });
      }

      // Refresh past list
      const past = await offlineDb.dailyWorkReports.orderBy('reportDate').reverse().toArray();
      setPastReports(past);
    } catch (err) {
      console.error('Failed to submit daily report:', err);
      toast.error('Failed to finalize and submit daily work report');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to extract parsed structured fields from a report
  const getStructuredDetails = (report) => {
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
      achievements: report.achievements || structured.achievements || 'None recorded',
      challenges: report.challenges || structured.challenges || 'No roadblocks reported',
      resources: report.resources || structured.resources || 'Standard equipment used',
      nextDayPlan: report.nextDayPlan || structured.nextDayPlan || 'Scheduled operational rollout',
      isUrgent: Boolean(report.isUrgent ?? structured.isUrgent),
      urgentReason: report.urgentReason || structured.urgentReason || '',
    };
  };

  // Filtered supervisor/manager reports
  const filteredTeamReports = useMemo(() => {
    let result = teamReports;
    if (selectedDate) {
      result = result.filter((r) => r.reportDate === selectedDate);
    }
    if (filterUrgentOnly) {
      result = result.filter((r) => {
        const details = getStructuredDetails(r);
        return details.isUrgent;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          (r.officerName || '').toLowerCase().includes(q) ||
          (r.officerWoreda || '').toLowerCase().includes(q) ||
          (r.officerEmail || '').toLowerCase().includes(q) ||
          (r.comments || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [teamReports, selectedDate, filterUrgentOnly, searchQuery]);

  // Aggregate stats for Supervisor/Manager
  const supervisorStats = useMemo(() => {
    const totalReports = filteredTeamReports.length;
    const totalCitizens = filteredTeamReports.reduce((sum, r) => sum + (r.citizenCountLocal || 0), 0);
    const totalSecs = filteredTeamReports.reduce((sum, r) => sum + (r.screenTimeSeconds || 0), 0);
    const urgentCount = filteredTeamReports.filter((r) => getStructuredDetails(r).isUrgent).length;

    return {
      totalReports,
      totalCitizens,
      totalScreenTimeFormatted: formatTime(totalSecs),
      urgentCount,
    };
  }, [filteredTeamReports]);

  // ==========================================
  // RENDER: SUPERVISOR & MANAGER CONSOLE
  // ==========================================
  if (isSupervisor || isManager) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                {isManager ? 'Organization Daily Work Reports' : 'Team Daily Work Reports & Review'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isManager
                  ? 'Central oversight of all field officer submissions, screen-time telemetry & operational roadblocks'
                  : 'Review submitted daily field deliverables, verify screen-time, and monitor team roadblocks'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadSupervisorManagerReports}
              className="text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh Reports
            </Button>
          </div>
        </div>

        {/* Aggregate KPI Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Reports Filed"
            value={supervisorStats.totalReports}
            icon={FileText}
            color="blue"
          />
          <StatCard
            title="Citizens Registered"
            value={supervisorStats.totalCitizens}
            icon={Users}
            color="emerald"
          />
          <StatCard
            title="Total Field Screen Time"
            value={supervisorStats.totalScreenTimeFormatted}
            icon={Smartphone}
            color="indigo"
          />
          <StatCard
            title="Urgent Roadblocks"
            value={supervisorStats.urgentCount}
            icon={AlertTriangle}
            color={supervisorStats.urgentCount > 0 ? 'red' : 'amber'}
          />
        </div>

        {/* Filter Controls */}
        <div className="bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#0F172A] rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
            </div>

            <button
              type="button"
              onClick={() => setSelectedDate('')}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                !selectedDate ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]' : 'bg-white dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              All Dates
            </button>

            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-[#0F172A] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <input
                type="checkbox"
                checked={filterUrgentOnly}
                onChange={(e) => setFilterUrgentOnly(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 text-red-600 focus:ring-red-500 w-3.5 h-3.5 bg-white dark:bg-slate-800"
              />
              <span className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Urgent Roadblocks Only
              </span>
            </label>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search officer, woreda, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#0F172A] rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            />
          </div>
        </div>

        {/* Reports Table Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Field Officer Submissions</CardTitle>
                <CardDescription className="text-xs">
                  Showing {filteredTeamReports.length} reports submitted by field teams
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading daily reports...</div>
            ) : filteredTeamReports.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No daily reports match the current filters.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-[#334155]">
                {filteredTeamReports.map((report) => {
                  const details = getStructuredDetails(report);
                  return (
                    <div
                      key={report.id}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-[#0F172A]/50 transition-colors"
                    >
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-[#F8FAFC] text-sm">
                            {report.officerName || 'Field Officer'}
                          </span>
                          <span className="text-slate-400 text-xs">•</span>
                          <span className="text-slate-600 dark:text-slate-300 text-xs flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {report.officerWoreda || 'Assigned Woreda'}
                          </span>
                          <span className="text-slate-400 text-xs">•</span>
                          <span className="text-slate-500 dark:text-slate-400 font-mono text-xs">{report.reportDate}</span>

                          {details.isUrgent && (
                            <Badge variant="danger" className="animate-pulse">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              URGENT ESCALATION
                            </Badge>
                          )}

                          <Badge variant={report.syncStatus === 'SYNCED' ? 'success' : 'warning'}>
                            {report.syncStatus === 'SYNCED' ? 'Synced' : 'Pending Sync'}
                          </Badge>
                        </div>

                        <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                          <strong className="text-slate-900 dark:text-[#F8FAFC]">Summary: </strong>
                          {details.summary}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                          <span>
                            Citizens:{' '}
                            <strong className="text-slate-800 dark:text-slate-200">{report.citizenCountLocal}</strong>{' '}
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">({report.citizenCountServerConfirmed} confirmed)</span>
                          </span>
                          <span>•</span>
                          <span>
                            Screen-Time:{' '}
                            <strong className="text-slate-800 dark:text-slate-200">
                              {report.screenTimeFormatted || formatTime(report.screenTimeSeconds)}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Sessions: <strong className="text-slate-800 dark:text-slate-200">{report.sessionCount}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Activities: <strong className="text-slate-800 dark:text-slate-200">{report.activityCount}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setInspectModalReport(report)}
                          className="text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5 text-[#1E3A8A] dark:text-blue-400" />
                          Inspect Report
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal Inspector for Supervisor & Manager */}
        {inspectModalReport && (
          <Modal
            isOpen={!!inspectModalReport}
            onClose={() => setInspectModalReport(null)}
            title={`Daily Report Review — ${inspectModalReport.officerName || 'Field Officer'}`}
            description={`Submitted on ${inspectModalReport.reportDate} • Scoped Jurisdiction: ${inspectModalReport.officerWoreda || 'Woreda'}`}
            size="lg"
            footer={
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-slate-400 font-mono">
                  ID: {inspectModalReport.id}
                </span>
                <Button variant="primary" size="sm" onClick={() => setInspectModalReport(null)}>
                  Close Review
                </Button>
              </div>
            }
          >
            {(() => {
              const details = getStructuredDetails(inspectModalReport);
              return (
                <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
                  {/* Urgent Alert Banner if flagged */}
                  {details.isUrgent && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-900 dark:text-red-200 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-sm text-red-700 dark:text-red-400">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        Officer Flagged Urgent Roadblock
                      </div>
                      <p className="text-xs font-medium text-red-800 dark:text-red-200">
                        {details.urgentReason || 'Immediate supervisor attention required for field operations.'}
                      </p>
                    </div>
                  )}

                  {/* Telemetry & Verified Verification Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-[#334155]">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Citizens Registered</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{inspectModalReport.citizenCountLocal} Citizens</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">({inspectModalReport.citizenCountServerConfirmed} Server Confirmed)</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Screen-Time Finalized</span>
                      <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
                        {inspectModalReport.screenTimeFormatted || formatTime(inspectModalReport.screenTimeSeconds)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">{inspectModalReport.sessionCount} Work Sessions</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Activity Events</span>
                      <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{inspectModalReport.activityCount} Logged</span>
                      <span className="text-[10px] text-slate-400 block">Verified Telemetry</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Sync Status</span>
                      <Badge variant={inspectModalReport.syncStatus === 'SYNCED' ? 'success' : 'warning'} className="mt-1">
                        {inspectModalReport.syncStatus === 'SYNCED' ? 'Synced with Central DB' : 'Saved Locally'}
                      </Badge>
                    </div>
                  </div>

                  {/* Section 1: Executive Work Narrative */}
                  <div className="p-3.5 bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-[#334155] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-[#F8FAFC] text-xs">
                      <FileText className="w-3.5 h-3.5 text-[#1E3A8A] dark:text-blue-400" />
                      Work Summary & Narrative
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{details.summary}</p>
                  </div>

                  {/* Section 2: Key Achievements */}
                  <div className="p-3.5 bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-[#334155] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-[#F8FAFC] text-xs">
                      <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Key Achievements & Milestones
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{details.achievements}</p>
                  </div>

                  {/* Section 3: Roadblocks & Challenges */}
                  <div className="p-3.5 bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-[#334155] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-[#F8FAFC] text-xs">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      Roadblocks & Field Challenges
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{details.challenges}</p>
                  </div>

                  {/* Section 4: Resources Used & Needed */}
                  <div className="p-3.5 bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-[#334155] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-[#F8FAFC] text-xs">
                      <Wrench className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Resources Used & Needed for Next Shift
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{details.resources}</p>
                  </div>

                  {/* Section 5: Tomorrow's Priorities */}
                  <div className="p-3.5 bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-[#334155] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-[#F8FAFC] text-xs">
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Tomorrow's Strategy & Target Kebeles
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{details.nextDayPlan}</p>
                  </div>
                </div>
              );
            })()}
          </Modal>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER: FIELD OFFICER SUBMISSION CONSOLE
  // ==========================================
  return (
    <div className="space-y-5">
      {/* 1. Consolidated Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight">
              Today's Report — {todayStr}
            </h1>
            {todayReport && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5" />
                Finalized Submission
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
            Official daily operational summary, citizen totals, and screen-time telemetry submission
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={computeDailyMetrics}
            className="text-xs h-9 px-3.5 rounded-xl border-[#E2E8F0] dark:border-[#334155] text-slate-700 dark:text-[#F8FAFC] dark:hover:bg-[#0F172A]"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Recalculate Today
          </Button>

          {setActiveTab && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('my_reports')}
              className="text-xs h-9 px-3.5 rounded-xl border-[#E2E8F0] dark:border-[#334155] text-[#2563EB] dark:text-[#60A5FA] dark:hover:bg-[#0F172A]"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              View My Reports
            </Button>
          )}
        </div>
      </div>

      {/* 2. Compact Overview & Metadata Bar (Top Deck Ribbon: 4-Column Unified Block) */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] shadow-xs overflow-hidden grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
        {/* Metric 1: Citizens Registered */}
        <div className="p-3.5 sm:p-4">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
            Citizens Registered
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-[#2563EB] dark:text-[#60A5FA] font-mono leading-none">
              {localCitizenCount}
            </span>
            <span className="text-xs text-slate-500 font-semibold">Today</span>
          </div>
        </div>

        {/* Metric 2: Screen Time Telemetry */}
        <div className="p-3.5 sm:p-4">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
            {todayReport ? 'Finalized Screen Time' : 'Recorded Screen Time'}
          </span>
          <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono leading-none block">
            {formatTime(todayScreenTimeSecs)}
          </span>
        </div>

        {/* Metric 3: Reporting Officer */}
        <div className="p-3.5 sm:p-4">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
            Reporting Officer
          </span>
          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#F8FAFC] truncate block leading-snug">
            {user?.fullName || user?.name || 'Field Officer'}
          </span>
          {user?.employeeId && (
            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
              {user.employeeId}
            </span>
          )}
        </div>

        {/* Metric 4: Report Date */}
        <div className="p-3.5 sm:p-4">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
            Report Date
          </span>
          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#F8FAFC] block leading-snug font-mono">
            {todayStr}
          </span>
        </div>
      </div>

      {/* 3. Balanced Two-Column Form Grid (Main Content Area) */}
      <form onSubmit={handleSubmitReport} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Primary Column (Left, 6 Columns) */}
        <div className="lg:col-span-6 space-y-5">
          {/* Card 1: Core Daily Deliverables & Roadblocks */}
          <Card className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="p-5 border-b border-[#E2E8F0] dark:border-[#334155] bg-slate-50/50 dark:bg-[#182234]">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                  Daily Work & Field Observations
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                  Core shift deliverables and operational roadblocks
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="dailyWorkNarrative"
                    className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block"
                  >
                    Daily Work Narrative & Completed Deliverables <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-bold text-[#2563EB] dark:text-[#60A5FA] bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200/60 dark:border-blue-900/50 whitespace-nowrap">
                    Primary Deliverable
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] mb-1.5">
                  Comprehensive log of today's field operations, community intake, and kebele coverage
                </p>
                <Textarea
                  id="dailyWorkNarrative"
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  disabled={!!todayReport}
                  rows={3}
                  required
                  className="w-full text-sm leading-relaxed"
                />
              </div>

              <div>
                <label
                  htmlFor="roadblocksInput"
                  className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block mb-1.5"
                >
                  Roadblocks & Operational Challenges
                </label>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] mb-1.5">
                  Field obstacles, weather disruptions, connectivity gaps, or community access issues
                </p>
                <Textarea
                  id="roadblocksInput"
                  value={form.challenges}
                  onChange={(e) => setForm({ ...form, challenges: e.target.value })}
                  disabled={!!todayReport}
                  rows={3}
                  className="w-full text-sm leading-relaxed"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Column (Right, 6 Columns) */}
        <div className="lg:col-span-6 space-y-5">
          {/* Card 3: Shift Logistics & Planning Stack */}
          <Card className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="p-5 border-b border-[#E2E8F0] dark:border-[#334155] bg-slate-50/50 dark:bg-[#182234]">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                  Shift Logistics & Next Steps
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                  Operational prerequisites and target scheduling
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <label
                  htmlFor="resourcesInput"
                  className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block mb-1.5"
                >
                  Resources Used & Logistics Needed
                </label>
                <Textarea
                  id="resourcesInput"
                  value={form.resources}
                  onChange={(e) => setForm({ ...form, resources: e.target.value })}
                  disabled={!!todayReport}
                  rows={3}
                  className="w-full text-sm leading-relaxed"
                />
              </div>

              <div>
                <label
                  htmlFor="nextDayPlanInput"
                  className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block mb-1.5"
                >
                  Tomorrow's Priorities & Target Kebeles
                </label>
                <Textarea
                  id="nextDayPlanInput"
                  value={form.nextDayPlan}
                  onChange={(e) => setForm({ ...form, nextDayPlan: e.target.value })}
                  disabled={!!todayReport}
                  rows={3}
                  className="w-full text-sm leading-relaxed"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Inline Submission & Finalization Action Panel */}
          <Card className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl shadow-xs p-5 space-y-4">
            <div>
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                Submission Status
              </span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
                  {todayReport ? 'Locked & Finalized' : 'Ready for Submission'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Auto-Save Active
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Submitting closes open work sessions and finalizes today's screen-time telemetry for supervisor and manager review.
            </p>

            {!todayReport ? (
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                className="w-full text-xs font-bold py-3.5 rounded-xl shadow-md shadow-blue-600/20"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit Daily Report
              </Button>
            ) : (
              <div className="space-y-2 pt-1">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Report finalized for {todayStr}</span>
                </div>
                {setActiveTab && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('my_reports')}
                    className="w-full text-xs font-bold h-10 rounded-xl border-[#E2E8F0] dark:border-[#334155] text-[#2563EB] dark:text-[#60A5FA]"
                  >
                    View All in My Reports
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>
      </form>
    </div>
  );
}
