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
  Activity, MapPin, Eye, Phone, Mail, Check, UserCog, Database, History
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

  // Chart: Geographic Distribution (by Region)
  const geographicData = useMemo(() => {
    const map = {};
    const normalizeRegion = (raw) => {
      if (!raw) return 'Addis Ababa';
      const clean = raw.trim();
      const lower = clean.toLowerCase();
      if (lower === 'north') return 'Amhara';
      if (lower === 'south') return 'Sidama';
      if (lower === 'east') return 'Somali';
      if (lower === 'west') return 'Oromia';
      if (lower === 'central') return 'Addis Ababa';
      return clean;
    };
    (citizens || []).forEach(c => {
      const reg = normalizeRegion(c.region || c.regionName);
      map[reg] = (map[reg] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [citizens]);

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

  // Chart: Supervisor Zonal Registration Performance
  const supervisorZonePerformanceData = useMemo(() => {
    const supervisors = (users || []).filter(u => u.role === 'supervisor' || u.role === 'SUPERVISOR');

    const list = supervisors.map(sup => {
      const supName = sup.fullName || sup.name || 'Supervisor';
      const zoneName = sup.zone || sup.zoneName || sup.region || 'Assigned Zone';

      // Officers assigned to this supervisor
      const assignedOfficers = (users || []).filter(u =>
        (u.role === 'field_officer' || u.role === 'FIELD_OFFICER') &&
        (u.supervisorId === sup.id || u.supervisor === sup.id || u.supervisor === sup.name || (sup.zone && u.zone === sup.zone))
      );
      const officerIds = new Set(assignedOfficers.map(u => u.id));

      // Count registrations
      const registrationCount = (citizens || []).filter(c => {
        const byOfficer = c.registeredById || c.registeredBy;
        if (byOfficer && (byOfficer === sup.id || officerIds.has(byOfficer))) {
          return true;
        }
        if (sup.zone && (c.zone === sup.zone || c.zoneName === sup.zone || c.zoneId === sup.zoneId)) {
          return true;
        }
        return false;
      }).length;

      return {
        id: sup.id,
        name: supName,
        zone: zoneName,
        displayName: `${supName} (${zoneName})`,
        registrations: registrationCount,
        officers: assignedOfficers.length,
      };
    });

    // Fallback if no supervisors exist in local dataset
    if (list.length === 0) {
      const zoneMap = {};
      (citizens || []).forEach(c => {
        const z = c.zone || c.zoneName || c.woreda || 'Central Zone';
        zoneMap[z] = (zoneMap[z] || 0) + 1;
      });
      return Object.entries(zoneMap).map(([zone, count], idx) => ({
        id: `sup-${idx}`,
        name: `Supervisor ${idx + 1}`,
        zone: zone,
        displayName: `Supervisor ${idx + 1} (${zone})`,
        registrations: count,
        officers: 3,
      }));
    }

    return list.sort((a, b) => b.registrations - a.registrations);
  }, [users, citizens]);

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


      {/* ============================================================
          MANAGER DASHBOARD OVERVIEW: CARDS FROM ALL SIDEBAR TABS
         ============================================================ */}
      {isManager && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Operations & System Overview
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time operational metrics across all organizational divisions
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* 1. User Management (from 'users' sidebar tab) */}
            <div onClick={() => setActiveTab && setActiveTab('users')} className="cursor-pointer">
              <StatCard
                title="User Management"
                value={users.length}
                subtitle={`${users.filter(u => u.status === 'active' || u.isActive).length} active staff accounts`}
                icon={UserCog}
                iconColor="text-blue-700 dark:text-blue-400"
                iconBg="bg-blue-50 dark:bg-blue-950/80"
                badge={`${users.filter(u => u.role === 'field_officer' || u.role === 'FIELD_OFFICER').length} Officers`}
                badgeColor="bg-blue-50 text-blue-700 border-blue-200"
              />
            </div>

            {/* 2. Registered Citizens (from 'citizens' sidebar tab) */}
            <div onClick={() => setActiveTab && setActiveTab('citizens')} className="cursor-pointer">
              <StatCard
                title="Registered Citizens"
                value={totalCitizens}
                subtitle={`${todayCitizens} registered today`}
                icon={Database}
                iconColor="text-emerald-700 dark:text-emerald-400"
                iconBg="bg-emerald-50 dark:bg-emerald-950/80"
                badge={`${syncedCitizens} Synced`}
                badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200"
              />
            </div>

            {/* 3. Field Officers (from 'team' sidebar tab) */}
            <div onClick={() => setActiveTab && setActiveTab('team')} className="cursor-pointer">
              <StatCard
                title="Field Officers"
                value={users.filter(u => u.role === 'field_officer' || u.role === 'FIELD_OFFICER').length}
                subtitle={`${users.filter(u => u.role === 'supervisor' || u.role === 'SUPERVISOR').length} supervisors across all zones`}
                icon={Users}
                iconColor="text-purple-700 dark:text-purple-400"
                iconBg="bg-purple-50 dark:bg-purple-950/80"
                badge="Active Staff"
                badgeColor="bg-purple-50 text-purple-700 border-purple-200"
              />
            </div>

            {/* 4. All Daily Reports (from 'all_reports' sidebar tab) */}
            <div onClick={() => setActiveTab && setActiveTab('all_reports')} className="cursor-pointer">
              <StatCard
                title="Daily Work Reports"
                value={reportsToday}
                subtitle={`${reports.length} total reports filed`}
                icon={FileText}
                iconColor="text-indigo-700 dark:text-indigo-400"
                iconBg="bg-indigo-50 dark:bg-indigo-950/80"
                badge={`${complianceRate}% Compliance`}
                badgeColor={complianceRate === 100 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}
              />
            </div>

            {/* 5. System Sync Health (from 'sync_center' sidebar tab) */}
            <div onClick={() => setActiveTab && setActiveTab('sync_center')} className="cursor-pointer">
              <StatCard
                title="System Sync Health"
                value={pendingCitizens === 0 ? '100%' : `${pendingCitizens} Pending`}
                subtitle={`${syncedCitizens} records synchronized`}
                icon={RefreshCw}
                iconColor="text-sky-700 dark:text-sky-400"
                iconBg="bg-sky-50 dark:bg-sky-950/80"
                badge={pendingCitizens === 0 ? "Synced" : "Sync Queue"}
                badgeColor={pendingCitizens === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}
              />
            </div>

            {/* 6. Analysis & Detail (from 'analytics' sidebar tab) */}
            <div onClick={() => setActiveTab && setActiveTab('analytics')} className="cursor-pointer">
              <StatCard
                title="Analysis & Detail"
                value={totalCitizens > 0 ? `${Math.round((todayCitizens / (totalCitizens || 1)) * 100)}% Pace` : '0%'}
                subtitle="Demographic & regional analytics"
                icon={BarChart3}
                iconColor="text-amber-700 dark:text-amber-400"
                iconBg="bg-amber-50 dark:bg-amber-950/80"
                badge="Telemetry"
                badgeColor="bg-amber-50 text-amber-700 border-amber-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          SUPERVISOR KPI STAT CARDS
         ============================================================ */}
      {isSupervisor && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
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
            title="Daily Report Compliance"
            value={`${complianceRate}%`}
            subtitle={`${reportsToday} of ${totalStaff} submitted today`}
            icon={FileText}
            iconColor="text-indigo-700"
            iconBg="bg-indigo-50"
            badge={complianceRate === 100 ? '100% Complete' : 'In Progress'}
            badgeColor={complianceRate === 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}
          />

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
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className="w-full h-14 sm:h-16 px-5 sm:px-6 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white font-extrabold text-sm sm:text-base flex items-center justify-between shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group border border-blue-600/30"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <span className="tracking-tight">Register Citizen</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform shrink-0">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('report_new')}
                className="w-full h-14 sm:h-16 px-5 sm:px-6 rounded-2xl bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-[#233044] active:scale-[0.99] text-slate-900 dark:text-[#F8FAFC] font-extrabold text-sm sm:text-base flex items-center justify-between border border-slate-200 dark:border-[#334155] shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA] border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shrink-0">
                    <FilePlus2 className="w-5 h-5" />
                  </div>
                  <span className="tracking-tight">Submit Daily Report</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#0F172A] text-slate-400 group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] group-hover:bg-blue-50 dark:group-hover:bg-blue-950/50 flex items-center justify-center group-hover:translate-x-1 transition-all shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          )}

          {/* Officer Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="My Registrations"
              value={totalCitizens}
              subtitle={`${todayCitizens} registered today`}
              icon={Users}
              iconColor="text-blue-700"
              iconBg="bg-blue-50"
            />
            <StatCard
              title="Today's Report Status"
              value={reportsToday > 0 ? 'SUBMITTED' : 'PENDING'}
              subtitle={reportsToday > 0 ? 'Daily report submitted' : 'Pending submission'}
              icon={FileText}
              iconColor="text-indigo-700"
              iconBg="bg-indigo-50"
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
          title="Geographic Distribution by Region"
          subtitle="Citizen registration density across administrative regions"
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
          MANAGER VIEW: SUPERVISOR ZONAL REGISTRATION PERFORMANCE CHART
         ============================================================ */}
      {isManager && (
        <Card className="bg-white dark:bg-[#1E293B] border border-slate-200/90 dark:border-[#334155] shadow-xs">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Supervisor Registration Performance by Assigned Zone
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Comparative citizen intake volume across zonal jurisdictions and supervisory units
              </CardDescription>
            </div>
            {setActiveTab && (
              <Button
                variant="outline"
                size="xs"
                onClick={() => setActiveTab('team')}
                className="text-xs self-start sm:self-auto"
              >
                Inspect Supervisors & Zones
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-2">
            {supervisorZonePerformanceData.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400 dark:text-slate-500">
                No supervisor zonal registration data available
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 dark:bg-[#0F172A] p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Top Performing Zone</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                      {supervisorZonePerformanceData[0]?.zone || '—'}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {supervisorZonePerformanceData[0]?.name} ({supervisorZonePerformanceData[0]?.registrations} records)
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#0F172A] p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Supervisors</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {supervisorZonePerformanceData.length} Supervisors
                    </p>
                    <p className="text-xs text-slate-400">Across all operational zones</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1 bg-slate-50 dark:bg-[#0F172A] p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Zonal Intake</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {supervisorZonePerformanceData.reduce((sum, s) => sum + s.registrations, 0)} Registrations
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">All assigned territories</p>
                  </div>
                </div>

                {/* Recharts Bar Chart */}
                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={supervisorZonePerformanceData}
                      margin={{ top: 10, right: 15, left: -10, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                      <XAxis
                        dataKey="displayName"
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        tickLine={false}
                        axisLine={{ stroke: '#E2E8F0' }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white dark:bg-[#1E293B] p-3 rounded-xl border border-slate-200 dark:border-[#334155] shadow-lg text-xs">
                                <p className="font-bold text-slate-900 dark:text-white">{data.name}</p>
                                <p className="text-slate-500 dark:text-slate-400 text-[11px] mb-1.5">Zone: <span className="font-medium text-slate-700 dark:text-slate-200">{data.zone}</span></p>
                                <div className="space-y-0.5 border-t border-slate-100 dark:border-slate-800 pt-1.5">
                                  <p className="flex justify-between gap-4 text-blue-600 dark:text-blue-400 font-bold">
                                    <span>Registrations:</span>
                                    <span>{data.registrations}</span>
                                  </p>
                                  <p className="flex justify-between gap-4 text-slate-500 dark:text-slate-400">
                                    <span>Field Officers:</span>
                                    <span>{data.officers}</span>
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="registrations"
                        name="Registrations"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={55}
                      >
                        {supervisorZonePerformanceData.map((_entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============================================================
          SUPERVISOR VIEW: FIELD OFFICER PERFORMANCE & LEADERBOARD
         ============================================================ */}
      {isSupervisor && (
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
                            Detail
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