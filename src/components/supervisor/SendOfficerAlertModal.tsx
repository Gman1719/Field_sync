// src/components/supervisor/SendOfficerAlertModal.tsx
// Modal for Supervisors to dispatch targeted operational alerts to specific field officers
// based on their real-time daily screen time and periodic verification history.

import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Sparkles,
  Info,
  Radio,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useUserLanguage } from '../../context/UserLanguageContext';
import { offlineDb } from '../../db/offlineDb';
import { db } from '../../services/database';
import { createLocalNotification } from '../../services/notificationApi';
import { API_BASE } from '../../config/api';
import { getZonedTimeComponents } from '../../config/workingHours';
import { ActivityLogger } from '../../services/activityLogger';
import { generateAlertId } from '../../utils/idGenerator';

interface SendOfficerAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  officer: {
    id: string;
    name?: string;
    fullName?: string;
    email?: string;
    employeeId?: string;
    zone?: any;
    woreda?: any;
    todayScreenTimeFormatted?: string;
    screenTimeFormatted?: string;
    screenTimeMinutes?: number;
    dailyReportSubmitted?: boolean;
    verificationRecords?: any[];
  } | null;
  currentUser: any;
  onAlertSent?: (alertData: any) => void;
}

export default function SendOfficerAlertModal({
  isOpen,
  onClose,
  officer,
  currentUser,
  onAlertSent,
}: SendOfficerAlertModalProps) {
  const { userT } = useUserLanguage();
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Telemetry states
  const [screenTimeFmt, setScreenTimeFmt] = useState<string>('00:00:00');
  const [reportSubmitted, setReportSubmitted] = useState<boolean>(false);
  const [verificationStats, setVerificationStats] = useState<{
    total: number;
    confirmed: number;
    missed: number;
    rate: number;
  }>({ total: 0, confirmed: 0, missed: 0, rate: 100 });

  // Form states
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const officerName = officer?.name || officer?.fullName || 'Field Officer';
  const officerZone = typeof officer?.zone === 'object' ? officer.zone?.name : officer?.zone || '';
  const officerWoreda = typeof officer?.woreda === 'object' ? officer.woreda?.name : officer?.woreda || '';
  const locationLabel = [officerZone, officerWoreda].filter(Boolean).join(' • ');

  // Fetch telemetry (screen time & verification history) for this specific officer
  useEffect(() => {
    if (!officer?.id || !isOpen) return;

    let isMounted = true;
    setLoadingTelemetry(true);

    const loadTelemetry = async () => {
      try {
        const { dateStr: todayStr } = getZonedTimeComponents();

        // 1. Resolve Screen Time
        let resolvedScreenTime = officer.todayScreenTimeFormatted || officer.screenTimeFormatted;
        let resolvedReportSubmitted = Boolean(officer.dailyReportSubmitted);

        if (!resolvedScreenTime && offlineDb.dailyScreenTimes) {
          try {
            const dst = await offlineDb.dailyScreenTimes
              .where('officerId')
              .equals(officer.id)
              .filter(r => r.date === todayStr)
              .first();

            if (dst) {
              const totalSec = dst.totalEligibleSeconds || (dst as any).totalSeconds || 0;
              const h = Math.floor(totalSec / 3600);
              const m = Math.floor((totalSec % 3600) / 60);
              const s = totalSec % 60;
              resolvedScreenTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }
          } catch (_e) {}
        }

        // 2. Resolve Verification History
        let vRecords = officer.verificationRecords || [];
        if (vRecords.length === 0 && offlineDb.workVerifications) {
          try {
            const allDbVerifs = await offlineDb.workVerifications
              .where('officerId')
              .equals(officer.id)
              .toArray();
            vRecords = allDbVerifs;
          } catch (_e) {}
        }

        if (vRecords.length === 0 && db?.verification_history) {
          try {
            const allLegacy = await db.verification_history.toArray();
            vRecords = allLegacy.filter(
              (v: any) => v.officerId === officer.id || (officer.employeeId && v.officerEmployeeId === officer.employeeId)
            );
          } catch (_e) {}
        }

        if (isMounted) {
          setScreenTimeFmt(resolvedScreenTime || '00:00:00');
          setReportSubmitted(resolvedReportSubmitted);

          const total = vRecords.length;
          const confirmed = vRecords.filter((v: any) =>
            v.isAnswered ||
            v.success ||
            String(v.status || '').includes('CONFIRMED') ||
            v.respondedAt
          ).length;
          const missed = total - confirmed;
          const rate = total > 0 ? Math.round((confirmed / total) * 100) : 100;

          setVerificationStats({ total, confirmed, missed, rate });

          // Default auto-preset based on telemetry
          if (missed > 0) {
            setTitle(userT('Urgent: Missed Verification Prompts'));
            setMessage(
              `${userT('Hello')} ${officerName}, ${userT('our monitoring system recorded')} ${missed} ${userT('missed verification check-in(s) today. Please keep your device accessible and respond to scheduled verification challenges immediately.')}`
            );
          } else if (resolvedScreenTime === '00:00:00' || (resolvedScreenTime && resolvedScreenTime.startsWith('00:'))) {
            setTitle(userT('Low Screen Time Notice'));
            setMessage(
              `${userT('Hello')} ${officerName}, ${userT('your recorded active screen time today is currently')} ${resolvedScreenTime || '00:00:00'}. ${userT('Please ensure FieldSync is actively running while you conduct field operations.')}`
            );
          } else {
            setTitle(userT('Operational Notice'));
            setMessage(
              `${userT('Hello')} ${officerName}, ${userT('please review your daily field tasks and report status.')}`
            );
          }
        }
      } catch (err) {
        console.error('Error fetching officer telemetry:', err);
      } finally {
        if (isMounted) setLoadingTelemetry(false);
      }
    };

    loadTelemetry();

    return () => {
      isMounted = false;
    };
  }, [officer, isOpen, userT, officerName]);

  // Quick Preset Handlers
  const applyPreset = (presetType: 'screentime' | 'verification' | 'inactivity' | 'custom') => {
    switch (presetType) {
      case 'screentime':
        setTitle(userT('Low Screen Time Notice'));
        setMessage(
          `${userT('Hello')} ${officerName}, ${userT('your recorded active screen time today is currently')} ${screenTimeFmt}. ${userT('Please ensure FieldSync is actively running while you conduct field operations in')} ${locationLabel || userT('your assigned area')}.`
        );
        break;
      case 'verification':
        setTitle(userT('Urgent: Missed Verification Prompts'));
        setMessage(
          `${userT('Hello')} ${officerName}, ${userT('you have')} ${verificationStats.missed || 1} ${userT('missed verification prompt(s) today. Verification compliance is mandatory during active field duties. Please acknowledge immediately.')}`
        );
        break;
      case 'inactivity':
        setTitle(userT('Session Inactivity Notice'));
        setMessage(
          `${userT('Hello')} ${officerName}, ${userT('we noted prolonged inactivity or unrecorded session time. Please verify that your work session is active and sync your progress.')}`
        );
        break;
      case 'custom':
        setTitle('');
        setMessage('');
        break;
    }
  };

  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officer?.id) return;

    if (!title.trim() || !message.trim()) {
      toast.error(userT('Please enter an alert title and message'));
      return;
    }

    setIsSubmitting(true);
    const alertId = generateAlertId();
    const supervisorName = currentUser?.fullName || currentUser?.name || userT('Supervisor');

    try {
      // 1. Dispatch in-app notification directly targeted to this officer
      await createLocalNotification({
        recipientId: officer.id,
        title: title.trim(),
        message: message.trim(),
        type: 'SUPERVISOR_ALERT',
        priority: 'NORMAL',
        relatedRecordId: currentUser?.id,
        actionUrl: '/notifications',
      });

      // 2. Persist in Dexie database `alerts` table
      const alertRecord = {
        id: alertId,
        title: title.trim(),
        message: message.trim(),
        priority: 'normal',
        type: 'supervisor_notice',
        timestamp: new Date().toISOString(),
        read: false,
        targetAll: false,
        targetEmployeeId: officer.employeeId || officer.id,
        targetUsers: [
          {
            id: officer.id,
            name: officerName,
            employeeId: officer.employeeId,
            role: 'field_officer',
          },
        ],
        sentBy: currentUser?.id || 'supervisor',
        sentByName: supervisorName,
        metadata: {
          screenTimeAtAlert: screenTimeFmt,
          verificationStatsAtAlert: verificationStats,
        },
        synced: navigator.onLine,
      };

      if (db?.alerts) {
        try {
          await db.alerts.add(alertRecord);
        } catch (_dbErr) {
          await db.alerts.put(alertRecord);
        }
      }

      // 3. Online sync to server alerts endpoint if available
      if (navigator.onLine) {
        try {
          const token = localStorage.getItem('fieldsync_token') || localStorage.getItem('token');
          fetch(`${API_BASE}/alerts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(alertRecord),
          }).catch(() => {});
        } catch (_syncErr) {}
      }

      // 4. Log Supervisor Action
      try {
        await ActivityLogger.log(
          'SUPERVISOR_ALERT_SENT',
          `Sent alert to ${officerName}: ${title.trim()}`,
          {
            officerId: officer.id,
            metadata: {
              supervisorId: currentUser?.id,
              screenTime: screenTimeFmt,
              missedVerifications: verificationStats.missed,
            },
          }
        );
      } catch (_logErr) {}

      // 5. Reactive events
      window.dispatchEvent(new CustomEvent('notifications-updated'));
      window.dispatchEvent(new CustomEvent('alerts-updated'));

      toast.success(`${userT('Alert notification sent to')} ${officerName}`);
      if (onAlertSent) {
        onAlertSent(alertRecord);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to send alert:', err);
      toast.error(userT('Failed to send alert. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!officer) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={userT('Send Alert to Officer')}
      size="lg"
    >
      <form onSubmit={handleSendAlert} className="space-y-5">
        {/* Officer Identity Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
              {(officerName[0] || 'O').toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {officerName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                {officer.employeeId || officer.email || officer.id}
              </p>
              {locationLabel && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                  {locationLabel}
                </p>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
              <Radio className="w-3 h-3 text-blue-500 animate-pulse" />
              {userT('Field Officer')}
            </span>
          </div>
        </div>

        {/* Real-time Telemetry Context (Screen Time & Verification History) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {userT('Officer Telemetry & Status')}
            </h4>
            {loadingTelemetry && (
              <span className="flex items-center gap-1 text-[11px] text-blue-500">
                <RefreshCw className="w-3 h-3 animate-spin" />
                {userT('Refreshing...')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Screen Time Telemetry Card */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {userT('Screen Time (Today)')}
                  </span>
                </div>
                <span className="font-mono font-bold text-sm text-[#2563EB] dark:text-blue-400">
                  {screenTimeFmt}
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">{userT('Daily Report')}</span>
                <span
                  className={`font-semibold ${
                    reportSubmitted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {reportSubmitted ? userT('Submitted') : userT('In Progress / Pending')}
                </span>
              </div>
            </div>

            {/* Verification History Telemetry Card */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      verificationStats.missed > 0
                        ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                        : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {userT('Verification History')}
                  </span>
                </div>
                <span
                  className={`font-mono font-bold text-sm ${
                    verificationStats.rate >= 80
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : verificationStats.rate >= 60
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {verificationStats.rate}% {userT('Pass')}
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  {verificationStats.total} {userT('total events')}
                </span>
                <span className="flex items-center gap-2 font-medium">
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> {verificationStats.confirmed}
                  </span>
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                    <XCircle className="w-3 h-3" /> {verificationStats.missed} {userT('missed')}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Template Presets */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            {userT('Quick Alert Templates')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => applyPreset('screentime')}
              className="p-2.5 rounded-xl border text-left transition-all text-xs font-medium cursor-pointer border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
            >
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{userT('Low Screen Time')}</span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-1">{userT('Target hours warning')}</p>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('verification')}
              className="p-2.5 rounded-xl border text-left transition-all text-xs font-medium cursor-pointer border-slate-200 dark:border-slate-700 hover:border-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/20"
            >
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold mb-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{userT('Missed Verif.')}</span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-1">{userT('Missed prompts alert')}</p>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('inactivity')}
              className="p-2.5 rounded-xl border text-left transition-all text-xs font-medium cursor-pointer border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
            >
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{userT('Inactivity')}</span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-1">{userT('Check active duty')}</p>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('custom')}
              className="p-2.5 rounded-xl border text-left transition-all text-xs font-medium cursor-pointer border-slate-200 dark:border-slate-700 hover:border-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{userT('Custom')}</span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-1">{userT('Compose message')}</p>
            </button>
          </div>
        </div>

        {/* Title Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {userT('Alert Title')} *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={userT('e.g. Low Screen Time Notice')}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
          />
        </div>

        {/* Message Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {userT('Alert Message')} *
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              {message.length} / 500
            </span>
          </div>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            placeholder={userT('Write a direct operational alert message to this field officer...')}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] resize-none"
          />
        </div>

        {/* Delivery Channels Note */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-[11px] text-slate-500 dark:text-slate-400">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <span>{userT('This alert will be delivered directly to the officer as an in-app notification.')}</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer font-semibold"
          >
            {userT('Cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !title.trim() || !message.trim()}
            icon={Send}
            className="cursor-pointer font-semibold shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? userT('Sending Alert...') : userT('Send Alert')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
