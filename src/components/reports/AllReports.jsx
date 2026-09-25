// src/components/reports/AllReports.jsx – Enterprise All Reports Overview

import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText, Search, Download, Filter, Calendar,
  RefreshCw, CheckCircle2, Clock, AlertTriangle,
  UserCheck, ShieldCheck, Star, Layers, MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';

import { exportCSV, exportJSON } from '../../utils/helpers';
import { syncQueue, checkRealInternet } from '../../services/database';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';
import StatCard from '../ui/StatCard';

export default function AllReports({ reports = [], users = [], supervisorReports = [] }) {
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'supervisor'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  // Check online status and pending sync count
  useEffect(() => {
    const checkStatus = async () => {
      const online = await checkRealInternet();
      setIsOnline(online);
      const count = syncQueue.count();
      setPendingCount(count);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 3000);

    const handleQueueUpdate = () => {
      setPendingCount(syncQueue.count());
    };
    window.addEventListener('sync-queue-updated', handleQueueUpdate);
    window.addEventListener('sync-complete', handleQueueUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('sync-queue-updated', handleQueueUpdate);
      window.removeEventListener('sync-complete', handleQueueUpdate);
    };
  }, []);

  // Format date/time
  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if report is new (< 24h)
  const isNewReport = (report) => {
    const dateStr = report.submittedAt || report.createdAt || report.reportDate;
    if (!dateStr) return false;
    const reportDate = new Date(dateStr);
    const now = new Date();
    const diffHours = (now - reportDate) / (1000 * 60 * 60);
    return diffHours < 24;
  };

  // Synced daily reports
  const syncedReports = useMemo(() => {
    return reports
      .filter(r => r.synced === true)
      .sort((a, b) => {
        const dateA = a.submittedAt || a.createdAt || a.reportDate;
        const dateB = b.submittedAt || b.createdAt || b.reportDate;
        return new Date(dateB) - new Date(dateA);
      });
  }, [reports]);

  // Filtered daily reports
  const filteredReports = useMemo(() => {
    let filtered = syncedReports;

    if (selectedRegion !== 'All') {
      filtered = filtered.filter(r => r.region === selectedRegion);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.siteName?.toLowerCase().includes(q) ||
        r.employeeName?.toLowerCase().includes(q) ||
        r.region?.toLowerCase().includes(q)
      );
    }

    if (dateRange.start) {
      filtered = filtered.filter(r => (r.reportDate || r.submittedAt) >= dateRange.start);
    }
    if (dateRange.end) {
      filtered = filtered.filter(r => (r.reportDate || r.submittedAt) <= dateRange.end);
    }

    return filtered;
  }, [syncedReports, selectedRegion, searchTerm, dateRange]);

  // Filtered supervisor reports
  const filteredSupervisorReports = useMemo(() => {
    let filtered = supervisorReports || [];
    if (selectedRegion !== 'All') {
      filtered = filtered.filter(r => r.region === selectedRegion);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.supervisorName?.toLowerCase().includes(q) ||
        r.officerName?.toLowerCase().includes(q) ||
        r.region?.toLowerCase().includes(q)
      );
    }
    return filtered
      .filter(r => r.synced !== false)
      .sort((a, b) => {
        const dateA = a.submittedAt || a.createdAt || a.reportDate;
        const dateB = b.submittedAt || b.createdAt || b.reportDate;
        return new Date(dateB) - new Date(dateA);
      });
  }, [supervisorReports, selectedRegion, searchTerm]);

  // Count offline reports
  const offlineCount = useMemo(() => {
    return reports.filter(r => r.synced === false).length;
  }, [reports]);

  // Total registrations in filtered reports
  const totalFilteredRegistrations = useMemo(() => {
    return filteredReports.reduce((sum, r) => sum + (Number(r.registrations) || 0), 0);
  }, [filteredReports]);

  // Export handlers
  const handleExportCSV = (data, filename) => {
    if (!data || data.length === 0) {
      toast.error('No data available to export');
      return;
    }
    exportCSV(data, filename);
    toast.success(`Exported ${data.length} records to CSV`);
  };

  const handleExportJSON = (data, filename) => {
    if (!data || data.length === 0) {
      toast.error('No data available to export');
      return;
    }
    exportJSON(data, filename);
    toast.success(`Exported ${data.length} records to JSON`);
  };

  const handleForceSync = () => {
    window.dispatchEvent(new Event('force-sync'));
    toast.success('Sync triggered. Processing queued items...');
  };

  const regions = ['All', 'North', 'South', 'East', 'West', 'Central'];

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#1E3A8A]" />
            Enterprise Reports Repository
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Complete centralized audit of field officer submissions and supervisor evaluations
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={isOnline ? 'success' : 'error'}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
          {offlineCount > 0 && (
            <Badge variant="warning">
              <Clock className="w-3 h-3 mr-1" />
              {offlineCount} offline pending
            </Badge>
          )}
          {isOnline && offlineCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleForceSync}
              className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-emerald-600 animate-spin" />
              Sync Now
            </Button>
          )}
        </div>
      </div>

      {/* Offline Alert Callout */}
      {offlineCount > 0 && (
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{offlineCount} report(s)</strong> are currently stored in local IndexedDB. They will automatically sync once a stable connection is verified.
            </span>
          </div>
          {isOnline && (
            <Button size="sm" variant="primary" onClick={handleForceSync} className="text-xs shrink-0 self-start sm:self-auto">
              <RefreshCw className="w-3 h-3 mr-1" /> Push Queue Now
            </Button>
          )}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Reports"
          value={reports.length}
          subtitle="System lifetime"
          icon={Layers}
          variant="default"
        />
        <StatCard
          title="Synced Reports"
          value={syncedReports.length}
          subtitle="Verified on server"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Filtered Citizens"
          value={totalFilteredRegistrations}
          subtitle="Across visible records"
          icon={UserCheck}
          variant="info"
        />
        <StatCard
          title="Supervisor Evals"
          value={supervisorReports.length}
          subtitle="Audits completed"
          icon={ShieldCheck}
          variant="primary"
        />
      </div>

      {/* Tabs & Search / Filter Controls */}
      <Card className="border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#1E293B]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#0F172A] rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'daily'
                  ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Daily Field Reports ({filteredReports.length})
            </button>
            <button
              onClick={() => setActiveTab('supervisor')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'supervisor'
                  ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Supervisor Evaluations ({filteredSupervisorReports.length})
            </button>
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCSV(
                activeTab === 'daily' ? filteredReports : filteredSupervisorReports,
                activeTab === 'daily' ? 'daily_field_reports' : 'supervisor_evaluations'
              )}
              className="text-xs dark:border-slate-700 dark:text-slate-300 dark:hover:bg-[#0F172A]"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-slate-600 dark:text-slate-400" /> Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportJSON(
                activeTab === 'daily' ? filteredReports : filteredSupervisorReports,
                activeTab === 'daily' ? 'daily_field_reports' : 'supervisor_evaluations'
              )}
              className="text-xs dark:border-slate-700 dark:text-slate-300 dark:hover:bg-[#0F172A]"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-slate-600 dark:text-slate-400" /> Export JSON
            </Button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-slate-50/50 dark:bg-[#182234]/50 border-b border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Input
              placeholder="Search site, officer, region..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-xs sm:text-sm"
            />
          </div>

          <div>
            <Select
              value={selectedRegion}
              onChange={e => setSelectedRegion(e.target.value)}
              className="w-full text-xs sm:text-sm"
            >
              {regions.map(r => (
                <option key={r} value={r}>
                  {r === 'All' ? 'All Geographic Regions' : `${r} Region`}
                </option>
              ))}
            </Select>
          </div>

          {activeTab === 'daily' ? (
            <>
              <div>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                  placeholder="Start Date"
                  className="w-full text-xs sm:text-sm"
                />
              </div>
              <div>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                  placeholder="End Date"
                  className="w-full text-xs sm:text-sm"
                />
              </div>
            </>
          ) : (
            <div className="lg:col-span-2 flex items-center justify-end text-xs text-slate-500 dark:text-slate-400">
              Showing evaluated performance scores and operational field ratings
            </div>
          )}
        </div>

        {/* Content Table */}
        <CardContent className="p-0">
          {activeTab === 'daily' ? (
            /* DAILY FIELD REPORTS TABLE */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50/90 dark:bg-[#0F172A] text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-[#334155]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Submitted</th>
                    <th className="py-3 px-4 font-semibold">Field Officer</th>
                    <th className="py-3 px-4 font-semibold">Site / Location</th>
                    <th className="py-3 px-4 font-semibold">Region</th>
                    <th className="py-3 px-4 font-semibold text-center">Registrations</th>
                    <th className="py-3 px-4 font-semibold">Attendance</th>
                    <th className="py-3 px-4 font-semibold">Operational Status</th>
                    <th className="py-3 px-4 font-semibold text-center">Sync</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No daily reports match criteria</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Adjust search parameters or region filters</p>
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map(r => {
                      const isNew = isNewReport(r);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            {formatDateTime(r.submittedAt || r.createdAt || r.reportDate)}
                            {isNew && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 uppercase">
                                New
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-[#F8FAFC]">
                            {r.employeeName || 'Unknown Officer'}
                            <div className="text-[11px] text-slate-400 font-normal">
                              ID: {r.employeeId || 'N/A'}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                            {r.siteName || 'N/A'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700">
                              <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                              {r.region || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-[#F8FAFC] font-mono">
                            {r.registrations ?? 0}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={
                              r.attendance === 'present' ? 'success' :
                              r.attendance === 'late' ? 'warning' : 'neutral'
                            }>
                              {r.attendance || 'Present'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={
                              r.operationalStatus === 'optimal' || r.operationalStatus === 'normal' ? 'success' :
                              r.operationalStatus === 'issues' || r.operationalStatus === 'warning' ? 'warning' : 'neutral'
                            }>
                              {r.operationalStatus || 'Standard'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={r.synced ? 'success' : 'warning'}>
                              {r.synced ? (
                                <><CheckCircle2 className="w-3 h-3 mr-1" /> Synced</>
                              ) : (
                                <><Clock className="w-3 h-3 mr-1" /> Pending</>
                              )}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* SUPERVISOR REPORTS TABLE */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50/90 dark:bg-[#0F172A] text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-[#334155]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Submitted</th>
                    <th className="py-3 px-4 font-semibold">Evaluation Type</th>
                    <th className="py-3 px-4 font-semibold">Supervisor</th>
                    <th className="py-3 px-4 font-semibold">Target Officer / Self</th>
                    <th className="py-3 px-4 font-semibold">Performance Rating</th>
                    <th className="py-3 px-4 font-semibold text-center">Score</th>
                    <th className="py-3 px-4 font-semibold text-center">Sync</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredSupervisorReports.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No supervisor evaluations found</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Evaluations submitted by supervisors will appear here</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSupervisorReports.map(r => {
                      const isNew = isNewReport(r);
                      const isSelfReport = r.type === 'self_report';
                      const displayName = isSelfReport ? r.supervisorName : r.officerName;

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            {formatDateTime(r.submittedAt || r.createdAt || r.reportDate)}
                            {isNew && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 uppercase">
                                New
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              isSelfReport
                                ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : 'bg-purple-50 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            }`}>
                              {isSelfReport ? 'Supervisor Operations' : 'Officer Evaluation'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-[#F8FAFC]">
                            {r.supervisorName || 'Supervisor'}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                            {displayName || 'N/A'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={
                              (r.overallStatus === 'excellent' || r.performance === 'excellent') ? 'success' :
                              (r.overallStatus === 'good' || r.performance === 'good') ? 'info' :
                              (r.overallStatus === 'average' || r.performance === 'average') ? 'warning' : 'error'
                            }>
                              {r.overallStatus || r.performance || 'Evaluated'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isSelfReport ? (
                              <span className="text-slate-400 dark:text-slate-500 text-xs">Self Log</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60 text-xs">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                {r.overallRating ?? 5}/5
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={r.synced !== false ? 'success' : 'warning'}>
                              {r.synced !== false ? (
                                <><CheckCircle2 className="w-3 h-3 mr-1" /> Synced</>
                              ) : (
                                <><Clock className="w-3 h-3 mr-1" /> Pending</>
                              )}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}