// src/components/supervisor/SupervisorSendAlertPage.tsx
// Dedicated supervisor page to send direct operational alerts and notifications to their assigned field officers.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  Send,
  UserCheck,
  Bell,
  Clock,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE } from '../../config/api';
import { offlineDb } from '../../db/offlineDb';
import { db } from '../../services/database';
import { createLocalNotification } from '../../services/notificationApi';
import { generateAlertId } from '../../utils/idGenerator';
import { useUserLanguage } from '../../context/UserLanguageContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';

interface SupervisorSendAlertPageProps {
  user: any;
  users?: any[];
}

export default function SupervisorSendAlertPage({
  user,
  users = [],
}: SupervisorSendAlertPageProps) {
  const { userT } = useUserLanguage();
  const [assignedOfficers, setAssignedOfficers] = useState<any[]>([]);
  const [loadingOfficers, setLoadingOfficers] = useState(true);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

  // Load supervisor's assigned officers strictly from backend DB or supervisorId match
  useEffect(() => {
    let isMounted = true;
    const loadOfficers = async () => {
      setLoadingOfficers(true);
      const map = new Map<string, any>();

      // 1. Fetch from backend /work-monitoring/officers (strictly supervisor's assigned officers from DB)
      try {
        const token = localStorage.getItem('fieldsync_token') || localStorage.getItem('token');
        if (token && navigator.onLine) {
          const res = await fetch(`${API_BASE}/work-monitoring/officers`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
              json.data.forEach((o: any) => {
                map.set(o.id, {
                  id: o.id,
                  name: o.name || o.fullName,
                  fullName: o.fullName || o.name,
                  email: o.email,
                  employeeId: o.employeeId,
                  zone: o.zone,
                  woreda: o.woreda,
                });
              });
            }
          }
        }
      } catch (_e) {}

      // 2. If map is empty (e.g. offline fallback), filter strictly from offlineDb or users where supervisorId matches user.id
      if (map.size === 0) {
        const sourcePool = (offlineDb?.users ? await offlineDb.users.toArray().catch(() => []) : [])
          .concat(users || []);

        sourcePool
          .filter((u: any) => {
            const isOfficer = u.role === 'field_officer' || u.role === 'FIELD_OFFICER';
            if (!isOfficer) return false;
            if (user?.role === 'manager') return true;
            // STRICT ASSIGNMENT ONLY: Officer's supervisorId must be current supervisor's id
            return (
              (u.supervisorId && u.supervisorId === user?.id) ||
              (user?.employeeId && u.supervisorEmployeeId && u.supervisorEmployeeId === user?.employeeId)
            );
          })
          .forEach((u: any) => {
            if (!map.has(u.id)) {
              map.set(u.id, {
                id: u.id,
                name: u.fullName || u.name,
                fullName: u.fullName || u.name,
                email: u.email,
                employeeId: u.employeeId,
                zone: u.zone,
                woreda: u.woreda,
              });
            }
          });
      }

      if (isMounted) {
        const list = Array.from(map.values());
        setAssignedOfficers(list);
        if (list.length > 0 && (!selectedOfficerId || !list.some(o => o.id === selectedOfficerId))) {
          setSelectedOfficerId(list[0].id);
        } else if (list.length === 0) {
          setSelectedOfficerId('');
        }
        setLoadingOfficers(false);
      }
    };

    loadOfficers();
    return () => {
      isMounted = false;
    };
  }, [user, users]);

  // Load recently sent alerts
  const loadRecentAlerts = useCallback(async () => {
    try {
      if (db?.alerts) {
        const allAlerts = await db.alerts.toArray();
        const supervisorId = user?.id || 'supervisor';
        const mine = allAlerts
          .filter((a: any) => a.sentBy === supervisorId || a.type === 'supervisor_notice')
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10);
        setRecentAlerts(mine);
      }
    } catch (_err) {
      console.warn('Failed to load recent alerts:', _err);
    }
  }, [user]);

  useEffect(() => {
    loadRecentAlerts();
  }, [loadRecentAlerts]);

  const selectedOfficer = useMemo(() => {
    return assignedOfficers.find((o) => o.id === selectedOfficerId) || null;
  }, [assignedOfficers, selectedOfficerId]);

  // Submit Alert
  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfficerId || !selectedOfficer) {
      toast.error(userT('Please select an assigned officer'));
      return;
    }

    if (!message.trim()) {
      toast.error(userT('Please enter an alert message'));
      return;
    }

    setIsSubmitting(true);
    const alertId = generateAlertId();
    const supervisorName = user?.fullName || user?.name || userT('Supervisor');
    const officerName = selectedOfficer.fullName || selectedOfficer.name || userT('Field Officer');

    try {
      const nowIso = new Date().toISOString();
      const metadataPayload = {
        senderId: user?.id,
        senderName: supervisorName,
        senderEmail: user?.email,
        senderRole: user?.role,
      };

      // 1. Dispatch directly to PostgreSQL /api/notifications with sender metadata
      const token = localStorage.getItem('fieldsync_token') || localStorage.getItem('token');
      if (token && navigator.onLine) {
        try {
          const res = await fetch(`${API_BASE}/notifications`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              recipientId: selectedOfficer.id,
              title: title.trim(),
              message: message.trim(),
              type: 'SUPERVISOR_ALERT',
              priority: 'IMPORTANT',
              relatedRecordId: alertId,
              actionUrl: '/notifications',
              metadata: metadataPayload,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => null);
            console.warn('Dispatch notification warning:', err);
          }
        } catch (apiErr) {
          console.warn('Online notification dispatch failed:', apiErr);
        }
      }

      // 2. Persist in offlineDb notifications and db.notifications
      const notifItem = {
        id: alertId,
        recipientId: selectedOfficer.id,
        title: title.trim(),
        message: message.trim(),
        type: 'SUPERVISOR_ALERT',
        priority: 'IMPORTANT' as const,
        isRead: false,
        readAt: null,
        relatedRecordId: alertId,
        actionUrl: '/notifications',
        metadata: metadataPayload,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      try {
        if (offlineDb?.notifications) {
          await offlineDb.notifications.put(notifItem);
        }
      } catch (_e) {}

      try {
        if (db?.notifications) {
          await db.notifications.put({
            id: alertId,
            userId: selectedOfficer.id,
            title: title.trim(),
            message: message.trim(),
            type: 'SUPERVISOR_ALERT',
            read: false,
            timestamp: nowIso,
            link: '/notifications',
          });
        }
      } catch (_e) {}

      // 3. Persist in Dexie database `alerts` table
      const alertRecord = {
        id: alertId,
        title: title.trim(),
        message: message.trim(),
        priority: 'normal',
        type: 'supervisor_notice',
        timestamp: nowIso,
        read: false,
        targetAll: false,
        targetEmployeeId: selectedOfficer.employeeId || selectedOfficer.id,
        targetUsers: [
          {
            id: selectedOfficer.id,
            name: officerName,
            employeeId: selectedOfficer.employeeId,
            role: 'field_officer',
          },
        ],
        sentBy: user?.id || 'supervisor',
        sentByName: supervisorName,
        synced: navigator.onLine,
      };

      if (db?.alerts) {
        try {
          await db.alerts.add(alertRecord);
        } catch (_dbErr) {
          await db.alerts.put(alertRecord);
        }
      }

      // 4. Online sync to server alerts endpoint if available
      if (navigator.onLine) {
        try {
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

      // 5. Broadcast real-time notifications event and cross-tab storage trigger
      window.dispatchEvent(new CustomEvent('notifications-updated'));
      try {
        localStorage.setItem(
          'fieldsync_alert_broadcast',
          JSON.stringify({
            alertId,
            recipientId: selectedOfficer.id,
            title: title.trim(),
            message: message.trim(),
            senderName: supervisorName,
            timestamp: Date.now(),
          })
        );
      } catch (_e) {}

      toast.success(`${userT('Alert notification sent to')} ${officerName}`);
      setTitle('');
      setMessage('');
      loadRecentAlerts();
    } catch (err) {
      console.error('Failed to dispatch officer alert:', err);
      toast.error(userT('Failed to send alert. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-900/40 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {userT('Send Alert')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {userT('Send direct operational alert messages to your assigned field officers')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Alert Dispatch Form */}
      <Card className="border border-slate-200 dark:border-slate-700 shadow-xs">
        <CardHeader className="border-b border-slate-100 dark:border-slate-700/60 pb-4">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{userT('Dispatch Alert Notification')}</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            {userT('Select an assigned field officer and compose an operational directive or reminder.')}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          {loadingOfficers ? (
            <div className="py-12 text-center text-xs text-slate-400">
              {userT('Loading assigned officers...')}
            </div>
          ) : assignedOfficers.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <ShieldAlert className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {userT('No Field Officers Assigned')}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {userT('There are currently no field officers assigned under your supervisory command.')}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendAlert} className="space-y-5">
              {/* Field 1: Assigned Officer Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{userT('Select Field Officer')}</span>
                  <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer"
                >
                  <option value="">{userT('Select an assigned officer...')}</option>
                  {assignedOfficers.map((off) => (
                    <option key={off.id} value={off.id}>
                      {off.fullName || off.name} {off.email ? `• ${off.email}` : ''}
                    </option>
                  ))}
                </select>
                {selectedOfficer && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    {userT('Officer territory')}:{' '}
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {typeof selectedOfficer.zone === 'object' ? selectedOfficer.zone?.name : selectedOfficer.zone || userT('Assigned Territory')}
                      {selectedOfficer.woreda ? ` • ${typeof selectedOfficer.woreda === 'object' ? selectedOfficer.woreda?.name : selectedOfficer.woreda}` : ''}
                    </span>
                  </p>
                )}
              </div>

              {/* Field 2: Alert Title (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>{userT('Alert Subject / Title')}</span>
                  <span className="text-slate-400 font-normal text-[11px]">({userT('Optional')})</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={userT('e.g., Immediate Check-In Required')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                />
              </div>

              {/* Field 3: Alert Message Textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {userT('Alert Message')} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={userT('Type your operational message or instructions for the officer here...')}
                  required
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 leading-relaxed"
                />
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || !selectedOfficerId || !message.trim()}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#2563EB] hover:bg-blue-700 text-white flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? userT('Sending Alert...') : userT('Send Alert')}</span>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Recently Sent Alerts */}
      {recentAlerts.length > 0 && (
        <Card className="border border-slate-200 dark:border-slate-700 shadow-xs">
          <CardHeader className="border-b border-slate-100 dark:border-slate-700/60 pb-3">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{userT('Recently Sent Alerts')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {recentAlerts.map((alt) => {
                const targetName = alt.targetUsers?.[0]?.name || alt.targetEmployeeId || userT('Assigned Officer');
                return (
                  <div key={alt.id} className="p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{alt.title}</span>
                        <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                          → {targetName}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(alt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {alt.message}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
