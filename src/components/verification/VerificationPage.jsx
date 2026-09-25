// src/components/verification/VerificationPage.jsx – Enterprise Officer Verification & Trust Dashboard

import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck, Search, Filter, RefreshCw, CheckCircle2,
  AlertTriangle, XCircle, Clock, ChevronDown, ChevronUp,
  User, MapPin, Award, Activity, Calendar, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';

import { db } from '../../services/database';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import StatCard from '../ui/StatCard';

export default function VerificationPage({
  users = [],
  liveStatus = [],
  reports = [],
  citizens = [],
  attendance = [],
  verificationScore = 100
}) {
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [allVerificationData, setAllVerificationData] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load Synced Verification Records
  const loadData = async () => {
    try {
      setLoading(true);
      let historyData = [];

      // 1. Load from IndexedDB (only synced = true)
      if (db && db.verification_history) {
        const allRecords = await db.verification_history.toArray();
        if (allRecords && allRecords.length > 0) {
          const syncedRecords = allRecords.filter(r => r.synced === true);
          historyData = syncedRecords;
        }
      }

      // 2. Merge synced history from localStorage for each officer
      if (users && users.length > 0) {
        const officers = users.filter(u => u.role === 'field_officer');
        for (const officer of officers) {
          const saved = localStorage.getItem(`verification_${officer.id}`);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed.history && parsed.history.length > 0) {
                const syncedHistory = parsed.history.filter(h => h.synced !== false);
                const officerHistory = syncedHistory.map(h => ({
                  ...h,
                  officerId: officer.id,
                  officerName: officer.name
                }));
                const existingIds = new Set(historyData.map(h => h.id));
                for (const item of officerHistory) {
                  if (!existingIds.has(item.id)) {
                    historyData.push(item);
                    existingIds.add(item.id);
                  }
                }
              }
            } catch (e) {
              /* ignore parse errors */
            }
          }
        }
      }

      setAllVerificationData(historyData);
    } catch (error) {
      console.error('Error loading verification data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [users, refreshKey]);

  useEffect(() => {
    const handleUpdate = () => {
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('verification-update', handleUpdate);
    window.addEventListener('sync-complete', handleUpdate);

    return () => {
      window.removeEventListener('verification-update', handleUpdate);
      window.removeEventListener('sync-complete', handleUpdate);
    };
  }, []);

  // Compute officer metrics
  const officersData = useMemo(() => {
    if (!users || users.length === 0) return [];

    const officers = users.filter(u => u.role === 'field_officer');
    if (officers.length === 0) return [];

    return officers.map(officer => {
      const history = allVerificationData.filter(h => h.officerId === officer.id);
      const status = liveStatus?.find(l => l.employeeId === officer.employeeId);
      const initialScore = status?.verificationScore || verificationScore || 100;

      const total = history.length;
      const passed = history.filter(h => h.success === true).length;
      const failed = history.filter(h => h.success === false && h.message !== '⏰ Verification skipped').length;
      const skipped = history.filter(h => h.message === '⏰ Verification skipped' || h.answer === 'Skipped').length;

      const avgResponseTime = total > 0
        ? Math.round(history.reduce((sum, h) => sum + (h.responseTime || 0), 0) / total)
        : 0;

      let trustScore = initialScore;
      if (total > 0 && passed > 0) {
        const historyScore = (passed / total) * 100;
        trustScore = Math.round((initialScore * 0.7) + (historyScore * 0.3));
      }
      trustScore = Math.min(100, Math.max(0, trustScore));

      const today = new Date().toISOString().slice(0, 10);
      const todayReports = reports?.filter(r =>
        r.employeeId === officer.employeeId && (r.reportDate || r.submittedAt || '').slice(0, 10) === today
      ).length || 0;

      const citizenCount = citizens?.filter(c =>
        c.registeredBy === officer.employeeId
      ).length || 0;

      const todayAttendance = attendance?.find(a =>
        a.employeeId === officer.employeeId && a.date === today
      );

      let statusLabel = 'Not Verified';
      if (total > 0) {
        if (trustScore >= 80) {
          statusLabel = 'Active';
        } else if (trustScore >= 60) {
          statusLabel = 'Suspicious';
        } else {
          statusLabel = 'Inactive';
        }
      }

      const questionHistory = history.map(h => ({
        question: h.question || 'Security verification challenge',
        answer: h.answer || 'N/A',
        success: h.success === true,
        timestamp: h.timestamp || new Date().toISOString(),
        responseTime: h.responseTime || 0,
        message: h.message || '',
        score: h.score || 0
      }));

      return {
        id: officer.id || 'unknown',
        name: officer.name || 'Unknown Officer',
        region: officer.region || 'N/A',
        employeeId: officer.employeeId || 'N/A',
        trustScore,
        hasHistory: total > 0,
        historyCount: total,
        passed,
        failed,
        skipped,
        avgResponseTime,
        questionHistory: questionHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
        todayReports,
        citizenCount,
        attendanceStatus: todayAttendance?.status || 'Not Marked',
        status: statusLabel,
        lastVerified: history.length > 0 ? history[0]?.timestamp : null,
        lastQuestion: history.length > 0 ? history[0]?.question || 'No challenges' : 'No challenges',
        lastResult: history.length > 0 ? history[0]?.success : undefined
      };
    });
  }, [users, liveStatus, allVerificationData, reports, citizens, attendance, verificationScore]);

  // Filter officers
  const filteredOfficers = useMemo(() => {
    let list = officersData;
    if (filter !== 'all') {
      list = list.filter(o => o.status === filter);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(o =>
        (o.name || '').toLowerCase().includes(q) ||
        (o.employeeId || '').toLowerCase().includes(q) ||
        (o.region || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [officersData, filter, searchTerm]);

  // Aggregate stats
  const summary = useMemo(() => {
    const total = officersData.length;
    const active = officersData.filter(o => o.status === 'Active').length;
    const suspicious = officersData.filter(o => o.status === 'Suspicious').length;
    const inactive = officersData.filter(o => o.status === 'Inactive').length;
    const notVerified = officersData.filter(o => o.status === 'Not Verified').length;
    const avgScore = total > 0
      ? Math.round(officersData.reduce((sum, o) => sum + (o.trustScore || 0), 0) / total)
      : 0;
    const totalVerifications = officersData.reduce((sum, o) => sum + (o.historyCount || 0), 0);

    return { total, active, suspicious, inactive, notVerified, avgScore, totalVerifications };
  }, [officersData]);

  const handleForceSync = () => {
    window.dispatchEvent(new Event('force-sync'));
    toast.success('Sync triggered. Pulling verification history...');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</Badge>;
      case 'Suspicious':
        return <Badge variant="warning"><AlertTriangle className="w-3 h-3 mr-1" /> Suspicious</Badge>;
      case 'Inactive':
        return <Badge variant="error"><XCircle className="w-3 h-3 mr-1" /> Inactive</Badge>;
      default:
        return <Badge variant="neutral"><Clock className="w-3 h-3 mr-1" /> Not Verified</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-[#1E3A8A] dark:border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Loading officer verification scores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#1E3A8A] dark:text-blue-400" />
            Field Officer Identity & Trust Verification
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time security integrity scores, biometric challenges, and authentication logs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-[#334155] shadow-sm flex items-center gap-3">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Average Trust</div>
              <div className={`text-xl font-bold ${
                summary.avgScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                summary.avgScore >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {summary.avgScore}%
              </div>
            </div>
            <Award className={`w-8 h-8 ${
              summary.avgScore >= 80 ? 'text-emerald-500' :
              summary.avgScore >= 60 ? 'text-amber-500' : 'text-rose-500'
            }`} />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleForceSync}
            className="text-xs self-stretch"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1 text-slate-600 dark:text-slate-300" />
            Sync
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Total Officers"
          value={summary.total}
          subtitle="Registered staff"
          icon={User}
          variant="default"
        />
        <StatCard
          title="Active (Trust >=80%)"
          value={summary.active}
          subtitle="Passed checks"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Suspicious (60-79%)"
          value={summary.suspicious}
          subtitle="Review required"
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title="Inactive (<60%)"
          value={summary.inactive}
          subtitle="Failed security"
          icon={XCircle}
          variant="danger"
        />
        <StatCard
          title="Total Challenges"
          value={summary.totalVerifications}
          subtitle="Executed audits"
          icon={Activity}
          variant="info"
        />
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search officer name, ID, region..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="text-xs sm:text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: 'all', label: `All (${summary.total})` },
              { key: 'Active', label: `Active (${summary.active})` },
              { key: 'Suspicious', label: `Suspicious (${summary.suspicious})` },
              { key: 'Inactive', label: `Inactive (${summary.inactive})` },
              { key: 'Not Verified', label: `Not Verified (${summary.notVerified})` }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === tab.key
                    ? 'bg-[#1E3A8A] text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Officers List with Expandable Verification Logs */}
      <div className="space-y-3">
        {filteredOfficers.length === 0 ? (
          <Card className="py-16 text-center text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-200">No officers match verification filter</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Adjust search terms or filter selection</p>
          </Card>
        ) : (
          filteredOfficers.map(officer => {
            const isExpanded = selectedOfficer === officer.id;

            return (
              <Card
                key={officer.id}
                className={`transition-all overflow-hidden ${
                  isExpanded ? 'ring-2 ring-[#1E3A8A]/30 dark:ring-blue-500/40 border-[#1E3A8A] dark:border-blue-500' : 'hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {/* Header Row */}
                <div
                  className="p-4 flex items-center justify-between gap-4 cursor-pointer"
                  onClick={() => setSelectedOfficer(isExpanded ? null : officer.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1E3A8A]/10 dark:bg-blue-900/40 text-[#1E3A8A] dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                      {officer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-sm sm:text-base">
                          {officer.name}
                        </h4>
                        {getStatusBadge(officer.status)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {officer.region} Region
                        </span>
                        <span>•</span>
                        <span className="font-mono text-slate-400">
                          ID: {officer.employeeId}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Trust Score</div>
                      <div className={`text-lg sm:text-xl font-bold font-mono ${
                        officer.hasHistory
                          ? officer.trustScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                            officer.trustScore >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-400'
                      }`}>
                        {officer.hasHistory ? `${officer.trustScore}%` : '—'}
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-slate-500 dark:text-slate-300">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Verification Details */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-slate-100 dark:border-[#334155] bg-slate-50/50 dark:bg-[#182234]/50 space-y-4">
                    {!officer.hasHistory ? (
                      <div className="py-8 text-center text-slate-400 dark:text-slate-500">
                        <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No synced verification history for this officer yet</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Audit challenge responses will appear here after synchronization</p>
                      </div>
                    ) : (
                      <>
                        {/* Metrics Pills Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-3">
                          <div className="p-2.5 bg-white dark:bg-[#0F172A] rounded-lg border border-slate-200 dark:border-[#334155] text-center">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Challenges</div>
                            <div className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">{officer.historyCount}</div>
                          </div>
                          <div className="p-2.5 bg-white dark:bg-[#0F172A] rounded-lg border border-slate-200 dark:border-[#334155] text-center">
                            <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Passed</div>
                            <div className="text-base font-bold text-emerald-700 dark:text-emerald-400">{officer.passed}</div>
                          </div>
                          <div className="p-2.5 bg-white dark:bg-[#0F172A] rounded-lg border border-slate-200 dark:border-[#334155] text-center">
                            <div className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400">Failed</div>
                            <div className="text-base font-bold text-rose-700 dark:text-rose-400">{officer.failed}</div>
                          </div>
                          <div className="p-2.5 bg-white dark:bg-[#0F172A] rounded-lg border border-slate-200 dark:border-[#334155] text-center">
                            <div className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Skipped</div>
                            <div className="text-base font-bold text-amber-700 dark:text-amber-400">{officer.skipped}</div>
                          </div>
                          <div className="p-2.5 bg-white dark:bg-[#0F172A] rounded-lg border border-slate-200 dark:border-[#334155] text-center">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Avg Response</div>
                            <div className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">{officer.avgResponseTime}s</div>
                          </div>
                          <div className="p-2.5 bg-white dark:bg-[#0F172A] rounded-lg border border-slate-200 dark:border-[#334155] text-center">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Reports Today</div>
                            <div className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">{officer.todayReports}</div>
                          </div>
                          <div className="p-2.5 bg-white dark:bg-[#0F172A] rounded-lg border border-slate-200 dark:border-[#334155] text-center">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Citizens</div>
                            <div className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">{officer.citizenCount}</div>
                          </div>
                          <div className="p-2.5 bg-white dark:bg-[#0F172A] rounded-lg border border-slate-200 dark:border-[#334155] text-center">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Attendance</div>
                            <div className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] capitalize pt-1">{officer.attendanceStatus}</div>
                          </div>
                        </div>

                        {/* Recent History Table */}
                        {officer.questionHistory.length > 0 && (
                          <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-[#334155] overflow-hidden">
                            <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#182234] border-b border-slate-200 dark:border-[#334155] flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                              <span>Security Verification Challenges ({officer.questionHistory.length})</span>
                              <span className="text-slate-400 font-normal">Last: {new Date(officer.lastVerified).toLocaleString()}</span>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                                <thead className="bg-slate-50/90 dark:bg-[#0F172A] text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-[#334155]">
                                  <tr>
                                    <th className="py-2.5 px-4 font-semibold">Time</th>
                                    <th className="py-2.5 px-4 font-semibold">Challenge Prompt</th>
                                    <th className="py-2.5 px-4 font-semibold">Officer Response</th>
                                    <th className="py-2.5 px-4 font-semibold text-center">Latency</th>
                                    <th className="py-2.5 px-4 font-semibold text-center">Outcome</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                                  {officer.questionHistory.slice(0, 10).map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                      <td className="py-2 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </td>
                                      <td className="py-2 px-4 font-medium text-slate-900 dark:text-[#F8FAFC]">
                                        {item.question}
                                      </td>
                                      <td className="py-2 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                                        {item.answer}
                                      </td>
                                      <td className="py-2 px-4 text-center font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                        {item.responseTime}s
                                      </td>
                                      <td className="py-2 px-4 text-center">
                                        <Badge variant={item.success ? 'success' : 'error'}>
                                          {item.success ? 'Passed' : 'Failed'}
                                        </Badge>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}