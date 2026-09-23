// src/components/dashboard/Dashboard.jsx – Enterprise Modern SaaS Dashboard

import React, { useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, AreaChart, Area, Cell
} from 'recharts';
import {
  FileText, Users, UserCheck, CalendarCheck, Calendar, Clock,
  TrendingUp, CheckCircle2, Award, ShieldCheck, AlertCircle,
  UserPlus, FilePlus2, BarChart3, Radio, ArrowRight, ShieldAlert,
  Percent, Sparkles
} from 'lucide-react';
import { getToday } from '../../utils/helpers';
import VerificationPopup from '../verification/VerificationPopup';
import { useVerification } from '../../hooks/useVerification';
import StatCard from '../ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

// Enterprise Chart Palette
const CHART_COLORS = ['#1E3A8A', '#0D9488', '#6366F1', '#D97706', '#16A34A', '#2563EB'];

const STATUS_COLORS = {
  'Approved': '#16A34A',
  'Pending': '#D97706',
  'Rejected': '#DC2626',
  'Present': '#16A34A',
  'Late': '#D97706',
  'Absent': '#DC2626',
  'Half Day': '#7C3AED'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-modal text-xs font-sans text-slate-800">
        <p className="font-semibold text-slate-900 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="flex items-center gap-1.5 py-0.5" style={{ color: entry.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="font-medium text-slate-600">{entry.name}:</span>
            <span className="font-bold text-slate-900">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ChartWrapper = ({ children, title, subtitle }) => (
  <Card className="h-full flex flex-col">
    <CardHeader>
      <div>
        <CardTitle>{title}</CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </div>
    </CardHeader>
    <CardContent className="flex-1 min-h-[280px]">
      {children}
    </CardContent>
  </Card>
);

function Dashboard({
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
  // ===== VERIFICATION =====
  const {
    showPopup,
    verificationScore,
    handleAnswer,
    handleClose,
    lastVerified
  } = useVerification(isOfficer ? user?.id : null, isOfficer ? user?.name : null);

  // ============================================================
  // ALL DATA COMPUTED FROM RAW ARRAYS – SYNCED-ONLY
  // ============================================================

  const realTotalReports = useMemo(() => {
    return (reports || []).filter(r => r.synced === true).length;
  }, [reports]);

  const realTotalCitizens = useMemo(() => {
    return (citizens || []).filter(c => c.synced === true).length;
  }, [citizens]);

  const realSupervisors = useMemo(() => (users || []).filter(u => u.role === 'supervisor').length, [users]);
  const realFieldOfficers = useMemo(() => (users || []).filter(u => u.role === 'field_officer').length, [users]);

  const realAttendanceRate = useMemo(() => {
    const syncedAttendance = (attendance || []).filter(a => a.synced !== false);
    if (!syncedAttendance || syncedAttendance.length === 0) return 0;
    const total = syncedAttendance.length;
    const present = syncedAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
    return Math.round((present / total) * 100);
  }, [attendance]);

  const registrationTrendData = useMemo(() => {
    const syncedCitizens = (citizens || []).filter(c => c.synced === true);
    const today = new Date();
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const value = syncedCitizens.filter(c => c.registrationDate?.slice(0, 10) === dateStr).length;
      data.push({ date: dateStr.slice(5), fullDate: dateStr, value });
    }
    return data;
  }, [citizens]);

  const reportStatusData = useMemo(() => {
    const syncedReports = (reports || []).filter(r => r.synced === true);
    if (!syncedReports || syncedReports.length === 0) return [];
    const statuses = { 'Approved': 0, 'Pending': 0, 'Rejected': 0 };
    syncedReports.forEach(r => {
      if (r.reviewed && r.status !== 'rejected') statuses['Approved']++;
      else if (r.status === 'rejected') statuses['Rejected']++;
      else statuses['Pending']++;
    });
    return Object.entries(statuses)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [reports]);

  const todayAttendanceData = useMemo(() => {
    const syncedAttendance = (attendance || []).filter(a => a.synced !== false);
    if (!syncedAttendance || syncedAttendance.length === 0) return [];
    const today = getToday();
    const todayAtt = syncedAttendance.filter(a => a.date === today);
    if (todayAtt.length === 0) return [];
    const statuses = { 'Present': 0, 'Late': 0, 'Absent': 0, 'Half Day': 0 };
    todayAtt.forEach(a => {
      if (a.status === 'present') statuses['Present']++;
      else if (a.status === 'late') statuses['Late']++;
      else if (a.status === 'absent') statuses['Absent']++;
      else if (a.status === 'half_day') statuses['Half Day']++;
    });
    return Object.entries(statuses)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [attendance]);

  const officerPerformanceData = useMemo(() => {
    if (!isOfficer || !user) return [];
    const syncedCitizens = (citizens || []).filter(c => c.synced === true);
    const syncedReports = (reports || []).filter(r => r.synced === true);
    const today = getToday();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const registrations = syncedCitizens.filter(c =>
        c.registeredBy === user.employeeId &&
        c.registrationDate?.slice(0, 10) === dateStr
      ).length;
      const reportsCount = syncedReports.filter(r =>
        r.employeeId === user.employeeId &&
        r.reportDate === dateStr
      ).length;
      last7Days.push({
        date: dateStr.slice(5),
        registrations,
        reports: reportsCount,
        efficiency: reportsCount > 0 ? Math.round((registrations / reportsCount) * 100) : 0
      });
    }
    return last7Days;
  }, [citizens, reports, isOfficer, user]);

  const teamCitizenCount = useMemo(() => {
    if (!isSupervisor || !user || !teamMembers) return 0;
    const teamIds = (teamMembers || []).map(m => m.employeeId);
    const syncedCitizens = (citizens || []).filter(c => c.synced === true);
    return syncedCitizens.filter(c => teamIds.includes(c.registeredBy)).length;
  }, [citizens, teamMembers, isSupervisor, user]);

  const teamReportsCount = useMemo(() => {
    if (!isSupervisor || !user || !teamMembers) return 0;
    const teamIds = (teamMembers || []).map(m => m.employeeId);
    const syncedReports = (reports || []).filter(r => r.synced === true);
    return syncedReports.filter(r => teamIds.includes(r.employeeId)).length;
  }, [reports, teamMembers, isSupervisor, user]);

  const officerReportsCount = useMemo(() => {
    if (!isOfficer || !user) return 0;
    const syncedReports = (reports || []).filter(r => r.synced === true);
    return syncedReports.filter(r => r.employeeId === user.employeeId).length;
  }, [reports, isOfficer, user]);

  const officerTotalRegistrations = useMemo(() => {
    if (!isOfficer || !user) return 0;
    const syncedCitizens = (citizens || []).filter(c => c.synced === true);
    return syncedCitizens.filter(c => c.registeredBy === user.employeeId).length;
  }, [citizens, isOfficer, user]);

  const officerTodayRegistrations = useMemo(() => {
    if (!isOfficer || !user) return 0;
    const syncedCitizens = (citizens || []).filter(c => c.synced === true);
    const today = getToday();
    return syncedCitizens.filter(c =>
      c.registeredBy === user.employeeId &&
      c.registrationDate?.slice(0, 10) === today
    ).length;
  }, [citizens, isOfficer, user]);

  const todayAttendance = useMemo(() => {
    if (!isOfficer || !user) return null;
    const syncedAttendance = (attendance || []).filter(a => a.synced !== false);
    return syncedAttendance.find(a => a.employeeId === user.employeeId && a.date === getToday());
  }, [attendance, user, isOfficer]);

  const realTopPerformers = useMemo(() => {
    const map = {};
    reports.forEach(r => {
      if (!map[r.employeeId]) {
        map[r.employeeId] = {
          employeeId: r.employeeId,
          employeeName: r.employeeName,
          region: r.region,
          totalReports: 0,
          totalRegistrations: 0,
          avgEfficiency: 0,
          attendanceRate: 0,
          trustScore: 0,
        };
      }
      map[r.employeeId].totalReports += 1;
    });

    citizens.forEach(c => {
      if (c.registeredBy && map[c.registeredBy] && c.synced === true) {
        map[c.registeredBy].totalRegistrations += 1;
      }
    });

    Object.values(map).forEach(emp => {
      emp.avgEfficiency = emp.totalReports > 0
        ? Math.round((emp.totalRegistrations / emp.totalReports) * 100)
        : 0;
    });

    attendance.forEach(a => {
      if (map[a.employeeId] && a.synced !== false) {
        const totalAtt = attendance.filter(att => att.employeeId === a.employeeId && att.synced !== false).length;
        const presentAtt = attendance.filter(att => att.employeeId === a.employeeId && (att.status === 'present' || att.status === 'late') && att.synced !== false).length;
        map[a.employeeId].attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;
      }
    });

    return Object.values(map)
      .filter(emp => emp.totalRegistrations > 0)
      .sort((a, b) => b.totalRegistrations - a.totalRegistrations)
      .slice(0, 5);
  }, [reports, citizens, attendance]);

  const realTeamPerformance = useMemo(() => {
    if (!isSupervisor || !user || !teamMembers) return [];
    const teamIds = teamMembers.map(m => m.employeeId);
    const map = {};
    reports.forEach(r => {
      if (teamIds.includes(r.employeeId) && !map[r.employeeId]) {
        map[r.employeeId] = {
          employeeId: r.employeeId,
          employeeName: r.employeeName,
          region: r.region,
          totalReports: 0,
          totalRegistrations: 0,
          avgEfficiency: 0,
          attendanceRate: 0,
        };
      }
      if (map[r.employeeId]) {
        map[r.employeeId].totalReports += 1;
      }
    });
    citizens.forEach(c => {
      if (c.registeredBy && map[c.registeredBy] && c.synced === true) {
        map[c.registeredBy].totalRegistrations += 1;
      }
    });
    Object.values(map).forEach(emp => {
      emp.avgEfficiency = emp.totalReports > 0
        ? Math.round((emp.totalRegistrations / emp.totalReports) * 100)
        : 0;
    });
    attendance.forEach(a => {
      if (map[a.employeeId] && a.synced !== false) {
        const totalAtt = attendance.filter(att => att.employeeId === a.employeeId && att.synced !== false).length;
        const presentAtt = attendance.filter(att => att.employeeId === a.employeeId && (att.status === 'present' || att.status === 'late') && att.synced !== false).length;
        map[a.employeeId].attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;
      }
    });
    return Object.values(map)
      .filter(emp => emp.totalRegistrations > 0)
      .sort((a, b) => b.totalRegistrations - a.totalRegistrations);
  }, [reports, citizens, attendance, teamMembers, isSupervisor, user]);

  const renderChart = useCallback((type, data, chartColors = CHART_COLORS, xAxisKey = 'name') => {
    if (!data || data.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-xs text-slate-400">
          No data records available
        </div>
      );
    }

    const commonProps = {
      margin: { top: 10, right: 10, left: -20, bottom: 0 },
    };

    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey={xAxisKey} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip content={CustomTooltip} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={STATUS_COLORS[entry.name] || chartColors[index % chartColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip content={CustomTooltip} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={chartColors[0]}
                strokeWidth={2.5}
                dot={{ r: 3, fill: chartColors[0] }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} {...commonProps}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors[0]} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={chartColors[0]} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip content={CustomTooltip} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartColors[0]}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#areaGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Officer Security Verification Popup */}
      {isOfficer && showPopup && (
        <VerificationPopup
          officerId={user?.id}
          officerName={user?.name}
          onAnswer={handleAnswer}
          onClose={handleClose}
        />
      )}

      {/* ============================================================
          FIELD OFFICER DASHBOARD
         ============================================================ */}
      {isOfficer && (
        <>
          {/* Header & Verification Pill */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Field Officer Dashboard
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Overview of your field registrations, reports, and attendance
              </p>
            </div>

            {/* Verification Status Pill */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-medium shadow-xs ${
                (verificationScore || 0) >= 80
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : (verificationScore || 0) >= 60
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>Verification Score: <strong>{verificationScore || 0}%</strong></span>
              </div>

              {lastVerified && (
                <div className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-500 text-xs shadow-xs">
                  Last verified: {new Date(lastVerified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>

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
                      <p className="text-xs text-blue-200 mt-0.5">Record offline beneficiary profile</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-blue-200 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>

              <Card
                hover
                onClick={() => setActiveTab('report_new')}
                className="p-5 cursor-pointer bg-white border border-slate-200 shadow-subtle group hover:border-blue-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1E3A8A] flex items-center justify-center">
                      <FilePlus2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-base text-slate-900">Submit Daily Report</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Upload work log and milestones</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 group-hover:text-[#1E3A8A] transition-all" />
                </div>
              </Card>
            </div>
          )}

          {/* Officer Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="My Reports (synced)"
              value={officerReportsCount}
              subtitle="Total verified submissions"
              icon={FileText}
              iconColor="text-blue-700"
              iconBg="bg-blue-50"
            />
            <StatCard
              title="Citizens Registered"
              value={officerTotalRegistrations}
              subtitle="Total records created"
              icon={Users}
              iconColor="text-emerald-700"
              iconBg="bg-emerald-50"
            />
            <StatCard
              title="Today's Attendance"
              value={todayAttendance?.status ? todayAttendance.status.toUpperCase() : 'NOT MARKED'}
              subtitle="Daily presence status"
              icon={CalendarCheck}
              iconColor="text-teal-700"
              iconBg="bg-teal-50"
            />
            <StatCard
              title="Today's Registrations"
              value={officerTodayRegistrations}
              subtitle="Beneficiaries added today"
              icon={CheckCircle2}
              iconColor="text-indigo-700"
              iconBg="bg-indigo-50"
            />
          </div>

          {/* Today's Realtime Status Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Today's Reports", value: (reports || []).filter(r => r.employeeId === user?.employeeId && r.reportDate === getToday() && r.synced).length },
              { label: "Today's Registrations", value: officerTodayRegistrations },
              { label: 'Work Efficiency', value: `${Math.round((officerTotalRegistrations / (officerReportsCount || 1) / 100) * 100)}%` },
              { label: "Today's Attendance", value: todayAttendance?.status ? todayAttendance.status.toUpperCase() : 'NOT MARKED' }
            ].map((stat, idx) => (
              <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{stat.label}</span>
                <span className="text-sm font-bold text-slate-900">{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Officer Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartWrapper title="7-Day Registration Trend" subtitle="Daily citizen records saved and synced">
              {renderChart('area', officerPerformanceData.map(d => ({ date: d.date, value: d.registrations })), ['#1E3A8A'])}
            </ChartWrapper>

            <ChartWrapper title="Submission Efficiency Trend" subtitle="Registrations per daily report">
              {renderChart('line', officerPerformanceData.map(d => ({ date: d.date, value: d.efficiency })), ['#0D9488'])}
            </ChartWrapper>
          </div>

          {/* Attendance Card */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Today's Shift Attendance</CardTitle>
                <CardDescription>Daily check-in verification log</CardDescription>
              </div>
              <Badge variant={todayAttendance?.status === 'present' ? 'success' : todayAttendance?.status === 'late' ? 'warning' : 'neutral'}>
                {todayAttendance?.status ? todayAttendance.status.toUpperCase() : 'PENDING'}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500 block">Status</span>
                  <span className="text-sm font-bold text-slate-900 capitalize">{todayAttendance?.status || 'Not Checked In'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500 block">Check In Time</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">{todayAttendance?.checkIn || '--:--'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500 block">Check Out Time</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">{todayAttendance?.checkOut || '--:--'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500 block">Total Work Hours</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">{todayAttendance?.workHours || 0} hrs</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ============================================================
          SUPERVISOR DASHBOARD
         ============================================================ */}
      {isSupervisor && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Supervisor Dashboard
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Monitoring field officer operations and approvals
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-50 text-[#1E3A8A] text-xs font-semibold border border-blue-100">
                {teamMembers?.length || 0} Active Officers
              </span>
            </div>
          </div>

          {/* Supervisor Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Team Members"
              value={teamMembers?.length || 0}
              subtitle="Assigned field officers"
              icon={Users}
              iconColor="text-indigo-700"
              iconBg="bg-indigo-50"
            />
            <StatCard
              title="Team Reports (synced)"
              value={teamReportsCount}
              subtitle="Synced reports submitted"
              icon={FileText}
              iconColor="text-blue-700"
              iconBg="bg-blue-50"
            />
            <StatCard
              title="Team Registrations"
              value={teamCitizenCount}
              subtitle="Citizens registered by team"
              icon={UserCheck}
              iconColor="text-emerald-700"
              iconBg="bg-emerald-50"
            />
            <StatCard
              title="Team Attendance Rate"
              value={`${realAttendanceRate}%`}
              subtitle="Active presence rate"
              icon={CalendarCheck}
              iconColor="text-teal-700"
              iconBg="bg-teal-50"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartWrapper title="Team Report Status" subtitle="Approved vs Pending vs Rejected">
              {renderChart('bar', reportStatusData)}
            </ChartWrapper>

            <ChartWrapper title="7-Day Team Registrations" subtitle="Cumulative daily citizen registrations">
              {renderChart('area', registrationTrendData.map(d => ({ date: d.date, value: d.value })), ['#0D9488'])}
            </ChartWrapper>
          </div>

          {/* Team Leaderboard */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Team Performance Leaderboard</CardTitle>
                <CardDescription>Top field officers ranked by registrations</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {(!realTeamPerformance || realTeamPerformance.length === 0) ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No team activity recorded yet
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {realTeamPerformance.map((emp, i) => (
                    <div key={emp.employeeId} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-amber-100 text-amber-800' : i === 1 ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">{emp.employeeName}</p>
                          <p className="text-[11px] text-slate-500">{emp.region}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <span className="font-semibold text-slate-900">{emp.totalRegistrations} citizens</span>
                        <span className="text-emerald-700 font-medium">{emp.avgEfficiency}% eff</span>
                        <span className="text-slate-500">{Math.round(emp.attendanceRate)}% att</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ============================================================
          MANAGER DASHBOARD
         ============================================================ */}
      {isManager && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Executive Operations Dashboard
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Consolidated overview across all regions and field teams
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="primary" dot>
                {realTotalReports} Synced Reports
              </Badge>
            </div>
          </div>

          {/* Manager Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <StatCard
              title="Reports"
              value={realTotalReports}
              subtitle="Synced"
              icon={FileText}
              iconColor="text-blue-700"
              iconBg="bg-blue-50"
            />
            <StatCard
              title="Citizens"
              value={realTotalCitizens}
              subtitle="Total profiles"
              icon={Users}
              iconColor="text-emerald-700"
              iconBg="bg-emerald-50"
            />
            <StatCard
              title="Supervisors"
              value={realSupervisors}
              subtitle="Field leads"
              icon={Award}
              iconColor="text-indigo-700"
              iconBg="bg-indigo-50"
            />
            <StatCard
              title="Officers"
              value={realFieldOfficers}
              subtitle="Field force"
              icon={UserCheck}
              iconColor="text-amber-700"
              iconBg="bg-amber-50"
            />
            <StatCard
              title="Attendance"
              value={`${realAttendanceRate}%`}
              subtitle="Present rate"
              icon={CalendarCheck}
              iconColor="text-teal-700"
              iconBg="bg-teal-50"
            />
            <StatCard
              title="Verified Reports"
              value={realTotalReports}
              subtitle="Submitted work logs"
              icon={FileText}
              iconColor="text-blue-700"
              iconBg="bg-blue-50"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartWrapper title="7-Day Registration Trend" subtitle="Daily registered beneficiaries across all territories">
              {renderChart('bar', registrationTrendData.map(d => ({ name: d.date, value: d.value })), ['#1E3A8A'])}
            </ChartWrapper>

            <ChartWrapper title="Report Status Breakdown" subtitle="Distribution of reviewed field reports">
              {renderChart('bar', reportStatusData)}
            </ChartWrapper>
          </div>

          <div className="grid grid-cols-1 gap-5">
            <ChartWrapper title="Today's Attendance Status" subtitle="Breakdown of attendance check-ins across staff">
              {renderChart('bar', todayAttendanceData)}
            </ChartWrapper>
          </div>

          {/* Top Performing Officers */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Top Performing Field Officers</CardTitle>
                <CardDescription>Top contributors sorted by verified registrations</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {(!realTopPerformers || realTopPerformers.length === 0) ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No officer performance records available
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="pb-3 pl-2">Rank</th>
                        <th className="pb-3">Officer</th>
                        <th className="pb-3">Region</th>
                        <th className="pb-3 text-right">Registrations</th>
                        <th className="pb-3 text-right">Efficiency</th>
                        <th className="pb-3 text-right pr-2">Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {realTopPerformers.map((emp, i) => (
                        <tr key={emp.employeeId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 pl-2">
                            <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center font-bold text-[11px] ${
                              i === 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="py-3 font-semibold text-slate-900">{emp.employeeName}</td>
                          <td className="py-3 text-slate-500">{emp.region}</td>
                          <td className="py-3 text-right font-bold text-slate-900">{emp.totalRegistrations}</td>
                          <td className="py-3 text-right font-medium text-emerald-700">{emp.avgEfficiency}%</td>
                          <td className="py-3 text-right pr-2 font-medium text-slate-700">{Math.round(emp.attendanceRate)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default Dashboard;