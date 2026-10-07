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
import { getZonedTimeComponents } from '../../config/workingHours';
import { generateReportId, generateId, formatDisplayUserId } from '../../utils/idGenerator';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import StatCard from '../ui/StatCard';
import Modal from '../ui/Modal';
import { useUserLanguage } from '../../context/UserLanguageContext';

interface DailyWorkReportViewProps {
  user: any;
  addNotification?: (notif: any) => void;
  setActiveTab?: (tab: string) => void;
  screenTimeInfo?: any;
}

export default function DailyWorkReportView({
  user,
  addNotification,
  setActiveTab,
  screenTimeInfo,
}: DailyWorkReportViewProps) {
  const { userT } = useUserLanguage();
  const role = (user?.role || '').toLowerCase();
  const isOfficer = role === 'field_officer';
  const isSupervisor = role === 'supervisor';
  const isManager = role === 'manager';

  const { dateStr: todayStr } = getZonedTimeComponents();

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
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [officersList, setOfficersList] = useState<{ id: string; name: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
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
      // Check if report already submitted for today by this specific officer
      const officerId = user?.id || user?.employeeId || 'officer';
      const existingReport = await offlineDb.dailyWorkReports
        .where('reportDate')
        .equals(todayStr)
        .filter((r) => r.officerId === officerId)
        .first();

      if (existingReport) {
        setTodayReport(existingReport);
      }

      // 1. Citizens registered today by this officer
      const allCitizens = await offlineDb.citizens.toArray();
      const todayCitizens = allCitizens.filter((c) => {
        const isThisOfficer =
          !isOfficer ||
          c.registeredById === officerId ||
          c.registeredById === user?.id ||
          c.registeredById === user?.employeeId ||
          c.registeredBy === officerId ||
          c.registeredBy === user?.id ||
          c.registeredBy === user?.employeeId ||
          c.registeredByName === user?.fullName ||
          c.registeredByName === user?.name ||
          (c as any).officerId === officerId;

        if (!isThisOfficer) return false;

        const ts = c.registrationTimestamp || c.createdAt || c.registrationDate || '';
        if (!ts) return false;
        if (ts.startsWith(todayStr)) return true;
        try {
          const zoned = getZonedTimeComponents(new Date(ts));
          return zoned.dateStr === todayStr;
        } catch {
          return false;
        }
      });
      setLocalCitizenCount(todayCitizens.length);
      setServerCitizenCount(todayCitizens.filter((c) => c.syncStatus === 'SYNCED').length);

      // 2. Activities recorded today
      const allActivities = await offlineDb.activityLogs.toArray();
      const todayActivities = allActivities.filter((a) => {
        const ts = a.deviceTimestamp || '';
        if (!ts) return false;
        if (ts.startsWith(todayStr)) return true;
        try {
          const zoned = getZonedTimeComponents(new Date(ts));
          return zoned.dateStr === todayStr;
        } catch {
          return false;
        }
      });
      setTodayActivityCount(todayActivities.length);

      // 3. Work sessions & screen time today
      const allSessions = await offlineDb.workSessions
        .where('reportDate')
        .equals(todayStr)
        .toArray();

      setTodaySessionCount(allSessions.length);

      // Use SessionTracker and screenTimeInfo for accurate accumulated screen time
      let liveSecs = screenTimeInfo?.screenTimeCounter || 0;

      if (!liveSecs && offlineDb.dailyScreenTimes) {
        try {
          const st = await offlineDb.dailyScreenTimes
            .where('officerId')
            .equals(officerId)
            .filter((r) => r.date === todayStr)
            .first();
          if (st?.totalEligibleSeconds) {
            liveSecs = st.totalEligibleSeconds;
          }
        } catch {}
      }

      let accumulatedSecs = 0;
      try {
        accumulatedSecs = await SessionTracker.getAccumulatedScreenTime(officerId, todayStr);
      } catch {}

      const bestSecs = Math.max(
        liveSecs,
        existingReport?.screenTimeSeconds || 0,
        accumulatedSecs || 0
      );
      setTodayScreenTimeSecs(bestSecs);

      // Auto-heal existing report if it was submitted with 0 screen time while active telemetry exists
      if (existingReport) {
        if ((!existingReport.screenTimeSeconds || existingReport.screenTimeSeconds === 0) && bestSecs > 0) {
          existingReport.screenTimeSeconds = bestSecs;
          existingReport.screenTimeFormatted = formatTime(bestSecs);
          await offlineDb.dailyWorkReports.put(existingReport);

          // Stop running counter if finalized report already exists
          if (screenTimeInfo?.finalizeWorkSession && screenTimeInfo?.trackingStatus !== 'FINALIZED') {
            await screenTimeInfo.finalizeWorkSession();
          }

          const authToken = localStorage.getItem('fieldsync_token');
          if (navigator.onLine && authToken) {
            fetch(`${API_BASE}/reports/daily`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`,
              },
              body: JSON.stringify(existingReport),
            }).catch(() => {});
          }
        }
      }

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
      let reportsData: any[] = [];
      const authToken = localStorage.getItem('fieldsync_token');
      if (navigator.onLine && authToken) {
        try {
          const res = await fetch(`${API_BASE}/reports/daily`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
              reportsData = data.data;
              setTeamReports(reportsData);
            }
          }
        } catch (apiErr) {
          console.warn('Backend fetch failed, falling back to local Dexie reports:', apiErr);
        }
      }

      if (reportsData.length === 0) {
        // Offline fallback: load from IndexedDB
        reportsData = await offlineDb.dailyWorkReports.orderBy('reportDate').reverse().toArray();
        setTeamReports(reportsData);
      }

      // Collect list of officers for the supervisor dropdown
      const officerMap = new Map<string, string>();
      try {
        const allDbUsers = await offlineDb.users.toArray();
        allDbUsers
          .filter((u) => u.role === 'field_officer' && (!isSupervisor || u.supervisorId === user?.id))
          .forEach((u) => officerMap.set(u.id, u.fullName || (u as any).name || u.email));
      } catch {}

      if (navigator.onLine && authToken && officerMap.size === 0) {
        try {
          const uRes = await fetch(`${API_BASE}/users`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (uRes.ok) {
            const uData = await uRes.json();
            const uList = Array.isArray(uData) ? uData : (uData.data || []);
            uList
              .filter((u: any) => u.role === 'field_officer' && (!isSupervisor || u.supervisorId === user?.id))
              .forEach((u: any) => officerMap.set(u.id, u.fullName || u.name || u.email));
          }
        } catch {}
      }

      reportsData.forEach((r: any) => {
        if (r.officerId && !officerMap.has(r.officerId)) {
          officerMap.set(r.officerId, r.officerName || r.officerEmail || 'Field Officer');
        }
      });

      setOfficersList(Array.from(officerMap.entries()).map(([id, name]) => ({ id, name })));
    } catch (err) {
      console.error('Failed to load supervisor/manager reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOfficer) {
      computeDailyMetrics();
      const handleCitizenRegistered = () => {
        computeDailyMetrics();
      };
      window.addEventListener('citizen-registered', handleCitizenRegistered);
      return () => window.removeEventListener('citizen-registered', handleCitizenRegistered);
    } else {
      loadSupervisorManagerReports();
    }
  }, [todayStr, isOfficer, user?.id]);

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
      const officerId = user?.id || user?.employeeId || 'officer';
      const submittedAt = new Date().toISOString();

      // Step 1: Strictly finalize daily screen-time telemetry
      let activeScreenSecs = screenTimeInfo?.screenTimeCounter || 0;

      // Check Dexie dailyScreenTimes
      if (offlineDb.dailyScreenTimes) {
        try {
          const st = await offlineDb.dailyScreenTimes
            .where('officerId')
            .equals(officerId)
            .filter((r) => r.date === todayStr)
            .first();
          if (st?.totalEligibleSeconds) {
            activeScreenSecs = Math.max(activeScreenSecs, st.totalEligibleSeconds);
          }
        } catch {}
      }

      // Check SessionTracker as well
      let trackerSecs = 0;
      let sessionCount = 0;
      try {
        const trackerRes = await SessionTracker.finalizeDailyScreenTime(officerId, todayStr);
        trackerSecs = trackerRes.finalizedScreenTimeSeconds || 0;
        sessionCount = trackerRes.sessionCount || 0;
      } catch {}

      const finalScreenTime = Math.max(
        activeScreenSecs,
        todayScreenTimeSecs,
        trackerSecs,
        todayReport?.screenTimeSeconds || 0
      );

      const finalSessions = sessionCount || todaySessionCount || 1;

      // Crucial: Finalize work session via useScreenTime hook to immediately stop header timer
      if (screenTimeInfo?.finalizeWorkSession) {
        try {
          await screenTimeInfo.finalizeWorkSession();
        } catch (fErr) {
          console.warn('finalizeWorkSession error:', fErr);
        }
      }

      // Update offlineDb.dailyScreenTimes to FINALIZED
      if (offlineDb.dailyScreenTimes) {
        try {
          const screenTimeId = `st_${officerId}_${todayStr}`;
          await offlineDb.dailyScreenTimes.put({
            id: screenTimeId,
            officerId,
            date: todayStr,
            totalEligibleSeconds: finalScreenTime,
            status: 'FINALIZED',
            finalizedAt: submittedAt,
            lastActivityAt: submittedAt,
            syncStatus: 'PENDING',
          });
        } catch (stPutErr) {
          console.warn('dailyScreenTimes put error:', stPutErr);
        }
      }

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

      const reportId = todayReport?.id || generateReportId();

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
      await offlineDb.dailyWorkReports.put(reportPayload as any);
      window.dispatchEvent(new CustomEvent('daily-report-submitted', { detail: reportPayload }));

      // Clear any pending daily report reminder notification
      try {
        const reminderId = `alert_report_${todayStr}_${user?.id}`;
        if (offlineDb.notifications) {
          await offlineDb.notifications.update(reminderId, { isRead: true });
        }
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('notifications-updated'));

      // Step 4: Record in local Activity Log
      await ActivityLogger.log(
        'DAILY_REPORT_SUBMITTED',
        `Daily work report submitted for ${todayStr} (Citizens: ${localCitizenCount}, Screen time: ${formatTime(finalScreenTime)})`,
        {
          officerId: user?.id || user?.employeeId || 'officer',
          officerName: user?.fullName || user?.name || 'Field Officer',
          woredaName: user?.woreda?.name || user?.region,
          relatedRecordId: reportId,
          metadata: {
            reportId,
            isUrgent: reportPayload.isUrgent,
            screenTimeSeconds: finalScreenTime,
            citizensCount: localCitizenCount,
          },
        }
      );

      // Step 5: Enqueue into offline sync queue
      await offlineDb.syncQueue.put({
        id: generateId('syn'),
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
      setTodayScreenTimeSecs(0);
      setLocalCitizenCount(0);
      setTodaySessionCount(finalSessions);

      // Clear the inputted data from the fields after the report is submitted
      setForm({
        summary: '',
        achievements: '',
        challenges: '',
        resources: '',
        nextDayPlan: '',
        isUrgent: false,
        urgentReason: '',
      });

      if (isSyncedServer) {
        toast.success('Daily Work Report submitted & synchronized with Central Database!');
      } else {
        toast.success('Daily Work Report locked & saved locally — pending sync');
      }

      if (addNotification) {
        addNotification({
          title: todayReport ? 'Daily Report Updated' : 'Daily Report Submitted & Finalized',
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
    if (selectedOfficerId) {
      result = result.filter((r) => r.officerId === selectedOfficerId);
    }
    return result;
  }, [teamReports, selectedDate, selectedOfficerId]);

  // Aggregate stats for Supervisor/Manager
  const supervisorStats = useMemo(() => {
    const totalReports = filteredTeamReports.length;
    const totalCitizens = filteredTeamReports.reduce((sum, r) => sum + (r.citizenCountLocal || 0), 0);
    const totalSecs = filteredTeamReports.reduce((sum, r) => sum + (r.screenTimeSeconds || 0), 0);

    return {
      totalReports,
      totalCitizens,
      totalScreenTimeFormatted: formatTime(totalSecs),
    };
  }, [filteredTeamReports]);

  // RENDER: SUPERVISOR & MANAGER CONSOLE
  if (isSupervisor || isManager) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                {userT(isManager ? 'Organization Daily Work Reports' : 'Team Daily Work Reports & Review')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {userT(isManager
                  ? 'Central oversight of all field officer submissions, screen-time telemetry & operational roadblocks'
                  : 'Review submitted daily field deliverables, verify screen-time, and monitor team roadblocks')}
              </p>
            </div>
          </div>

        </div>

        {/* Filter Controls */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
            </div>

            <button
              type="button"
              onClick={() => setSelectedDate('')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                !selectedDate
                  ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 dark:hover:border-blue-400 dark:hover:text-white'
              }`}
            >
              {userT('All Dates')}
            </button>

            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                selectedDate === todayStr
                  ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 dark:hover:border-blue-400 dark:hover:text-white'
              }`}
            >
              {userT('Today')}
            </button>
          </div>

          <div className="w-full md:w-64">
            <select
              value={selectedOfficerId}
              onChange={(e) => setSelectedOfficerId(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            >
              <option value="">{userT('Filter by Officer (All Officers)')}</option>
              {officersList.map((off) => (
                <option key={off.id} value={off.id}>
                  {off.name}
                </option>
              ))}
            </select>
          </div>
        </div>        {/* Reports Table Card */}
        <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs">
          <CardHeader className="border-b border-slate-100 dark:border-slate-700/60 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  {userT('Field Officer Submissions')}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {userT(`Showing ${filteredTeamReports.length} reports submitted by field teams`)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-400">{userT('Loading daily reports...')}</div>
            ) : filteredTeamReports.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                {userT('No daily reports match the current filters.')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">{userT('Field Officer')}</th>
                      <th className="py-3.5 px-4">{userT('Date')}</th>
                      <th className="py-3.5 px-4">{userT('Location')}</th>
                      <th className="py-3.5 px-4">{userT('Citizens')}</th>
                      <th className="py-3.5 px-4">{userT('Screen Time')}</th>
                      <th className="py-3.5 px-4 text-center">
                        <span className="block leading-tight text-slate-500 dark:text-slate-400 font-bold tracking-wider text-[10px] uppercase">
                          {userT('Sync')}<br />{userT('Status')}
                        </span>
                      </th>
                      <th className="py-3.5 px-4 text-center">
                        <span className="block leading-tight text-slate-500 dark:text-slate-400 font-bold tracking-wider text-[10px] uppercase">
                          {userT('Action')}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredTeamReports.map((report) => {
                      return (
                        <tr
                          key={report.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          {/* Field Officer */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {(report.officerName || 'O').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 dark:text-white truncate">
                                  {report.officerName || 'Field Officer'}
                                </div>
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                                  {report.employeeId ? `ID: ${report.employeeId}` : report.officerEmail || 'Field Team'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                              {report.reportDate}
                            </span>
                          </td>

                          {/* Location */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{report.officerWoreda || report.woreda || report.region || 'Assigned Site'}</span>
                            </div>
                          </td>

                          {/* Citizens Registered */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                              {report.citizenCountLocal}
                            </span>
                          </td>

                          {/* Screen Time */}
                          <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#2563EB] dark:text-blue-400">
                            {report.screenTimeFormatted || formatTime(report.screenTimeSeconds)}
                          </td>

                          {/* Sync Status */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {report.syncStatus === 'SYNCED' ? (
                              <span className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#ecfdf5] dark:bg-emerald-950/60 text-[#065f46] dark:text-emerald-300 border border-[#a7f3d0] dark:border-emerald-700 shadow-2xs">
                                {userT('Synced')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs">
                                {userT('Pending')}
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setInspectModalReport(report)}
                              className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-xs transition-colors cursor-pointer"
                            >
                              {userT('Details')}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                  {/* Telemetry Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Citizens Registered</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{inspectModalReport.citizenCountLocal} Citizens</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Screen Time</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {inspectModalReport.screenTimeFormatted || formatTime(inspectModalReport.screenTimeSeconds)}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Sync Status</span>
                      <div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {inspectModalReport.syncStatus === 'SYNCED' ? 'Synced with Central DB' : 'Saved Locally'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section 1: Executive Work Narrative */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <h4 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-xs">
                      Work Summary & Narrative
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{details.summary}</p>
                  </div>

                  {/* Section 2: Key Achievements */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <h4 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-xs">
                      Key Achievements & Milestones
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{details.achievements}</p>
                  </div>

                  {/* Section 3: Roadblocks & Challenges */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <h4 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-xs">
                      Roadblocks & Field Challenges
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{details.challenges}</p>
                  </div>

                  {/* Section 4: Resources Used & Needed */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <h4 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-xs">
                      Resources Used & Needed for Next Shift
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{details.resources}</p>
                  </div>

                  {/* Section 5: Tomorrow's Priorities */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <h4 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-xs">
                      Tomorrow's Strategy & Target Kebeles
                    </h4>
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

  // RENDER: FIELD OFFICER SUBMISSION CONSOLE
  return (
    <div className="space-y-5">
      {/* 1. Consolidated Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight">
              {userT("Today's Report")} — {todayStr}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
            {userT('Official daily operational summary, citizen totals, and screen-time telemetry submission')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {setActiveTab && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setActiveTab('my_reports')}
              className="h-10 px-4 rounded-xl border-[#E2E8F0] dark:border-slate-700 text-[#2563EB] dark:text-blue-400 font-bold text-sm dark:hover:bg-[#0F172A]"
            >
              <FileText className="w-4 h-4 mr-2" />
              {userT('View My Reports')}
            </Button>
          )}
        </div>
      </div>

      {/* 2. Compact Overview & Metadata Bar (Top Deck Ribbon: 4-Column Unified Block) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 shadow-xs overflow-hidden grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
        {/* Metric 1: Citizens Registered */}
        <div className="p-3.5 sm:p-4">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {userT('Citizens Registered')}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono leading-none">
              {todayReport && !screenTimeInfo?.isSessionActive ? 0 : localCitizenCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{userT('Today')}</span>
          </div>
        </div>

        {/* Metric 2: Screen Time Telemetry */}
        <div className="p-3.5 sm:p-4">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {todayReport && !screenTimeInfo?.isSessionActive
              ? userT('Finalized Screen Time')
              : userT('Recorded Screen Time')}
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono leading-none block">
            {todayReport && !screenTimeInfo?.isSessionActive
              ? '00:00:00'
              : (screenTimeInfo?.screenTimeDisplay || formatTime(screenTimeInfo?.screenTimeCounter || todayScreenTimeSecs || 0))}
          </span>
        </div>

        {/* Metric 3: Reporting Officer */}
        <div className="p-3.5 sm:p-4">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {userT('Reporting Officer')}
          </span>
          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate block leading-snug">
            {user?.fullName || user?.name || user?.email || userT('Field Staff')}
          </span>
          {user?.employeeId && (
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              ({user.employeeId})
            </span>
          )}
        </div>

        {/* Metric 4: Report Date */}
        <div className="p-3.5 sm:p-4">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {userT('Report Date')}
          </span>
          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block leading-snug font-mono">
            {todayStr}
          </span>
        </div>
      </div>

      {/* 3. Balanced Two-Column Form Grid (Main Content Area) */}
      <form onSubmit={handleSubmitReport} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Primary Column (Left, 6 Columns) */}
        <div className="lg:col-span-6 space-y-5">
          {/* Card 1: Core Daily Deliverables & Roadblocks */}
          <Card className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="p-5 border-b border-[#E2E8F0] dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                  {userT('Daily Work & Field Observations')}
                </h3>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="dailyWorkNarrative"
                    className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-200 block"
                  >
                    {userT('Daily Work Narrative & Completed Deliverables')} <span className="text-rose-500 font-bold">*</span>
                  </label>
                </div>
                <Textarea
                  id="dailyWorkNarrative"
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  rows={4}
                  required
                  placeholder={userT("Enter details of today's citizen intake, site visits, and completed registrations...")}
                  className="w-full text-sm leading-relaxed"
                />
              </div>

              <div>
                <label
                  htmlFor="roadblocksInput"
                  className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-200 block mb-1.5"
                >
                  {userT('Roadblocks & Operational Challenges')}
                </label>
                <Textarea
                  id="roadblocksInput"
                  value={form.challenges}
                  onChange={(e) => setForm({ ...form, challenges: e.target.value })}
                  rows={4}
                  placeholder={userT('Describe any field obstacles, network issues, or equipment challenges...')}
                  className="w-full text-sm leading-relaxed"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Column (Right, 6 Columns) */}
        <div className="lg:col-span-6 space-y-5">
          {/* Card 3: Shift Logistics & Planning Stack */}
          <Card className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="p-5 border-b border-[#E2E8F0] dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                  {userT('Shift Logistics & Next Steps')}
                </h3>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <label
                  htmlFor="resourcesInput"
                  className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-200 block mb-1.5"
                >
                  {userT('Resources Used & Logistics Needed')}
                </label>
                <Textarea
                  id="resourcesInput"
                  value={form.resources}
                  onChange={(e) => setForm({ ...form, resources: e.target.value })}
                  rows={4}
                  placeholder={userT('Biometric kits, tablets, vehicle/fuel, battery packs...')}
                  className="w-full text-sm leading-relaxed"
                />
              </div>

              <div>
                <label
                  htmlFor="nextDayPlanInput"
                  className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-200 block mb-1.5"
                >
                  {userT("Tomorrow's Priorities & Target Kebeles")}
                </label>
                <Textarea
                  id="nextDayPlanInput"
                  value={form.nextDayPlan}
                  onChange={(e) => setForm({ ...form, nextDayPlan: e.target.value })}
                  rows={4}
                  placeholder={userT('Target kebeles, prioritized registration sites for next shift...')}
                  className="w-full text-sm leading-relaxed"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Submission Action Panel */}
          <Card className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-2xl shadow-xs p-5">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              className="w-full text-base font-bold py-3.5 rounded-xl shadow-md shadow-blue-600/20"
            >
              <Send className="w-5 h-5 mr-2" />
              {userT('Submit Daily Report')}
            </Button>
          </Card>
        </div>
      </form>
    </div>
  );
}
