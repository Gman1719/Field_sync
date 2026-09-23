import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  RefreshCw, 
  Trash2, 
  HardDrive, 
  CheckCircle2, 
  Server, 
  Sliders 
} from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Badge from '../../components/ui/Badge.tsx';
import db from '../../db/index.ts';
import OfflineGeographyService from '../../services/offlineGeographyService.ts';

export const SettingsPage: React.FC = () => {
  const [syncInterval, setSyncInterval] = useState('60000'); // 1 min default
  const [isRecaching, setIsRecaching] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // IndexedDB Live Counts
  const localCitizensCount = useLiveQuery(() => db.citizens.count()) ?? 0;
  const queueCount = useLiveQuery(() => db.syncQueue.count()) ?? 0;
  const cachedGeoCount = useLiveQuery(() => db.cachedGeography.count()) ?? 0;

  const handleRecacheGeography = async () => {
    try {
      setIsRecaching(true);
      await OfflineGeographyService.getRegions();
      setFeedback('Ethiopian administrative hierarchy successfully re-cached into IndexedDB.');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback('Failed to cache geography: ' + err.message);
    } finally {
      setIsRecaching(false);
    }
  };

  const handleClearCompletedQueue = async () => {
    await db.syncQueue.where('status').equals('COMPLETED').delete();
    setFeedback('Completed sync queue items cleaned.');
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              System &amp; Offline Settings
            </h1>
            <Badge variant="purple" size="sm">
              Configuration
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure local IndexedDB storage, background sync intervals, and system parameters
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Sync Engine Configuration */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Sliders className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900">Background Sync Settings</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Automatic Synchronization Frequency
            </label>
            <select
              value={syncInterval}
              onChange={(e) => {
                setSyncInterval(e.target.value);
                setFeedback('Sync interval updated.');
                setTimeout(() => setFeedback(null), 3000);
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="30000">Every 30 seconds (High frequency)</option>
              <option value="60000">Every 1 minute (Recommended)</option>
              <option value="300000">Every 5 minutes (Conserves battery)</option>
              <option value="0">Manual sync only</option>
            </select>
            <span className="text-[11px] text-slate-400 mt-1 block">
              When connectivity is detected, pending IndexedDB mutations synchronize automatically.
            </span>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Network Reconnect Policy
            </label>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
              <span className="font-semibold text-emerald-700 block">Immediate Auto-Sync</span>
              <span className="text-[11px] text-slate-400">
                Triggered instantly upon receiving browser 'online' event.
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Local IndexedDB Diagnostics */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <HardDrive className="w-5 h-5 text-purple-600" />
          <h2 className="text-base font-bold text-slate-900">Local Device Storage (Dexie.js)</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block">Local Citizens</span>
            <strong className="text-lg text-slate-900">{localCitizensCount} records</strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block">Sync Queue Jobs</span>
            <strong className="text-lg text-slate-900">{queueCount} jobs</strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block">Cached Geography</span>
            <strong className="text-lg text-slate-900">{cachedGeoCount} entries</strong>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecacheGeography}
            isLoading={isRecaching}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Re-cache Ethiopian Geography
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCompletedQueue}
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Clean Completed Queue
          </Button>
        </div>
      </Card>

      {/* System Architecture Specifications */}
      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Server className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">System Specifications</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Database Engine:</span>
            <span className="font-semibold text-slate-800">PostgreSQL (Prisma ORM)</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Local Store:</span>
            <span className="font-semibold text-slate-800">IndexedDB (Dexie.js v4)</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Authentication:</span>
            <span className="font-semibold text-slate-800">JWT (HS256) + bcrypt</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Hierarchy:</span>
            <span className="font-semibold text-slate-800">Region &bull; Zone &bull; Woreda &bull; Kebele</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
