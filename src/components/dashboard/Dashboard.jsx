// src/components/dashboard/Dashboard.jsx
// Enterprise Real-Time Monitoring & Telemetry Dashboard for FieldSync (Phase 9)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import {
  FileText, Users, UserCheck, CalendarCheck, Calendar, Clock,
  TrendingUp, CheckCircle2, Award, ShieldCheck, AlertCircle,
  UserPlus, FilePlus2, BarChart3, Radio, ArrowRight, ShieldAlert,
  Percent, Sparkles, RefreshCw, AlertTriangle, ChevronRight,
  Activity, MapPin, Eye, Phone, Mail, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

import { API_BASE } from '../../config/api';
import { offlineDb } from '../../db/offlineDb';
import { getToday } from '../../utils/helpers';
import VerificationPopup from '../verification/VerificationPopup';
import { useVerification } from '../../hooks/useVerification';
import StatCard from '../ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

// Enterprise Palette
const CHART_COLORS = ['#1E3A8A', '#0D9488', '#6366F1', '#D97706', '#16A34A', '#2563EB'];
const GENDER_COLORS = { 'MALE': '#1E3A8A', 'FEMALE': '#EC4899', 'OTHER': '#8B5CF6' };

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-[#1E293B] p-3 rounded-xl border border-slate-200 dark:border-[#334155] shadow-modal text-xs font-sans text-slate-800 dark:text-[#F8FAFC]">
        <p className="font-semibold text-slate-900 dark:text-white mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="flex items-center gap-1.5 py-0.5" style={{ color: entry.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="font-medium text-slate-600 dark:text-slate-300">{entry.name}:</span>
            <span className="font-bold text-slate-900 dark:text-white">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ChartWrapper = ({ children, title, subtitle, rightElement }) => (
  <Card className="h-full flex flex-col">
    <CardHeader className="flex flex-row items-center justify-between">
      <div>
        <CardTitle>{title}</CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </div>
      {rightElement}
    </CardHeader>
    <CardContent className="flex-1 min-h-[260px]">
      {children}
    </CardContent>
  </Card>
);

export default function Dashboard({
  isManager,
  isSupervisor,
  isOfficer,
  user,
  reports = [],
  users = [],
  attendance = [],
  leaves = [],
  permissions = [],
  citizens = [],
  teamMembers = [],
  liveStatus,
  setActiveTab
}) {
  // ===== VERIFICATION (Officer Only) =====
  const {
    showPopup,
    verificationScore,
    handleAnswer,
    handleClose,
    lastVerified
  } = useVerification(isOfficer ? user?.id : null, isOfficer ? user?.name : null);

  // ===== LIVE TELEMETRY STATE =====
  const [telemetryData, setTelemetryData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [isLiveConnected, setIsLiveConnected] = useState(true);

  // ===== OFFICER DRILLDOWN MODAL STATE =====
  const [selectedOfficerId, setSelectedOfficerId] = useState(null);
  const [officerDetail, setOfficerDetail] = useState(null);
  const [isLoadingOfficer, setIsLoadingOfficer] = useState(false);

  // Fetch overview telemetry from backend API with Dexie fallback
  const fetchTelemetryOverview = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    const token = localStorage.getItem('fieldsync_token');

    try {
      if (token) {
        const res = await fetch(`${API_BASE}/analytics/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setTelemetryData(json.data);
            setIsLiveConnected(true);
            setLastRefreshed(new Date());
            if (isManual) toast.success('Telemetry dashboard refreshed');
            setIsRefreshing(false);
            return;
          }
        }
      }
      throw new Error('Server unreachable or unauthorized');
    } catch (err) {
      console.warn('Analytics API unreachable, computing offline fallback from IndexedDB:', err.message);
      setIsLiveConnected(false);
      setLastRefreshed(new Date());

      // Dexie Offline Fallback
      try {
        const localCitizens = await offlineDb.citizens.toArray();
        const localReports = await offlineDb.dailyWorkReports.toArray();
        const localSessions = await offlineDb.workSessions.toArray();
        const localLogs = await offlineDb.activityLogs.reverse().limit(10).toArray();

        const todayStr = getToday();
        const todayRegs = localCitizens.filter(c => (c.registrationTimestamp || '').slice(0, 10) === todayStr).length;
        const syncedRegs = localCitizens.filter(c => c.syncStatus === 'SYNCED').length;
        const pendingRegs = localCitizens.filter(c => c.syncStatus !== 'SYNCED').length;

        const totalScreenSecs = localSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
        const todayScreenSecs = localSessions
          .filter(s => s.reportDate === todayStr)
          .reduce((sum, s) => sum + (s.durationSeconds || 0), 0);

        const formatSecs = (secs) => {
          const h = Math.floor(secs / 3600);
          const m = Math.floor((secs % 3600) / 60);
          const s = secs % 60;
          return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };

        const todayReports = localReports.filter(r => r.reportDate === todayStr);

        setTelemetryData({
          citizens: {
            total: localCitizens.length,
            today: todayRegs,
            thisWeek: localCitizens.length,
            synced: syncedRegs,
            pending: pendingRegs,
            genderDistribution: [
              { gender: 'MALE', count: localCitizens.filter(c => c.gender === 'MALE').length },
              { gender: 'FEMALE', count: localCitizens.filter(c => c.gender === 'FEMALE').length }
            ],
            geographicDistribution: []
          },
          telemetry: {
            totalScreenTimeSeconds: totalScreenSecs,
            totalScreenTimeFormatted: formatSecs(totalScreenSecs),
            todayScreenTimeSeconds: todayScreenSecs,
            todayScreenTimeFormatted: formatSecs(todayScreenSecs),
            todaySessionsCount: localSessions.filter(s => s.reportDate === todayStr).length,
            totalSessionsCount: localSessions.length,
          },
          compliance: {
            reportsSubmittedToday: todayReports.length,
            totalAssignedStaff: 1,
            complianceRatePercentage: todayReports.length > 0 ? 100 : 0,
            urgentRoadblocksCount: 0,
            urgentRoadblocks: [],
          },
          duplicates: {
            pending: 0,
            confirmed: 0,
            approved: 0,
            total: 0
          },
          recentActivity: localLogs.map(l => ({
            id: l.id,
            eventType: l.eventType,
            description: l.description,
            officerName: 'Field Officer',
            deviceTimestamp: l.deviceTimestamp,
            syncStatus: l.syncStatus
          })),
          serverTimestamp: new Date().toISOString()
        });
      } catch (dbErr) {
        console.error('Dexie fallback failed:', dbErr);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Polling on mount
  useEffect(() => {
    fetchTelemetryOverview(false);
    const interval = setInterval(() => {
      fetchTelemetryOverview(false);
    }, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [fetchTelemetryOverview]);

  // Fetch individual officer drilldown
  const handleOpenOfficerDrilldown = async (officerId) => {
    setSelectedOfficerId(officerId);
    setOfficerDetail(null);
    setIsLoadingOfficer(true);
    const token = localStorage.getItem('fieldsync_token');

    try {
      if (token) {
        const res = await fetch(`${API_BASE}/analytics/officer/${officerId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setOfficerDetail(json.data);
            setIsLoadingOfficer(false);
            return;
          }
        }
      }
      throw new Error('Unable to fetch officer drilldown');
    } catch (e) {
      console.warn('Officer drilldown fallback:', e);
      // Fallback from passed props
      const foundUser = (users || []).find(u => u.id === officerId || u.employeeId === officerId);
      const officerCitizens = (citizens || []).filter(c => c.registeredById === officerId || c.registeredBy === officerId);
      const officerReports = (reports || []).filter(r => r.officerId === officerId || r.employeeId === officerId);

      setOfficerDetail({
        officer: {
          id: officerId,
          fullName: foundUser?.name || foundUser?.fullName || 'Field Officer',
          email: foundUser?.email || '',
          phoneNumber: foundUser?.phone || foundUser?.phoneNumber || '',
          woredaName: foundUser?.woreda || 'Assigned Territory',
          kebeleName: foundUser?.kebele || '',
          supervisorName: 'Supervisor'
        },
        metrics: {
          citizensRegistered: officerCitizens.length,
          totalSessions: 1,
          totalScreenTimeSeconds: 0,
          totalScreenTimeFormatted: '00:00:00',
          reportsCount: officerReports.length,
        },
        recentReports: officerReports.slice(0, 5).map(r => ({
          id: r.id,
          reportDate: r.reportDate || getToday(),
          citizenCountLocal: r.registrationsCount || 0,
          citizenCountServerConfirmed: r.registrationsCount || 0,
          screenTimeSeconds: 0,
          screenTimeFormatted: '00:00:00',
          syncStatus: r.synced ? 'SYNCED' : 'PENDING'
        }))
      });
    } finally {
      setIsLoadingOfficer(false);
    }
  };

  // ============================================================
  // COMPUTED TELEMETRY & DISPLAY DERIVATIONS
  // ============================================================

  // Key metrics
  const totalCitizens = telemetryData?.citizens?.total ?? citizens.length;
  const todayCitizens = telemetryData?.citizens?.today ?? 0;
  const syncedCitizens = telemetryData?.citizens?.synced ?? citizens.filter(c => c.synced).length;
  const pendingCitizens = telemetryData?.citizens?.pending ?? citizens.filter(c => !c.synced).length;

  const todayScreenTimeFormatted = telemetryData?.telemetry?.todayScreenTimeFormatted || '00:00:00';
  const totalScreenTimeFormatted = telemetryData?.telemetry?.totalScreenTimeFormatted || '00:00:00';
  const totalSessionsCount = telemetryData?.telemetry?.totalSessionsCount || 0;

  const complianceRate = telemetryData?.compliance?.complianceRatePercentage ?? 100;
  const reportsToday = telemetryData?.compliance?.reportsSubmittedToday ?? 0;
  const totalStaff = telemetryData?.compliance?.totalAssignedStaff ?? (teamMembers.length || 1);

  const urgentRoadblocks = telemetryData?.compliance?.urgentRoadblocks || [];
  const pendingDuplicates = telemetryData?.duplicates?.pending ?? 0;

  const recentActivityStream = telemetryData?.recentActivity || [];

  // Chart: 7-Day Trend
  const registrationTrendData = useMemo(() => {
    const today = new Date();
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = (citizens || []).filter(c => (c.registrationDate || c.registrationTimestamp || '').slice(0, 10) === dateStr).length;
      data.push({ date: dateStr.slice(5), fullDate: dateStr, value: count });
    }
    return data;
  }, [citizens]);

  // Chart: Geographic Distribution (Woredas)
  const geographicData = useMemo(() => {
    if (telemetryData?.citizens?.geographicDistribution?.length > 0) {
      return telemetryData.citizens.geographicDistribution.map(g => ({
        name: g.woredaName,
        count: g.count
      }));
    }
    // Fallback from citizens prop
    const map = {};
    (citizens || []).forEach(c => {
      const w = c.woreda || c.woredaName || 'Bole Sub-City';
      map[w] = (map[w] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [telemetryData, citizens]);

  // Chart: Gender Breakdown
  const genderData = useMemo(() => {
    if (telemetryData?.citizens?.genderDistribution?.length > 0) {
      return telemetryData.citizens.genderDistribution.map(g => ({
        name: g.gender,
        value: g.count
      }));
    }
    const male = (citizens || []).filter(c => (c.gender || '').toUpperCase() === 'MALE').length;
    const female = (citizens || []).filter(c => (c.gender || '').toUpperCase() === 'FEMALE').length;
    return [
      { name: 'MALE', value: male },
      { name: 'FEMALE', value: female }
    ].filter(d => d.value > 0);
  }, [telemetryData, citizens]);

  // Team Leaderboard
  const teamLeaderboard = useMemo(() => {
    const map = {};
    (users || []).filter(u => u.role === 'field_officer' || u.role === 'FIELD_OFFICER').forEach(u => {
      map[u.id] = {
        id: u.id,
        name: u.fullName || u.name || 'Field Officer',
        region: u.woreda || u.region || 'Territory',
        registrations: 0,
        reports: 0
      };
    });

    (citizens || []).forEach(c => {
      const officerId = c.registeredById || c.registeredBy;
      if (officerId && map[officerId]) {
        map[officerId].registrations += 1;
      }
    });

    (reports || []).forEach(r => {
      const officerId = r.officerId || r.employeeId;
      if (officerId && map[officerId]) {
        map[officerId].reports += 1;
      }
    });

    return Object.values(map)
      .sort((a, b) => b.registrations - a.registrations);
  }, [users, citizens, reports]);

  return (
    <div className="space-y-6">
      {/* Officer Security Verification Popup */}
      {isOfficer && showPopup && (
        <VerificationPopup
          officerId={user?.id}
          officerName={user?.name || user?.fullName}
          onAnswer={handleAnswer}
          onClose={handleClose}
        />
      )}

      {/* Top Banner: Status & Real-Time Sync Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#334155] shadow-2xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            {isManager && 'Executive Operations Dashboard'}
            {isSupervisor && 'Supervisor Real-Time Monitoring'}
            {isOfficer && 'Field Officer Operations Console'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isManager && 'Consolidated live telemetry across all regions, zones, and field officers'}
            {isSupervisor && 'Real-time telemetry and registration velocity for your assigned territory'}
            {isOfficer && 'Real-time tracking of personal registrations, reports, and screen-time telemetry'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Badge variant={isLiveConnected ? 'success' : 'warning'} dot>
            {isLiveConnected ? 'Live Server Telemetry' : 'Offline Local Cache'}
          </Badge>

          {lastRefreshed && (
            <span className="text-xs text-slate-400">
              Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTelemetryOverview(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ============================================================
          URGENT ROADBLOCKS ESCALATION BANNER (Supervisor & Manager)
         ============================================================ */}
      {(isManager || isSupervisor) && urgentRoadblocks.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 sm:p-5 shadow-xs animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
                  Urgent Roadblocks & Escalations Requiring Immediate Action
                  <span className="px-2 py-0.5 rounded-full text-xs bg-rose-200 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 font-bold">
                    {urgentRoadblocks.length}
                  </span>
                </h4>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                The following field officers flagged critical impediments in their daily reports today:
              </p>

              <div className="mt-3 space-y-2">
                {urgentRoadblocks.map((rb, idx) => (
                  <div key={idx} className="bg-white/90 dark:bg-[#1E293B] rounded-xl p-3 border border-rose-200/80 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{rb.officerName}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600 dark:text-slate-300 font-medium">{rb.woredaName}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-400">
                          {new Date(rb.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-rose-900 dark:text-rose-300 font-medium mt-1">
                        "{rb.reason}"
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleOpenOfficerDrilldown(rb.reportId)}
                        className="bg-white dark:bg-[#1E293B] hover:bg-rose-50 dark:hover:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                      >
                        Inspect Officer
                      </Button>
                      {setActiveTab && (
                        <Button
                          size="xs"
                          variant="primary"
                          onClick={() => setActiveTab(isManager ? 'all_reports' : 'reports')}
                          className="bg-rose-700 hover:bg-rose-800 text-white"
                        >
                          Review Report
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          EXECUTIVE / SUPERVISOR KPI STAT CARDS
         ============================================================ */}
      {(isManager || isSupervisor) && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
          <StatCard
            title="Registered Citizens"
            value={totalCitizens}
            subtitle={`${todayCitizens} registered today`}
            icon={Users}
            iconColor="text-blue-700"
            iconBg="bg-blue-50"
            badge={`${syncedCitizens} Synced`}
            badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200"
          />

          <StatCard
            title="Today's Screen Time"
            value={todayScreenTimeFormatted}
            subtitle={`Total: ${totalScreenTimeFormatted}`}
            icon={Clock}
            iconColor="text-teal-700"
            iconBg="bg-teal-50"
          />

          <StatCard
            title="Daily Report Compliance"
            value={`${complianceRate}%`}
            subtitle={`${reportsToday} of ${totalStaff} submitted today`}
            icon={FileText}
            iconColor="text-indigo-700"
            iconBg="bg-indigo-50"
            badge={complianceRate === 100 ? '100% Complete' : 'In Progress'}
            badgeColor={complianceRate === 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}
          />

          <StatCard
            title="Urgent Roadblocks"
            value={urgentRoadblocks.length}
            subtitle={urgentRoadblocks.length > 0 ? 'Requires attention' : 'All clear'}
            icon={AlertTriangle}
            iconColor={urgentRoadblocks.length > 0 ? 'text-rose-700' : 'text-slate-400'}
            iconBg={urgentRoadblocks.length > 0 ? 'bg-rose-50 dark:bg-rose-950/60' : 'bg-slate-50 dark:bg-slate-800'}
          />

          <div
            onClick={() => setActiveTab && setActiveTab('duplicates')}
            className="cursor-pointer"
          >
            <StatCard
              title="Duplicate Reviews"
              value={pendingDuplicates}
              subtitle="Pending adjudication"
              icon={ShieldCheck}
              iconColor="text-amber-700"
              iconBg="bg-amber-50"
              badge={pendingDuplicates > 0 ? 'Review Needed' : 'Clean'}
              badgeColor={pendingDuplicates > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}
            />
          </div>

          <div
            onClick={() => setActiveTab && setActiveTab('sync_center')}
            className="cursor-pointer"
          >
            <StatCard
              title="Sync Status"
              value={`${pendingCitizens === 0 ? '100%' : Math.round((syncedCitizens / (totalCitizens || 1)) * 100) + '%'}`}
              subtitle={`${pendingCitizens} pending sync`}
              icon={RefreshCw}
              iconColor="text-blue-700"
              iconBg="bg-blue-50"
            />
          </div>
        </div>
      )}

      {/* ============================================================
          FIELD OFFICER DASHBOARD VIEW
         ============================================================ */}
      {isOfficer && (
        <>
          {/* Quick Action Shortcuts */}
          {setActiveTab && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card
                hover
                onClick={() => setActiveTab('register')}
                className="p-5 cursor-pointer bg-gradient-to-r from-blue-900 to-blue-800 text-white border-0 shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-xs">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-base text-white">Register Citizen</h4>
                      <p className="text-xs text-blue-200 mt-0.5">Record offline citizen profile</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-blue-200 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>

              <Card
                hover
                onClick={() => setActiveTab('report_new')}
                className="p-5 cursor-pointer bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] shadow-subtle group hover:border-blue-300 dark:hover:border-blue-500"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#1E3A8A] dark:text-[#60A5FA] flex items-center justify-center">
                      <FilePlus2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-base text-slate-900 dark:text-white">Submit Daily Report</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Finalize screen time & submit work log</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 group-hover:text-[#1E3A8A] dark:group-hover:text-[#60A5FA] transition-all" />
                </div>
              </Card>
            </div>
          )}

          {/* Officer Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="My Registrations"
              value={totalCitizens}
              subtitle={`${todayCitizens} registered today`}
              icon={Users}
              iconColor="text-blue-700"
              iconBg="bg-blue-50"
            />
            <StatCard
              title="Today's Screen Time"
              value={todayScreenTimeFormatted}
              subtitle="Recorded on current shift"
              icon={Clock}
              iconColor="text-teal-700"
              iconBg="bg-teal-50"
            />
            <StatCard
              title="Today's Report Status"
              value={reportsToday > 0 ? 'SUBMITTED' : 'PENDING'}
              subtitle={reportsToday > 0 ? 'Daily report submitted' : 'Submission required by EOD'}
              icon={FileText}
              iconColor="text-indigo-700"
              iconBg="bg-indigo-50"
            />
            <StatCard
              title="Verification Score"
              value={`${verificationScore || 100}%`}
              subtitle="Device & security integrity"
              icon={ShieldCheck}
              iconColor="text-emerald-700"
              iconBg="bg-emerald-50"
            />
          </div>
        </>
      )}

      {/* ============================================================
          INTERACTIVE CHARTS & VISUAL TELEMETRY
         ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 7-Day Velocity Chart */}
        <ChartWrapper
          title="7-Day Registration Velocity"
          subtitle="Daily citizen registrations recorded and synchronized"
        >
          {registrationTrendData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No registration history recorded yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={registrationTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaVelocity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E3A8A" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip content={CustomTooltip} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Citizens"
                  stroke="#1E3A8A"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#areaVelocity)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartWrapper>

        {/* Geographic Distribution Chart */}
        <ChartWrapper
          title="Geographic Distribution by Woreda"
          subtitle="Citizen registration density across administrative woredas"
        >
          {geographicData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No geographic distribution data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={geographicData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip content={CustomTooltip} />
                <Bar dataKey="count" name="Citizens" fill="#0D9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartWrapper>
      </div>

      {/* ============================================================
          DEMOGRAPHICS & LIVE ACTIVITY STREAM
         ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Demographics / Gender Card */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Demographic Distribution</CardTitle>
            <CardDescription>Gender breakdown of registered citizens</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center items-center">
            {genderData.length === 0 ? (
              <div className="text-xs text-slate-400 py-10">No demographic data recorded</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {genderData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={GENDER_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex items-center justify-center gap-6 mt-2 text-xs">
                  {genderData.map((g, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: GENDER_COLORS[g.name] || CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="font-medium text-slate-700 capitalize">{g.name.toLowerCase()}:</span>
                      <span className="font-bold text-slate-900">{g.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Live Operational Activity Stream (2 Columns) */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Live Operational Activity Stream
              </CardTitle>
              <CardDescription>Real-time stream of field officer activities & telemetry</CardDescription>
            </div>
            {setActiveTab && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setActiveTab('activity_logs')}
                className="text-blue-700 hover:text-blue-800 text-xs flex items-center gap-1"
              >
                View Full Timeline
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            {recentActivityStream.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400 dark:text-slate-500">
                No recent activity events logged yet
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-[#334155] max-h-[300px] overflow-y-auto pr-1">
                {recentActivityStream.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/50 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">
                        {log.eventType?.slice(0, 3) || 'LOG'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">
                          {log.description}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{log.officerName}</span>
                          <span>·</span>
                          <span>
                            {new Date(log.deviceTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div>
                      <Badge variant={log.syncStatus === 'SYNCED' ? 'success' : 'warning'}>
                        {log.syncStatus === 'SYNCED' ? 'Synced' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============================================================
          OFFICER PERFORMANCE & LEADERBOARD (Supervisor & Manager)
         ============================================================ */}
      {(isManager || isSupervisor) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Field Officer Performance & Telemetry</CardTitle>
              <CardDescription>Click any field officer to inspect detailed individual telemetry</CardDescription>
            </div>
            {setActiveTab && (
              <Button
                variant="outline"
                size="xs"
                onClick={() => setActiveTab('team')}
                className="text-xs"
              >
                Manage Force
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {teamLeaderboard.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400 dark:text-slate-500">
                No officer performance records available
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-[#334155]">
                    <tr className="border-b border-slate-200 dark:border-[#334155] text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">
                      <th className="py-3.5 pl-6 pr-3">Rank</th>
                      <th className="py-3.5 px-4">Officer</th>
                      <th className="py-3.5 px-4">Woreda / Territory</th>
                      <th className="py-3.5 px-4 text-right">Registrations</th>
                      <th className="py-3.5 px-4 text-right">Reports</th>
                      <th className="py-3.5 pr-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                    {teamLeaderboard.map((emp, i) => (
                      <tr
                        key={emp.id}
                        onClick={() => handleOpenOfficerDrilldown(emp.id)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 pl-6 pr-3">
                          <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                            i === 0 ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-[#F8FAFC] group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                          {emp.name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{emp.region}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-[#F8FAFC] font-mono">{emp.registrations}</td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300 font-mono">{emp.reports}</td>
                        <td className="py-3.5 pr-6 text-right">
                          <Button
                            size="xs"
                            variant="ghost"
                            className="text-blue-700 dark:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 font-semibold"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============================================================
          OFFICER TELEMETRY DRILLDOWN MODAL
         ============================================================ */}
      <Modal
        isOpen={Boolean(selectedOfficerId)}
        onClose={() => {
          setSelectedOfficerId(null);
          setOfficerDetail(null);
        }}
        title="Field Officer Telemetry Drilldown"
        description="Comprehensive field operational performance and submission history"
        size="lg"
      >
        {isLoadingOfficer ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <p className="text-xs">Loading officer telemetry data...</p>
          </div>
        ) : officerDetail ? (
          <div className="space-y-5 py-2">
            {/* Officer Header Card */}
            <div className="p-4 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">{officerDetail.officer.fullName}</h4>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {officerDetail.officer.email}
                  </span>
                  {officerDetail.officer.phoneNumber && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {officerDetail.officer.phoneNumber}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {officerDetail.officer.woredaName || 'Territory'}
                  </span>
                </div>
              </div>

              <Badge variant="primary">
                Field Officer
              </Badge>
            </div>

            {/* Officer KPI Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-[#334155] shadow-2xs text-center">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Citizens Registered</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {officerDetail.metrics.citizensRegistered}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-[#334155] shadow-2xs text-center">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Screen Time</span>
                <span className="text-lg font-bold text-teal-700 dark:text-teal-400 mt-0.5 block">
                  {officerDetail.metrics.totalScreenTimeFormatted}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-[#334155] shadow-2xs text-center">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Reports Submitted</span>
                <span className="text-lg font-bold text-indigo-700 dark:text-indigo-400 mt-0.5 block">
                  {officerDetail.metrics.reportsCount}
                </span>
              </div>
            </div>

            {/* Officer Recent Reports Table */}
            <div>
              <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                Recent Daily Work Reports
              </h5>
              {(!officerDetail.recentReports || officerDetail.recentReports.length === 0) ? (
                <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-dashed border-slate-200 dark:border-[#334155]">
                  No daily work reports submitted yet
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-[#334155] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/90 dark:bg-[#0F172A] border-b border-slate-200 dark:border-[#334155] text-slate-600 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-right">Registrations</th>
                        <th className="py-2.5 px-3 text-right">Screen Time</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                      {officerDetail.recentReports.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-200">{r.reportDate}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                            {r.citizenCountServerConfirmed || r.citizenCountLocal}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300 font-mono">
                            {r.screenTimeFormatted}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Badge variant={r.syncStatus === 'SYNCED' ? 'success' : 'warning'}>
                              {r.syncStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedOfficerId(null);
                  setOfficerDetail(null);
                }}
              >
                Close Drilldown
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-400">
            Failed to load officer details.
          </div>
        )}
      </Modal>
    </div>
  );
}