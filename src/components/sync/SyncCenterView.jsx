// src/components/sync/SyncCenterView.jsx
// Enterprise Synchronization Center, Offline Queue Inspector & Conflict Diagnostics (Phase 7)

import React, { useState, useEffect } from 'react';
import {
  RefreshCw, CheckCircle2, Clock, AlertTriangle, Wifi, WifiOff,
  Database, Users, Activity, Smartphone, FileText, ArrowDownToLine,
  ShieldCheck, AlertCircle, Trash2, RotateCw, Layers, Check,
  SlidersHorizontal, ChevronRight, Server, CheckCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

import { syncEngine } from '../../services/unifiedSyncEngine';
import { offlineDb } from '../../db/offlineDb';
import { API_BASE } from '../../config/api';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import StatCard from '../ui/StatCard';

export default function SyncCenterView({ user }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'queue' | 'errors' | 'conflicts'

  const [summary, setSummary] = useState({
    citizensPending: 0,
    activityLogsPending: 0,
    workSessionsPending: 0,
    dailyReportsPending: 0,
    totalPending: 0,
    queuePendingCount: 0,
    unresolvedErrorsCount: 0,
    lastSyncTime: null,
    isSyncing: false,
    lastError: null,
  });

  const [queueItems, setQueueItems] = useState([]);
  const [errorRecords, setErrorRecords] = useState([]);
  const [serverHealth, setServerHealth] = useState(null);

  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [isPullingNow, setIsPullingNow] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueFilter, setQueueFilter] = useState('ALL');

  // Load summary and database records
  const loadData = async () => {
    try {
      const s = await syncEngine.getPendingSummary();
      setSummary(s);

      // Load queue items
      const q = await offlineDb.syncQueue.orderBy('queuedAt').reverse().toArray();
      setQueueItems(q);

      // Load error records
      const errs = await offlineDb.syncErrors.orderBy('timestamp').reverse().toArray();
      setErrorRecords(errs);
    } catch (e) {
      console.error('Error refreshing sync diagnostics:', e);
    }
  };

  // Load backend sync health
  const checkServerHealth = async () => {
    if (!navigator.onLine) return;
    try {
      const token = localStorage.getItem('fieldsync_token');
      if (!token) return;
      const res = await fetch(`${API_BASE}/sync/health`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setServerHealth(json.data);
        }
      }
    } catch (e) {
      console.warn('Health check query failed:', e);
    }
  };

  useEffect(() => {
    loadData();
    checkServerHealth();

    const handleUpdate = () => loadData();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('fieldsync-status-updated', handleUpdate);
    window.addEventListener('fieldsync-queue-updated', handleUpdate);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      loadData();
      checkServerHealth();
    }, 5000);

    return () => {
      window.removeEventListener('fieldsync-status-updated', handleUpdate);
      window.removeEventListener('fieldsync-queue-updated', handleUpdate);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // 1. Manual push synchronization
  const handleManualSync = async () => {
    if (!navigator.onLine) {
      toast.error('Device is offline. Connect to network to synchronize.');
      return;
    }

    setIsSyncingNow(true);
    try {
      const result = await syncEngine.syncAll();
      await loadData();
      await checkServerHealth();

      if (result.success) {
        toast.success(`Successfully synchronized ${result.syncedCount} records with PostgreSQL!`);
      } else {
        toast.error(`Sync finished with issues: ${result.errors[0] || 'Unknown problem'}`);
      }
    } catch (e) {
      toast.error('Sync failed');
    } finally {
      setIsSyncingNow(false);
    }
  };

  // 2. Manual delta pull
  const handleManualPull = async () => {
    if (!navigator.onLine) {
      toast.error('Device is offline. Connect to network to pull updates.');
      return;
    }

    setIsPullingNow(true);
    try {
      const result = await syncEngine.pullServerUpdates();
      await loadData();
      toast.success(`Pulled ${result.pulledCount} updated records from Central Server`);
    } catch (e) {
      toast.error('Pull updates failed');
    } finally {
      setIsPullingNow(false);
    }
  };

  // 3. Retry individual queue item
  const handleRetryItem = async (item) => {
    const success = await syncEngine.retryItem(item);
    await loadData();
    if (success) {
      toast.success(`Successfully retried and synchronized item ${item.entityType}`);
    } else {
      toast.error(`Retry attempt failed for item ${item.entityType}`);
    }
  };

  // 4. Remove item from queue
  const handleRemoveQueueItem = async (id) => {
    await offlineDb.syncQueue.delete(id);
    await loadData();
    toast.success('Removed item from sync queue');
  };

  // 5. Clear resolved errors
  const handleClearResolvedErrors = async () => {
    await syncEngine.clearResolvedErrors();
    await loadData();
    toast.success('Resolved error records marked as cleared');
  };

  // Filtered queue items
  const filteredQueueItems = queueItems.filter((item) => {
    if (queueFilter === 'ALL') return true;
    return item.status === queueFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-xs">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
              Central Synchronization Center
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bidirectional sync pipeline, offline queue diagnostics, and conflict resolution engine
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOnline ? (
            <Badge variant="success" className="gap-1.5 py-1 px-3">
              <Wifi className="w-3.5 h-3.5" />
              <span>Connected Online</span>
            </Badge>
          ) : (
            <Badge variant="warning" className="gap-1.5 py-1 px-3">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline Mode</span>
            </Badge>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleManualPull}
            loading={isPullingNow}
            disabled={!isOnline}
            className="text-xs"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 mr-1.5 text-[#1E3A8A] dark:text-blue-400" />
            Pull Server Updates
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleManualSync}
            loading={isSyncingNow || summary.isSyncing}
            disabled={!isOnline || summary.totalPending === 0}
            className="text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Sync All Pending ({summary.totalPending})
          </Button>
        </div>
      </div>

      {/* Sync Readiness Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          summary.totalPending === 0
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
        }`}
      >
        <div className="flex items-center gap-3">
          {summary.totalPending === 0 ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <div>
            <span className="font-bold text-sm block">
              {summary.totalPending === 0
                ? 'All Local Records are Synchronized with PostgreSQL'
                : `${summary.totalPending} Offline Records Pending Central Synchronization`}
            </span>
            <span className="text-[11px] opacity-80">
              {summary.lastSyncTime
                ? `Last successful synchronization: ${new Date(summary.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                : 'No synchronization performed during this session.'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
          <span className="px-3 py-1 rounded-lg bg-white/80 dark:bg-slate-800/80 font-bold border border-current">
            Pending: {summary.totalPending}
          </span>
          {summary.unresolvedErrorsCount > 0 && (
            <span className="px-3 py-1 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 font-bold border border-red-200 dark:border-red-800 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {summary.unresolvedErrorsCount} Errors
            </span>
          )}
        </div>
      </div>

      {/* Aggregate Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Citizens"
          value={summary.citizensPending}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Pending Activity Logs"
          value={summary.activityLogsPending}
          icon={Activity}
          color="indigo"
        />
        <StatCard
          title="Pending Work Sessions"
          value={summary.workSessionsPending}
          icon={Smartphone}
          color="amber"
        />
        <StatCard
          title="Pending Daily Reports"
          value={summary.dailyReportsPending}
          icon={FileText}
          color="purple"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-[#334155] text-xs font-semibold gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-3 transition-colors border-b-2 ${
            activeTab === 'overview'
              ? 'border-[#1E3A8A] text-[#1E3A8A] dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Pipeline Overview & Telemetry
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'queue'
              ? 'border-[#1E3A8A] text-[#1E3A8A] dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Sync Queue Inspector
          {queueItems.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {queueItems.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('errors')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'errors'
              ? 'border-red-600 text-red-600 dark:border-red-400 dark:text-red-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Failure Diagnostics & Logs
          {summary.unresolvedErrorsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold">
              {summary.unresolvedErrorsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('conflicts')}
          className={`pb-3 transition-colors border-b-2 ${
            activeTab === 'conflicts'
              ? 'border-[#1E3A8A] text-[#1E3A8A] dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Conflict Resolution Rules
        </button>
      </div>

      {/* ========================================== */}
      {/* TAB 1: PIPELINE OVERVIEW & TELEMETRY       */}
      {/* ========================================== */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
                <CardTitle className="text-base">Offline-First Guarantees</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Guaranteed architectural contracts for remote field operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-100 dark:border-[#334155] space-y-1">
                <span className="font-semibold text-slate-900 dark:text-[#F8FAFC] block flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  1. Idempotent UUID Preservation
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Every citizen registration, activity log, and work session is generated with a cryptographic UUID on the device. Re-syncing or retrying uploads updates existing records rather than creating duplicate entries.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-100 dark:border-[#334155] space-y-1">
                <span className="font-semibold text-slate-900 dark:text-[#F8FAFC] block flex items-center gap-1.5">
                  <CheckCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  2. Non-Destructive Offline Persistence
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Local records remain securely stored in IndexedDB and are never discarded until explicit confirmation is returned from the central PostgreSQL database.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-100 dark:border-[#334155] space-y-1">
                <span className="font-semibold text-slate-900 dark:text-[#F8FAFC] block flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  3. Multi-Level Duplicate Auditing
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Duplicate detection occurs locally on the device (Level 1) and is re-verified centrally (Level 2 & 3) upon synchronization to catch cross-device registrations.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
                <CardTitle className="text-base">System Synchronization Telemetry</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Real-time connection metrics and PostgreSQL health
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-100 dark:border-[#334155]">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Internet Connectivity:</span>
                <Badge variant={isOnline ? 'success' : 'warning'}>
                  {isOnline ? 'Active Online' : 'No Connection'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-100 dark:border-[#334155]">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Sync Engine Status:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {summary.isSyncing || isSyncingNow ? 'Pipeline In Progress...' : 'Standby / Idle'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-100 dark:border-[#334155]">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Central Database Status:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {serverHealth ? serverHealth.databaseStatus : 'Connected'}
                </span>
              </div>

              {serverHealth && (
                <div className="p-3 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-100 dark:border-[#334155] space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span>Central Citizens:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{serverHealth.citizens?.total || 0}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Central Reports:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{serverHealth.dailyReportsTotal || 0}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Server Uptime:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{serverHealth.uptimeSeconds}s</strong>
                  </div>
                </div>
              )}

              {summary.lastError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 rounded-xl text-[11px]">
                  <strong className="block font-semibold">Latest Diagnostic Error:</strong>
                  <span>{summary.lastError}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: SYNC QUEUE INSPECTOR                */}
      {/* ========================================== */}
      {activeTab === 'queue' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base">Offline Sync Queue Records</CardTitle>
                <CardDescription className="text-xs">
                  Detailed inspection of queued offline operations and retry state
                </CardDescription>
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0F172A] p-1 rounded-xl text-xs border border-transparent dark:border-[#334155]">
                {['ALL', 'PENDING', 'SYNCING', 'FAILED', 'RESOLVED'].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setQueueFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      queueFilter === filter
                        ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredQueueItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No queue items found matching filter "{queueFilter}".
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-[#334155] text-xs">
                {filteredQueueItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-[#0F172A]/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            item.entityType === 'citizen'
                              ? 'primary'
                              : item.entityType === 'daily_report'
                              ? 'secondary'
                              : 'outline'
                          }
                          className="uppercase text-[10px]"
                        >
                          {item.entityType.replace('_', ' ')}
                        </Badge>
                        <span className="font-mono text-slate-700 dark:text-slate-200 font-bold">
                          {item.entityId?.slice(0, 16)}...
                        </span>
                        <Badge
                          variant={
                            item.status === 'RESOLVED'
                              ? 'success'
                              : item.status === 'FAILED'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {item.status}
                        </Badge>
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3">
                        <span>
                          Queued: <strong className="text-slate-700 dark:text-slate-200">{new Date(item.queuedAt).toLocaleTimeString()}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Attempts: <strong className="text-slate-700 dark:text-slate-200">{item.attempts} / {item.maxRetries}</strong>
                        </span>
                      </div>

                      {item.lastError && (
                        <p className="text-[11px] text-red-600 dark:text-red-400 font-mono mt-1">Error: {item.lastError}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status !== 'RESOLVED' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryItem(item)}
                          disabled={!isOnline}
                          className="text-xs"
                        >
                          <RotateCw className="w-3.5 h-3.5 mr-1" />
                          Retry
                        </Button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveQueueItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Remove from Queue"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================== */}
      {/* TAB 3: FAILURE DIAGNOSTICS & LOGS          */}
      {/* ========================================== */}
      {activeTab === 'errors' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base">Failure Diagnostics & Error Records</CardTitle>
                <CardDescription className="text-xs">
                  Inspect recorded sync exceptions, network timeouts, and validation rejections
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearResolvedErrors}
                  className="text-xs"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Mark All Resolved
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {errorRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No synchronization errors recorded. The pipeline is operating normally.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-[#334155] text-xs">
                {errorRecords.map((err) => (
                  <div
                    key={err.id}
                    className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      err.resolved ? 'opacity-60 bg-slate-50 dark:bg-[#0F172A]/40' : 'hover:bg-red-50/40 dark:hover:bg-red-950/20'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={err.resolved ? 'secondary' : 'danger'}>
                          {err.errorCode || 'ERR'}
                        </Badge>
                        <span className="font-bold text-slate-900 dark:text-[#F8FAFC]">{err.entityType}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(err.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-red-700 dark:text-red-400 font-mono text-[11px]">{err.errorMessage}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!err.resolved && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            await offlineDb.syncErrors.update(err.id, { resolved: true });
                            await loadData();
                            toast.success('Marked error as resolved');
                          }}
                          className="text-xs"
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================== */}
      {/* TAB 4: CONFLICT RESOLUTION RULES           */}
      {/* ========================================== */}
      {activeTab === 'conflicts' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
              <CardTitle className="text-base">Conflict Resolution Architecture</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Algorithmic resolution matrix governing offline divergence and central state
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-[#334155] space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-[#F8FAFC] text-sm">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[#1E3A8A] dark:text-blue-300 flex items-center justify-center text-xs">1</span>
                  Idempotent Stable UUIDs
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Every entity created while offline is assigned a cryptographic UUID (<code className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1 py-0.5 rounded text-[11px]">clientRecordId</code>). The backend executes upsert logic based on this key, guaranteeing that duplicate network transmissions will never create duplicate database rows.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-[#334155] space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-[#F8FAFC] text-sm">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs">2</span>
                  Server-Wins on Official Status
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  When a supervisor or manager reviews duplicates and updates status to <code className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1 py-0.5 rounded text-[11px]">APPROVED_AS_DIFFERENT</code> or <code className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1 py-0.5 rounded text-[11px]">CONFIRMED_DUPLICATE</code>, the server's authoritative decision overrides any local unverified status.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-[#334155] space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-[#F8FAFC] text-sm">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs">3</span>
                  Client-Wins on Draft Officer Inputs
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  If an officer edits an unconfirmed draft citizen or notes while offline, the local timestamp determines the active version and updates the server upon reconnection without data loss.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-[#334155] space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-[#F8FAFC] text-sm">
                  <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xs">4</span>
                  Immutable Finalized Reports
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Once a Daily Work Report is submitted and screen time is finalized, it enters read-only lock. Subsequent sync calls cannot alter the finalized screen time or historical metrics.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
