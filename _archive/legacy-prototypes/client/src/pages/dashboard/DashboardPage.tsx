import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Users,
  Clock,
  UserCheck,
  AlertTriangle,
  PlusCircle,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Briefcase,
} from 'lucide-react';
import Card, { CardHeader } from '../../components/ui/Card.tsx';
import StatsCard from '../../components/ui/StatsCard.tsx';
import Badge from '../../components/ui/Badge.tsx';
import Button from '../../components/ui/Button.tsx';
import { User } from '../../types/index.ts';
import db from '../../db/index.ts';
import StatsService, { DashboardStats } from '../../services/statsService.ts';
import ScreenTimeTracker from '../../services/screenTimeTracker.ts';
import DailyReportService from '../../services/dailyReportService.ts';

export interface DashboardPageProps {
  user: User | null;
  onNavigate: (path: string) => void;
  pendingSyncCount?: number;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  onNavigate,
}) => {
  const role = user?.role || 'FIELD_OFFICER';

  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Live IndexedDB count of pending items
  const localPendingCount = useLiveQuery(
    () => db.citizens.where('syncStatus').equals('PENDING').count()
  ) ?? 0;

  const fetchStats = async () => {
    try {
      const data = await StatsService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    }
  };

  const [screenTimeSeconds, setScreenTimeSeconds] = useState(0);
  const [isReportSubmitted, setIsReportSubmitted] = useState(false);

  useEffect(() => {
    fetchStats();

    if (role === 'FIELD_OFFICER' && user?.id) {
      const checkScreenTime = async () => {
        const timeData = await ScreenTimeTracker.getTodayScreenTime(user.id);
        setScreenTimeSeconds(timeData.totalSeconds);

        const todayReport = await db.dailyWorkReports
          .where('[officerId+reportDate]')
          .equals([user.id, ScreenTimeTracker.getLocalDateString()])
          .first();
        setIsReportSubmitted(Boolean(todayReport?.isLocked));
      };

      checkScreenTime();
      const ticker = setInterval(checkScreenTime, 2000);
      return () => clearInterval(ticker);
    }
  }, [user]);

  const jurisdictionSubtitle =
    role === 'MANAGER'
      ? 'National HQ Administration'
      : role === 'SUPERVISOR'
      ? `${user?.woreda?.name || 'Woreda Station'} Supervisory Desk`
      : `${user?.kebele?.name || 'Kebele Station'} Field Operations`;

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.fullName || 'Personnel'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {jurisdictionSubtitle} &bull; Offline-first registration &amp; central synchronization
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {role === 'FIELD_OFFICER' && (
            <>
              <Button
                leftIcon={<FileText className="w-4 h-4" />}
                variant="primary"
                onClick={() => onNavigate('/daily-report')}
              >
                {isReportSubmitted ? 'View Submitted Report' : 'Daily Work Report'}
              </Button>
              <Button
                leftIcon={<PlusCircle className="w-4 h-4" />}
                onClick={() => onNavigate('/register')}
              >
                Register Citizen
              </Button>
            </>
          )}

          <Button
            variant="outline"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => onNavigate('/sync')}
          >
            Sync Center
          </Button>
        </div>
      </div>

      {/* Field Officer Active Session & Screen-Time Widget */}
      {role === 'FIELD_OFFICER' && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                    Active Work Interface Screen Time
                  </h4>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Recording
                  </span>
                </div>
                <p className="text-xs text-blue-800 mt-0.5">
                  Accumulated eligible time today:{' '}
                  <strong className="font-mono text-blue-950 font-bold">
                    {DailyReportService.formatScreenTime(screenTimeSeconds)}
                  </strong>{' '}
                  &bull; Finalized upon daily report submission.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('/assignments')}
                leftIcon={<Briefcase className="w-3.5 h-3.5" />}
              >
                Field Tasks
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate('/daily-report')}
                leftIcon={<FileText className="w-3.5 h-3.5" />}
              >
                {isReportSubmitted ? 'Locked Report' : 'Draft Daily Report'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Storage Guarantee Card */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
              Offline-First Guarantee Active
            </h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              FieldSync guarantees zero data loss in the field. Registrations, screen-time sessions, and activity logs commit to local IndexedDB before syncing to PostgreSQL.
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Confirmed Registrations"
          value={stats?.totalCitizens ?? 0}
          subtitle="Confirmed on central database"
          icon={<Users className="w-5 h-5" />}
        />

        <StatsCard
          title="Pending Local Sync"
          value={localPendingCount}
          subtitle="Records in device offline queue"
          icon={<Clock className="w-5 h-5" />}
        />

        <StatsCard
          title="Active Field Officers"
          value={stats?.activeOfficers ?? 0}
          subtitle={role === 'SUPERVISOR' ? 'In your Woreda' : 'Authorized workforce'}
          icon={<UserCheck className="w-5 h-5" />}
        />

        <StatsCard
          title="Duplicate Alerts"
          value={stats?.duplicateAlerts ?? 0}
          subtitle="Pending supervisor review"
          icon={<AlertTriangle className="w-5 h-5" />}
        />
      </div>

      {/* Two Column Section: Recent Records & Operational Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Citizen Registrations */}
        <div className="lg:col-span-2">
          <Card noPadding className="border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Citizen Registrations</h3>
                <p className="text-[11px] text-slate-500">Live feed from central PostgreSQL database</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
                onClick={() => onNavigate('/citizens')}
              >
                View Directory
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Citizen Name</th>
                    <th className="px-4 py-3">Gender / DOB</th>
                    <th className="px-4 py-3">Station</th>
                    <th className="px-4 py-3">Sync Status</th>
                    <th className="px-4 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {!stats?.recentCitizens || stats.recentCitizens.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No registrations recorded yet.
                      </td>
                    </tr>
                  ) : (
                    stats.recentCitizens.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {c.fullName}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {c.gender} &bull; {c.dateOfBirth.split('T')[0]}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {c.woreda?.name || 'Woreda'} &bull; {c.kebele?.name || 'Kebele'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge status={c.syncStatus as any} size="sm">
                            {c.syncStatus}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-[11px]">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Quick Operations & Sync Status */}
        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader
              title="System Connectivity"
              subtitle="Device to central PostgreSQL"
            />
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Database Engine</span>
                <span className="font-semibold text-slate-800">PostgreSQL (Prisma)</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Local Cache</span>
                <span className="font-semibold text-slate-800">IndexedDB (Dexie.js)</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Idempotency Key</span>
                <span className="font-semibold text-slate-800">UUID v4</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Sync Engine State</span>
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active &bull; Auto-Sync
                </span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onNavigate('/sync')}
              >
                Open Synchronization Center
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
