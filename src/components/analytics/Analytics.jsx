// src/components/analytics/Analytics.jsx – Enterprise Executive Analytics & Intelligence

import React, { useMemo, useState } from 'react';
import {
  BarChart3, TrendingUp, Users, Award, MapPin,
  CheckCircle2, AlertTriangle, ShieldCheck, Clock,
  ArrowUpRight, ArrowDownRight, Layers, FileText
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import StatCard from '../ui/StatCard';
import Select from '../ui/Select';

export default function Analytics({
  reports: allReports = [],
  users = [],
  attendance: allAttendance = [],
  screenTime: allScreenTime = [],
  liveStatus: allLiveStatus = [],
  citizens: allCitizens = []
}) {
  const [metricTab, setMetricTab] = useState('registrations'); // 'registrations' | 'efficiency'

  // Filter only synced records
  const reports = useMemo(() =>
    (allReports || []).filter(r => r.synced === true),
    [allReports]
  );

  const citizens = useMemo(() =>
    (allCitizens || []).filter(c => c.synced === true),
    [allCitizens]
  );

  const attendance = useMemo(() =>
    (allAttendance || []).filter(a => a.synced === true),
    [allAttendance]
  );

  const screenTime = useMemo(() =>
    (allScreenTime || []).filter(s => s.synced === true),
    [allScreenTime]
  );

  const liveStatus = useMemo(() =>
    (allLiveStatus || []).filter(l => l.synced === true),
    [allLiveStatus]
  );

  // Compute metrics
  const totalReports = reports.length;
  const totalRegistrations = citizens.length;

  const daysWithReports = new Set(reports.map(r => r.reportDate || (r.submittedAt || '').slice(0, 10))).size || 1;
  const dailyAvg = Math.round(totalRegistrations / daysWithReports);

  const approvedReports = reports.filter(r => r.reviewed || r.operationalStatus === 'optimal' || r.operationalStatus === 'normal').length;
  const completionRate = totalReports > 0 ? Math.round((approvedReports / totalReports) * 100) : 0;

  // Region stats
  const regionStats = useMemo(() => {
    const map = {};
    reports.forEach(r => {
      const reg = r.region || 'Unassigned';
      if (!map[reg]) map[reg] = { region: reg, reports: 0, registrations: 0, employees: new Set() };
      map[reg].reports += 1;
    });
    citizens.forEach(c => {
      const reg = c.region || 'Unassigned';
      if (!map[reg]) map[reg] = { region: reg, reports: 0, registrations: 0, employees: new Set() };
      map[reg].registrations += 1;
      if (c.registeredBy) map[reg].employees.add(c.registeredBy);
    });
    return Object.values(map).map(data => ({
      ...data,
      employees: data.employees.size
    }));
  }, [reports, citizens]);

  // Employee performance
  const employeePerformance = useMemo(() => {
    const map = {};
    reports.forEach(r => {
      if (!map[r.employeeId]) {
        map[r.employeeId] = {
          employeeId: r.employeeId,
          employeeName: r.employeeName || 'Unknown Officer',
          region: r.region || 'N/A',
          totalReports: 0,
          totalRegistrations: 0,
          avgEfficiency: 0,
          attendanceRate: 0,
          totalWorkHours: 0,
          trustScore: 0
        };
      }
      map[r.employeeId].totalReports += 1;
    });

    citizens.forEach(c => {
      if (c.registeredBy && map[c.registeredBy]) {
        map[c.registeredBy].totalRegistrations += 1;
      }
    });

    attendance.forEach(a => {
      if (map[a.employeeId]) {
        const totalAtt = attendance.filter(att => att.employeeId === a.employeeId).length;
        const presentAtt = attendance.filter(att => att.employeeId === a.employeeId && att.status === 'present').length;
        map[a.employeeId].attendanceRate = totalAtt > 0 ? (presentAtt / totalAtt) * 100 : 0;
        map[a.employeeId].totalWorkHours += a.workHours || 0;
      }
    });

    screenTime.forEach(s => {
      if (map[s.employeeId]) {
        map[s.employeeId].trustScore = (s.trustScore && !isNaN(s.trustScore)) ? s.trustScore : 0;
      }
    });

    Object.values(map).forEach(emp => {
      emp.avgEfficiency = emp.totalReports > 0
        ? Math.min(100, Math.round((emp.totalRegistrations / (emp.totalReports * 15)) * 100))
        : 0;
    });

    return Object.values(map);
  }, [reports, citizens, attendance, screenTime]);

  const avgEfficiency = employeePerformance.length > 0
    ? Math.round(employeePerformance.reduce((sum, e) => sum + e.avgEfficiency, 0) / employeePerformance.length)
    : 0;

  const avgTrust = employeePerformance.length > 0
    ? Math.round(employeePerformance.reduce((sum, e) => sum + (e.trustScore || 0), 0) / employeePerformance.length)
    : 0;

  const topOfficers = useMemo(() => {
    return [...employeePerformance]
      .sort((a, b) => b.totalRegistrations - a.totalRegistrations)
      .slice(0, 5);
  }, [employeePerformance]);

  const lowPerformers = useMemo(() => {
    return [...employeePerformance]
      .filter(e => e.avgEfficiency > 0 && e.avgEfficiency < 35)
      .sort((a, b) => a.avgEfficiency - b.avgEfficiency)
      .slice(0, 3);
  }, [employeePerformance]);

  const totalOfficers = users?.filter(u => u.role === 'field_officer').length || 0;
  const totalSupervisors = users?.filter(u => u.role === 'supervisor').length || 0;

  // Chart Data preparation
  const chartData = useMemo(() => {
    if (regionStats.length === 0) return [];
    return regionStats.map(r => ({
      name: r.region,
      Registrations: r.registrations,
      Reports: r.reports,
      Staff: r.employees
    }));
  }, [regionStats]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#1E3A8A]" />
            Executive Field Operations Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Aggregated intelligence across registration outputs, regional throughput, and workforce efficiency
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="info">
            <span className="font-mono">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </Badge>
          <Badge variant="success">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {totalReports} Synced Reports
          </Badge>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Total Registrations"
          value={totalRegistrations}
          subtitle={`+${dailyAvg} daily average`}
          icon={Users}
          variant="primary"
        />
        <StatCard
          title="Report Completion"
          value={`${completionRate}%`}
          subtitle={`${approvedReports} verified`}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Avg Team Efficiency"
          value={`${avgEfficiency}%`}
          subtitle="Target threshold: 80%"
          icon={TrendingUp}
          variant={avgEfficiency >= 70 ? 'success' : 'warning'}
        />
        <StatCard
          title="Avg Trust Score"
          value={`${avgTrust}%`}
          subtitle="Screen time audit"
          icon={ShieldCheck}
          variant="info"
        />
        <StatCard
          title="Active Field Forces"
          value={totalOfficers + totalSupervisors}
          subtitle={`${totalOfficers} officers, ${totalSupervisors} sup.`}
          icon={Users}
          variant="default"
        />
      </div>

      {/* Low Performers Alert Callout */}
      {lowPerformers.length > 0 && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-rose-950">
                Performance Warning: {lowPerformers.length} Officer(s) Falling Below Minimum Throughput
              </h4>
              <p className="text-xs text-rose-800 mt-1">
                The following personnel recorded less than 35% efficiency and may require immediate supervisory intervention or field retraining:
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {lowPerformers.map(emp => (
                  <span key={emp.employeeId} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-rose-200 text-rose-900 shadow-2xs">
                    {emp.employeeName} ({emp.region}) — <strong className="ml-1 text-rose-700">{emp.avgEfficiency}% eff.</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Visualizations: 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Performance Recharts */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#1E3A8A]" />
                Regional Beneficiary Throughput
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Registered citizens and submitted reports per geographic zone
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="flex-1 pt-4">
            <div className="h-64 sm:h-72 w-full">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No regional data recorded yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      axisLine={{ stroke: '#CBD5E1' }}
                    />
                    <YAxis
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      axisLine={{ stroke: '#CBD5E1' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderRadius: '8px',
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: '12px'
                      }}
                      itemStyle={{ color: '#FFFFFF' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    />
                    <Bar
                      dataKey="Registrations"
                      fill="#1E3A8A"
                      radius={[4, 4, 0, 0]}
                      name="Citizens Registered"
                    />
                    <Bar
                      dataKey="Reports"
                      fill="#0284C7"
                      radius={[4, 4, 0, 0]}
                      name="Field Logs Submitted"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Top Zone: <strong className="text-slate-800">{regionStats.slice().sort((a, b) => b.registrations - a.registrations)[0]?.region || 'N/A'}</strong></span>
              <span>Total Active Zones: <strong className="text-slate-800">{regionStats.length}</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* Top Performers Leaderboard */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Field Officer Productivity Leaderboard
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Top 5 officers by verified registrations and operational efficiency
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 pt-3">
            {topOfficers.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                No officer performance data recorded yet
              </div>
            ) : (
              <div className="space-y-2.5">
                {topOfficers.map((emp, i) => (
                  <div
                    key={emp.employeeId}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                      i === 0
                        ? 'bg-amber-50/70 border-amber-200'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        i === 0 ? 'bg-amber-500 text-white' :
                        i === 1 ? 'bg-slate-300 text-slate-800' :
                        i === 2 ? 'bg-amber-700 text-white' :
                        'bg-slate-200 text-slate-600'
                      }`}>
                        #{i + 1}
                      </div>

                      <div>
                        <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                          {emp.employeeName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {emp.region} Region • ID: {emp.employeeId}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <div className="font-mono font-bold text-xs sm:text-sm text-[#1E3A8A]">
                          {emp.totalRegistrations} registered
                        </div>
                        <div className="text-[11px] text-emerald-600 font-medium">
                          {emp.avgEfficiency}% efficiency
                        </div>
                      </div>

                      <Badge variant={emp.attendanceRate >= 80 ? 'success' : 'neutral'}>
                        {Math.round(emp.attendanceRate)}% Att.
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
              Top registrar delivered <strong>{topOfficers[0]?.totalRegistrations || 0}</strong> verified citizen registrations
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regional Matrix Detailed Breakdown */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-200 bg-slate-50/50">
          <CardTitle className="text-sm sm:text-base font-semibold text-slate-900">
            Regional Throughput Matrix & Capacity
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Detailed performance breakdown across all regional administrative zones
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Geographic Region</th>
                  <th className="py-3 px-4 font-semibold">Assigned Staff</th>
                  <th className="py-3 px-4 font-semibold text-center">Submitted Reports</th>
                  <th className="py-3 px-4 font-semibold text-center">Registrations</th>
                  <th className="py-3 px-4 font-semibold">Relative Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {regionStats.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400 text-xs">
                      No regional activity recorded
                    </td>
                  </tr>
                ) : (
                  regionStats.map(r => {
                    const maxVal = Math.max(...regionStats.map(x => x.registrations)) || 1;
                    const pct = Math.round((r.registrations / maxVal) * 100);

                    return (
                      <tr key={r.region} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {r.region}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {r.employees} field personnel
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                          {r.reports}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-[#1E3A8A]">
                          {r.registrations}
                        </td>
                        <td className="py-3 px-4 w-48">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#1E3A8A] rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-mono text-slate-500 w-8 text-right">
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}