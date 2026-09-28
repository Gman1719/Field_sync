// src/components/analytics/Analytics.tsx
// Comparison Analytics & Demographic Intelligence Dashboard for FieldSync

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3, Users, MapPin, Calendar, Building2, Globe, ArrowUpDown,
  PieChart as PieIcon, RefreshCw, AlertOctagon
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import toast from 'react-hot-toast';

import { API_BASE } from '../../config/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';

const GENDER_PALETTE: Record<string, string> = {
  Female: '#EC4899',
  Male: '#3B82F6',
  Other: '#8B5CF6',
  Unknown: '#94A3B8'
};

const AGE_COLORS = ['#6366F1', '#0D9488', '#2563EB', '#D97706', '#16A34A', '#8B5CF6'];

export interface AnalyticsProps {
  user: any;
  setActiveTab?: (tab: string) => void;
  [key: string]: any;
}

export default function Analytics({ user, setActiveTab }: AnalyticsProps) {
  // Global Date Filtering State
  const [period, setPeriod] = useState<string>('month'); // 'today' | 'week' | 'month'

  // Manager Zone Filter State
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('all');

  // Specific Chart Filter States
  const [officerDisplayLimit, setOfficerDisplayLimit] = useState<number>(10);
  const [officerSortOrder, setOfficerSortOrder] = useState<'desc' | 'asc' | 'alpha'>('desc');

  // Data & Loading States
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const isSupervisor = user?.role === 'supervisor' || user?.role === 'SUPERVISOR';
  const isManager = user?.role === 'manager' || user?.role === 'MANAGER';

  // Fetch Dashboard Analytics from PostgreSQL
  const fetchDashboardAnalytics = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const token = localStorage.getItem('fieldsync_token');
      if (!token) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const params = new URLSearchParams();
      params.append('period', period);
      if (isManager && selectedZoneFilter !== 'all') {
        params.append('zoneId', selectedZoneFilter);
      }

      const res = await fetch(`${API_BASE}/analytics/dashboard?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setDashboardData(json.data);
          if (manual) toast.success('Analytics updated from database');
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson.error || 'Failed to load analytics dashboard');
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
      toast.error('Network error loading analytics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [period, selectedZoneFilter, isManager]);

  useEffect(() => {
    fetchDashboardAnalytics();
  }, [fetchDashboardAnalytics]);

  const d = dashboardData;

  // 1. Gender Data
  const genderChartData = useMemo(() => {
    if (!d?.citizens?.byGender) return [];
    return d.citizens.byGender.map((item: any) => ({
      name: item.name,
      count: item.count,
      percentage: item.percentage,
      color: GENDER_PALETTE[item.name] || '#94A3B8'
    }));
  }, [d]);

  const totalGenderCount = useMemo(() => {
    return genderChartData.reduce((acc: number, curr: any) => acc + curr.count, 0);
  }, [genderChartData]);

  // 2. Age Group Data
  const ageChartData = useMemo(() => {
    if (!d?.citizens?.byAgeGroup) return [];
    return d.citizens.byAgeGroup.map((item: any, idx: number) => ({
      group: item.label || item.group,
      description: item.description || '',
      count: item.count,
      percentage: item.percentage,
      fill: AGE_COLORS[idx % AGE_COLORS.length]
    }));
  }, [d]);

  // 3. Geographic Registration Data (Supervisor: by Woreda | Manager: by Zone)
  const locationComparisonData = useMemo(() => {
    if (isSupervisor) {
      if (!d?.citizens?.byWoreda) return [];
      return d.citizens.byWoreda.map((w: any) => ({
        name: w.woredaName,
        parentLocation: w.zoneName,
        registrations: w.count,
        percentage: w.percentage
      }));
    } else {
      if (!d?.citizens?.byZone) return [];
      return d.citizens.byZone.map((z: any) => ({
        name: z.zoneName,
        parentLocation: z.regionName,
        registrations: z.count,
        percentage: z.percentage
      }));
    }
  }, [d, isSupervisor]);

  // 4. Regional Registration Data
  const regionalData = useMemo(() => {
    if (!d?.citizens?.byRegion) return [];
    return d.citizens.byRegion.map((r: any) => ({
      region: r.regionName,
      registrations: r.count,
      percentage: r.percentage
    }));
  }, [d]);

  // 5. Officer Registration Comparison (Horizontal Bar Chart)
  const officerComparisonData = useMemo(() => {
    if (!d?.officers?.activityList) return [];
    let list = [...d.officers.activityList];

    // Sort order
    if (officerSortOrder === 'desc') {
      list.sort((a: any, b: any) => b.registrationsInPeriod - a.registrationsInPeriod);
    } else if (officerSortOrder === 'asc') {
      list.sort((a: any, b: any) => a.registrationsInPeriod - b.registrationsInPeriod);
    } else if (officerSortOrder === 'alpha') {
      list.sort((a: any, b: any) => a.fullName.localeCompare(b.fullName));
    }

    // Slice limit
    if (officerDisplayLimit > 0 && officerDisplayLimit < list.length) {
      list = list.slice(0, officerDisplayLimit);
    }

    // For horizontal bar chart, reverse so the highest appears at the top
    const formatted = list.map((o: any) => ({
      id: o.id,
      name: o.fullName,
      woreda: o.woredaName || 'Unassigned',
      registrations: o.registrationsInPeriod,
      screenTime: o.formattedScreenTime || '0m'
    }));

    if (officerSortOrder === 'desc') {
      return [...formatted].reverse();
    }
    return formatted;
  }, [d, officerSortOrder, officerDisplayLimit]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Scope Indicator */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200/90 dark:border-[#334155] rounded-2xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 text-[#1E3A8A] dark:text-blue-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
              {isSupervisor ? 'Zone Operations Intelligence' : 'Enterprise Field Operations Analytics'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isSupervisor
                ? `Telemetry & registration activity strictly scoped to your assigned Zone (${d?.scope?.effectiveZoneName || user?.zone?.name || 'Zone'})`
                : 'National comparative registration analytics across demographics, jurisdictions, and field officers'}
            </p>
          </div>
        </div>

        {/* Total Registrations in Period Quick Badge */}
        {d?.citizens && (
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#0F172A] px-4 py-2 rounded-xl border border-slate-200/90 dark:border-[#334155]">
            <div className="text-right">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Recorded</div>
              <div className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">
                {d.citizens.periodTotal.toLocaleString()} <span className="text-xs font-normal text-slate-400">citizens</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Global Filter Bar: Timeframe & Manager Zone Drilldown */}
      <Card className="border border-slate-200/90 dark:border-[#334155] shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Timeframe Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Timeframe:</span>
            </span>

            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week (7d)' },
              { id: 'month', label: 'This Month (30d)' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === p.id
                    ? 'bg-[#1E3A8A] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Manager Zone Dropdown Filter */}
          {isManager && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Zone Scope:</span>
              </span>
              <select
                value={selectedZoneFilter}
                onChange={(e) => setSelectedZoneFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#0F172A] text-slate-900 dark:text-[#F8FAFC] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1E3A8A]"
              >
                <option value="all">All Zones (National)</option>
                {d?.scope?.availableZones?.map((z: any) => (
                  <option key={z.id} value={z.id}>
                    {z.name} {z.regionName ? `(${z.regionName})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Supervisor Zone Badge (Strictly Scoped) */}
          {isSupervisor && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-blue-50/60 dark:bg-blue-950/40 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/50">
              <MapPin className="w-3.5 h-3.5 text-[#1E3A8A] dark:text-blue-400" />
              <span className="font-medium">Assigned Zone:</span>
              <span className="font-bold text-[#1E3A8A] dark:text-blue-300">{d?.scope?.effectiveZoneName || user?.zone?.name || 'Assigned Zone'}</span>
            </div>
          )}

          {/* Date Range Feedback Pill */}
          {d?.dateRange && (
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0F172A] px-2.5 py-1 rounded-md border border-slate-100 dark:border-[#334155]">
              {d.dateRange.startDate} → {d.dateRange.endDate} ({d.dateRange.days} days)
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="py-24 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#1E3A8A] dark:text-blue-400" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fetching records from database...</p>
          <p className="text-xs text-slate-400 mt-1">Aggregating field officer activity and geographic registrations</p>
        </div>
      ) : !d ? (
        <div className="py-20 text-center">
          <AlertOctagon className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Unable to load dashboard data</p>
          <Button onClick={() => fetchDashboardAnalytics(true)} className="mt-4" size="sm">Retry</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION 1: DEMOGRAPHICS (GENDER PIE CHART & AGE BAR CHART) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Citizen Registrations by Gender (Pie Chart) */}
            <Card className="border border-slate-200/90 dark:border-[#334155] shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
                    <span>Registered Citizens by Gender</span>
                  </span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    Total: {totalGenderCount.toLocaleString()}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Proportional gender breakdown of biographic registrations in the active timeframe
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64 w-full flex flex-col sm:flex-row items-center justify-around">
                  {totalGenderCount === 0 ? (
                    <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs">
                      No citizen registration records found in this timeframe
                    </div>
                  ) : (
                    <>
                      <div className="h-56 w-56 relative shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Tooltip
                              formatter={(value: any, name: any) => [
                                `${Number(value).toLocaleString()} citizens (${totalGenderCount > 0 ? Math.round((Number(value) / totalGenderCount) * 100) : 0}%)`,
                                name
                              ]}
                              contentStyle={{
                                backgroundColor: '#0F172A',
                                borderRadius: '8px',
                                border: '1px solid #334155',
                                color: '#FFF',
                                fontSize: '11px'
                              }}
                            />
                            <Pie
                              data={genderChartData}
                              dataKey="count"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={80}
                              paddingAngle={4}
                            >
                              {genderChartData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Center Metric */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC]">
                            {totalGenderCount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Total</span>
                        </div>
                      </div>

                      {/* Legend List with Proportions */}
                      <div className="space-y-3 w-full sm:w-48 mt-4 sm:mt-0">
                        {genderChartData.map((item: any) => (
                          <div key={item.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-100 dark:border-[#334155]">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-slate-900 dark:text-[#F8FAFC]">{item.count.toLocaleString()}</span>
                              <span className="text-[10px] text-slate-400 ml-1">({item.percentage}%)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Chart 2: Citizen Registrations by Age (Bar Chart) */}
            <Card className="border border-slate-200/90 dark:border-[#334155] shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
                    <span>Citizen Registrations by Age</span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64 w-full">
                  {ageChartData.length === 0 || d.citizens.periodTotal === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                      No citizen age data available in this timeframe
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ageChartData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                        <XAxis
                          dataKey="group"
                          tick={{ fontSize: 11, fill: '#64748B' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#64748B' }}
                          allowDecimals={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={false}
                          formatter={(value: any, name: any, props: any) => [
                            `${Number(value).toLocaleString()} citizens (${props.payload.percentage}%)`,
                            `${props.payload.group}`
                          ]}
                          contentStyle={{
                            backgroundColor: '#0F172A',
                            borderRadius: '8px',
                            border: '1px solid #334155',
                            color: '#FFF',
                            fontSize: '11px'
                          }}
                        />
                        <Bar
                          dataKey="count"
                          radius={[6, 6, 0, 0]}
                        >
                          {ageChartData.map((entry: any, index: number) => (
                            <Cell key={`age-cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SECTION 2: GEOGRAPHIC COMPARISONS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 3: Where Citizens Registered Comparison */}
            {/* For Supervisor: Compare Woredas in assigned zone */}
            {/* For Manager: Compare Zones */}
            <Card className="border border-slate-200/90 dark:border-[#334155] shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
                  <span>
                    {isSupervisor
                      ? `Citizen Registrations by Woreda (${d?.scope?.effectiveZoneName || 'Assigned Zone'})`
                      : 'Citizen Registrations by Zone'}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {isSupervisor
                    ? 'Comparative registration volume across woredas in your assigned zone'
                    : 'Comparative registration volume across administrative zones'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64 w-full">
                  {locationComparisonData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                      No location registration data recorded in this period
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={locationComparisonData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: '#64748B' }}
                          tickLine={false}
                          interval={0}
                          angle={locationComparisonData.length > 5 ? -25 : 0}
                          textAnchor={locationComparisonData.length > 5 ? 'end' : 'middle'}
                          height={locationComparisonData.length > 5 ? 45 : 30}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#64748B' }}
                          allowDecimals={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={false}
                          formatter={(value: any, name: any, props: any) => [
                            `${Number(value).toLocaleString()} citizens (${props.payload.percentage}%)`,
                            `${props.payload.name} (${props.payload.parentLocation})`
                          ]}
                          contentStyle={{
                            backgroundColor: '#0F172A',
                            borderRadius: '8px',
                            border: '1px solid #334155',
                            color: '#FFF',
                            fontSize: '11px'
                          }}
                        />
                        <Bar
                          dataKey="registrations"
                          name="Registrations"
                          fill="#0D9488"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Chart 4: Citizen Registrations by Region (Bar Chart) */}
            {/* For Supervisor: Scoped strictly to their assigned zone/region */}
            {/* For Manager: Compare registration volume across regions (Oromia, Amhara, Addis Ababa, Tigray...) */}
            <Card className="border border-slate-200/90 dark:border-[#334155] shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
                  <span>
                    {isSupervisor
                      ? `Regional Jurisdiction (${d?.scope?.effectiveRegionName || 'Assigned Region'})`
                      : 'Citizen Registrations by Region'}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {isSupervisor
                    ? `Registrations strictly scoped to your assigned zone in ${d?.scope?.effectiveRegionName || 'assigned region'}`
                    : 'Compare registration volume between Ethiopian Regional States'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64 w-full">
                  {regionalData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                      No regional registration records in this timeframe
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={regionalData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                        <XAxis
                          dataKey="region"
                          tick={{ fontSize: 10, fill: '#64748B' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#64748B' }}
                          allowDecimals={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(value: any, name: any, props: any) => [
                            `${Number(value).toLocaleString()} citizens (${props.payload.percentage}%)`,
                            props.payload.region
                          ]}
                          contentStyle={{
                            backgroundColor: '#0F172A',
                            borderRadius: '8px',
                            border: '1px solid #334155',
                            color: '#FFF',
                            fontSize: '11px'
                          }}
                        />
                        <Bar
                          dataKey="registrations"
                          name="Registrations"
                          fill="#1E3A8A"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SECTION 3: FIELD OFFICER REGISTRATION COMPARISON (HORIZONTAL BAR CHART) */}
          <Card className="border border-slate-200/90 dark:border-[#334155] shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
                    Field Officer Registration Comparison
                  </CardTitle>
                </div>

                {/* Officer Chart Controls & Filters */}
                <div className="flex items-center gap-2 text-xs">
                  {/* Display Limit Dropdown */}
                  <select
                    value={officerDisplayLimit}
                    onChange={(e) => setOfficerDisplayLimit(Number(e.target.value))}
                    className="px-2.5 py-1 text-xs border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#0F172A] text-slate-900 dark:text-[#F8FAFC] rounded-lg"
                  >
                    <option value={5}>Top 5</option>
                    <option value={10}>Top 10</option>
                    <option value={20}>Top 20</option>
                    <option value={0}>All Officers</option>
                  </select>

                  {/* Sort Order Toggle */}
                  <button
                    onClick={() => {
                      if (officerSortOrder === 'desc') setOfficerSortOrder('asc');
                      else if (officerSortOrder === 'asc') setOfficerSortOrder('alpha');
                      else setOfficerSortOrder('desc');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Change sort order"
                  >
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    <span>
                      {officerSortOrder === 'desc' ? 'High → Low' : officerSortOrder === 'asc' ? 'Low → High' : 'A → Z'}
                    </span>
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="w-full"
                style={{ height: `${Math.max(260, officerComparisonData.length * 36 + 50)}px` }}
              >
                {officerComparisonData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    No field officers found in database for this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={officerComparisonData}
                      margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.3} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: '#64748B' }}
                        allowDecimals={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#475569' }}
                        tickLine={false}
                        width={130}
                      />
                      <Tooltip
                        cursor={false}
                        formatter={(value: any, name: any, props: any) => [
                          `${Number(value).toLocaleString()} citizens`,
                          `${props.payload.name} (${props.payload.woreda})`
                        ]}
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderRadius: '8px',
                          border: '1px solid #334155',
                          color: '#FFF',
                          fontSize: '11px'
                        }}
                      />
                      <Bar
                        dataKey="registrations"
                        name="Recorded Registrations"
                        fill="#2563EB"
                        activeBar={{ fill: '#1D4ED8', stroke: '#60A5FA', strokeWidth: 1 }}
                        radius={[0, 6, 6, 0]}
                        barSize={18}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}