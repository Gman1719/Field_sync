// src/hooks/useVerification.ts
// Offline-First Random Work Verification Hook for FieldSync
// Handles 15-second mandatory verification modal, offline scheduling fallback, and safe synchronization.

import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineDb } from '../db/offlineDb';
import { db } from '../services/database';
import { API_BASE } from '../config/api';
import ActivityLogger from '../services/activityLogger';
import { createLocalNotification } from '../services/notificationApi';
import { generateVerificationId } from '../utils/idGenerator';
import {
  evaluateWorkingHours,
  getZonedTimeComponents,
  DEFAULT_WORKING_HOURS_CONFIG,
} from '../config/workingHours';
import type { WorkVerification, VerificationStatus } from '../types/index';

export interface PendingVerificationData {
  id: string;
  scheduledAt: string;
  deadlineAt: string;
  remainingSeconds: number;
  message?: string;
  isOffline?: boolean;
}

// Check if officer is on approved leave or approved permission
async function isAbsenceAuthorized(targetOfficerId: string): Promise<boolean> {
  try {
    const { dateStr, totalMinutes } = getZonedTimeComponents();

    if (db.leaves) {
      const leaves = await db.leaves.where('employeeId').equals(targetOfficerId).toArray();
      const activeLeave = leaves.find(
        (l: any) =>
          (l.status || '').toLowerCase() === 'approved' &&
          (l.startDate || l.start_date) <= dateStr &&
          (l.endDate || l.end_date) >= dateStr
      );
      if (activeLeave) return true;
    }

    if (db.permissions) {
      const permissions = await db.permissions.where('employeeId').equals(targetOfficerId).toArray();
      const activePerm = permissions.find((p: any) => {
        if ((p.status || '').toLowerCase() !== 'approved') return false;
        const pDate = p.date || p.permissionDate || p.startDate || p.start_date;
        if (pDate !== dateStr) return false;
        const [sh, sm] = (p.startTime || p.start_time || '00:00').split(':').map(Number);
        const [eh, em] = (p.endTime || p.end_time || '00:00').split(':').map(Number);
        const sMins = sh * 60 + sm;
        const eMins = eh * 60 + em;
        return totalMinutes >= sMins && totalMinutes <= eMins;
      });
      if (activePerm) return true;
    }
  } catch (_) {}
  return false;
}

export function useVerification(officerId?: string | null, officerName?: string | null) {
  const [showPopup, setShowPopup] = useState(false);
  const [pendingVerification, setPendingVerification] = useState<PendingVerificationData | null>(null);
  const [recentVerifications, setRecentVerifications] = useState<WorkVerification[]>([]);

  const pollIntervalRef = useRef<any>(null);
  const offlineCheckIntervalRef = useRef<any>(null);
  const isRespondingRef = useRef(false);

  // 1. Load recent verifications from Dexie
  const loadRecentVerifications = useCallback(async () => {
    if (!officerId) return;
    try {
      if (offlineDb.workVerifications) {
        const records = await offlineDb.workVerifications
          .where('officerId')
          .equals(officerId)
          .reverse()
          .limit(20)
          .toArray();
        setRecentVerifications(records);
      }
    } catch (e) {
      console.error('Error loading recent verifications:', e);
    }
  }, [officerId]);

  useEffect(() => {
    loadRecentVerifications();
  }, [loadRecentVerifications]);

  // 2. Trigger a verification popup
  const triggerVerification = useCallback(
    (data: PendingVerificationData) => {
      setPendingVerification(data);
      setShowPopup(true);
      // Notify screen-time tracking to pause counting while modal is pending
      window.dispatchEvent(new CustomEvent('verification-modal-state', { detail: { pending: true } }));
    },
    []
  );

  // 3. Dismiss popup & restore screen-time state
  const closePopup = useCallback(() => {
    setShowPopup(false);
    setPendingVerification(null);
    window.dispatchEvent(new CustomEvent('verification-modal-state', { detail: { pending: false } }));
  }, []);

  // 4. Online polling / heartbeat listener
  useEffect(() => {
    if (!officerId) return;

    // Listen to incoming verification signals from heartbeat
    const handleIncoming = async (e: any) => {
      const v = e.detail;
      if (v && v.id && !showPopup) {
        if (officerId && (await isAbsenceAuthorized(officerId))) return;
        triggerVerification({
          id: v.id,
          scheduledAt: v.scheduledAt,
          deadlineAt: v.deadlineAt,
          remainingSeconds: v.remainingSeconds || 15,
          isOffline: false,
        });
      }
    };

    window.addEventListener('incoming-verification', handleIncoming);

    // Also poll every 15 seconds if online
    pollIntervalRef.current = setInterval(async () => {
      if (!navigator.onLine || showPopup) return;
      const token = localStorage.getItem('fieldsync_token');
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/work-monitoring/verifications/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.pending) {
            if (officerId && (await isAbsenceAuthorized(officerId))) return;
            triggerVerification({
              id: json.pending.id,
              scheduledAt: json.pending.scheduledAt,
              deadlineAt: json.pending.deadlineAt,
              remainingSeconds: json.pending.remainingSeconds,
              isOffline: false,
            });
          }
        }
      } catch (_e) {
        // Network error ignored
      }
    }, 15000);

    return () => {
      window.removeEventListener('incoming-verification', handleIncoming);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [officerId, showPopup, triggerVerification]);

  // 5. Offline Verification Scheduler Fallback
  // If the device is offline during official working hours and a work session is active,
  // ensure random verifications still occur at configured intervals.
  useEffect(() => {
    if (!officerId) return;

    offlineCheckIntervalRef.current = setInterval(async () => {
      if (navigator.onLine || showPopup) return;

      const wh = evaluateWorkingHours();
      if (!wh.isWorkingHours || wh.isLunch) return;

      if (officerId && (await isAbsenceAuthorized(officerId))) return;

      const { dateStr } = getZonedTimeComponents();

      // Check today's existing verifications count and last verification time
      const todayVerifications = await offlineDb.workVerifications
        .where('officerId')
        .equals(officerId)
        .filter((v) => v.date === dateStr)
        .sortBy('scheduledAt');

      if (todayVerifications.length >= DEFAULT_WORKING_HOURS_CONFIG.maxDailyChecks) {
        return; // Daily limit reached
      }

      const lastV = todayVerifications[todayVerifications.length - 1];
      const now = Date.now();

      if (lastV) {
        const lastTime = new Date(lastV.scheduledAt).getTime();
        const minutesSinceLast = (now - lastTime) / (60 * 1000);
        if (minutesSinceLast < DEFAULT_WORKING_HOURS_CONFIG.minVerificationIntervalMinutes) {
          return; // Safeguard: Too soon
        }
      }

      // Trigger local offline verification
      const scheduledIso = new Date().toISOString();
      const deadlineIso = new Date(now + 15000).toISOString();
      const vId = generateVerificationId();

      triggerVerification({
        id: vId,
        scheduledAt: scheduledIso,
        deadlineAt: deadlineIso,
        remainingSeconds: 15,
        isOffline: true,
      });
    }, 60000); // Check every minute offline

    return () => {
      if (offlineCheckIntervalRef.current) clearInterval(offlineCheckIntervalRef.current);
    };
  }, [officerId, showPopup, triggerVerification]);

  // 6. Officer clicked "I'm Here" within 15 seconds
  const handleConfirm = useCallback(async () => {
    if (!pendingVerification || isRespondingRef.current || !officerId) return;
    isRespondingRef.current = true;

    const now = new Date();
    const respondedIso = now.toISOString();
    const scheduledTime = new Date(pendingVerification.scheduledAt).getTime();
    const responseSeconds = Math.max(0, Math.round((now.getTime() - scheduledTime) / 1000));
    const isOnline = navigator.onLine && !pendingVerification.isOffline;
    const status: VerificationStatus = isOnline ? 'CONFIRMED' : 'CONFIRMED_OFFLINE';
    const { dateStr } = getZonedTimeComponents();

    try {
      // Record in local Dexie
      const record: WorkVerification = {
        id: pendingVerification.id,
        officerId,
        officerName: officerName || undefined,
        scheduledAt: pendingVerification.scheduledAt,
        triggeredAt: pendingVerification.scheduledAt,
        respondedAt: respondedIso,
        deadlineAt: pendingVerification.deadlineAt,
        status,
        responseTimeSeconds: responseSeconds,
        failureReason: null,
        connectionState: isOnline ? 'ONLINE' : 'OFFLINE',
        loginState: 'LOGGED_IN',
        offlineCreated: !isOnline,
        syncStatus: isOnline ? 'SYNCED' : 'PENDING',
        syncedAt: isOnline ? respondedIso : null,
        date: dateStr,
        notes: isOnline ? 'Confirmed online' : 'Confirmed offline — sync pending',
      };

      if (offlineDb.workVerifications) {
        await offlineDb.workVerifications.put(record);
      }

      // Record Activity Log
      ActivityLogger.log(
        'VERIFICATION_CONFIRMED',
        `Successfully confirmed presence check in ${responseSeconds}s`,
        {
          officerId,
          officerName,
          relatedRecordId: pendingVerification.id,
          metadata: {
            responseTimeSeconds: responseSeconds,
            status,
            connectionState: isOnline ? 'ONLINE' : 'OFFLINE',
          },
        }
      ).catch(() => {});

      // If online, send confirmation to server immediately
      if (isOnline) {
        const token = localStorage.getItem('fieldsync_token');
        if (token) {
          fetch(`${API_BASE}/work-monitoring/verifications/respond`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ verificationId: pendingVerification.id }),
          }).catch((err) => console.warn('Failed to post online response:', err));
        }
      }

      window.dispatchEvent(new CustomEvent('verification-update'));
      loadRecentVerifications();
    } catch (err) {
      console.error('Error confirming verification:', err);
    } finally {
      isRespondingRef.current = false;
      closePopup();
    }
  }, [pendingVerification, officerId, officerName, closePopup, loadRecentVerifications]);

  // 7. 15-second window expired without response (MISSED)
  const handleTimeout = useCallback(async () => {
    if (!pendingVerification || isRespondingRef.current || !officerId) return;
    isRespondingRef.current = true;

    const isOnline = navigator.onLine && !pendingVerification.isOffline;
    const status: VerificationStatus = isOnline ? 'MISSED' : 'MISSED_OFFLINE';
    const { dateStr } = getZonedTimeComponents();

    // Check if session was started
    let todaySession: any = null;
    try {
      todaySession = await offlineDb.workSessions
        .where('officerId')
        .equals(officerId)
        .filter((s) => s.reportDate === dateStr && !s.endedAt)
        .first();
    } catch (_) {}

    const sessionNote = todaySession ? 'Work session active' : 'Session not started yet';
    const noteText = `Work verification missed — no response within 15 seconds (${sessionNote})`;

    try {
      const record: WorkVerification = {
        id: pendingVerification.id,
        officerId,
        officerName: officerName || undefined,
        scheduledAt: pendingVerification.scheduledAt,
        triggeredAt: pendingVerification.scheduledAt,
        respondedAt: null,
        deadlineAt: pendingVerification.deadlineAt,
        status,
        responseTimeSeconds: null,
        failureReason: todaySession ? 'NO_RESPONSE' : 'SESSION_NOT_ACTIVE',
        connectionState: isOnline ? 'ONLINE' : 'OFFLINE',
        loginState: 'LOGGED_IN',
        offlineCreated: !isOnline,
        syncStatus: 'PENDING',
        syncedAt: null,
        date: dateStr,
        notes: noteText,
      };

      if (offlineDb.workVerifications) {
        await offlineDb.workVerifications.put(record);
      }

      // Record Activity Log
      ActivityLogger.log(
        'VERIFICATION_MISSED',
        noteText,
        {
          officerId,
          officerName: officerName || 'Field Officer',
          relatedRecordId: pendingVerification.id,
          metadata: {
            status,
            hasActiveSession: Boolean(todaySession),
            connectionState: isOnline ? 'ONLINE' : 'OFFLINE',
          },
        }
      ).catch(() => {});

      // Dispatch alert notification directly to assigned supervisor
      let supervisorId: string | null = null;
      try {
        const u = await offlineDb.users.get(officerId);
        if (u?.supervisorId) supervisorId = u.supervisorId;
      } catch (_) {}
      if (!supervisorId) {
        try {
          const raw = localStorage.getItem('fieldsync_user');
          if (raw) supervisorId = JSON.parse(raw)?.supervisorId || null;
        } catch (_) {}
      }

      if (supervisorId) {
        createLocalNotification({
          recipientId: supervisorId,
          title: 'Missed Verification: Field Officer',
          message: `${officerName || 'Field Officer'} missed a scheduled verification check-in (${sessionNote}).`,
          type: 'SECURITY',
          priority: 'IMPORTANT',
          actionUrl: '/verification',
        }).catch(() => {});
      }

      // Notify supervisor via backend API if online
      if (isOnline) {
        const token = localStorage.getItem('fieldsync_token');
        if (token) {
          fetch(`${API_BASE}/work-monitoring/verifications/missed`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              verificationId: pendingVerification.id,
              reason: todaySession ? 'NO_RESPONSE' : 'SESSION_NOT_ACTIVE',
              notes: noteText,
            }),
          }).catch((err) => console.warn('Failed to notify supervisor of missed verification:', err));
        }
      }

      window.dispatchEvent(new CustomEvent('verification-update'));
      window.dispatchEvent(new CustomEvent('verification-missed', { detail: { record } }));
      loadRecentVerifications();
    } catch (err) {
      console.error('Error recording missed verification:', err);
    } finally {
      isRespondingRef.current = false;
      closePopup();
    }
  }, [pendingVerification, officerId, officerName, closePopup, loadRecentVerifications]);

  return {
    showPopup,
    pendingVerification,
    recentVerifications,
    handleConfirm,
    handleTimeout,
    closePopup,
  };
}

export default useVerification;
