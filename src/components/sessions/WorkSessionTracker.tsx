// src/components/sessions/WorkSessionTracker.tsx
// Field Officer Work Session & Active Screen-Time Tracking Center
// Complies with official Ethiopian working hours, automatic on-page tracking,
// no manual pause/resume/end buttons, and safe offline-first synchronization.

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Wifi,
  WifiOff,
  History,
  Calendar,
  Sparkles,
  Timer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { offlineDb } from '../../db/offlineDb';
import { useScreenTime, type ScreenTimeHookResult } from '../../hooks/useScreenTime';
import { getZonedTimeComponents } from '../../config/workingHours';
import type { DailyScreenTime, WorkVerification } from '../../types/index';

interface WorkSessionTrackerProps {
  user: any;
  screenTimeInfo?: ScreenTimeHookResult;
}

export default function WorkSessionTracker({ user, screenTimeInfo: passedInfo }: WorkSessionTrackerProps) {
  const internalInfo = useScreenTime(passedInfo ? null : user);
  const screenTime = passedInfo || internalInfo;

  const {
    screenTimeDisplay,
    screenTimeShort,
    screenTimeCounter,
    trackingStatus,
    isSessionActive,
    sessionStartedAt,
    startWorkSession,
    isTabActive,
    isWorkingHours,
    isLunch,
    statusMessage,
  } = screenTime;

  const [isStarting, setIsStarting] = useState(false);
  const [historyTab, setHistoryTab] = useState<'screentime' | 'verifications'>('screentime');
  const [pastScreenTimes, setPastScreenTimes] = useState<DailyScreenTime[]>([]);
  const [pastVerifications, setPastVerifications] = useState<WorkVerification[]>([]);
  const [lastVerification, setLastVerification] = useState<WorkVerification | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const officerId = user?.id || user?.employeeId;

  // Monitor network
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load officer telemetry history from local Dexie
  const loadHistory = useCallback(async () => {
    if (!officerId) return;
    try {
      if (offlineDb.dailyScreenTimes) {
        const records = await offlineDb.dailyScreenTimes
          .where('officerId')
          .equals(officerId)
          .reverse()
          .toArray();
        setPastScreenTimes(records);
      }

      if (offlineDb.workVerifications) {
        const vList = await offlineDb.workVerifications
          .where('officerId')
          .equals(officerId)
          .reverse()
          .toArray();
        setPastVerifications(vList);
        if (vList.length > 0) {
          setLastVerification(vList[0]);
        }
      }
    } catch (e) {
      console.error('Error loading officer history:', e);
    }
  }, [officerId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, trackingStatus]);

  const handleStartSession = async () => {
    setIsStarting(true);
    try {
      await startWorkSession();
      toast.success('Daily Work Session started successfully');
      loadHistory();
    } catch (e) {
      toast.error('Failed to start work session');
    } finally {
      setIsStarting(false);
    }
  };

  const formattedStartTime = sessionStartedAt
    ? new Date(sessionStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner / Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-[#3B82F6] border border-blue-200 dark:border-blue-900/40">
              Field Officer Workstation
            </span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                isOnline
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40'
              }`}
            >
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? 'Online' : 'Offline (Saved Locally)'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F4F4F5] mt-2">
            Work Session & Screen Time
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Official Work Hours: 08:30 – 17:30 (Lunch: 12:30 – 13:30)
          </p>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Session Status
            </span>
            <span
              className={`text-sm font-semibold flex items-center gap-1.5 ${
                trackingStatus === 'TRACKING'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : trackingStatus === 'FINALIZED'
                  ? 'text-purple-600 dark:text-purple-400'
                  : trackingStatus === 'VERIFICATION_PENDING'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  trackingStatus === 'TRACKING'
                    ? 'bg-emerald-500 animate-ping'
                    : trackingStatus === 'FINALIZED'
                    ? 'bg-purple-500'
                    : trackingStatus === 'VERIFICATION_PENDING'
                    ? 'bg-blue-500 animate-bounce'
                    : 'bg-amber-500'
                }`}
              />
              {trackingStatus === 'TRACKING'
                ? 'Actively Counting'
                : trackingStatus === 'FINALIZED'
                ? 'Session Finalized'
                : trackingStatus === 'VERIFICATION_PENDING'
                ? 'Verification Active'
                : isSessionActive
                ? (!isTabActive ? 'Paused (Page Inactive/Minimized)' : isLunch ? 'Paused (Lunch Break)' : 'Paused')
                : 'Not Started'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Action / Telemetry Card */}
      {!isSessionActive ? (
        // NOT STARTED OR FINALIZED STATE: Prompt to start session / new session
        <div className="p-8 rounded-2xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] shadow-xs text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-[#3B82F6] flex items-center justify-center border border-blue-100 dark:border-blue-900/50 shadow-inner">
            <Sparkles className="w-8 h-8" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F4F4F5]">
            {trackingStatus === 'FINALIZED' ? 'Ready to start a new work session?' : "Ready to start today's work session?"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2">
            Click Start Work Session below. Screen time counts continuously while you remain on the
            FieldSync page and automatically pauses if you minimize or switch tabs.
          </p>

          <div className="my-6 inline-flex flex-col sm:flex-row items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#1E222D] border border-slate-200/80 dark:border-[#272A35] text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>
                <strong>Official Work Period:</strong> 08:30 – 17:30
              </span>
            </div>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
            <div>
              <span>
                <strong>Lunch Break:</strong> 12:30 – 13:30 (Paused)
              </span>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleStartSession}
              disabled={isStarting}
              className="py-3 px-8 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 dark:bg-[#3B82F6] dark:hover:bg-blue-500 shadow-lg shadow-blue-500/25 transition-all text-sm sm:text-base cursor-pointer disabled:opacity-50"
            >
              {isStarting ? 'Starting Session...' : (trackingStatus === 'FINALIZED' ? 'Start New Work Session' : 'Start Work Session')}
            </button>
          </div>
        </div>
      ) : (
        // ACTIVE OR FINALIZED SESSION TELEMETRY
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Today's Cumulative Screen Time Counter */}
          <div className="p-6 rounded-2xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Today's Cumulative Screen Time
              </span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>

            <div className="my-4">
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 dark:text-[#F4F4F5] tracking-tight">
                {screenTimeDisplay}
              </div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                {screenTimeShort} total active usage
              </div>
            </div>

            <div className="text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-[#202431] pt-3">
              {trackingStatus === 'TRACKING'
                ? '● Actively counting on FieldSync'
                : trackingStatus === 'FINALIZED'
                ? 'Session finalized upon Daily Report submission'
                : !isTabActive
                ? 'Paused — window minimized or tab switched'
                : isLunch
                ? 'Paused — official lunch period (12:30–13:30)'
                : statusMessage}
            </div>
          </div>

          {/* Card 2: Work Session State */}
          <div className="p-6 rounded-2xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Work Session
              </span>
              <Timer className="w-4 h-4 text-emerald-500" />
            </div>

            <div className="my-4">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    trackingStatus === 'FINALIZED'
                      ? 'bg-purple-500'
                      : isSessionActive
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-slate-400'
                  }`}
                />
                <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[#F4F4F5]">
                  {trackingStatus === 'FINALIZED' ? 'Finalized' : 'Active'}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {formattedStartTime ? `Started at ${formattedStartTime}` : 'Started Today'}
              </div>
            </div>

            <div className="text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-[#202431] pt-3">
              Finalizes automatically when you submit your Daily Work Report
            </div>
          </div>

          {/* Card 3: Last Verification Check */}
          <div className="p-6 rounded-2xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Last Verification
              </span>
              <ShieldCheck className="w-4 h-4 text-purple-500" />
            </div>

            <div className="my-4">
              {lastVerification ? (
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm sm:text-base font-bold ${
                        lastVerification.status.includes('CONFIRMED')
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {lastVerification.status.includes('CONFIRMED') ? 'Confirmed' : 'Missed'}
                    </span>
                    {lastVerification.responseTimeSeconds !== null && lastVerification.responseTimeSeconds !== undefined && (
                      <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                        ({lastVerification.responseTimeSeconds}s response)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {new Date(lastVerification.scheduledAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  No verification checks yet today
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-[#202431] pt-3">
              Official random checks occur during work hours
            </div>
          </div>
        </div>
      )}

      {/* Historical Telemetry Drawer */}
      <div className="rounded-2xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] shadow-xs overflow-hidden">
        <div
          className="p-5 flex items-center justify-between cursor-pointer select-none border-b border-slate-100 dark:border-[#272A35]"
          onClick={() => setShowHistory(!showHistory)}
        >
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" />
            <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-[#F4F4F5]">
              My Screen Time & Verification History
            </h3>
          </div>
          <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showHistory && (
          <div className="p-5 space-y-4">
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#272A35] pb-3">
              <button
                type="button"
                onClick={() => setHistoryTab('screentime')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  historyTab === 'screentime'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-[#3B82F6]'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                Screen Time Records ({pastScreenTimes.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab('verifications')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  historyTab === 'verifications'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-[#3B82F6]'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                Verification Events ({pastVerifications.length})
              </button>
            </div>

            {/* Tab 1: Screen Time Records */}
            {historyTab === 'screentime' && (
              <div className="overflow-x-auto">
                {pastScreenTimes.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                    No historical screen-time records recorded yet.
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-[#272A35] text-slate-400 dark:text-slate-500">
                        <th className="py-2 px-3 font-semibold">Date</th>
                        <th className="py-2 px-3 font-semibold">Active Screen Time</th>
                        <th className="py-2 px-3 font-semibold">Status</th>
                        <th className="py-2 px-3 font-semibold">Finalized</th>
                        <th className="py-2 px-3 font-semibold">Sync</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#272A35]">
                      {pastScreenTimes.map((st) => {
                        const h = Math.floor(st.totalEligibleSeconds / 3600);
                        const m = Math.floor((st.totalEligibleSeconds % 3600) / 60);
                        const formatted = h > 0 ? `${h}h ${m}m` : `${m}m`;

                        return (
                          <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-[#1E222D]">
                            <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-[#F4F4F5]">
                              {st.date}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                              {formatted}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  st.status === 'FINALIZED'
                                    ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400'
                                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                                }`}
                              >
                                {st.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                              {st.finalizedAt
                                ? new Date(st.finalizedAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '--'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`text-[10px] font-medium ${
                                  st.syncStatus === 'SYNCED'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-amber-600 dark:text-amber-400'
                                }`}
                              >
                                {st.syncStatus || 'SYNCED'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab 2: Verifications History */}
            {historyTab === 'verifications' && (
              <div className="overflow-x-auto">
                {pastVerifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                    No verification records available.
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-[#272A35] text-slate-400 dark:text-slate-500">
                        <th className="py-2 px-3 font-semibold">Scheduled Time</th>
                        <th className="py-2 px-3 font-semibold">Status</th>
                        <th className="py-2 px-3 font-semibold">Response Window</th>
                        <th className="py-2 px-3 font-semibold">Connection</th>
                        <th className="py-2 px-3 font-semibold">Sync</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#272A35]">
                      {pastVerifications.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-[#1E222D]">
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-[#F4F4F5]">
                            {new Date(v.scheduledAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                v.status.includes('CONFIRMED')
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                              }`}
                            >
                              {v.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-mono">
                            {v.responseTimeSeconds !== null && v.responseTimeSeconds !== undefined
                              ? `${v.responseTimeSeconds}s`
                              : v.failureReason === 'NO_RESPONSE'
                              ? 'Expired (15s)'
                              : '--'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                            {v.connectionState}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[10px] font-medium ${
                                v.syncStatus === 'SYNCED'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {v.syncStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
