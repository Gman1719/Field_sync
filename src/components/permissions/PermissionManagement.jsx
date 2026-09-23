// src/components/permissions/PermissionManagement.jsx – Enterprise Permission Management View

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Clock, Plus, CheckCircle2, XCircle, AlertCircle,
  User, Check, X, ShieldCheck
} from 'lucide-react';
import { db, syncQueue, checkRealInternet } from '../../services/database';
import { uid } from '../../utils/helpers';
import { API_BASE } from '../../config/api';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';

export default function PermissionManagement({
  filteredPermissions,
  permissions = [],
  setPermissions,
  user,
  isManager,
  isSupervisor,
  isOfficer,
  teamMembers = [],
  users = [],
  addNotification
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState('requests');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [displayPermissions, setDisplayPermissions] = useState([]);
  const [errors, setErrors] = useState({});
  const [newPermission, setNewPermission] = useState({
    employeeId: '',
    permissionType: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const updateDisplayPermissions = () => {
    if (!permissions || permissions.length === 0) {
      setDisplayPermissions([]);
      return;
    }

    let filtered = [];
    if (isSupervisor && user) {
      const teamIds = teamMembers.map(m => m.employeeId);
      filtered = permissions.filter(p =>
        p.employeeId === user.employeeId || teamIds.includes(p.employeeId)
      );
    } else if (isOfficer && user) {
      filtered = permissions.filter(p => p.employeeId === user.employeeId);
    } else {
      filtered = permissions;
    }

    let syncedPermissions = filtered.filter(p => p.synced === true);
    syncedPermissions.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
    setDisplayPermissions(syncedPermissions);
  };

  const refreshDataFromIndexedDB = async () => {
    try {
      const allPermissions = await db.permissions.toArray();
      if (setPermissions && typeof setPermissions === 'function') {
        setPermissions(allPermissions);
      }
    } catch (err) {
      console.error('Error refreshing permissions from IndexedDB:', err);
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
      updateDisplayPermissions();
    };

    const handleQueueUpdate = () => {
      const count = syncQueue.count();
      setPendingCount(count);
      updateDisplayPermissions();
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
    updateDisplayPermissions();
  }, [permissions, user, isSupervisor, isOfficer, teamMembers]);

  const pendingPermissions = displayPermissions.filter(p => p.status === 'pending');
  const approvedPermissions = displayPermissions.filter(p => p.status === 'approved');
  const rejectedPermissions = displayPermissions.filter(p => p.status === 'rejected');

  const validatePermission = () => {
    const newErrors = {};
    if (!newPermission.permissionType) {
      newErrors.permissionType = 'Permission type is required';
    }
    if (!newPermission.startDate) {
      newErrors.startDate = 'Start date/time is required';
    }
    if (!newPermission.endDate) {
      newErrors.endDate = 'End date/time is required';
    } else if (newPermission.startDate && newPermission.endDate < newPermission.startDate) {
      newErrors.endDate = 'End date must be after start date';
    }
    if (!newPermission.reason || newPermission.reason.trim().length < 3) {
      newErrors.reason = 'Reason must be at least 3 characters';
    }
    if (isManager && !newPermission.employeeId) {
      newErrors.employeeId = 'Please select an employee';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRequestPermission = async (e) => {
    e.preventDefault();

    if (!validatePermission()) {
      toast.error('Please resolve the errors in the form.');
      return;
    }

    setIsSubmitting(true);

    const permission = {
      id: uid(),
      employeeId: (isOfficer || isSupervisor) ? user.employeeId : newPermission.employeeId,
      employeeName: (isOfficer || isSupervisor) ? user.name : users?.find(u => u.employeeId === newPermission.employeeId)?.name || user.name,
      permissionType: newPermission.permissionType,
      startDate: newPermission.startDate,
      endDate: newPermission.endDate,
      reason: newPermission.reason.trim(),
      status: 'pending',
      requestedAt: new Date().toISOString(),
      approvedBy: null,
      approvedAt: null,
      synced: false
    };

    try {
      await db.permissions.add(permission);
      if (setPermissions && typeof setPermissions === 'function') {
        setPermissions(prev => [permission, ...prev]);
      }

      if (isOnline) {
        try {
          const response = await fetch(`${API_BASE}/permissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(permission)
          });
          if (response.ok) {
            await db.permissions.update(permission.id, { synced: true });
            if (setPermissions) {
              setPermissions(prev => prev.map(p => p.id === permission.id ? { ...p, synced: true } : p));
            }
            toast.success('Permission request submitted successfully!');
          } else {
            throw new Error('Server error');
          }
        } catch (err) {
          syncQueue.add({ type: 'permission', id: permission.id, data: permission });
          setPendingCount(syncQueue.count());
          toast('Server unreachable. Saved to offline queue.', { icon: '💾' });
        }
      } else {
        syncQueue.add({ type: 'permission', id: permission.id, data: permission });
        setPendingCount(syncQueue.count());
        toast('Permission request saved offline! Will sync when connected.', { icon: '💾' });
      }

      if (addNotification) {
        addNotification(
          user.id,
          'Permission Request Submitted',
          `Permission request for ${newPermission.permissionType} submitted`,
          'info'
        );
      }
    } catch (error) {
      console.error('Error submitting permission:', error);
      toast.error('Error submitting permission request: ' + error.message);
    } finally {
      setIsSubmitting(false);
      setShowModal(false);
      setNewPermission({ employeeId: '', permissionType: '', startDate: '', endDate: '', reason: '' });
      setErrors({});
    }
  };

  const approvePermission = async (permissionId, approve) => {
    try {
      const permission = permissions.find(p => p.id === permissionId);
      if (!permission) {
        toast.error('Permission request not found');
        return;
      }

      if (isSupervisor) {
        if (permission.employeeId === user.employeeId) {
          toast.error('You cannot approve your own permission request.');
          return;
        }
        const teamIds = teamMembers.map(m => m.employeeId);
        if (!teamIds.includes(permission.employeeId)) {
          toast.error('You can only review requests from your assigned team.');
          return;
        }
      }

      if (isOfficer) {
        toast.error('Officers cannot approve permission requests.');
        return;
      }

      const status = approve ? 'approved' : 'rejected';
      const approvedAt = new Date().toISOString();
      const approvalPayload = {
        id: permissionId,
        status,
        approvedBy: user.employeeId,
        approvedAt
      };
      const updatedPermission = {
        ...permission,
        status,
        approvedBy: user.employeeId,
        approvedAt,
        synced: false
      };

      await db.permissions.update(permissionId, updatedPermission);
      if (setPermissions) {
        setPermissions(prev => prev.map(p => p.id === permissionId ? updatedPermission : p));
      }

      if (isOnline) {
        try {
          const response = await fetch(`${API_BASE}/permissions/${permissionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(approvalPayload)
          });
          if (response.ok) {
            await db.permissions.update(permissionId, { synced: true, syncError: null });
            if (setPermissions) {
              setPermissions(prev => prev.map(p => p.id === permissionId ? { ...p, ...approvalPayload, synced: true } : p));
            }
            toast.success(`Permission request ${approve ? 'approved' : 'rejected'}!`);
          } else {
            let errMsg = 'Server error';
            try {
              const errJson = await response.json();
              if (errJson.error) errMsg = errJson.error;
            } catch (_) {}
            throw new Error(errMsg);
          }
        } catch (err) {
          syncQueue.add({ type: 'permission_update', id: permissionId, data: approvalPayload });
          setPendingCount(syncQueue.count());
          toast(`Permission ${approve ? 'approved' : 'rejected'} locally. Queued for sync.`, { icon: '💾' });
        }
      } else {
        syncQueue.add({ type: 'permission_update', id: permissionId, data: approvalPayload });
        setPendingCount(syncQueue.count());
        toast(`Permission ${approve ? 'approved' : 'rejected'} locally! Queued for sync.`, { icon: '💾' });
      }

      if (addNotification) {
        const officer = users?.find(u => u.employeeId === permission.employeeId);
        if (officer) {
          addNotification(
            officer.id,
            'Permission Request Decision',
            `Your permission request has been ${approve ? 'approved' : 'rejected'} by ${user.name}`,
            approve ? 'success' : 'error'
          );
        }
      }
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Error updating permission: ' + error.message);
    }
  };

  const getDisplayPermissions = () => {
    if (selectedTab === 'pending') return pendingPermissions;
    if (selectedTab === 'approved') return approvedPermissions;
    if (selectedTab === 'rejected') return rejectedPermissions;
    return displayPermissions;
  };

  const currentList = getDisplayPermissions();

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-[#1E3A8A]" />
            Permission Requests
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isOfficer ? 'Submit and track short-term duty permissions and absences' : 'Review and approve short-term staff permission requests'}
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Request Permission
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'requests', label: 'All Permissions', count: displayPermissions.length },
          { id: 'pending', label: 'Pending Review', count: pendingPermissions.length, badge: 'warning' },
          { id: 'approved', label: 'Approved', count: approvedPermissions.length, badge: 'success' },
          { id: 'rejected', label: 'Rejected', count: rejectedPermissions.length, badge: 'error' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              selectedTab === tab.id
                ? 'bg-[#1E3A8A] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              selectedTab === tab.id
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-600'
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
            <div className="py-12 text-center text-xs text-slate-400">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <span>No permission requests found in this view</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3.5 pl-6">Employee</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Time Window</th>
                    <th className="py-3.5 px-4">Reason</th>
                    <th className="py-3.5 px-4">Status</th>
                    {(isManager || isSupervisor) && <th className="py-3.5 pr-6 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentList.map(item => {
                    const isPending = item.status === 'pending';
                    const canApprove = (isManager || isSupervisor) && isPending && (item.employeeId !== user?.employeeId);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 pl-6">
                          <p className="font-semibold text-slate-900">{item.employeeName || 'Staff Member'}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{item.employeeId}</p>
                        </td>

                        <td className="py-4 px-4">
                          <Badge variant="neutral" className="capitalize">
                            {item.permissionType || 'Personal'}
                          </Badge>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-medium text-slate-700">
                            {item.startDate} → {item.endDate}
                          </div>
                        </td>

                        <td className="py-4 px-4 max-w-xs">
                          <p className="text-slate-600 truncate" title={item.reason}>{item.reason}</p>
                        </td>

                        <td className="py-4 px-4">
                          <Badge
                            variant={item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'error' : 'warning'}
                            dot
                          >
                            {item.status ? item.status.toUpperCase() : 'PENDING'}
                          </Badge>
                        </td>

                        {(isManager || isSupervisor) && (
                          <td className="py-4 pr-6 text-right">
                            {canApprove ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => approvePermission(item.id, true)}
                                  className="h-8 px-2.5 text-xs"
                                >
                                  <Check className="w-3.5 h-3.5 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => approvePermission(item.id, false)}
                                  className="h-8 px-2.5 text-xs"
                                >
                                  <X className="w-3.5 h-3.5 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                {item.approvedBy ? `Reviewed by ${item.approvedBy}` : '--'}
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

      {/* Request Permission Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Submit Permission Request"
        size="md"
      >
        <form onSubmit={handleRequestPermission} noValidate className="space-y-4">
          {isManager && (
            <Select
              label="Select Employee"
              value={newPermission.employeeId}
              onChange={(e) => {
                setNewPermission(prev => ({ ...prev, employeeId: e.target.value }));
                if (errors.employeeId) setErrors(prev => ({ ...prev, employeeId: '' }));
              }}
              required
              error={errors.employeeId}
            >
              <option value="">Choose Staff Member</option>
              {users.map(u => (
                <option key={u.id} value={u.employeeId}>{u.name} ({u.employeeId})</option>
              ))}
            </Select>
          )}

          <Select
            label="Permission Type"
            value={newPermission.permissionType}
            onChange={(e) => {
              setNewPermission(prev => ({ ...prev, permissionType: e.target.value }));
              if (errors.permissionType) setErrors(prev => ({ ...prev, permissionType: '' }));
            }}
            required
            error={errors.permissionType}
          >
            <option value="">Select Permission Reason</option>
            <option value="Personal Appointment">Personal Appointment</option>
            <option value="Medical Visit">Medical Visit / Clinical</option>
            <option value="Official Duty Transfer">Official Duty Transfer</option>
            <option value="Field Logistics Emergency">Field Logistics Emergency</option>
            <option value="Other">Other</option>
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date / Time"
              type="datetime-local"
              value={newPermission.startDate}
              onChange={(e) => {
                setNewPermission(prev => ({ ...prev, startDate: e.target.value }));
                if (errors.startDate) setErrors(prev => ({ ...prev, startDate: '' }));
              }}
              required
              error={errors.startDate}
            />

            <Input
              label="End Date / Time"
              type="datetime-local"
              value={newPermission.endDate}
              onChange={(e) => {
                setNewPermission(prev => ({ ...prev, endDate: e.target.value }));
                if (errors.endDate) setErrors(prev => ({ ...prev, endDate: '' }));
              }}
              required
              error={errors.endDate}
            />
          </div>

          <Textarea
            label="Reason Details"
            value={newPermission.reason}
            onChange={(e) => {
              setNewPermission(prev => ({ ...prev, reason: e.target.value }));
              if (errors.reason) setErrors(prev => ({ ...prev, reason: '' }));
            }}
            placeholder="Explain why short-term leave is needed..."
            rows={3}
            required
            error={errors.reason}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
            >
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}