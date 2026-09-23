// src/components/sync/SyncCenterView.jsx
// Centralized Synchronization Center & Diagnostics Dashboard (Phase 8)

import React, { useState, useEffect } from 'react';
import {
  RefreshCw, CheckCircle2, Clock, AlertTriangle, Wifi, WifiOff,
  Database, Users, Activity, Smartphone, FileText, ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';

import { syncEngine } from '../../services/unifiedSyncEngine';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import StatCard from '../ui/StatCard';

export default function SyncCenterView({ user }) {
  const [summary, setSummary] = useState({
    citizensPending: 0,
    activityLogsPending: 0,
    workSessionsPending: 0,
    dailyReportsPending: 0,
    totalPending: 0,
    lastSyncTime: null,
    isSyncing: false,
    lastError: null,
  });

  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const fetchSummary = async () => {
    const s = await syncEngine.getPendingSummary();
    setSummary(s);
  };

  useEffect(() => {
    fetchSummary();

    const handleUpdate = () => {
      fetchSummary();
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('fieldsync-status-updated', handleUpdate);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(fetchSummary, 5000);

    return () => {
      window.removeEventListener('fieldsync-status-updated', handleUpdate);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    if (!navigator.onLine) {
      toast.error('Device is offline. Connect to network to synchronize.');
      return;
    }

    setIsSyncingNow(true);
    try {
      const result = await syncEngine.syncAll();
      await fetchSummary();

      if (result.success) {
        toast.success(`Synchronized ${result.syncedCount} records with PostgreSQL!`);
      } else {
        toast.error(`Sync finished with warnings: ${result.errors[0] || 'Unknown issue'}`);
      }
    } catch (e) {
      toast.error('Sync failed');
    } finally {
      setIsSyncingNow(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-card">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-xs">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Central Synchronization Center
              </h1>
              <p className="text-xs text-slate-500">
                Bidirectional synchronization engine between IndexedDB offline storage and central PostgreSQL database
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            variant="primary"
            size="sm"
            onClick={handleManualSync}
            loading={isSyncingNow || summary.isSyncing}
            disabled={!isOnline || summary.totalPending === 0}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Sync All Pending ({summary.totalPending})
          </Button>
        </div>
      </div>

      {/* Sync Readiness Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs ${
        summary.totalPending === 0
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <div className="flex items-center gap-3">
          {summary.totalPending === 0 ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <div>
            <span className="font-bold text-sm block">
              {summary.totalPending === 0
                ? 'All Local Records are Synchronized with PostgreSQL'
                : `${summary.totalPending} Offline Records Pending Synchronization`}
            </span>
            <span className="text-[11px] opacity-80">
              {summary.lastSyncTime
                ? `Last successful sync: ${new Date(summary.lastSyncTime).toLocaleTimeString()}`
                : 'No sync completed during this session.'}
            </span>
          </div>
        </div>

        <span className="font-mono text-xs font-bold px-3 py-1 rounded-lg bg-white/70">
          Pending: {summary.totalPending}
        </span>
      </div>

      {/* Pending Items Grid */}
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

      {/* Sync Diagnostics & Contracts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#1E3A8A]" />
              <CardTitle className="text-base">Offline-First Guarantees</CardTitle>
            </div>
            <CardDescription className="text-xs">
              System architectural synchronization contracts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="font-semibold text-slate-800 block">1. Stable Client UUIDs</span>
              <p className="text-slate-600">
                All records are generated with cryptographic UUIDs locally. Retried sync uploads update the existing record rather than creating duplicates.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="font-semibold text-slate-800 block">2. Non-Destructive Offline Persistence</span>
              <p className="text-slate-600">
                Local records remain securely stored in IndexedDB until explicit HTTP 200/201 confirmation is returned from PostgreSQL.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="font-semibold text-slate-800 block">3. Multi-Level Duplicate Auditing</span>
              <p className="text-slate-600">
                Duplicate detection occurs locally on the device and is re-verified centrally upon sync to catch cross-device registrations.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1E3A8A]" />
              <CardTitle className="text-base">Synchronization Diagnostics</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Live status telemetry and connection health
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-600 font-medium">Internet Connectivity:</span>
              <Badge variant={isOnline ? 'success' : 'warning'}>
                {isOnline ? 'Active Online' : 'No Connection'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-600 font-medium">Sync Engine Status:</span>
              <span className="font-semibold text-slate-800">
                {summary.isSyncing || isSyncingNow ? 'Pipeline In Progress' : 'Standby / Idle'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-600 font-medium">Last Sync Timestamp:</span>
              <span className="text-slate-800 font-mono text-[11px]">
                {summary.lastSyncTime ? new Date(summary.lastSyncTime).toLocaleString() : 'Not yet synced'}
              </span>
            </div>

            {summary.lastError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[11px]">
                <strong className="block font-semibold">Latest Diagnostic Note:</strong>
                <span>{summary.lastError}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
