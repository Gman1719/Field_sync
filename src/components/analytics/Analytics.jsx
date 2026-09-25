// src/components/analytics/Analytics.jsx
// Enterprise Operations Intelligence & Regional Telemetry Console (Data-Driven PostgreSQL)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3, TrendingUp, Users, Award, MapPin, CheckCircle2,
  AlertTriangle, ShieldCheck, Clock, ArrowUpRight, ArrowDownRight,
  Layers, FileText, RefreshCw, Search, Filter, Eye, ChevronRight,
  Activity, Smartphone, Phone, Mail, Calendar, AlertOctagon,
  Database, CheckCheck, HelpCircle, ArrowRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area, PieChart,
  Pie, Cell
} from 'recharts';
import toast from 'react-hot-toast';

import { API_BASE } from '../../config/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import StatCard from '../ui/StatCard';
import Button from '../ui/Button';

const CHART_COLORS = ['#1E3A8A', '#0D9488', '#6366F1', '#D97706', '#16A34A', '#2563EB', '#EC4899', '#8B5CF6'];

export default function Analytics({ user, setActiveTab }) {
  // Navigation View State
  const [activeTabNav, setActiveTabNav] = useState('overview'); // 'overview' | 'registrations' | 'officers' | 'sync_quality' | 'reports' | 'sessions'

  // Date Filtering State
  const [period, setPeriod] = useState('month'); // 'today' | 'week' | 'month' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [appliedCustomStart, setAppliedCustomStart] = useState('');
  const [appliedCustomEnd, setAppliedCustomEnd] = useState('');

  // Manager Zone/Region Drilldown State
  const [selectedZoneFilter, setSelectedZoneFilter] = useState('all');

  // Data & Loading States
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [officerSearch, setOfficerSearch] = useState('');

  const isSupervisor = user?.role === 'supervisor' || user?.role === 'SUPERVISOR';
  const isManager = user?.role === 'manager' || user?.role === 'MANAGER';

  // Fetch Dashboard Analytics
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
      if (period === 'custom' && appliedCustomStart && appliedCustomEnd) {
        params.append('startDate', appliedCustomStart);
        params.append('endDate', appliedCustomEnd);
      }
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
          if (manual) toast.success('Analytics updated from PostgreSQL');
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
  }, [period, appliedCustomStart, appliedCustomEnd, selectedZoneFilter, isManager]);

  useEffect(() => {
    fetchDashboardAnalytics();
  }, [fetchDashboardAnalytics]);

  const handleApplyCustomRange = (e) => {
    e.preventDefault();
    if (!customStart || !customEnd) {
      toast.error('Please select both start and end dates');
      return;
    }
    if (new Date(customStart) > new Date(customEnd)) {
      toast.error('Start date cannot be after end date');
      return;
    }
    setAppliedCustomStart(customStart);
    setAppliedCustomEnd(customEnd);
  };

  // Filtered officers list
  const filteredOfficers = useMemo(() => {
    if (!dashboardData?.officers?.activityList) return [];
    if (!officerSearch.trim()) return dashboardData.officers.activityList;
    const q = officerSearch.toLowerCase().trim();
    return dashboardData.officers.activityList.filter(o =>
      o.fullName?.toLowerCase().includes(q) ||
      o.email?.toLowerCase().includes(q) ||
      o.woredaName?.toLowerCase().includes(q)
    );
  }, [dashboardData, officerSearch]);

  const d = dashboardData;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Banner & Scope Indicator */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200/90 dark:border-[#334155] rounded-2xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 text-[#1E3A8A] dark:text-blue-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
                  {isSupervisor ? 'Zone Operations Intelligence' : 'Enterprise Field Operations Analytics'}
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>PostgreSQL Live</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isSupervisor
                  ? `Telemetry & registration activity strictly scoped to your assigned Zone (${d?.scope?.effectiveZoneName || 'Zone'})`
                  : 'Real-time organization-wide operational statistics, registration telemetry, and sync monitoring'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Refresh Button */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardAnalytics(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#1E3A8A] dark:text-blue-400' : ''}`} />
            <span>Refresh Data</span>
          </Button>
        </div>
      </div>

      {/* 2. Date Filtering Bar */}
      <Card className="border border-slate-200/90 dark:border-[#334155] shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Timeframe:</span>
            </span>

            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week (7d)' },
              { id: 'month', label: 'This Month (30d)' },
              { id: 'custom', label: 'Custom Range' },
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

          {/* Custom Date Range Picker Form */}
          {period === 'custom' && (
            <form onSubmit={handleApplyCustomRange} className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#0F172A] text-slate-900 dark:text-[#F8FAFC] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1E3A8A]"
                required
              />
              <span className="text-slate-400 font-semibold">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#0F172A] text-slate-900 dark:text-[#F8FAFC] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1E3A8A]"
                required
              />
              <Button type="submit" size="sm" className="px-3 py-1 text-xs bg-[#1E3A8A] text-white">
                Apply
              </Button>
            </form>
          )}

          {/* Active Period Label */}
          {d?.dateRange && (
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0F172A] px-2.5 py-1 rounded-md border border-slate-100 dark:border-[#334155]">
              {d.dateRange.startDate} → {d.dateRange.endDate} ({d.dateRange.days} days)
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Section Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-[#334155] overflow-x-auto space-x-1">
        {[
          { id: 'overview', label: 'Overview & KPIs', icon: BarChart3 },
          { id: 'registrations', label: 'Citizen Registrations', icon: Database },
          { id: 'officers', label: 'Field Officer Activity', icon: Users },
          { id: 'sync_quality', label: 'Sync & Data Quality', icon: RefreshCw },
          { id: 'reports', label: 'Daily Work Reports', icon: FileText },
          { id: 'sessions', label: 'Work Sessions & Telemetry', icon: Smartphone },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTabNav === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTabNav(tab.id)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-[#1E3A8A] text-[#1E3A8A] dark:text-blue-400 dark:border-blue-400 bg-blue-50/40 dark:bg-blue-950/40 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-[#F8FAFC] hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="py-24 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#1E3A8A]" />
          <p className="text-sm font-semibold text-slate-700">Aggregating PostgreSQL telemetry...</p>
          <p className="text-xs text-slate-400 mt-1">Calculating role-scoped metrics and geographic hierarchies</p>
        </div>
      ) : !d ? (
        <div className="py-20 text-center">
          <AlertOctagon className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">Unable to load dashboard data</p>
          <Button onClick={() => fetchDashboardAnalytics(true)} className="mt-4" size="sm">Retry</Button>
        </div>
      ) : (
        <>
          {/* TAB 1: EXECUTIVE OVERVIEW & KPIS */}
          {activeTabNav === 'overview' && (
            <div className="space-y-6">
              {/* Primary KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-slate-200/90 dark:border-[#334155] shadow-xs">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                      <span>Registrations (Period)</span>
                      <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#1E3A8A] dark:text-blue-400">
                        <Database className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
                        {d.citizens.periodTotal.toLocaleString()}
                      </span>
                      <span className={`text-[11px] font-semibold flex items-center ${
                        d.citizens.percentChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {d.citizens.percentChange >= 0 ? '+' : ''}{d.citizens.percentChange}%
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-[#334155] text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                      <span>All-time total:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{d.citizens.allTimeTotal.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-slate-200/90 dark:border-[#334155] shadow-xs">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                      <span>Sync Success Rate</span>
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                        <CheckCheck className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
                        {d.syncAnalytics.successRatePercentage}%
                      </span>
                      <span className="text-[11px] text-slate-400">
                        ({d.syncAnalytics.serverConfirmedRecords} confirmed)
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-[#334155] text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                      <span>Pending offline:</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{d.syncAnalytics.pendingOfflineRecords}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-slate-200/90 dark:border-[#334155] shadow-xs">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                      <span>Daily Report Submission</span>
                      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                        <FileText className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
                        {d.dailyReports.totalSubmitted}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        / {d.dailyReports.expectedReports} expected
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-[#334155] text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                      <span>Awaiting review:</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{d.dailyReports.awaitingReview}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-slate-200/90 dark:border-[#334155] shadow-xs">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                      <span>Data Quality Rate</span>
                      <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
                        {d.dataQuality.validationRatePercentage}%
                      </span>
                      <span className="text-[11px] text-slate-400">valid</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-[#334155] text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                      <span>Duplicate reviews:</span>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">{d.dataQuality.possibleDuplicatesCount}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Registration Trend Chart & Geographic Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border border-slate-200/90 dark:border-[#334155] shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] flex items-center justify-between">
                      <span>Registration Activity Trend</span>
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Daily Timeline</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Daily citizen registration distribution across the selected timeframe
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="h-64 w-full">
                      {d.citizens.dailyTrends?.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                          No registration records in this date range
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={d.citizens.dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1E3A8A" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} tickLine={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', border: '1px solid #334155', color: '#FFF', fontSize: '11px' }}
                              labelStyle={{ fontWeight: 'bold' }}
                            />
                            <Area type="monotone" dataKey="count" name="Registrations" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#regGrad)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Administrative Locations Comparison */}
                <Card className="border border-slate-200/90 dark:border-[#334155] shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
                      {isSupervisor ? 'Top Woredas in Zone' : 'Top Zones by Registrations'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Comparative registration volume
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="space-y-3">
                      {(isSupervisor ? d.citizens.byWoreda : d.citizens.byZone).slice(0, 5).map((loc, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                              {loc.woredaName || loc.zoneName}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-[#F8FAFC]">{loc.count} ({loc.percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-[#1E3A8A] dark:bg-blue-500 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, loc.percentage)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                      {(isSupervisor ? d.citizens.byWoreda : d.citizens.byZone).length === 0 && (
                        <div className="py-12 text-center text-slate-400 text-xs">
                          No location breakdown available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Prolonged Delay & Sync Alert Callout */}
              {d.officers.prolongedSyncDelaysCount > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Synchronization Delays Detected ({d.officers.prolongedSyncDelaysCount} Field Officers)
                    </h3>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                      The following field officers have not synchronized local fieldwork records for over 24 hours:{' '}
                      <span className="font-semibold">
                        {d.officers.prolongedSyncDelays.map(o => o.fullName).join(', ')}
                      </span>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CITIZEN REGISTRATION ANALYTICS */}
          {activeTabNav === 'registrations' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-slate-200/90 shadow-xs p-4">
                  <span className="text-xs text-slate-400 uppercase font-bold block">Period Total</span>
                  <span className="text-2xl font-bold text-slate-900 mt-1 block">
                    {d.citizens.periodTotal.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500">Citizens registered in selected date range</span>
                </Card>
                <Card className="border border-slate-200/90 shadow-xs p-4">
                  <span className="text-xs text-slate-400 uppercase font-bold block">All-Time Cumulative</span>
                  <span className="text-2xl font-bold text-slate-900 mt-1 block">
                    {d.citizens.allTimeTotal.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500">Total database registration volume</span>
                </Card>
                <Card className="border border-slate-200/90 shadow-xs p-4">
                  <span className="text-xs text-slate-400 uppercase font-bold block">Period-over-Period</span>
                  <span className={`text-2xl font-bold mt-1 block ${d.citizens.percentChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {d.citizens.percentChange >= 0 ? '+' : ''}{d.citizens.percentChange}%
                  </span>
                  <span className="text-xs text-slate-500">Comparison to previous {d.dateRange.days} days</span>
                </Card>
              </div>

              {/* Geographic Breakdown Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Woreda Breakdown */}
                <Card className="border border-slate-200/90 dark:border-[#334155] shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
                      Woreda Registration Distribution
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Registrations by Woreda within {isSupervisor ? 'your Zone' : 'organization'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-[#334155] text-slate-600 dark:text-slate-200 font-bold text-[11px] uppercase tracking-wider bg-slate-50/90 dark:bg-[#0F172A]">
                            <th className="py-2 px-2">Woreda</th>
                            <th className="py-2 px-2">Zone</th>
                            <th className="py-2 px-2 text-right">Registrations</th>
                            <th className="py-2 px-2 text-right">Share</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                          {d.citizens.byWoreda.length === 0 ? (
                            <tr><td colSpan={4} className="py-8 text-center text-slate-400 dark:text-slate-500">No records found</td></tr>
                          ) : (
                            d.citizens.byWoreda.map((w, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-[#0F172A]/50">
                                <td className="py-2 px-2 font-medium text-slate-800 dark:text-slate-200">{w.woredaName}</td>
                                <td className="py-2 px-2 text-slate-500 dark:text-slate-400">{w.zoneName}</td>
                                <td className="py-2 px-2 text-right font-semibold text-slate-900 dark:text-[#F8FAFC]">{w.count}</td>
                                <td className="py-2 px-2 text-right text-slate-500 dark:text-slate-400">{w.percentage}%</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Region / Zone Breakdown for Manager */}
                {isManager && (
                  <Card className="border border-slate-200/90 dark:border-[#334155] shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
                        Regional Distribution (National Scope)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Aggregate registrations across Ethiopian Regional States
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-[#334155] text-slate-600 dark:text-slate-200 font-bold text-[11px] uppercase tracking-wider bg-slate-50/90 dark:bg-[#0F172A]">
                              <th className="py-2 px-2">Region</th>
                              <th className="py-2 px-2 text-right">Registrations</th>
                              <th className="py-2 px-2 text-right">Share</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                            {d.citizens.byRegion.length === 0 ? (
                              <tr><td colSpan={3} className="py-8 text-center text-slate-400 dark:text-slate-500">No records found</td></tr>
                            ) : (
                              d.citizens.byRegion.map((r, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-[#0F172A]/50">
                                  <td className="py-2 px-2 font-medium text-slate-800 dark:text-slate-200">{r.regionName}</td>
                                  <td className="py-2 px-2 text-right font-semibold text-slate-900 dark:text-[#F8FAFC]">{r.count}</td>
                                  <td className="py-2 px-2 text-right text-slate-500 dark:text-slate-400">{r.percentage}%</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FIELD OFFICER ACTIVITY & ASSIGNMENT COVERAGE */}
          {activeTabNav === 'officers' && (
            <div className="space-y-6">
              {/* Assignment Coverage Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-slate-200/90 dark:border-[#334155] shadow-xs p-4">
                  <span className="text-xs text-slate-400 uppercase font-bold block">Active Officers</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] mt-1 block">
                    {d.assignmentCoverage.totalActiveOfficers}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Currently active in fieldwork</span>
                </Card>
                <Card className="border border-slate-200/90 dark:border-[#334155] shadow-xs p-4">
                  <span className="text-xs text-slate-400 uppercase font-bold block">Woreda Coverage</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] mt-1 block">
                    {d.assignmentCoverage.woredaCoveragePercentage}%
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {d.assignmentCoverage.coveredWoredas} of {d.assignmentCoverage.totalWoredas} woredas assigned
                  </span>
                </Card>
                <Card className="border border-slate-200/90 dark:border-[#334155] shadow-xs p-4">
                  <span className="text-xs text-slate-400 uppercase font-bold block">Supervisor Coverage</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] mt-1 block">
                    {d.assignmentCoverage.zoneCoveragePercentage}%
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {d.assignmentCoverage.coveredZones} of {d.assignmentCoverage.totalZones} zones covered
                  </span>
                </Card>
                <Card className="border border-slate-200/90 dark:border-[#334155] shadow-xs p-4">
                  <span className="text-xs text-slate-400 uppercase font-bold block">Assigned vs Unassigned</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{d.assignmentCoverage.assignedOfficersCount}</span>
                    <span className="text-xs text-slate-400">assigned /</span>
                    <span className="text-lg font-semibold text-rose-500 dark:text-rose-400">{d.assignmentCoverage.unassignedOfficersCount}</span>
                    <span className="text-xs text-slate-400">unassigned</span>
                  </div>
                </Card>
              </div>

              {/* Zones without Active Supervisor (Manager View) */}
              {isManager && d.assignmentCoverage.zonesWithoutSupervisor?.length > 0 && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>Administrative Coverage Gap: {d.assignmentCoverage.zonesWithoutSupervisor.length} Zones Without Active Supervisor</span>
                  </div>
                  <p className="text-xs text-rose-700 dark:text-rose-300">
                    The following administrative zones have no supervisor assigned: {d.assignmentCoverage.zonesWithoutSupervisor.slice(0, 10).map(z => z.name).join(', ')}.
                  </p>
                </div>
              )}

              {/* Field Officers Detailed Activity Table */}
              <Card className="border border-slate-200/90 dark:border-[#334155] shadow-xs overflow-hidden">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
                      Field Officer Telemetry & Activity Roster
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Recorded citizen registrations, daily work reports, and synchronization health
                    </CardDescription>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={officerSearch}
                      onChange={(e) => setOfficerSearch(e.target.value)}
                      placeholder="Search officer name or woreda..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] text-slate-900 dark:text-[#F8FAFC] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1E3A8A]"
                    />
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/90 dark:bg-[#0F172A] border-b border-slate-200 dark:border-[#334155] text-slate-600 dark:text-slate-200 font-bold text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 px-4">Field Officer</th>
                        <th className="py-2.5 px-4">Woreda</th>
                        <th className="py-2.5 px-4 text-right">Registrations</th>
                        <th className="py-2.5 px-4 text-right">Reports</th>
                        <th className="py-2.5 px-4 text-right">Screen Time</th>
                        <th className="py-2.5 px-4 text-right">Last Sync</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#334155] text-slate-700 dark:text-slate-300">
                      {filteredOfficers.length === 0 ? (
                        <tr><td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">No matching officers found</td></tr>
                      ) : (
                        filteredOfficers.map((o) => (
                          <tr key={o.id} className="hover:bg-slate-50/60 dark:hover:bg-[#0F172A]/50">
                            <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-[#F8FAFC]">
                              <div>{o.fullName}</div>
                              <div className="text-[10px] text-slate-400">{o.email}</div>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{o.woredaName}</td>
                            <td className="py-2.5 px-4 text-right font-semibold text-slate-900 dark:text-[#F8FAFC]">
                              {o.registrationsInPeriod}
                              <span className="text-[10px] text-slate-400 font-normal ml-1">({o.lastSyncTime ? 'synced' : '0'})</span>
                            </td>
                            <td className="py-2.5 px-4 text-right text-slate-800 dark:text-slate-200">{o.reportsSubmitted}</td>
                            <td className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-300">{o.formattedScreenTime}</td>
                            <td className="py-2.5 px-4 text-right text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                              {o.hoursSinceSync === 0 ? 'Just now' : `${o.hoursSinceSync}h ago`}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                o.syncStatus === 'HEALTHY'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : o.syncStatus === 'DELAYED'
                                  ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  : 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              }`}>
                                {o.syncStatus === 'PROLONGED_DELAY' ? '>24h Delay' : o.syncStatus}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: SYNCHRONIZATION & DATA QUALITY */}
          {activeTabNav === 'sync_quality' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Synchronization Health */}
                <Card className="border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#1E293B] shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
                      <span>Synchronization Health & Pipeline</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                      Server-confirmed records versus local offline pending status
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/50 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Confirmed Synced</span>
                        <span className="text-xl font-bold text-emerald-900 dark:text-emerald-300 block mt-1">
                          {d.syncAnalytics.serverConfirmedRecords}
                        </span>
                      </div>
                      <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800/50 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">Pending Sync</span>
                        <span className="text-xl font-bold text-amber-900 dark:text-amber-300 block mt-1">
                          {d.syncAnalytics.pendingOfflineRecords}
                        </span>
                      </div>
                      <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/50 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400">Sync Failures</span>
                        <span className="text-xl font-bold text-rose-900 dark:text-rose-300 block mt-1">
                          {d.syncAnalytics.failedSyncRecords}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1 text-slate-700 dark:text-slate-300">
                      <div className="font-semibold text-slate-900 dark:text-[#F8FAFC]">Device-Reported vs Server-Confirmed:</div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        {d.syncAnalytics.deviceReportedPendingCount > 0
                          ? `Field tablets reported ${d.syncAnalytics.deviceReportedPendingCount} pending records queued in local device storage awaiting connection.`
                          : 'All device-reported local records are currently synchronized with PostgreSQL.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Data Quality & Conflict Console */}
                <Card className="border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#1E293B] shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>Data Quality & Duplicate Adjudication</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                      Record completeness and potential duplicate conflict reviews
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3.5 bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800/50 rounded-xl">
                      <div>
                        <div className="text-xs font-bold text-purple-950 dark:text-purple-200">Record Validation Pass Rate</div>
                        <div className="text-[11px] text-purple-700 dark:text-purple-400 mt-0.5">Complete address, community & demographics</div>
                      </div>
                      <span className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                        {d.dataQuality.validationRatePercentage}%
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700/60">
                        <span className="text-slate-600 dark:text-slate-400">Possible Duplicate Reviews Pending:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{d.dataQuality.possibleDuplicatesCount}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700/60">
                        <span className="text-slate-600 dark:text-slate-400">Confirmed Duplicates Identified:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{d.dataQuality.confirmedDuplicatesCount}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700/60">
                        <span className="text-slate-600 dark:text-slate-400">Records Missing Phone Number:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{d.dataQuality.missingDataBreakdown.missingPhoneNumber}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-600 dark:text-slate-400">Records Missing Date of Birth:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{d.dataQuality.missingDataBreakdown.missingDobOrAge}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 5: DAILY WORK REPORTS */}
          {activeTabNav === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#1E293B] shadow-xs p-4">
                  <span className="text-xs text-slate-400 dark:text-slate-400 uppercase font-bold block">Submitted Reports</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] mt-1 block">
                    {d.dailyReports.totalSubmitted}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">In selected timeframe</span>
                </Card>
                <Card className="border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#1E293B] shadow-xs p-4">
                  <span className="text-xs text-slate-400 dark:text-slate-400 uppercase font-bold block">Expected Reports</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] mt-1 block">
                    {d.dailyReports.expectedReports}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Based on working roster</span>
                </Card>
                <Card className="border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#1E293B] shadow-xs p-4">
                  <span className="text-xs text-slate-400 dark:text-slate-400 uppercase font-bold block">Submission Rate</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] mt-1 block">
                    {d.dailyReports.submissionRatePercentage}%
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Fulfillment compliance</span>
                </Card>
                <Card className="border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#1E293B] shadow-xs p-4">
                  <span className="text-xs text-slate-400 dark:text-slate-400 uppercase font-bold block">Review Pipeline</span>
                  <div className="flex items-baseline gap-1 mt-1 text-xs">
                    <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{d.dailyReports.awaitingReview}</span>
                    <span className="text-slate-400">pending ·</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{d.dailyReports.reviewed}</span>
                    <span className="text-slate-400">done</span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">
                    {d.dailyReports.returnedForCorrection} returned for correction
                  </span>
                </Card>
              </div>

              {/* Report Trend Chart */}
              <Card className="border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#1E293B] shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
                    Daily Report Submissions Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    {d.dailyReports.dailyTrends?.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                        No report submissions in this period
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={d.dailyReports.dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" strokeOpacity={0.3} />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} allowDecimals={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#F8FAFC', fontSize: '11px' }} />
                          <Bar dataKey="count" name="Reports Submitted" fill="#2563EB" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 6: WORK SESSIONS & OPERATIONAL TELEMETRY */}
          {activeTabNav === 'sessions' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#1E293B] shadow-xs p-4">
                  <span className="text-xs text-slate-400 dark:text-slate-400 uppercase font-bold block">Work Sessions</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] mt-1 block">
                    {d.workSessions.totalSessions}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Recorded fieldwork app sessions</span>
                </Card>
                <Card className="border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#1E293B] shadow-xs p-4">
                  <span className="text-xs text-slate-400 dark:text-slate-400 uppercase font-bold block">Total Fieldwork Time</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] mt-1 block">
                    {d.workSessions.formattedDuration}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Cumulative active operational duration</span>
                </Card>
                <Card className="border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#1E293B] shadow-xs p-4">
                  <span className="text-xs text-slate-400 dark:text-slate-400 uppercase font-bold block">Average Session Length</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] mt-1 block">
                    {d.workSessions.formattedAverageSession}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Per work session recorded</span>
                </Card>
              </div>

              {/* Recent Activity Timeline Stream */}
              <Card className="border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#1E293B] shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
                    <span>Real-Time Field Activity Timeline</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {d.workSessions.recentActivity?.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">No recent activity logs recorded</div>
                    ) : (
                      d.workSessions.recentActivity.map((log) => (
                        <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{log.officerName}</span>
                            {log.woredaName && <span className="text-slate-400 ml-1.5">({log.woredaName})</span>}
                            <p className="text-slate-600 dark:text-slate-300 mt-0.5">{log.description}</p>
                          </div>
                          <span className="text-slate-400 font-mono text-[11px] shrink-0">
                            {new Date(log.deviceTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}