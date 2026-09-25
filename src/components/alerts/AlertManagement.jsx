// src/components/alerts/AlertManagement.jsx – Enterprise Emergency Alert Broadcast

import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell, AlertOctagon, Send, CheckCircle2, Clock,
  Radio, ShieldAlert, Filter, User, Users,
  Check, Eye, AlertTriangle, MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';

import { db, checkRealInternet, syncQueue } from '../../services/database';
import { uid } from '../../utils/helpers';
import { API_BASE as API_BASE_URL } from '../../config/api';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';
import StatCard from '../ui/StatCard';

export default function AlertManagement({ alerts = [], setAlerts, users = [], user, addNotification }) {
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [filterPriority, setFilterPriority] = useState('all');

  const [newAlert, setNewAlert] = useState({
    title: '',
    message: '',
    priority: 'medium',
    targetAll: true,
    targetEmployeeId: ''
  });

  useEffect(() => {
    const checkNetwork = async () => {
      const online = await checkRealInternet();
      setIsOnline(online);
      setPendingCount(syncQueue.count());
    };

    checkNetwork();
    const interval = setInterval(checkNetwork, 5000);

    const handleQueueUpdate = () => {
      setPendingCount(syncQueue.count());
    };

    window.addEventListener('sync-queue-updated', handleQueueUpdate);
    window.addEventListener('sync-complete', handleQueueUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('sync-queue-updated', handleQueueUpdate);
      window.removeEventListener('sync-complete', handleQueueUpdate);
    };
  }, []);

  const filteredAlerts = useMemo(() => {
    let list = alerts || [];
    if (filterPriority !== 'all') {
      if (filterPriority === 'unread') {
        list = list.filter(a => !a.read);
      } else {
        list = list.filter(a => a.priority === filterPriority);
      }
    }
    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [alerts, filterPriority]);

  const getTargetUsers = () => {
    const targetUsers = [];

    if (newAlert.targetAll) {
      const fieldUsers = users.filter(u => u.role === 'field_officer' || u.role === 'supervisor');
      targetUsers.push(...fieldUsers);
    } else if (newAlert.targetEmployeeId) {
      const targetUser = users.find(u => u.employeeId === newAlert.targetEmployeeId);
      if (targetUser) targetUsers.push(targetUser);
    }

    const managers = users.filter(u => u.role === 'manager' && u.id !== user?.id);
    targetUsers.push(...managers);

    const uniqueUsers = [];
    const seenIds = new Set();
    for (const u of targetUsers) {
      if (!seenIds.has(u.id)) {
        seenIds.add(u.id);
        uniqueUsers.push(u);
      }
    }

    return uniqueUsers;
  };

  const handleSendAlert = async (e) => {
    e.preventDefault();

    if (!newAlert.title.trim() || !newAlert.message.trim()) {
      toast.error('Please enter an alert headline and description');
      return;
    }

    const online = await checkRealInternet();
    setIsOnline(online);
    setIsSubmitting(true);

    try {
      const targetUsers = getTargetUsers();

      const alertObj = {
        id: uid(),
        title: newAlert.title,
        message: newAlert.message,
        priority: newAlert.priority,
        type: 'emergency',
        timestamp: new Date().toISOString(),
        read: false,
        targetAll: newAlert.targetAll,
        targetEmployeeId: newAlert.targetAll ? null : newAlert.targetEmployeeId,
        sentBy: user?.employeeId || 'SYSTEM',
        sentByName: user?.name || 'Administrator',
        synced: false,
        targetUsers: targetUsers.map(u => ({
          id: u.id,
          name: u.name,
          employeeId: u.employeeId,
          role: u.role
        }))
      };

      // 1. Save alert to IndexedDB
      await db.alerts.add(alertObj);
      if (setAlerts) {
        setAlerts(prev => [alertObj, ...(prev || [])]);
      }

      // 2. Create notifications for all target users
      for (const targetUser of targetUsers) {
        const notification = {
          id: uid(),
          userId: targetUser.id,
          title: `Alert: ${alertObj.title}`,
          message: alertObj.message,
          type: 'error',
          read: false,
          timestamp: new Date().toISOString(),
          link: '/alerts'
        };
        try {
          await db.notifications.add(notification);
        } catch (err) {
          console.error(`Error saving notification for ${targetUser.name}:`, err);
        }
        if (addNotification) {
          try {
            await addNotification(targetUser.id, `Alert: ${alertObj.title}`, alertObj.message, 'error', '/alerts');
          } catch (err) {
            console.error('Error calling addNotification:', err);
          }
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('notifications-updated'));
      }

      // 3. Sync to server if online, else queue
      if (online) {
        try {
          const response = await fetch(`${API_BASE_URL}/alerts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alertObj)
          });
          if (response.ok) {
            await db.alerts.update(alertObj.id, { synced: true });
            if (setAlerts) {
              setAlerts(prev => prev.map(a => a.id === alertObj.id ? { ...a, synced: true } : a));
            }
          } else {
            throw new Error('Server returned non-200');
          }
        } catch (error) {
          console.warn('Failed to post alert online, queueing:', error);
          syncQueue.add({
            type: 'alert',
            id: alertObj.id,
            data: alertObj
          });
          setPendingCount(syncQueue.count());
        }
      } else {
        syncQueue.add({
          type: 'alert',
          id: alertObj.id,
          data: alertObj
        });
        setPendingCount(syncQueue.count());
      }

      toast.success(`Alert successfully broadcast to ${targetUsers.length} staff member(s)!`);
      setShowModal(false);
      setNewAlert({
        title: '',
        message: '',
        priority: 'medium',
        targetAll: true,
        targetEmployeeId: ''
      });
    } catch (error) {
      console.error('Error sending alert:', error);
      toast.error('Failed to broadcast alert: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const markAlertRead = async (alertId) => {
    try {
      const online = await checkRealInternet();
      setIsOnline(online);

      await db.alerts.update(alertId, { read: true, synced: online ? true : false });
      if (setAlerts) {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read: true } : a));
      }

      if (!online) {
        syncQueue.add({
          type: 'alert_read',
          id: alertId,
          data: { alertId, read: true }
        });
        setPendingCount(syncQueue.count());
      } else {
        try {
          await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ read: true })
          });
        } catch (err) {
          console.warn('Failed to update alert read status on server:', err);
        }
      }
      toast.success('Alert marked as acknowledged');
    } catch (error) {
      console.error('Error marking alert read:', error);
    }
  };

  const unreadCount = alerts.filter(a => !a.read).length;
  const criticalCount = alerts.filter(a => a.priority === 'critical' || a.priority === 'high').length;
  const pendingSyncAlerts = alerts.filter(a => !a.synced).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
            Emergency Alerts & Operational Bulletins
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Broadcast high-priority communications and safety instructions to field personnel
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={isOnline ? 'success' : 'error'}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
            {isOnline ? 'Network Online' : 'Network Offline'}
          </Badge>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowModal(true)}
            className="text-xs sm:text-sm font-semibold shadow-sm"
          >
            <AlertOctagon className="w-4 h-4 mr-1.5" />
            Broadcast Alert {!isOnline && '(Offline)'}
          </Button>
        </div>
      </div>

      {/* Offline Callout */}
      {!isOnline && (
        <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
            <span>
              <strong>Offline Mode:</strong> Broadcast alerts will trigger immediate local client notifications and store into the sync queue.
            </span>
          </div>
          {pendingSyncAlerts > 0 && (
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 px-2.5 py-1 rounded-md">
              {pendingSyncAlerts} queued
            </span>
          )}
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Bulletins"
          value={alerts.length}
          subtitle="System history"
          icon={Bell}
          variant="default"
        />
        <StatCard
          title="Unread Alerts"
          value={unreadCount}
          subtitle="Require acknowledgement"
          icon={Eye}
          variant={unreadCount > 0 ? 'warning' : 'success'}
        />
        <StatCard
          title="High / Critical"
          value={criticalCount}
          subtitle="Urgent priority"
          icon={ShieldAlert}
          variant={criticalCount > 0 ? 'danger' : 'default'}
        />
        <StatCard
          title="Pending Sync"
          value={pendingSyncAlerts}
          subtitle="Queued locally"
          icon={Clock}
          variant={pendingSyncAlerts > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#334155] pb-3 flex-wrap">
        {[
          { key: 'all', label: `All Alerts (${alerts.length})` },
          { key: 'unread', label: `Unacknowledged (${unreadCount})` },
          { key: 'critical', label: 'Critical' },
          { key: 'high', label: 'High' },
          { key: 'medium', label: 'Medium' },
          { key: 'low', label: 'Low' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterPriority(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterPriority === tab.key
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <Card className="py-16 text-center text-slate-400 dark:text-slate-500">
            <Bell className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No emergency alerts matching filters</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Operational communications will appear here</p>
          </Card>
        ) : (
          filteredAlerts.map(a => {
            const isCritical = a.priority === 'critical';
            const isHigh = a.priority === 'high';
            const isMedium = a.priority === 'medium';

            return (
              <div
                key={a.id}
                onClick={() => markAlertRead(a.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  !a.read
                    ? isCritical || isHigh
                      ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900/60 shadow-sm'
                      : 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900/60 shadow-sm'
                    : 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-[#334155] hover:border-slate-300 dark:hover:border-slate-500'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isCritical ? 'bg-rose-600 text-white' :
                      isHigh ? 'bg-orange-500 text-white' :
                      isMedium ? 'bg-amber-500 text-white' :
                      'bg-blue-600 text-white'
                    }`}>
                      <AlertOctagon className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                          {a.title}
                        </h4>
                        {!a.read && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white uppercase">
                            New
                          </span>
                        )}
                        <Badge variant={
                          isCritical ? 'error' :
                          isHigh ? 'danger' :
                          isMedium ? 'warning' : 'info'
                        }>
                          {a.priority.toUpperCase()}
                        </Badge>
                        {!a.synced && (
                          <Badge variant="warning">
                            <Clock className="w-3 h-3 mr-1" /> Offline
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed">
                        {a.message}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500 mt-2.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          Dispatcher: <strong className="text-slate-600 dark:text-slate-300 font-medium">{a.sentByName || 'System'}</strong>
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          {new Date(a.timestamp).toLocaleString()}
                        </span>
                        <span>
                          Target: <strong className="text-slate-700 dark:text-slate-300">{a.targetAll ? 'All Field Personnel' : `Officer (${a.targetEmployeeId})`}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {a.read ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Acknowledged
                      </span>
                    ) : (
                      <Button size="sm" variant="outline" className="text-xs">
                        Mark Read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Broadcast Alert Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Broadcast Emergency Bulletin"
          description="Issue high-priority announcements and safety advisories across field teams"
          size="md"
        >
          <form onSubmit={handleSendAlert} className="space-y-4">
            {!isOnline && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Offline: Will queue locally and dispatch immediately to all local users.</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bulletin Headline *
              </label>
              <Input
                placeholder="e.g. Severe Weather Warning - Southern Sector"
                value={newAlert.title}
                onChange={e => setNewAlert({ ...newAlert, title: e.target.value })}
                required
                className="w-full text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Detailed Message & Instructions *
              </label>
              <Textarea
                placeholder="Provide clear operational directions, safety procedures, and response expectations..."
                value={newAlert.message}
                onChange={e => setNewAlert({ ...newAlert, message: e.target.value })}
                rows={4}
                required
                className="w-full text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Urgency Level
                </label>
                <Select
                  value={newAlert.priority}
                  onChange={e => setNewAlert({ ...newAlert, priority: e.target.value })}
                  className="w-full text-xs sm:text-sm"
                >
                  <option value="low">Low (General Notice)</option>
                  <option value="medium">Medium (Operational Alert)</option>
                  <option value="high">High (Immediate Action Required)</option>
                  <option value="critical">Critical (Life Safety Emergency)</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Audience
                </label>
                <Select
                  value={newAlert.targetAll ? 'true' : 'false'}
                  onChange={e => setNewAlert({ ...newAlert, targetAll: e.target.value === 'true' })}
                  className="w-full text-xs sm:text-sm"
                >
                  <option value="true">All Field Officers & Supervisors</option>
                  <option value="false">Specific Field Officer</option>
                </Select>
              </div>
            </div>

            {!newAlert.targetAll && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Target Field Officer
                </label>
                <Select
                  value={newAlert.targetEmployeeId}
                  onChange={e => setNewAlert({ ...newAlert, targetEmployeeId: e.target.value })}
                  className="w-full text-xs sm:text-sm"
                >
                  <option value="">Select an Officer...</option>
                  {users.filter(u => u.role === 'field_officer').map(u => (
                    <option key={u.id} value={u.employeeId}>
                      {u.name} ({u.region}) - {u.employeeId}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#334155]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                disabled={isSubmitting}
                className="font-semibold"
              >
                <Send className="w-4 h-4 mr-1.5" />
                {isSubmitting ? 'Transmitting...' : 'Dispatch Bulletin'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}