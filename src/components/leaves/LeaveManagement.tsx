import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Calendar, CalendarPlus, CheckCircle2, XCircle, Clock,
  AlertCircle, User, Filter, Check, X, ShieldCheck
} from 'lucide-react';
import { db, syncQueue, checkRealInternet } from '../../services/database';
import { uid } from '../../utils/helpers';
import { API_BASE } from '../../config/api';
import ActivityLogger from '../../services/activityLogger';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';
import { useUserLanguage } from '../../context/UserLanguageContext';

export default function LeaveManagement({
  filteredLeaves,
  leaves = [],
  setLeaves,
  user,
  isManager,
  isSupervisor,
  isOfficer,
  teamMembers = [],
  users = [],
  addNotification
}) {
  const { userT } = useUserLanguage();
  const [showModal, setShowModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState('requests');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [displayLeaves, setDisplayLeaves] = useState([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newLeave, setNewLeave] = useState({
    employeeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    type: 'annual'
  });

  const updateDisplayLeaves = () => {
    if (!leaves || leaves.length === 0) {
      setDisplayLeaves([]);
      return;
    }

    let filtered = [];
    if (isSupervisor && user) {
      const teamIds = teamMembers.map(m => m.employeeId);
      filtered = leaves.filter(l =>
        l.employeeId === user.employeeId || teamIds.includes(l.employeeId)
      );
    } else if (isOfficer && user) {
      filtered = leaves.filter(l => l.employeeId === user.employeeId);
    } else {
      filtered = leaves;
    }

    let syncedLeaves = filtered.filter(l => l.synced === true);
    syncedLeaves.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setDisplayLeaves(syncedLeaves);
  };

  const refreshDataFromIndexedDB = async () => {
    try {
      const allLeaves = await db.leaves.toArray();
      if (setLeaves && typeof setLeaves === 'function') {
        setLeaves(allLeaves);
      }
    } catch (err) {
      console.error('Error refreshing leaves from IndexedDB:', err);
    }
  };

  useEffect(() => {
    const checkNetwork = async () => {
      const online = await checkRealInternet();
      setIsOnline(online);
      const count = syncQueue.count();
      setPendingCount(count);
      if (online && count > 0) {
        window.dispatchEvent(new CustomEvent('force-sync'));
      }
    };

    checkNetwork();
    const interval = setInterval(checkNetwork, 3000);

    const handleSyncComplete = async () => {
      await refreshDataFromIndexedDB();
      const count = syncQueue.count();
      setPendingCount(count);
      updateDisplayLeaves();
    };

    const handleQueueUpdate = () => {
      const count = syncQueue.count();
      setPendingCount(count);
      updateDisplayLeaves();
    };

    window.addEventListener('sync-complete', handleSyncComplete);
    window.addEventListener('sync-queue-updated', handleQueueUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('sync-complete', handleSyncComplete);
      window.removeEventListener('sync-queue-updated', handleQueueUpdate);
    };
  }, []);

  useEffect(() => {
    updateDisplayLeaves();
  }, [leaves, user, isSupervisor, isOfficer, teamMembers]);

  const pendingLeaves = displayLeaves.filter(l => l.status === 'pending');
  const approvedLeaves = displayLeaves.filter(l => l.status === 'approved');
  const rejectedLeaves = displayLeaves.filter(l => l.status === 'rejected');

  const validateLeave = () => {
    const newErrors: Record<string, string> = {};
    if (!newLeave.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (!newLeave.endDate) {
      newErrors.endDate = 'End date is required';
    } else if (newLeave.startDate && newLeave.endDate < newLeave.startDate) {
      newErrors.endDate = 'End date must be after start date';
    }
    if (newLeave.startDate && newLeave.endDate) {
      const start = new Date(newLeave.startDate);
      const end = new Date(newLeave.endDate);
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 30) {
        newErrors.endDate = 'Leave cannot exceed 30 days';
      }
    }
    if (newLeave.startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(newLeave.startDate);
      if (start < today) {
        newErrors.startDate = 'Start date cannot be in the past';
      }
    }
    if (!newLeave.reason || newLeave.reason.trim().length < 3) {
      newErrors.reason = 'Reason must be at least 3 characters';
    } else if (newLeave.reason.trim().length > 200) {
      newErrors.reason = 'Reason cannot exceed 200 characters';
    }
    if (isManager && !newLeave.employeeId) {
      newErrors.employeeId = 'Please select an employee';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRequestLeave = async (e) => {
    e.preventDefault();

    if (!validateLeave()) {
      toast.error('Please resolve the errors in the form.');
      return;
    }

    setIsSubmitting(true);

    const leave = {
      id: uid(),
      employeeId: (isOfficer || isSupervisor) ? user.employeeId : newLeave.employeeId,
      employeeName: (isOfficer || isSupervisor) ? user.name : users?.find(u => u.employeeId === newLeave.employeeId)?.name || user.name,
      startDate: newLeave.startDate,
      endDate: newLeave.endDate,
      reason: newLeave.reason.trim(),
      type: newLeave.type,
      status: 'pending',
      createdAt: new Date().toISOString(),
      approvedBy: null,
      approvedAt: null,
      synced: false
    };

    try {
      await db.leaves.add(leave);
      if (setLeaves && typeof setLeaves === 'function') {
        setLeaves(prev => [leave, ...prev]);
      }

      if (isOnline) {
        try {
          const response = await fetch(`${API_BASE}/leaves`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(leave)
          });
          if (response.ok) {
            await db.leaves.update(leave.id, { synced: true });
            if (setLeaves) {
              setLeaves(prev => prev.map(l => l.id === leave.id ? { ...l, synced: true } : l));
            }
            toast.success('Leave request submitted successfully!');
          } else {
            throw new Error('Server error');
          }
        } catch (err) {
          syncQueue.add({ type: 'leave', id: leave.id, data: leave });
          setPendingCount(syncQueue.count());
          toast('Server unreachable. Saved to offline queue.', { icon: '💾' });
        }
      } else {
        syncQueue.add({ type: 'leave', id: leave.id, data: leave });
        setPendingCount(syncQueue.count());
        toast('Leave request saved offline! Will sync when connected.', { icon: '💾' });
      }

      // Resolve Assigned Supervisor
      const targetSupervisor = users?.find(
        (u) => (u.id && u.id === user?.supervisorId) || (u.employeeId && u.employeeId === user?.supervisorId)
      ) || teamMembers?.find((m) => m.supervisorId);
      const targetSupervisorId = user?.supervisorId || targetSupervisor?.id || targetSupervisor?.employeeId;
      const supervisorName = targetSupervisor?.fullName || targetSupervisor?.name || 'Assigned Supervisor';

      if (addNotification) {
        addNotification(
          user.id,
          'Leave Request Sent',
          `Your leave request for ${leave.startDate} to ${leave.endDate} was sent to supervisor ${supervisorName}.`,
          'info'
        );
        if (targetSupervisorId) {
          addNotification(
            targetSupervisorId,
            'New Leave Request Received',
            `${leave.employeeName || 'Field Officer'} submitted a leave request for ${leave.startDate} to ${leave.endDate}.`,
            'info'
          );
        }
      }

      // Record Activity Log for Officer ("request send")
      await ActivityLogger.log(
        'REQUEST_SENT',
        `Request sent: ${leave.type} leave (${leave.startDate} to ${leave.endDate}) to supervisor ${supervisorName}`,
        {
          officerId: user?.id || leave.employeeId,
          officerName: leave.employeeName,
          relatedRecordId: leave.id,
          metadata: {
            requestType: 'leave',
            leaveType: leave.type,
            startDate: leave.startDate,
            endDate: leave.endDate,
            reason: leave.reason,
            supervisorId: targetSupervisorId,
            supervisorName,
          },
        }
      );

      // Record Activity Log for Supervisor ("add request in supervisor activity log")
      if (targetSupervisorId) {
        await ActivityLogger.log(
          'REQUEST_RECEIVED',
          `Request received: ${leave.employeeName || 'Field Officer'} submitted ${leave.type} leave request (${leave.startDate} to ${leave.endDate})`,
          {
            officerId: targetSupervisorId,
            userId: targetSupervisorId,
            officerName: supervisorName,
            relatedRecordId: leave.id,
            metadata: {
              requestType: 'leave',
              leaveType: leave.type,
              startDate: leave.startDate,
              endDate: leave.endDate,
              fromOfficerId: user?.id || leave.employeeId,
              fromOfficerName: leave.employeeName,
            },
          }
        );
      }
    } catch (error) {
      console.error('Error submitting leave:', error);
      toast.error('Error submitting leave request: ' + error.message);
    } finally {
      setIsSubmitting(false);
      setShowModal(false);
      setNewLeave({ employeeId: '', startDate: '', endDate: '', reason: '', type: 'annual' });
      setErrors({});
    }
  };

  const approveLeave = async (leaveId, approve) => {
    try {
      const leave = leaves.find(l => l.id === leaveId);
      if (!leave) {
        toast.error('Leave request not found');
        return;
      }

      if (isSupervisor) {
        if (leave.employeeId === user.employeeId) {
          toast.error('You cannot approve your own leave request.');
          return;
        }
        const teamIds = teamMembers.map(m => m.employeeId);
        if (!teamIds.includes(leave.employeeId)) {
          toast.error('You can only review requests from your assigned team.');
          return;
        }
      }

      if (isOfficer) {
        toast.error('Officers cannot approve leave requests.');
        return;
      }

      const status = approve ? 'approved' : 'rejected';
      const approvedAt = new Date().toISOString();
      const approvalPayload = {
        id: leaveId,
        status,
        approvedBy: user.employeeId,
        approvedAt
      };
      const updatedLeave = {
        ...leave,
        status,
        approvedBy: user.employeeId,
        approvedAt,
        synced: false
      };

      await db.leaves.update(leaveId, updatedLeave);
      if (setLeaves) {
        setLeaves(prev => prev.map(l => l.id === leaveId ? updatedLeave : l));
      }

      if (isOnline) {
        try {
          const response = await fetch(`${API_BASE}/leaves/${leaveId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(approvalPayload)
          });
          if (response.ok) {
            await db.leaves.update(leaveId, { synced: true, syncError: null });
            if (setLeaves) {
              setLeaves(prev => prev.map(l => l.id === leaveId ? { ...l, ...approvalPayload, synced: true } : l));
            }
            toast.success(`Leave request ${approve ? 'approved' : 'rejected'}!`);
          } else {
            let errMsg = 'Server error';
            try {
              const errJson = await response.json();
              if (errJson.error) errMsg = errJson.error;
            } catch (_) {}
            throw new Error(errMsg);
          }
        } catch (err) {
          syncQueue.add({ type: 'leave_update', id: leaveId, data: approvalPayload });
          setPendingCount(syncQueue.count());
          toast(`Leave ${approve ? 'approved' : 'rejected'} locally. Queued for sync.`, { icon: '💾' });
        }
      } else {
        syncQueue.add({ type: 'leave_update', id: leaveId, data: approvalPayload });
        setPendingCount(syncQueue.count());
        toast(`Leave ${approve ? 'approved' : 'rejected'} locally! Queued for sync.`, { icon: '💾' });
      }

      const supervisorDisplayName = user?.name || user?.fullName || 'Supervisor';

      if (addNotification) {
        const officer = users?.find(u => u.employeeId === leave.employeeId || u.id === leave.employeeId);
        if (officer) {
          addNotification(
            officer.id,
            approve ? 'Leave Request Approved' : 'Leave Request Rejected',
            `Your leave request has been ${approve ? 'approved' : 'rejected'} by ${supervisorDisplayName}`,
            approve ? 'success' : 'error'
          );
        }
      }

      // 1. Record Confirmation from Supervisor in Officer's Activity Log ("confirmation from supervisor")
      await ActivityLogger.log(
        'SUPERVISOR_CONFIRMATION',
        `Confirmation from supervisor: Leave request ${approve ? 'approved' : 'rejected'} by ${supervisorDisplayName}`,
        {
          officerId: leave.employeeId,
          officerName: leave.employeeName,
          relatedRecordId: leaveId,
          metadata: {
            status,
            requestType: 'leave',
            supervisorId: user?.id || user?.employeeId,
            supervisorName: supervisorDisplayName,
          },
        }
      );

      // 2. Record Supervisor Activity Log
      await ActivityLogger.log(
        approve ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
        `${approve ? 'Approved' : 'Rejected'} leave request for ${leave.employeeName} (${leave.startDate} to ${leave.endDate})`,
        {
          officerId: user?.id || user?.employeeId,
          officerName: supervisorDisplayName,
          relatedRecordId: leaveId,
          metadata: {
            status,
            requestType: 'leave',
            targetEmployeeId: leave.employeeId,
            targetEmployeeName: leave.employeeName,
          },
        }
      );
    } catch (error) {
      console.error('Error updating leave:', error);
      toast.error('Error updating leave: ' + error.message);
    }
  };

  const getDisplayLeaves = () => {
    if (selectedTab === 'pending') return pendingLeaves;
    if (selectedTab === 'approved') return approvedLeaves;
    if (selectedTab === 'rejected') return rejectedLeaves;
    return displayLeaves;
  };

  const currentList = getDisplayLeaves();

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#1E3A8A] dark:text-blue-400" />
            {userT('Leave Management')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isOfficer ? userT('Submit and track your annual and sick leave requests') : userT('Review and manage staff leave applications')}
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto"
        >
          <CalendarPlus className="w-4 h-4 mr-2" />
          {userT('Request Leave')}
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'requests', label: userT('All Requests'), count: displayLeaves.length },
          { id: 'pending', label: userT('Pending Review'), count: pendingLeaves.length, badge: 'warning' },
          { id: 'approved', label: userT('Approved'), count: approvedLeaves.length, badge: 'success' },
          { id: 'rejected', label: userT('Rejected'), count: rejectedLeaves.length, badge: 'error' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              selectedTab === tab.id
                ? 'bg-[#1E3A8A] text-white shadow-xs dark:bg-blue-600'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/80'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              selectedTab === tab.id
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Table Card */}
      <Card>
        <CardContent className="p-0">
          {currentList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
              <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <span>{userT('No leave requests found in this view')}</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 font-bold uppercase tracking-wider bg-slate-50/90 dark:bg-slate-900 text-[11px]">
                    <th className="py-3.5 pl-6">{userT('Employee')}</th>
                    <th className="py-3.5 px-4">{userT('Leave Type')}</th>
                    <th className="py-3.5 px-4">{userT('Date Range')}</th>
                    <th className="py-3.5 px-4">{userT('Reason')}</th>
                    <th className="py-3.5 px-4">{userT('Status')}</th>
                    {(isManager || isSupervisor) && <th className="py-3.5 pr-6 text-right">{userT('Actions')}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {currentList.map(item => {
                    const isPending = item.status === 'pending';
                    const canApprove = (isManager || isSupervisor) && isPending && (item.employeeId !== user?.employeeId);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 pl-6">
                          <p className="font-semibold text-slate-900 dark:text-[#F8FAFC]">{item.employeeName || 'Staff Member'}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{item.employeeId}</p>
                        </td>

                        <td className="py-4 px-4">
                          <Badge variant="neutral" className="capitalize">
                            {userT(item.type) || 'Annual'}
                          </Badge>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-medium text-slate-700 dark:text-slate-300">
                            {item.startDate} → {item.endDate}
                          </div>
                        </td>

                        <td className="py-4 px-4 max-w-xs">
                          <p className="text-slate-600 dark:text-slate-300 truncate" title={item.reason}>{item.reason}</p>
                        </td>

                        <td className="py-4 px-4">
                          <Badge
                            variant={item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'error' : 'warning'}
                            dot
                          >
                            {userT(item.status || 'pending')}
                          </Badge>
                        </td>

                        {(isManager || isSupervisor) && (
                          <td className="py-4 pr-6 text-right">
                            {canApprove ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => approveLeave(item.id, true)}
                                  className="h-8 px-2.5 text-xs"
                                >
                                  <Check className="w-3.5 h-3.5 mr-1" />
                                  {userT('Approve')}
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => approveLeave(item.id, false)}
                                  className="h-8 px-2.5 text-xs"
                                >
                                  <X className="w-3.5 h-3.5 mr-1" />
                                  {userT('Reject')}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                {item.approvedBy ? `${userT('Reviewed by')} ${item.approvedBy}` : '--'}
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Leave Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={userT('Submit Leave Application')}
        size="md"
      >
        <form onSubmit={handleRequestLeave} noValidate className="space-y-4">
          {isManager && (
            <Select
              label={userT('Select Employee')}
              value={newLeave.employeeId}
              onChange={(e) => {
                setNewLeave(prev => ({ ...prev, employeeId: e.target.value }));
                if (errors.employeeId) setErrors(prev => ({ ...prev, employeeId: '' }));
              }}
              required
              error={errors.employeeId}
            >
              <option value="">{userT('Choose Staff Member')}</option>
              {users.map(u => (
                <option key={u.id} value={u.employeeId}>{u.name} ({u.employeeId})</option>
              ))}
            </Select>
          )}

          <Select
            label={userT('Leave Type')}
            value={newLeave.type}
            onChange={(e) => setNewLeave(prev => ({ ...prev, type: e.target.value }))}
            required
          >
            <option value="annual">{userT('Annual Leave')}</option>
            <option value="sick">{userT('Sick Leave')}</option>
            <option value="maternity">{userT('Maternity / Paternity Leave')}</option>
            <option value="emergency">{userT('Family Emergency')}</option>
            <option value="unpaid">{userT('Unpaid Leave')}</option>
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={userT('Start Date')}
              type="date"
              value={newLeave.startDate}
              onChange={(e) => {
                setNewLeave(prev => ({ ...prev, startDate: e.target.value }));
                if (errors.startDate) setErrors(prev => ({ ...prev, startDate: '' }));
              }}
              required
              error={errors.startDate}
            />

            <Input
              label={userT('End Date')}
              type="date"
              value={newLeave.endDate}
              onChange={(e) => {
                setNewLeave(prev => ({ ...prev, endDate: e.target.value }));
                if (errors.endDate) setErrors(prev => ({ ...prev, endDate: '' }));
              }}
              required
              error={errors.endDate}
            />
          </div>

          <Textarea
            label={userT('Reason for Request')}
            value={newLeave.reason}
            onChange={(e) => {
              setNewLeave(prev => ({ ...prev, reason: e.target.value }));
              if (errors.reason) setErrors(prev => ({ ...prev, reason: '' }));
            }}
            placeholder={userT('Briefly state reason for leave request...')}
            rows={3}
            required
            error={errors.reason}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              {userT('Cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
            >
              {userT('Submit Application')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}