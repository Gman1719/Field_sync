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

export default function DailyWorkReportView({ user, addNotification }) {
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {isManager ? 'Organization Daily Work Reports' : 'Team Daily Work Reports & Review'}
              </h1>
              <p className="text-xs text-slate-500">
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
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
            </div>

            <button
              type="button"
              onClick={() => setSelectedDate('')}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                !selectedDate ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Dates
            </button>

            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={filterUrgentOnly}
                onChange={(e) => setFilterUrgentOnly(e.target.checked)}
                className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-3.5 h-3.5"
              />
              <span className="font-semibold text-red-700 flex items-center gap-1">
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
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
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
              <div className="divide-y divide-slate-100">
                {filteredTeamReports.map((report) => {
                  const details = getStructuredDetails(report);
                  return (
                    <div
                      key={report.id}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {report.officerName || 'Field Officer'}
                          </span>
                          <span className="text-slate-400 text-xs">•</span>
                          <span className="text-slate-600 text-xs flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {report.officerWoreda || 'Assigned Woreda'}
                          </span>
                          <span className="text-slate-400 text-xs">•</span>
                          <span className="text-slate-500 font-mono text-xs">{report.reportDate}</span>

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

                        <p className="text-xs text-slate-700 line-clamp-2">
                          <strong className="text-slate-900">Summary: </strong>
                          {details.summary}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                          <span>
                            Citizens:{' '}
                            <strong className="text-slate-800">{report.citizenCountLocal}</strong>{' '}
                            <span className="text-[10px] text-emerald-600">({report.citizenCountServerConfirmed} confirmed)</span>
                          </span>
                          <span>•</span>
                          <span>
                            Screen-Time:{' '}
                            <strong className="text-slate-800">
                              {report.screenTimeFormatted || formatTime(report.screenTimeSeconds)}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Sessions: <strong className="text-slate-800">{report.sessionCount}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Activities: <strong className="text-slate-800">{report.activityCount}</strong>
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
                          <Eye className="w-3.5 h-3.5 mr-1.5 text-[#1E3A8A]" />
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
                <div className="space-y-4 text-xs text-slate-700">
                  {/* Urgent Alert Banner if flagged */}
                  {details.isUrgent && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-sm text-red-700">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        Officer Flagged Urgent Roadblock
                      </div>
                      <p className="text-xs font-medium text-red-800">
                        {details.urgentReason || 'Immediate supervisor attention required for field operations.'}
                      </p>
                    </div>
                  )}

                  {/* Telemetry & Verified Verification Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Citizens Registered</span>
                      <span className="text-sm font-bold text-slate-800">{inspectModalReport.citizenCountLocal} Citizens</span>
                      <span className="text-[10px] text-emerald-600 block">({inspectModalReport.citizenCountServerConfirmed} Server Confirmed)</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Screen-Time Finalized</span>
                      <span className="text-sm font-bold text-indigo-700">
                        {inspectModalReport.screenTimeFormatted || formatTime(inspectModalReport.screenTimeSeconds)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">{inspectModalReport.sessionCount} Work Sessions</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Activity Events</span>
                      <span className="text-sm font-bold text-amber-700">{inspectModalReport.activityCount} Logged</span>
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
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                      <FileText className="w-3.5 h-3.5 text-[#1E3A8A]" />
                      Work Summary & Narrative
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{details.summary}</p>
                  </div>

                  {/* Section 2: Key Achievements */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      Key Achievements & Milestones
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{details.achievements}</p>
                  </div>

                  {/* Section 3: Roadblocks & Challenges */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Roadblocks & Field Challenges
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{details.challenges}</p>
                  </div>

                  {/* Section 4: Resources Used & Needed */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                      <Wrench className="w-3.5 h-3.5 text-blue-600" />
                      Resources Used & Needed for Next Shift
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{details.resources}</p>
                  </div>

                  {/* Section 5: Tomorrow's Priorities */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                      Tomorrow's Strategy & Target Kebeles
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{details.nextDayPlan}</p>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Daily Work Reports & Aggregation
            </h1>
            <p className="text-xs text-slate-500">
              Official daily operational summary, citizen totals, and screen-time telemetry submission
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={computeDailyMetrics}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Recalculate Today
          </Button>
        </div>
      </div>

      {/* Locked / Submitted Status Alert Banner */}
      {todayReport && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-sm block text-emerald-900">
                Daily Work Report Finalized for Today ({todayStr})
              </span>
              <span className="text-emerald-700">
                This report is locked in read-only mode and queued for supervisor review. Work sessions and screen time are finalized.
              </span>
            </div>
          </div>
          <Badge variant={todayReport.syncStatus === 'SYNCED' ? 'success' : 'warning'} className="self-start sm:self-auto">
            {todayReport.syncStatus === 'SYNCED' ? 'Synced with Central DB' : 'Saved Locally — Pending Sync'}
          </Badge>
        </div>
      )}

      {/* Today's Aggregated Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Citizens Registered Today"
          value={localCitizenCount}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Server Confirmed"
          value={serverCitizenCount}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title={todayReport ? "Finalized Screen Time" : "Recorded Screen Time"}
          value={formatTime(todayScreenTimeSecs)}
          icon={Smartphone}
          color="indigo"
        />
        <StatCard
          title="Logged Field Activities"
          value={todayActivityCount}
          icon={Activity}
          color="amber"
        />
      </div>

      {/* Submission Form (or Read-Only View if Locked) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1E3A8A]" />
              <CardTitle className="text-base">
                Operational Summary for {todayStr}
              </CardTitle>
            </div>
            {todayReport ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-500" />
                Read-Only Record
              </Badge>
            ) : (
              <Badge variant="outline" className="text-indigo-700 bg-indigo-50 border-indigo-200">
                Active Draft
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            {todayReport
              ? 'Official verified submission archived on local storage and synchronized with regional servers.'
              : 'Review automatically aggregated metrics and enter comprehensive field observations for supervisor & manager review.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitReport} className="space-y-5">
            {/* Context Officer Header Pill */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Report Date</span>
                <span className="font-bold text-slate-800">{todayStr}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Reporting Officer</span>
                <span className="font-bold text-slate-800">{user?.fullName || user?.name || 'Field Officer'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Jurisdiction</span>
                <span className="font-bold text-slate-800">{user?.woreda || user?.woredaName || 'Assigned Woreda'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Sessions Run</span>
                <span className="font-bold text-slate-800">{todaySessionCount} Sessions</span>
              </div>
            </div>

            {/* Field 1: Work Summary & Narrative */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#1E3A8A]" />
                Daily Work Narrative & Completed Deliverables <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                placeholder="Detail today's operations: specific kebeles/villages covered, community leadership meetings, outreach activities, and completed registrations..."
                disabled={!!todayReport}
                rows={3}
                required
              />
            </div>

            {/* Two-Column Grid for Achievements & Challenges */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Field 2: Key Achievements */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  Key Achievements & Targets Met
                </label>
                <Textarea
                  value={form.achievements}
                  onChange={(e) => setForm({ ...form, achievements: e.target.value })}
                  placeholder="e.g. Registered 25 households in Village 3; successfully enrolled elderly citizens requiring home visits; met weekly registration quota..."
                  disabled={!!todayReport}
                  rows={3}
                />
              </div>

              {/* Field 3: Roadblocks & Challenges */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Roadblocks & Operational Challenges
                </label>
                <Textarea
                  value={form.challenges}
                  onChange={(e) => setForm({ ...form, challenges: e.target.value })}
                  placeholder="e.g. Heavy afternoon rain flooded kebele access road; temporary power outage; some residents away at market; device low-battery..."
                  disabled={!!todayReport}
                  rows={3}
                />
              </div>
            </div>

            {/* Two-Column Grid for Resources & Next Day Plan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Field 4: Resources Used & Needed */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-blue-600" />
                  Resources Used & Logistics Needed for Next Shift
                </label>
                <Textarea
                  value={form.resources}
                  onChange={(e) => setForm({ ...form, resources: e.target.value })}
                  placeholder="e.g. Power bank depleted to 15%; need 50 additional paper registration forms; transport fuel reimbursement needed for remote sub-village..."
                  disabled={!!todayReport}
                  rows={3}
                />
              </div>

              {/* Field 5: Tomorrow's Priorities */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                  Tomorrow's Priorities & Target Kebeles
                </label>
                <Textarea
                  value={form.nextDayPlan}
                  onChange={(e) => setForm({ ...form, nextDayPlan: e.target.value })}
                  placeholder="e.g. Moving to Kebele 04 starting at 08:30 AM; coordinating with local Kebele Administrator; target 30 citizen registrations..."
                  disabled={!!todayReport}
                  rows={3}
                />
              </div>
            </div>

            {/* Field 6: Urgent Supervisor Attention Flag */}
            <div className={`p-4 rounded-xl border transition-all ${
              form.isUrgent
                ? 'bg-red-50/70 border-red-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="urgentFlag"
                    checked={form.isUrgent}
                    onChange={(e) => setForm({ ...form, isUrgent: e.target.checked })}
                    disabled={!!todayReport}
                    className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                  />
                  <label htmlFor="urgentFlag" className="text-xs font-bold text-slate-800 cursor-pointer flex items-center gap-1.5">
                    <AlertTriangle className={`w-3.5 h-3.5 ${form.isUrgent ? 'text-red-600' : 'text-slate-400'}`} />
                    Requires Urgent Supervisor Attention / Roadblock Intervention
                  </label>
                </div>
                {form.isUrgent && (
                  <Badge variant="danger" className="text-[10px]">
                    Supervisor Alert
                  </Badge>
                )}
              </div>

              {form.isUrgent && (
                <div className="mt-3">
                  <label className="block text-[11px] font-semibold text-red-800 mb-1">
                    Explain Urgent Roadblock / Escalation Reason <span className="text-red-600">*</span>
                  </label>
                  <Textarea
                    value={form.urgentReason}
                    onChange={(e) => setForm({ ...form, urgentReason: e.target.value })}
                    placeholder="Specify the urgent situation requiring immediate supervisor action (e.g. washed-out bridge, security concern, severe equipment malfunction)..."
                    disabled={!!todayReport}
                    rows={2}
                    className="border-red-300 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
              )}
            </div>

            {/* Submission Action Button */}
            {!todayReport && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Submitting will close open work sessions & finalize today's screen time.
                </span>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isSubmitting}
                  className="w-full sm:w-auto text-xs font-semibold px-6 shadow-sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Finalize & Submit Daily Work Report
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Historical Reports Directory */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#1E3A8A]" />
            <CardTitle className="text-base">Submitted Reports History</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Previous daily work submissions and synchronization records
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {pastReports.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No historical daily reports found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pastReports.map((report) => {
                const details = getStructuredDetails(report);
                return (
                  <div
                    key={report.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{report.reportDate}</span>
                        <Badge variant={report.syncStatus === 'SYNCED' ? 'success' : 'warning'}>
                          {report.syncStatus === 'SYNCED' ? 'Synced' : 'Pending Sync'}
                        </Badge>
                        {details.isUrgent && (
                          <Badge variant="danger">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Urgent Flagged
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-500">
                        Citizens: <strong className="text-slate-800">{report.citizenCountLocal}</strong>
                        {' • '}Screen-time: <strong className="text-slate-800">{formatTime(report.screenTimeSeconds)}</strong>
                        {' • '}Activities: <strong className="text-slate-800">{report.activityCount}</strong>
                      </p>
                      {details.summary && (
                        <p className="text-[11px] text-slate-600 line-clamp-1 italic">"{details.summary}"</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setInspectModalReport(report)}
                        className="text-xs"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Inspector for Officer History */}
      {inspectModalReport && (
        <Modal
          isOpen={!!inspectModalReport}
          onClose={() => setInspectModalReport(null)}
          title={`Daily Work Report — ${inspectModalReport.reportDate}`}
          description={`Finalized on ${new Date(inspectModalReport.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          size="lg"
          footer={
            <Button variant="primary" size="sm" onClick={() => setInspectModalReport(null)}>
              Close
            </Button>
          }
        >
          {(() => {
            const details = getStructuredDetails(inspectModalReport);
            return (
              <div className="space-y-4 text-xs text-slate-700">
                {details.isUrgent && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-red-700">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      Urgent Supervisor Escalation
                    </div>
                    <p className="text-xs text-red-800">{details.urgentReason}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Citizens Registered</span>
                    <span className="text-sm font-bold text-slate-800">{inspectModalReport.citizenCountLocal} Citizens</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Screen-Time</span>
                    <span className="text-sm font-bold text-indigo-700">{formatTime(inspectModalReport.screenTimeSeconds)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Sessions</span>
                    <span className="text-sm font-bold text-slate-800">{inspectModalReport.sessionCount} Sessions</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Sync Status</span>
                    <Badge variant={inspectModalReport.syncStatus === 'SYNCED' ? 'success' : 'warning'} className="mt-1">
                      {inspectModalReport.syncStatus === 'SYNCED' ? 'Synced' : 'Pending Sync'}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block text-xs">Work Summary & Narrative</span>
                  <p className="text-slate-700 whitespace-pre-wrap">{details.summary}</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block text-xs">Key Achievements</span>
                  <p className="text-slate-700 whitespace-pre-wrap">{details.achievements}</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block text-xs">Roadblocks & Challenges</span>
                  <p className="text-slate-700 whitespace-pre-wrap">{details.challenges}</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block text-xs">Resources Needed</span>
                  <p className="text-slate-700 whitespace-pre-wrap">{details.resources}</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block text-xs">Tomorrow's Priorities</span>
                  <p className="text-slate-700 whitespace-pre-wrap">{details.nextDayPlan}</p>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
