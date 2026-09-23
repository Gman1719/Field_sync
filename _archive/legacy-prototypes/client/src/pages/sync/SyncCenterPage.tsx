import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  RefreshCw, 
  CheckCircle2, 
  Database, 
  AlertCircle, 
  Clock, 
  Trash2, 
  Wifi, 
  WifiOff, 
  Layers 
} from 'lucide-react';
import db from '../../db/index.ts';
import Card, { CardHeader } from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import SyncService, { SyncProgressEvent } from '../../services/syncService.ts';

export const SyncCenterPage: React.FC = () => {
  const [syncProgress, setSyncProgress] = useState<SyncProgressEvent>(SyncService.getProgress());
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Connectivity Listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to real-time sync service progress
    const unsubscribe = SyncService.subscribe((progress) => {
      setSyncProgress(progress);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  // Live query on real IndexedDB queue
  const queueItems = useLiveQuery(() => db.syncQueue.orderBy('id').reverse().toArray()) || [];
  const pendingCitizenCount = useLiveQuery(
    () => db.citizens.where('syncStatus').equals('PENDING').count()
  ) ?? 0;
  const totalLocalCitizens = useLiveQuery(() => db.citizens.count()) ?? 0;

  const handleManualSync = async () => {
    await SyncService.syncAll();
  };

  const handleClearCompleted = async () => {
    await db.syncQueue.where('status').equals('COMPLETED').delete();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Synchronization Center
            </h1>
            {isOnline ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                Offline
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Offline-first background engine synchronizing IndexedDB device queue with central PostgreSQL
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            isLoading={syncProgress.inProgress}
            disabled={!isOnline || pendingCitizenCount === 0}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={handleManualSync}
          >
            {syncProgress.inProgress ? 'Synchronizing...' : 'Sync Queue Now'}
          </Button>
        </div>
      </div>

      {/* Sync Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 shrink-0">
            <Clock className={`w-6 h-6 ${syncProgress.inProgress ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Queue Buffer</p>
            <h4 className="text-xl font-bold text-slate-900">
              {pendingCitizenCount > 0 ? `${pendingCitizenCount} Pending` : 'All Synced'}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Last sync: {syncProgress.lastSyncTime || 'Not run this session'}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Central PostgreSQL</p>
            <h4 className="text-xl font-bold text-emerald-700">
              {isOnline ? 'Online & Reachable' : 'Disconnected'}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isOnline ? 'Port 5000 Active' : 'Queuing mutations locally'}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600 shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Local Device Database</p>
            <h4 className="text-xl font-bold text-slate-900">{totalLocalCitizens} Citizens</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">IndexedDB (Dexie.js)</p>
          </div>
        </Card>
      </div>

      {/* Sync Alert Banner if any error occurred */}
      {syncProgress.lastError && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{syncProgress.lastError}</span>
          </div>
        </div>
      )}

      {/* Queue Items Table */}
      <Card noPadding className="border-slate-200 shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <CardHeader
            title="Local Queue Records"
            subtitle="Mutations stored locally in IndexedDB awaiting central confirmation"
          />
          {queueItems.some((q) => q.status === 'COMPLETED') && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCompleted}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Clear Completed
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Queue ID</th>
                <th className="px-4 py-3">Entity &amp; Action</th>
                <th className="px-4 py-3">Payload Details</th>
                <th className="px-4 py-3">Queue Status</th>
                <th className="px-4 py-3">Retries</th>
                <th className="px-4 py-3">Queued Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {queueItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">Sync queue is empty</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      All citizen records on this device are synchronized with the central database.
                    </p>
                  </td>
                </tr>
              ) : (
                queueItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">#{item.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-700 border mr-1">
                        {item.entityType}
                      </span>
                      {item.action}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {item.payload?.fullName || 'Citizen Record'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {item.clientRecordId}
                      </div>
                      {item.errorMessage && (
                        <div className="text-[11px] text-rose-600 mt-0.5">
                          Error: {item.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          item.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.status === 'PROCESSING'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : item.status === 'FAILED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">{item.retryCount}</td>
                    <td className="px-4 py-3 text-slate-400 text-[11px]">
                      {new Date(item.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default SyncCenterPage;
