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
import { getZonedTimeComponents } from '../../config/workingHours';
import StatCard from '../ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { translateText } from '../../services/translationEngine';
import { useUserLanguage } from '../../context/UserLanguageContext';

// Enterprise Palette
const CHART_COLORS = ['#1E3A8A', '#0D9488', '#6366F1', '#D97706', '#16A34A', '#2563EB'];
const GENDER_COLORS = { 'MALE': '#1E3A8A', 'FEMALE': '#EC4899', 'OTHER': '#8B5CF6' };

const CustomTooltip: any = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const fullDate = payload[0]?.payload?.fullDate;
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-modal text-xs font-sans text-slate-800 dark:text-[#F8FAFC]">
        <p className="font-semibold text-slate-900 dark:text-white mb-1">
          {fullDate ? `Date: ${fullDate}` : label}
        </p>
        {payload.map((entry: any, index: number) => (
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

interface ChartWrapperProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
}

const ChartWrapper = ({ children, title, subtitle, rightElement }: ChartWrapperProps) => (
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

export interface DashboardProps {
  isManager?: boolean;
  isSupervisor?: boolean;
  isOfficer?: boolean;
  user?: any;
  reports?: any[];
  users?: any[];
  attendance?: any[];
  leaves?: any[];
  permissions?: any[];
  citizens?: any[];
  teamMembers?: any[];
  liveStatus?: any;
  setActiveTab?: (tab: string) => void;
  [key: string]: any;
}

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
}: DashboardProps) {
  const { language, userT } = useUserLanguage();

  // ===== LIVE TELEMETRY STATE =====
  const [telemetryData, setTelemetryData] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(true);

  // ===== REAL DATABASE OFFLINE STORE STATE =====
  const [localCitizens, setLocalCitizens] = useState<any[]>([]);
  const [localReports, setLocalReports] = useState<any[]>([]);
  const [localLogs, setLocalLogs] = useState<any[]>([]);
  const [localSessions, setLocalSessions] = useState<any[]>([]);
  const [localUsers, setLocalUsers] = useState<any[]>([]);

  // ===== OFFICER DRILLDOWN MODAL STATE =====
  const [selectedOfficerId, setSelectedOfficerId] = useState<string | null>(null);
  const [officerDetail, setOfficerDetail] = useState<any>(null);
  const [isLoadingOfficer, setIsLoadingOfficer] = useState(false);

  // Direct asynchronous query to IndexedDB (offlineDb)
  const loadLocalDatabase = useCallback(async () => {
    try {
      const [citizensList, reportsList, logsList, sessionsList, usersList] = await Promise.all([
        offlineDb.citizens.toArray(),
        offlineDb.dailyWorkReports.toArray(),
        offlineDb.activityLogs.reverse().limit(15).toArray(),
        offlineDb.workSessions.toArray(),
        offlineDb.users.toArray()
      ]);
      setLocalCitizens(citizensList || []);
      setLocalReports(reportsList || []);
      setLocalLogs(logsList || []);
      setLocalSessions(sessionsList || []);
      setLocalUsers(usersList || []);
    } catch (err) {
      console.error('Failed to load local Dexie database:', err);
    }
  }, []);

  // Fetch overview telemetry from backend API with Dexie fallback
  const fetchTelemetryOverview = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    await loadLocalDatabase();

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
    } catch (err: any) {
      console.warn('Analytics API unreachable, computing offline fallback from IndexedDB:', err.message);
      setIsLiveConnected(false);
      setLastRefreshed(new Date());

      // Dexie Offline Fallback
      try {
        const dbCitizens = await offlineDb.citizens.toArray();
        const dbReports = await offlineDb.dailyWorkReports.toArray();
        const dbSessions = await offlineDb.workSessions.toArray();
        const dbLogs = await offlineDb.activityLogs.reverse().limit(15).toArray();

        const { dateStr: todayStr } = getZonedTimeComponents();
        const todayRegs = dbCitizens.filter(c => {
          const ts = c.registrationTimestamp || c.createdAt || c.registrationDate || '';
          return ts.slice(0, 10) === todayStr;
        }).length;
        const syncedRegs = dbCitizens.filter(c => c.syncStatus === 'SYNCED' || c.synced).length;
        const pendingRegs = dbCitizens.filter(c => c.syncStatus !== 'SYNCED' && !c.synced).length;

        const totalScreenSecs = dbSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
        const todayScreenSecs = dbSessions
          .filter(s => s.reportDate === todayStr)
          .reduce((sum, s) => sum + (s.durationSeconds || 0), 0);

        const formatSecs = (secs: number) => {
          const h = Math.floor(secs / 3600);
          const m = Math.floor((secs % 3600) / 60);
          const s = secs % 60;
          return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };

        const todayReportsList = dbReports.filter(r => (r.reportDate || '').slice(0, 10) === todayStr);

        setTelemetryData({
          citizens: {
            total: dbCitizens.length,
            today: todayRegs,
            thisWeek: dbCitizens.length,
            synced: syncedRegs,
            pending: pendingRegs,
            genderDistribution: [
              { gender: 'MALE', count: dbCitizens.filter(c => (c.gender || '').toUpperCase() === 'MALE').length },
              { gender: 'FEMALE', count: dbCitizens.filter(c => (c.gender || '').toUpperCase() === 'FEMALE').length }
            ],
            geographicDistribution: []
          },
          telemetry: {
            totalScreenTimeSeconds: totalScreenSecs,
            totalScreenTimeFormatted: formatSecs(totalScreenSecs),
            todayScreenTimeSeconds: todayScreenSecs,
            todayScreenTimeFormatted: formatSecs(todayScreenSecs),
            todaySessionsCount: dbSessions.filter(s => s.reportDate === todayStr).length,
            totalSessionsCount: dbSessions.length,
          },
          compliance: {
            reportsSubmittedToday: todayReportsList.length,
            totalAssignedStaff: 1,
            complianceRatePercentage: todayReportsList.length > 0 ? 100 : 0,
            urgentRoadblocksCount: 0,
            urgentRoadblocks: [],
          },
          duplicates: {
            pending: 0,
            confirmed: 0,
            approved: 0,
            total: 0
          },
          recentActivity: dbLogs.map(l => ({
            id: l.id,
            eventType: l.eventType,
            description: l.description,
            officerName: l.officerName || 'Field Officer',
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
  }, [loadLocalDatabase]);

  // Real-time reactive updates: listen to local events and poll
  useEffect(() => {
    fetchTelemetryOverview(false);

    const handleDataChanged = () => {
      loadLocalDatabase();
      fetchTelemetryOverview(false);
    };

    window.addEventListener('citizen-registered', handleDataChanged);
    window.addEventListener('daily-report-submitted', handleDataChanged);
    window.addEventListener('activity-logged', handleDataChanged);
    window.addEventListener('force-sync', handleDataChanged);
    window.addEventListener('fieldsync-status-updated', handleDataChanged);
    window.addEventListener('notifications-updated', handleDataChanged);

    const interval = setInterval(() => {
      fetchTelemetryOverview(false);
    }, 15000);

    return () => {
      window.removeEventListener('citizen-registered', handleDataChanged);
      window.removeEventListener('daily-report-submitted', handleDataChanged);
      window.removeEventListener('activity-logged', handleDataChanged);
      window.removeEventListener('force-sync', handleDataChanged);
      window.removeEventListener('fieldsync-status-updated', handleDataChanged);
      window.removeEventListener('notifications-updated', handleDataChanged);
      clearInterval(interval);
    };
  }, [fetchTelemetryOverview, loadLocalDatabase]);

  // Fetch individual officer drilldown
  const handleOpenOfficerDrilldown = async (officerId: string) => {
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
      // Fallback from local data
      const allUsers = localUsers.length > 0 ? localUsers : (users || []);
      const allCitizens = localCitizens.length > 0 ? localCitizens : (citizens || []);
      const allReports = localReports.length > 0 ? localReports : (reports || []);

      const foundUser = allUsers.find(u => u.id === officerId || u.employeeId === officerId);
      const officerCitizensList = allCitizens.filter(c => c.registeredById === officerId || c.registeredBy === officerId);
      const officerReportsList = allReports.filter(r => r.officerId === officerId || r.employeeId === officerId);

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
          citizensRegistered: officerCitizensList.length,
          totalSessions: 1,
          totalScreenTimeSeconds: 0,
          totalScreenTimeFormatted: '00:00:00',
          reportsCount: officerReportsList.length,
        },
        recentReports: officerReportsList.slice(0, 5).map(r => ({
          id: r.id,
          reportDate: r.reportDate || getToday(),
          citizenCountLocal: r.citizenCountLocal || r.registrationsCount || 0,
          citizenCountServerConfirmed: r.citizenCountServerConfirmed || r.registrationsCount || 0,
          screenTimeSeconds: r.screenTimeSeconds || 0,
          screenTimeFormatted: r.screenTimeFormatted || '00:00:00',
          syncStatus: r.syncStatus || (r.synced ? 'SYNCED' : 'PENDING')
        }))
      });
    } finally {
      setIsLoadingOfficer(false);
    }
  };

  // ============================================================
  // COMPUTED TELEMETRY & DISPLAY DERIVATIONS FROM REAL DATABASE
  // ============================================================

  // Normalized local date string for today (e.g. "2026-09-28")
  const todayStr = useMemo(() => getZonedTimeComponents().dateStr, []);

  // Safe helper to extract YYYY-MM-DD from any timestamp using local timezone
  const getCitizenDateStr = useCallback((c: any): string => {
    const ts = c.registrationTimestamp || c.createdAt || c.registrationDate || '';
    if (!ts) return '';
    if (typeof ts === 'string') {
      if (ts.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(ts)) {
        try {
          const zoned = getZonedTimeComponents(new Date(ts));
          return zoned.dateStr;
        } catch {
          return ts.slice(0, 10);
        }
      }
    }
    return '';
  }, []);

  // Effective real datasets: prioritize local Dexie store, fallback to props
  const effectiveCitizens = useMemo(() => {
    return localCitizens.length > 0 ? localCitizens : (citizens || []);
  }, [localCitizens, citizens]);

  const effectiveReports = useMemo(() => {
    return localReports.length > 0 ? localReports : (reports || []);
  }, [localReports, reports]);

  const effectiveLogs = useMemo(() => {
    return localLogs.length > 0 ? localLogs : (telemetryData?.recentActivity || []);
  }, [localLogs, telemetryData]);

  // Filter citizens for current field officer
  const officerCitizens = useMemo(() => {
    if (!isOfficer) return effectiveCitizens;
    const filtered = effectiveCitizens.filter(c => {
      const idMatch =
        c.registeredById === user?.id ||
        c.registeredById === user?.employeeId ||
        c.registeredBy === user?.id ||
        c.registeredBy === user?.employeeId ||
        c.registeredByName === user?.fullName ||
        c.registeredByName === user?.name ||
        (c as any).officerId === user?.id;
      return idMatch;
    });
    // Fallback: If officer filter returns 0 but records exist on this offline officer's terminal
    return filtered.length > 0 ? filtered : effectiveCitizens;
  }, [effectiveCitizens, isOfficer, user]);

  // Key metrics calculated directly from real database records
  const targetCitizens = isOfficer ? officerCitizens : effectiveCitizens;
  const totalCitizens = targetCitizens.length;
  const todayCitizens = targetCitizens.filter(c => getCitizenDateStr(c) === todayStr).length;
  const syncedCitizens = targetCitizens.filter(c => c.syncStatus === 'SYNCED' || c.synced).length;
  const pendingCitizens = targetCitizens.filter(c => c.syncStatus !== 'SYNCED' && !c.synced).length;

  // Real today report for this officer
  const todayReport = useMemo(() => {
    return effectiveReports.find(r => {
      const dateMatch = (r.reportDate || '').slice(0, 10) === todayStr;
      if (!dateMatch) return false;
      if (!isOfficer) return true;
      return (
        r.officerId === user?.id ||
        r.officerId === user?.employeeId ||
        r.employeeId === user?.id ||
        r.employeeId === user?.employeeId ||
        !r.officerId
      );
    });
  }, [effectiveReports, todayStr, isOfficer, user]);

  const isReportSubmittedToday = Boolean(todayReport);
  const reportsToday = effectiveReports.filter(r => (r.reportDate || '').slice(0, 10) === todayStr).length;

  const todayScreenTimeFormatted = telemetryData?.telemetry?.todayScreenTimeFormatted || todayReport?.screenTimeFormatted || '00:00:00';
  const totalScreenTimeFormatted = telemetryData?.telemetry?.totalScreenTimeFormatted || '00:00:00';
  const totalSessionsCount = telemetryData?.telemetry?.totalSessionsCount || localSessions.length;

  const totalStaff = telemetryData?.compliance?.totalAssignedStaff ?? (teamMembers.length || 1);
  const complianceRate = reportsToday > 0 ? Math.min(100, Math.round((reportsToday / (totalStaff || 1)) * 100)) : 0;

  const urgentRoadblocks = telemetryData?.compliance?.urgentRoadblocks || [];
  const pendingDuplicates = telemetryData?.duplicates?.pending ?? 0;


  // Chart 1: 7-Day Velocity Chart (Aggregated accurately from real database records)
  const registrationTrendData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getZonedTimeComponents(d).dateStr;
      const count = targetCitizens.filter(c => getCitizenDateStr(c) === dateStr).length;
      data.push({
        date: dateStr.slice(5), // "MM-DD" e.g. "09-28"
        fullDate: dateStr,
        value: count
      });
    }
    return data;
  }, [targetCitizens, getCitizenDateStr]);

  const total7DayVelocity = useMemo(() => {
    return registrationTrendData.reduce((sum, item) => sum + item.value, 0);
  }, [registrationTrendData]);

  // Chart 2: Geographic Distribution by Region (Aggregated from real database records)
  const geographicData = useMemo(() => {
    const map: Record<string, number> = {};
    const normalizeRegion = (raw?: string) => {
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
    targetCitizens.forEach(c => {
      const reg = normalizeRegion(c.regionName || c.region);
      map[reg] = (map[reg] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [targetCitizens]);

  // Chart 3: Gender Breakdown (Aggregated from real database records)
  const genderData = useMemo(() => {
    const male = targetCitizens.filter(c => (c.gender || '').toUpperCase() === 'MALE').length;
    const female = targetCitizens.filter(c => (c.gender || '').toUpperCase() === 'FEMALE').length;
    const other = targetCitizens.filter(c => {
      const g = (c.gender || '').toUpperCase();
      return g && g !== 'MALE' && g !== 'FEMALE';
    }).length;
    const total = male + female + other;
    return [
      { name: 'MALE', value: male, percent: total > 0 ? Math.round((male / total) * 100) : 0 },
      { name: 'FEMALE', value: female, percent: total > 0 ? Math.round((female / total) * 100) : 0 },
      ...(other > 0 ? [{ name: 'OTHER', value: other, percent: total > 0 ? Math.round((other / total) * 100) : 0 }] : [])
    ].filter(d => d.value > 0);
  }, [targetCitizens]);

  // Team Leaderboard
  const teamLeaderboard = useMemo(() => {
    const map: Record<string, { id: string; name: string; region: string; registrations: number; reports: number }> = {};
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
      const zoneName = sup.zone || (sup as any).zoneName || sup.region || 'Assigned Zone';

      // Officers assigned to this supervisor
      const assignedOfficers = (users || []).filter(u =>
        (u.role === 'field_officer' || u.role === 'FIELD_OFFICER') &&
        ((u as any).supervisorId === sup.id || (u as any).supervisor === sup.id || (u as any).supervisor === sup.name || (sup.zone && u.zone === sup.zone))
      );
      const officerIds = new Set(assignedOfficers.map(u => u.id));

      // Count registrations
      const registrationCount = (citizens || []).filter(c => {
        const byOfficer = c.registeredById || (c as any).registeredBy;
        if (byOfficer && (byOfficer === sup.id || officerIds.has(byOfficer))) {
          return true;
        }
        if (sup.zone && (c.zone === sup.zone || (c as any).zoneName === sup.zone || (c as any).zoneId === (sup as any).zoneId)) {
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
      const zoneMap: Record<string, number> = {};
      (citizens || []).forEach(c => {
        const z = c.zone || (c as any).zoneName || c.woreda || 'Central Zone';
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
                title={userT('User Management')}
                value={users.length}
                subtitle={
                  language === 'am'
                    ? `${users.filter(u => u.status === 'active' || u.isActive).length} ንቁ የሰራተኞች አካውንቶች`
                    : `${users.filter(u => u.status === 'active' || u.isActive).length} active staff accounts`
                }
                icon={UserCog}
                iconColor="text-blue-700 dark:text-blue-400"
                iconBg="bg-blue-50 dark:bg-blue-950/80"
                badge={`${users.filter(u => u.role === 'field_officer' || u.role === 'FIELD_OFFICER').length} ${userT('Officers')}`}
                badgeColor="bg-blue-50 text-blue-700 border-blue-200"
              />
            </div>

            {/* 2. Registered Citizens (from 'citizens' sidebar tab) */}
            <div onClick={() => setActiveTab && setActiveTab('citizens')} className="cursor-pointer">
              <StatCard
                title={userT('Registered Citizens')}
                value={totalCitizens}
                subtitle={
                  language === 'am'
                    ? `ዛሬ ${todayCitizens} ተመዝግቧል`
                    : language === 'om'
                    ? `Har'a ${todayCitizens} galmaa'eera`
                    : language === 'ti'
                    ? `ሎሚ ${todayCitizens} ተመዝጊቡ`
                    : `${todayCitizens} registered today`
                }
                icon={Database}
                iconColor="text-emerald-700 dark:text-emerald-400"
                iconBg="bg-emerald-50 dark:bg-emerald-950/80"
                badge={
                  language === 'am'
                    ? `${syncedCitizens} ተመሳስሏል`
                    : language === 'om'
                    ? `${syncedCitizens} Qindaa'eera`
                    : language === 'ti'
                    ? `${syncedCitizens} ተመሳሲሉ`
                    : `${syncedCitizens} Synced`
                }
                badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200"
              />
            </div>

            {/* 3. Field Officers (from 'team' sidebar tab) */}
            <div onClick={() => setActiveTab && setActiveTab('team')} className="cursor-pointer">
              <StatCard
                title={userT('Field Officers')}
                value={users.filter(u => u.role === 'field_officer' || u.role === 'FIELD_OFFICER').length}
                subtitle={
                  language === 'am'
                    ? `በሁሉም ዞኖች ${users.filter(u => u.role === 'supervisor' || u.role === 'SUPERVISOR').length} ተቆጣጣሪዎች`
                    : `${users.filter(u => u.role === 'supervisor' || u.role === 'SUPERVISOR').length} supervisors across all zones`
                }
                icon={Users}
                iconColor="text-purple-700 dark:text-purple-400"
                iconBg="bg-purple-50 dark:bg-purple-950/80"
                badge={userT('Active Personnel')}
                badgeColor="bg-purple-50 text-purple-700 border-purple-200"
              />
            </div>

            {/* 4. All Daily Reports (from 'all_reports' sidebar tab) */}
            <div onClick={() => setActiveTab && setActiveTab('all_reports')} className="cursor-pointer">
              <StatCard
                title={userT('Daily Work Reports')}
                value={reportsToday}
                subtitle={
                  language === 'am'
                    ? `ጠቅላላ ${reports.length} ሪፖርቶች ቀርበዋል`
                    : `${reports.length} total reports filed`
                }
                icon={FileText}
                iconColor="text-indigo-700 dark:text-indigo-400"
                iconBg="bg-indigo-50 dark:bg-indigo-950/80"
                badge={`${complianceRate}% ${userT('Daily Report Compliance')}`}
                badgeColor={complianceRate === 100 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}
              />
            </div>

            {/* 5. System Sync Health (from 'sync_center' sidebar tab) */}
            <div onClick={() => setActiveTab && setActiveTab('sync_center')} className="cursor-pointer">
              <StatCard
                title={userT('System Sync Health')}
                value={pendingCitizens === 0 ? '100%' : `${pendingCitizens} ${userT('Pending')}`}
                subtitle={
                  language === 'am'
                    ? `${syncedCitizens} መዝገቦች ተመሳስለዋል`
                    : `${syncedCitizens} records synchronized`
                }
                icon={RefreshCw}
                iconColor="text-sky-700 dark:text-sky-400"
                iconBg="bg-sky-50 dark:bg-sky-950/80"
                badge={pendingCitizens === 0 ? userT('Synced') : userT('Pending')}
                badgeColor={pendingCitizens === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}
              />
            </div>

            {/* 6. Analysis & Detail (from 'analytics' sidebar tab) */}
            <div onClick={() => setActiveTab && setActiveTab('analytics')} className="cursor-pointer">
              <StatCard
                title={userT('Analytics & Trends')}
                value={totalCitizens > 0 ? `${Math.round((todayCitizens / (totalCitizens || 1)) * 100)}% Pace` : '0%'}
                subtitle={
                  language === 'am'
                    ? 'የስነ-ሕዝብ እና የክልል ትንታኔ'
                    : 'Demographic & regional analytics'
                }
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
            title={userT('Registered Citizens')}
            value={totalCitizens}
            subtitle={
              language === 'am'
                ? `ዛሬ ${todayCitizens} ተመዝግቧል`
                : language === 'om'
                ? `Har'a ${todayCitizens} galmaa'eera`
                : language === 'ti'
                ? `ሎሚ ${todayCitizens} ተመዝጊቡ`
                : `${todayCitizens} registered today`
            }
            icon={Users}
            iconColor="text-blue-700"
            iconBg="bg-blue-50"
            badge={
              language === 'am'
                ? `${syncedCitizens} ተመሳስሏል`
                : language === 'om'
                ? `${syncedCitizens} Qindaa'eera`
                : language === 'ti'
                ? `${syncedCitizens} ተመሳሲሉ`
                : `${syncedCitizens} Synced`
            }
            badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200"
          />

          <StatCard
            title={userT('Daily Report Compliance')}
            value={`${complianceRate}%`}
            subtitle={
              language === 'am'
                ? `ዛሬ ከ ${totalStaff} ውስጥ ${reportsToday} ቀርቧል`
                : language === 'om'
                ? `Har'a ${totalStaff} keessaa ${reportsToday} dhiyaateera`
                : language === 'ti'
                ? `ሎሚ ካብ ${totalStaff} ውሽጢ ${reportsToday} ቀሪቡ`
                : `${reportsToday} of ${totalStaff} submitted today`
            }
            icon={FileText}
            iconColor="text-indigo-700"
            iconBg="bg-indigo-50"
            badge={complianceRate === 100 ? userT('100% Complete') : userT('In Progress')}
            badgeColor={complianceRate === 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}
          />

          <div
            onClick={() => setActiveTab && setActiveTab('sync_center')}
            className="cursor-pointer"
          >
            <StatCard
              title={userT('Sync Status')}
              value={`${pendingCitizens === 0 ? '100%' : Math.round((syncedCitizens / (totalCitizens || 1)) * 100) + '%'}`}
              subtitle={
                language === 'am'
                  ? `${pendingCitizens} ማመሳሰል በመጠባበቅ ላይ`
                  : language === 'om'
                  ? `${pendingCitizens} walqabsiisa eegaa jira`
                  : language === 'ti'
                  ? `${pendingCitizens} ምምስሳል ይጽበ ኣሎ`
                  : `${pendingCitizens} pending sync`
              }
              icon={RefreshCw}
              iconColor="text-blue-700"
              iconBg="bg-blue-50"
            />
          </div>
        </div>
      )}

      {/* ============================================================
          FIELD OFFICER DASHBOARD VIEW: QUICK ACTION BUTTONS & METRICS
         ============================================================ */}
      {isOfficer && (
        <>
          {/* Quick Action Shortcuts: Redesigned with Balanced Visual Hierarchy & Tactile Feedback */}
          {setActiveTab && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Button 1: Register Citizen */}
              <div
                onClick={() => setActiveTab('register')}
                className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-5 border border-blue-200/90 dark:border-blue-900/60 shadow-xs hover:shadow-md hover:border-blue-500 dark:hover:border-blue-400 hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Visual accent top line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500" />
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-base text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        Register Citizen
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Register a new citizen record, online or offline.
                      </p>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:translate-x-1 shadow-2xs">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Button 2: Daily Work Report */}
              <div
                onClick={() => setActiveTab('report_new')}
                className={`group relative cursor-pointer overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-5 border shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
                  isReportSubmittedToday
                    ? 'border-emerald-200/90 dark:border-emerald-900/60 hover:border-emerald-500 dark:hover:border-emerald-400'
                    : 'border-indigo-200/90 dark:border-indigo-900/60 hover:border-indigo-500 dark:hover:border-indigo-400'
                }`}
              >
                {/* Visual accent top line */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                    isReportSubmittedToday
                      ? 'from-emerald-500 via-teal-500 to-emerald-600'
                      : 'from-indigo-600 via-purple-600 to-indigo-500'
                  }`}
                />
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-xl text-white shadow-md flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200 ${
                        isReportSubmittedToday
                          ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-emerald-500/25'
                          : 'bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-indigo-500/25'
                      }`}
                    >
                      {isReportSubmittedToday ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <FilePlus2 className="w-6 h-6" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4
                        className={`font-bold text-base text-slate-900 dark:text-white tracking-tight transition-colors ${
                          isReportSubmittedToday
                            ? 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                            : 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                        }`}
                      >
                        Daily Work Report
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        View and manage your report for today.
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:translate-x-1 shadow-2xs ${
                      isReportSubmittedToday
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white'
                        : 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white'
                    }`}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Officer Key Metrics: Direct Database Real Values */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="My Registrations"
              value={totalCitizens}
              subtitle={`${todayCitizens} registered today`}
              icon={Users}
              iconColor="text-blue-700 dark:text-blue-400"
              iconBg="bg-blue-50 dark:bg-blue-950/80"
              badge={`${syncedCitizens} Synced`}
              badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800"
            />
            <StatCard
              title="Today's Report Status"
              value={isReportSubmittedToday ? 'SUBMITTED' : 'PENDING'}
              subtitle={
                isReportSubmittedToday
                  ? 'Daily work report submitted for today'
                  : 'Pending submission at shift completion'
              }
              icon={isReportSubmittedToday ? CalendarCheck : FileText}
              iconColor={isReportSubmittedToday ? 'text-emerald-700 dark:text-emerald-400' : 'text-indigo-700 dark:text-indigo-400'}
              iconBg={isReportSubmittedToday ? 'bg-emerald-50 dark:bg-emerald-950/80' : 'bg-indigo-50 dark:bg-indigo-950/80'}
              badge={isReportSubmittedToday ? 'Shift Logged ✓' : 'Action Required'}
              badgeColor={
                isReportSubmittedToday
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
              }
            />
          </div>
        </>
      )}

      {/* ============================================================
          INTERACTIVE CHARTS & VISUAL TELEMETRY (REAL DATABASE SOURCES)
         ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 7-Day Velocity Chart */}
        <ChartWrapper
          title={userT('7-Day Registration Velocity')}
          subtitle={userT('Daily citizen registrations recorded and synchronized')}
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
                  name={userT('Citizens')}
                  stroke="#1E3A8A"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#areaVelocity)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartWrapper>

        {/* Demographics / Gender Card (Compact 2-Column Grid Slot) */}
        <Card className="h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>{userT('Demographic Distribution')}</CardTitle>
              <CardDescription>{userT('Gender breakdown of registered citizens')}</CardDescription>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Users className="w-3.5 h-3.5" />
              <span>{language === 'am' ? `ጠቅላላ ${totalCitizens}` : language === 'om' ? `Ida'ama ${totalCitizens}` : language === 'ti' ? `ጠቕላላ ${totalCitizens}` : `${totalCitizens} Total`}</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col sm:flex-row justify-around items-center py-4 min-h-[260px]">
            {genderData.length === 0 ? (
              <div className="text-xs text-slate-400 py-10 flex items-center justify-center h-full">No demographic data recorded</div>
            ) : (
              <>
                <div className="w-full sm:w-1/2 flex justify-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
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
                </div>

                <div className="flex flex-wrap sm:flex-col items-center sm:items-start justify-center gap-3 mt-3 sm:mt-0 text-xs">
                  {genderData.map((g: any, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: GENDER_COLORS[g.name] || CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{userT(g.name)}:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{g.value}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">({g.percent}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============================================================
          GEOGRAPHIC DISTRIBUTION BY REGION (EXPANDED FULL-WIDTH CAPACITY)
         ============================================================ */}
      <div className="grid grid-cols-1 gap-5">
        {/* Geographic Distribution Chart */}
        <ChartWrapper
          title={userT('Geographic Distribution by Region')}
          subtitle={userT('Citizen registration density across administrative regions')}
          rightElement={
            <div className="flex items-center gap-1.5 bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-900/60 px-2.5 py-1 rounded-full text-xs font-semibold text-teal-700 dark:text-teal-300">
              <MapPin className="w-3.5 h-3.5" />
              <span>{geographicData.length} {language === 'am' ? 'ንቁ ክልሎች' : language === 'om' ? "Naannolee Socho'oo" : language === 'ti' ? 'ንጡፋት ክልላት' : 'Active Regions'}</span>
            </div>
          }
        >
          {geographicData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 py-12">
              No geographic distribution data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={geographicData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip content={CustomTooltip} />
                <Bar dataKey="count" name={userT('Citizens')} fill="#0D9488" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartWrapper>
      </div>

      {/* ============================================================
          MANAGER VIEW: SUPERVISOR ZONAL REGISTRATION PERFORMANCE CHART
         ============================================================ */}
      {isManager && (
        <Card className="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-xs">
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
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Top Performing Zone</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                      {supervisorZonePerformanceData[0]?.zone || '—'}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {supervisorZonePerformanceData[0]?.name} ({supervisorZonePerformanceData[0]?.registrations} records)
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Supervisors</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {supervisorZonePerformanceData.length} Supervisors
                    </p>
                    <p className="text-xs text-slate-400">Across all operational zones</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
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
                              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg text-xs">
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
              <CardTitle>{userT('Field Officer Performance & Telemetry')}</CardTitle>
              <CardDescription>{userT('Click any field officer to inspect detailed individual telemetry')}</CardDescription>
            </div>
            {setActiveTab && (
              <Button
                variant="outline"
                size="xs"
                onClick={() => setActiveTab('team')}
                className="text-xs"
              >
                {userT('Manage Force')}
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
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">
                      <th className="py-3.5 pl-6 pr-3">{userT('Rank')}</th>
                      <th className="py-3.5 px-4">{userT('Officer')}</th>
                      <th className="py-3.5 px-4">{userT('Woreda / Territory')}</th>
                      <th className="py-3.5 px-4 text-right">{userT('Registrations')}</th>
                      <th className="py-3.5 px-4 text-right">{userT('Reports')}</th>
                      <th className="py-3.5 pr-6 text-right">{userT('Action')}</th>
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
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{userT(emp.region)}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-[#F8FAFC] font-mono">{emp.registrations}</td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300 font-mono">{emp.reports}</td>
                        <td className="py-3.5 pr-6 text-right">
                          <Button
                            size="xs"
                            variant="ghost"
                            className="text-blue-700 dark:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 font-semibold"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            {userT('Detail')}
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
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs text-center">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Citizens Registered</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {officerDetail.metrics.citizensRegistered}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs text-center">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Screen Time</span>
                <span className="text-lg font-bold text-teal-700 dark:text-teal-400 mt-0.5 block">
                  {officerDetail.metrics.totalScreenTimeFormatted}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs text-center">
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
                <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  No daily work reports submitted yet
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/90 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px]">
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