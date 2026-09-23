import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Lock,
  RefreshCw,
  Users,
  Activity,
  Calendar,
  Sparkles,
  ShieldCheck,
  Info,
} from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Badge from '../../components/ui/Badge.tsx';
import StatsCard from '../../components/ui/StatsCard.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import DailyReportService, { TodayStats } from '../../services/dailyReportService.ts';
import ScreenTimeTracker from '../../services/screenTimeTracker.ts';

interface DailyReportPageProps {
  onNavigate?: (path: string) => void;
}

export const DailyReportPage: React.FC<DailyReportPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [liveScreenTime, setLiveScreenTime] = useState<number>(0);

  const officerId = user?.id || '';
  const todayDate = ScreenTimeTracker.getLocalDateString();

  const loadStats = async () => {
    if (!officerId) return;
    const data = await DailyReportService.getTodayStats(officerId, todayDate);
    setStats(data);
    setLiveScreenTime(data.screenTimeSeconds);
    if (data.existingReport) {
      setComments(data.existingReport.comments || '');
    }
  };

  useEffect(() => {
    loadStats();
    // Live ticker for active screen-time counter on the page
    const interval = setInterval(async () => {
      if (officerId && (!stats?.existingReport || !stats.existingReport.isLocked)) {
        const timeData = await ScreenTimeTracker.getTodayScreenTime(officerId, todayDate);
        setLiveScreenTime(timeData.totalSeconds);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [officerId]);

  const handleConfirmSubmit = async () => {
    if (!officerId || !stats) return;

    try {
      setIsSubmitting(true);
      const submittedReport = await DailyReportService.submitDailyReport({
        officerId,
        supervisorId: user?.supervisorId || null,
        reportDate: todayDate,
        citizenCountLocal: stats.citizenCountLocal,
        citizenCountServerConfirmed: stats.citizenCountServerConfirmed,
        activityCount: stats.activityCount,
        sessionCount: stats.sessionCount,
        comments: comments.trim() || undefined,
      });

      setStats((prev) => (prev ? { ...prev, existingReport: submittedReport } : null));
      setShowConfirmModal(false);
      setFeedback({
        type: 'success',
        text: 'Daily work report submitted successfully! Screen time is finalized and the report is locked.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to submit daily report. Stored offline for retry.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLocked = Boolean(stats?.existingReport?.isLocked);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">Daily Work Report</h1>
              {isLocked ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <Lock className="h-3.5 w-3.5" />
                  Locked (Submitted)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Drafting (Live Active)
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">
              Review today's collected fieldwork data, verify citizen registrations, and submit to your assigned supervisor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>Reporting Date: <strong className="text-slate-800">{todayDate}</strong></span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadStats}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Officer & Supervisor Hierarchy Card */}
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-xs text-slate-600 sm:grid-cols-3">
          <div>
            <span className="text-slate-400">Reporting Officer:</span>{' '}
            <strong className="text-slate-800">{user?.fullName || 'Field Officer'}</strong>
          </div>
          <div>
            <span className="text-slate-400">Assigned Station:</span>{' '}
            <strong className="text-slate-800">
              {user?.woreda?.name || 'Assigned Woreda'} • {user?.kebele?.name || 'Kebele'}
            </strong>
          </div>
          <div>
            <span className="text-slate-400">Assigned Supervisor:</span>{' '}
            <strong className="text-slate-800">
              {user?.supervisor?.fullName || 'Woreda Lead Supervisor'}
            </strong>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-3 rounded-lg p-4 text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 4 Core Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Citizens Registered Today"
          value={stats?.citizenCountLocal ?? 0}
          icon={<Users className="w-5 h-5" />}
          subtitle={`${stats?.citizenCountServerConfirmed ?? 0} confirmed on server`}
          trend={{
            value: `${stats?.citizenCountServerConfirmed ?? 0} synced`,
            isPositive: true,
          }}
        />

        <StatsCard
          title="Active Screen Time"
          value={DailyReportService.formatScreenTime(liveScreenTime)}
          icon={<Clock className="w-5 h-5" />}
          subtitle={isLocked ? 'Finalized upon submission' : 'Continuously tracking active interface'}
        />

        <StatsCard
          title="Work Sessions"
          value={stats?.sessionCount ?? 0}
          icon={<Activity className="w-5 h-5" />}
          subtitle="Intervals of active engagement"
        />

        <StatsCard
          title="Activity Events"
          value={stats?.activityCount ?? 0}
          icon={<ShieldCheck className="w-5 h-5" />}
          subtitle="Automated audit events logged"
        />
      </div>

      {/* Screen-Time Finalization Rule Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-800">
        <Info className="h-5 w-5 shrink-0 text-blue-600" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-900">
            Official Screen-Time Tracking Rule
          </p>
          <p className="text-blue-700 leading-relaxed">
            Navigating away or closing tabs pauses screen-time tracking, but <strong>does not finalize your daily screen time</strong>.
            Your total daily screen time is permanently finalized only when you submit this Daily Work Report.
          </p>
        </div>
      </div>

      {/* Report Details & Review Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Review Summary */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600" />
                <span>Fieldwork Performance Breakdown</span>
              </h2>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Metric Category</th>
                      <th className="px-4 py-3">Device Recorded</th>
                      <th className="px-4 py-3">Server Confirmed</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    <tr>
                      <td className="px-4 py-3 font-medium text-slate-800">Citizen Registrations</td>
                      <td className="px-4 py-3 text-slate-600">{stats?.citizenCountLocal ?? 0} records</td>
                      <td className="px-4 py-3 text-slate-600">{stats?.citizenCountServerConfirmed ?? 0} records</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            stats && stats.citizenCountLocal === stats.citizenCountServerConfirmed
                              ? 'success'
                              : 'warning'
                          }
                        >
                          {stats && stats.citizenCountLocal === stats.citizenCountServerConfirmed
                            ? 'All Synced'
                            : 'Pending Ingestion'}
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-slate-800">Active Screen Time</td>
                      <td className="px-4 py-3 text-slate-600">{DailyReportService.formatScreenTime(liveScreenTime)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {isLocked ? DailyReportService.formatScreenTime(liveScreenTime) : 'Pending submission'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={isLocked ? 'success' : 'default'}>
                          {isLocked ? 'Finalized' : 'In Progress'}
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-slate-800">Work Sessions Recorded</td>
                      <td className="px-4 py-3 text-slate-600">{stats?.sessionCount ?? 0} sessions</td>
                      <td className="px-4 py-3 text-slate-600">{isLocked ? stats?.sessionCount ?? 0 : '0'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="default">Tracked</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-slate-800">Audit Activity Events</td>
                      <td className="px-4 py-3 text-slate-600">{stats?.activityCount ?? 0} events</td>
                      <td className="px-4 py-3 text-slate-600">{stats?.activityCount ?? 0} queued</td>
                      <td className="px-4 py-3">
                        <Badge variant="success">Auto-Captured</Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Officer Comments / Notes */}
              <div className="mt-6 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Officer Comments & Daily Observations (Optional)
                </label>
                {isLocked ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 leading-relaxed italic">
                    {comments || 'No comments provided for this report.'}
                  </div>
                ) : (
                  <textarea
                    rows={4}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Enter any challenges encountered, equipment issues, community notes, or weather impediments..."
                    className="w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Action / Status Sidebar */}
        <div className="space-y-6">
          <Card>
            <div className="p-6 space-y-5">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Submission & Synchronization
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Report Status:</span>
                  <span className="font-semibold text-slate-800">
                    {isLocked ? 'Submitted (Read-Only)' : 'Draft (Editable)'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Local Queue Health:</span>
                  <span className="font-semibold text-emerald-600">
                    {stats?.pendingSyncCount === 0 ? 'Queue Clean' : `${stats?.pendingSyncCount} items pending`}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Failed Queue Items:</span>
                  <span className="font-semibold text-slate-800">
                    {stats?.failedSyncCount ?? 0}
                  </span>
                </div>
              </div>

              {isLocked ? (
                <div className="rounded-lg bg-emerald-50 p-4 text-xs text-emerald-800 border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Report Officially Submitted</span>
                  </div>
                  <p className="text-emerald-700 leading-relaxed">
                    Submitted at{' '}
                    <strong>
                      {stats?.existingReport?.submittedAt
                        ? new Date(stats.existingReport.submittedAt).toLocaleTimeString()
                        : 'Today'}
                    </strong>
                    . This report is locked against direct editing to preserve data integrity.
                  </p>
                </div>
              ) : (
                <Button
                  variant="primary"
                  className="w-full justify-center py-2.5 text-xs font-semibold"
                  leftIcon={<Send className="h-4 w-4" />}
                  onClick={() => setShowConfirmModal(true)}
                >
                  Submit Daily Work Report
                </Button>
              )}

              {onNavigate && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full justify-center text-xs"
                    onClick={() => onNavigate('/activity-logs')}
                  >
                    View Detailed Activity Logs
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Report Submission</h3>
                <p className="text-xs text-slate-500">Please review before finalizing</p>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>
                Once submitted, your daily screen time of{' '}
                <strong className="text-slate-900">{DailyReportService.formatScreenTime(liveScreenTime)}</strong> will be
                permanently finalized, and this report will be <strong>locked against editing</strong>.
              </p>
              <p>
                Total citizens registered today: <strong className="text-slate-900">{stats?.citizenCountLocal}</strong>.
              </p>
              <p className="text-slate-500 italic">
                If offline, this report will be saved securely on your device and synchronized as soon as internet connectivity returns.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmSubmit}
                isLoading={isSubmitting}
                leftIcon={<Lock className="h-3.5 w-3.5" />}
              >
                Finalize & Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyReportPage;
