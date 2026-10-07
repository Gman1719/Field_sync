// src/components/requests/RequestsCenter.tsx
// Comprehensive Leave Request and Permission Request Management for FieldSync
// Supports Field Officer intake, supervisor approvals, offline-first storage,
// attachment uploads, working hours validation, and multi-language localization.

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Paperclip,
  X,
  ChevronDown,
  Filter,
  User,
  ShieldCheck,
  Send,
  Download,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  Eye,
  Ban,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../services/database';
import { API_BASE } from '../../config/api';
import { useUserLanguage } from '../../context/UserLanguageContext';
import { createLocalNotification } from '../../services/notificationApi';
import { ActivityLogger } from '../../services/activityLogger';
import {
  validateLeaveRequest,
  validatePermissionRequest,
  LEAVE_TYPES,
  timeStringToMinutes,
} from '../../utils/requestValidation';
import { generateLeaveId, generatePermissionId } from '../../utils/idGenerator';
import type { LeaveRequest, PermissionRequest, LeaveType } from '../../types/index';

interface RequestsCenterProps {
  user: any;
  leaves?: any[];
  setLeaves?: React.Dispatch<React.SetStateAction<any[]>>;
  permissions?: any[];
  setPermissions?: React.Dispatch<React.SetStateAction<any[]>>;
  users?: any[];
  teamMembers?: any[];
  defaultType?: 'all' | 'leave' | 'permission';
}

export default function RequestsCenter({
  user,
  leaves = [],
  setLeaves,
  permissions = [],
  setPermissions,
  users = [],
  teamMembers = [],
  defaultType = 'all',
}: RequestsCenterProps) {
  const { userT } = useUserLanguage();

  const isOfficer = user?.role === 'field_officer';
  const isSupervisor = user?.role === 'supervisor';
  const isManager = user?.role === 'manager';

  const officerId = user?.employeeId || user?.id;

  // Filter & tab states
  const [selectedStatusTab, setSelectedStatusTab] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'leave' | 'permission'>(defaultType);
  const [selectedOfficerFilter, setSelectedOfficerFilter] = useState<string>('all');

  // Modals state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    item: any | null;
  }>({ isOpen: false, item: null });
  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject';
    item: any | null;
    requestCategory: 'leave' | 'permission';
  }>({ isOpen: false, type: 'approve', item: null, requestCategory: 'leave' });

  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    item: any | null;
    requestCategory: 'leave' | 'permission';
  }>({ isOpen: false, item: null, requestCategory: 'leave' });

  const [previewAttachment, setPreviewAttachment] = useState<{
    isOpen: boolean;
    name: string;
    data: string;
  }>({ isOpen: false, name: '', data: '' });

  // Form states for Leave
  const [leaveForm, setLeaveForm] = useState({
    type: 'annual' as LeaveType,
    startDate: '',
    endDate: '',
    reason: '',
    attachmentName: '',
    attachmentData: '',
  });
  const [leaveErrors, setLeaveErrors] = useState<Record<string, string>>({});
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Form states for Permission
  const [permissionForm, setPermissionForm] = useState({
    date: '',
    startTime: '09:00',
    endTime: '11:00',
    reason: '',
    attachmentName: '',
    attachmentData: '',
  });
  const [permissionErrors, setPermissionErrors] = useState<Record<string, string>>({});
  const [isSubmittingPermission, setIsSubmittingPermission] = useState(false);

  // Decision form note
  const [decisionNote, setDecisionNote] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  // Handle attachment file selection (Max 5MB)
  const handleAttachmentChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    formType: 'leave' | 'permission'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(userT('File size exceeds 5MB limit. Please choose a smaller file.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      if (formType === 'leave') {
        setLeaveForm((prev) => ({
          ...prev,
          attachmentName: file.name,
          attachmentData: base64Data,
        }));
      } else {
        setPermissionForm((prev) => ({
          ...prev,
          attachmentName: file.name,
          attachmentData: base64Data,
        }));
      }
      toast.success(`${userT('Attached')}: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  // Compile combined unified requests list
  const unifiedRequests = useMemo(() => {
    const leaveItems = leaves.map((l) => ({
      ...l,
      requestCategory: 'leave' as const,
      displayDate: l.startDate === l.endDate ? l.startDate : `${l.startDate} – ${l.endDate}`,
      sortTime: new Date(l.createdAt || l.created_at || l.startDate).getTime(),
    }));

    const permItems = permissions.map((p) => {
      const pDate = p.date || p.permissionDate || p.startDate || p.start_date || '';
      return {
        ...p,
        requestCategory: 'permission' as const,
        displayDate: `${pDate} (${p.startTime || p.start_time} – ${p.endTime || p.end_time})`,
        sortTime: new Date(p.requestedAt || p.requested_at || p.createdAt || pDate).getTime(),
      };
    });

    let combined = [...leaveItems, ...permItems];

    // Filter by role scope
    if (isOfficer) {
      combined = combined.filter(
        (r) => (r.employeeId || r.employee_id) === officerId || (r.officerId || r.officer_id) === officerId
      );
    } else {
      const teamIds = teamMembers.map((m) => m.employeeId || m.id);
      combined = combined.filter((r) => {
        const empId = r.employeeId || r.employee_id;
        return teamIds.includes(empId) || empId === officerId;
      });
      // Canceled requests should not be displayed in supervisor/manager page
      combined = combined.filter((r) => (r.status || '').toLowerCase() !== 'cancelled');
    }

    // Filter by specific officer if supervisor/manager
    if (!isOfficer && selectedOfficerFilter !== 'all') {
      combined = combined.filter(
        (r) => (r.employeeId || r.employee_id) === selectedOfficerFilter
      );
    }

    // Filter by category (leave vs permission)
    if (selectedTypeFilter !== 'all') {
      combined = combined.filter((r) => r.requestCategory === selectedTypeFilter);
    }

    // Filter by status tab
    if (selectedStatusTab !== 'all') {
      combined = combined.filter((r) => (r.status || 'pending').toLowerCase() === selectedStatusTab);
    }

    // Sort newest first
    combined.sort((a, b) => b.sortTime - a.sortTime);

    return combined;
  }, [
    leaves,
    permissions,
    isOfficer,
    isSupervisor,
    officerId,
    teamMembers,
    selectedOfficerFilter,
    selectedTypeFilter,
    selectedStatusTab,
  ]);

  // Prevent supervisors from staying on 'cancelled' status filter
  React.useEffect(() => {
    if (!isOfficer && selectedStatusTab === 'cancelled') {
      setSelectedStatusTab('all');
    }
  }, [isOfficer, selectedStatusTab]);

  // Status counts for tabs
  const stats = useMemo(() => {
    let baseLeaves = leaves;
    let basePerms = permissions;

    if (isOfficer) {
      baseLeaves = leaves.filter((l) => (l.employeeId || l.employee_id) === officerId);
      basePerms = permissions.filter((p) => (p.employeeId || p.employee_id) === officerId);
    } else {
      const teamIds = teamMembers.map((m) => m.employeeId || m.id);
      // Exclude cancelled requests for supervisor / manager view
      baseLeaves = leaves.filter((l) => teamIds.includes(l.employeeId || l.employee_id) && (l.status || '').toLowerCase() !== 'cancelled');
      basePerms = permissions.filter((p) => teamIds.includes(p.employeeId || p.employee_id) && (p.status || '').toLowerCase() !== 'cancelled');
    }

    if (!isOfficer && selectedOfficerFilter !== 'all') {
      baseLeaves = baseLeaves.filter((l) => (l.employeeId || l.employee_id) === selectedOfficerFilter);
      basePerms = basePerms.filter((p) => (p.employeeId || p.employee_id) === selectedOfficerFilter);
    }

    if (selectedTypeFilter === 'leave') {
      basePerms = [];
    } else if (selectedTypeFilter === 'permission') {
      baseLeaves = [];
    }

    const all = [...baseLeaves, ...basePerms];
    return {
      total: all.length,
      pending: all.filter((r) => (r.status || 'pending').toLowerCase() === 'pending').length,
      approved: all.filter((r) => (r.status || '').toLowerCase() === 'approved').length,
      rejected: all.filter((r) => (r.status || '').toLowerCase() === 'rejected').length,
      cancelled: isOfficer ? all.filter((r) => (r.status || '').toLowerCase() === 'cancelled').length : 0,
    };
  }, [leaves, permissions, isOfficer, isSupervisor, officerId, teamMembers, selectedOfficerFilter, selectedTypeFilter]);

  // 1. Submit Leave Request
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveErrors({});

    const validation = validateLeaveRequest(
      leaveForm,
      leaves.filter((l) => (l.employeeId || l.employee_id) === officerId),
      undefined,
      userT
    );

    if (!validation.isValid) {
      setLeaveErrors(validation.errors);
      return;
    }

    setIsSubmittingLeave(true);
    const newLeaveId = generateLeaveId();
    const newRecord: LeaveRequest = {
      id: newLeaveId,
      employeeId: officerId,
      employeeName: user?.fullName || user?.name || 'Field Officer',
      supervisorId: user?.supervisorId || null,
      type: leaveForm.type,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      reason: leaveForm.reason.trim(),
      attachmentName: leaveForm.attachmentName || null,
      attachmentData: leaveForm.attachmentData || null,
      status: 'pending',
      decisionNote: null,
      decidedBy: null,
      decidedByName: null,
      decidedAt: null,
      createdAt: new Date().toISOString(),
      synced: false,
    };

    try {
      // Offline-first commit to Dexie
      if (db.leaves) {
        await db.leaves.put(newRecord as any);
      }

      // Update local state
      if (setLeaves) {
        setLeaves((prev) => [newRecord, ...prev]);
      }

      // Attempt server sync if online
      if (navigator.onLine) {
        try {
          const res = await fetch(`${API_BASE}/leaves`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRecord),
          });
          if (res.ok) {
            const serverSaved = await res.json();
            if (db.leaves) {
              await db.leaves.update(newLeaveId, { ...serverSaved, synced: true });
            }
          } else {
            const errData = await res.json().catch(() => ({}));
            if (errData?.error) {
              toast.error(errData.error);
            }
          }
        } catch (_) {}
      }

      toast.success(userT('Leave request submitted successfully! Sent to supervisor for review.'));

      // Resolve Assigned Supervisor
      const targetSupervisor = users.find(
        (u) => (u.id && u.id === user?.supervisorId) || (u.employeeId && u.employeeId === user?.supervisorId)
      ) || teamMembers.find((m) => m.supervisorId);
      const targetSupervisorId = user?.supervisorId || targetSupervisor?.id || targetSupervisor?.employeeId || 'supervisor';
      const supervisorName = targetSupervisor?.fullName || targetSupervisor?.name || userT('Assigned Supervisor');

      // 1. Notify Officer
      createLocalNotification({
        recipientId: officerId,
        title: userT('Leave Request Sent'),
        message: `${userT('Your')} ${leaveForm.type} ${userT('leave request')} (${leaveForm.startDate} ${userT('to')} ${leaveForm.endDate}) ${userT('was sent to supervisor')} ${supervisorName}.`,
        type: 'LEAVE_REQUEST',
        priority: 'NORMAL',
        actionUrl: '/requests',
      }).catch(() => {});

      // 2. Notify Supervisor
      if (targetSupervisorId) {
        createLocalNotification({
          recipientId: targetSupervisorId,
          title: userT('New Leave Request Received'),
          message: `${user?.fullName || user?.name || userT('Field Officer')} ${userT('submitted')} ${leaveForm.type} ${userT('leave request')} (${leaveForm.startDate} ${userT('to')} ${leaveForm.endDate}).`,
          type: 'LEAVE_REQUEST',
          priority: 'IMPORTANT',
          actionUrl: '/requests',
        }).catch(() => {});
      }

      // 3. Log in Officer Activity Log ("request send")
      ActivityLogger.log(
        'REQUEST_SENT',
        `Request sent: ${leaveForm.type} leave (${leaveForm.startDate} to ${leaveForm.endDate}) to supervisor ${supervisorName}`,
        {
          officerId: officerId,
          officerName: user?.fullName || user?.name || 'Field Officer',
          relatedRecordId: newLeaveId,
          metadata: {
            requestType: 'leave',
            leaveType: leaveForm.type,
            startDate: leaveForm.startDate,
            endDate: leaveForm.endDate,
            supervisorId: targetSupervisorId,
            supervisorName,
          },
        }
      ).catch(() => {});

      // 4. Log in Supervisor Activity Log ("add request in supervisor activity log")
      if (targetSupervisorId && targetSupervisorId !== 'all') {
        ActivityLogger.log(
          'REQUEST_RECEIVED',
          `Request received: ${user?.fullName || user?.name || 'Field Officer'} submitted ${leaveForm.type} leave request (${leaveForm.startDate} to ${leaveForm.endDate})`,
          {
            officerId: targetSupervisorId,
            userId: targetSupervisorId,
            officerName: supervisorName,
            relatedRecordId: newLeaveId,
            metadata: {
              requestType: 'leave',
              leaveType: leaveForm.type,
              startDate: leaveForm.startDate,
              endDate: leaveForm.endDate,
              fromOfficerId: officerId,
              fromOfficerName: user?.fullName || user?.name || 'Field Officer',
            },
          }
        ).catch(() => {});
      }

      window.dispatchEvent(new CustomEvent('fieldsync-request-updated'));
      setShowLeaveModal(false);
      setLeaveForm({
        type: 'annual',
        startDate: '',
        endDate: '',
        reason: '',
        attachmentName: '',
        attachmentData: '',
      });
    } catch (err: any) {
      toast.error(err?.message || userT('Failed to submit leave request.'));
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // 2. Submit Permission Request
  const handleSubmitPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    setPermissionErrors({});

    const validation = validatePermissionRequest(
      permissionForm,
      permissions.filter((p) => (p.employeeId || p.employee_id) === officerId),
      leaves.filter((l) => (l.employeeId || l.employee_id) === officerId),
      undefined,
      userT
    );

    if (!validation.isValid) {
      setPermissionErrors(validation.errors);
      return;
    }

    setIsSubmittingPermission(true);
    const newPermId = generatePermissionId();
    const startMins = timeStringToMinutes(permissionForm.startTime);
    const endMins = timeStringToMinutes(permissionForm.endTime);
    const duration = Math.max(0, endMins - startMins);

    const newRecord: PermissionRequest = {
      id: newPermId,
      employeeId: officerId,
      employeeName: user?.fullName || user?.name || 'Field Officer',
      supervisorId: user?.supervisorId || null,
      date: permissionForm.date,
      startTime: permissionForm.startTime,
      endTime: permissionForm.endTime,
      durationMinutes: duration,
      reason: permissionForm.reason.trim(),
      attachmentName: permissionForm.attachmentName || null,
      attachmentData: permissionForm.attachmentData || null,
      status: 'pending',
      decisionNote: null,
      decidedBy: null,
      decidedByName: null,
      decidedAt: null,
      requestedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      synced: false,
    };

    try {
      // Offline-first commit to Dexie
      if (db.permissions) {
        await db.permissions.put(newRecord as any);
      }

      // Update local state
      if (setPermissions) {
        setPermissions((prev) => [newRecord, ...prev]);
      }

      // Attempt server sync if online
      if (navigator.onLine) {
        try {
          const res = await fetch(`${API_BASE}/permissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRecord),
          });
          if (res.ok) {
            const serverSaved = await res.json();
            if (db.permissions) {
              await db.permissions.update(newPermId, { ...serverSaved, synced: true });
            }
          } else {
            const errData = await res.json().catch(() => ({}));
            if (errData?.error) {
              toast.error(errData.error);
            }
          }
        } catch (_) {}
      }

      toast.success(userT('Permission request submitted successfully! Sent to supervisor for review.'));

      // Resolve Assigned Supervisor
      const targetSupervisor = users.find(
        (u) => (u.id && u.id === user?.supervisorId) || (u.employeeId && u.employeeId === user?.supervisorId)
      ) || teamMembers.find((m) => m.supervisorId);
      const targetSupervisorId = user?.supervisorId || targetSupervisor?.id || targetSupervisor?.employeeId || 'supervisor';
      const supervisorName = targetSupervisor?.fullName || targetSupervisor?.name || userT('Assigned Supervisor');

      // 1. Notify Officer
      createLocalNotification({
        recipientId: officerId,
        title: userT('Permission Request Sent'),
        message: `${userT('Your permission request for')} ${permissionForm.date} (${permissionForm.startTime} – ${permissionForm.endTime}) ${userT('was sent to supervisor')} ${supervisorName}.`,
        type: 'PERMISSION_REQUEST',
        priority: 'NORMAL',
        actionUrl: '/requests',
      }).catch(() => {});

      // 2. Notify Supervisor
      if (targetSupervisorId) {
        createLocalNotification({
          recipientId: targetSupervisorId,
          title: userT('New Permission Request Received'),
          message: `${user?.fullName || user?.name || userT('Field Officer')} ${userT('requested permission for')} ${permissionForm.date} (${permissionForm.startTime} – ${permissionForm.endTime}).`,
          type: 'PERMISSION_REQUEST',
          priority: 'IMPORTANT',
          actionUrl: '/requests',
        }).catch(() => {});
      }

      // 3. Log in Officer Activity Log ("request send")
      ActivityLogger.log(
        'REQUEST_SENT',
        `Request sent: Permission request on ${permissionForm.date} (${permissionForm.startTime} – ${permissionForm.endTime}) to supervisor ${supervisorName}`,
        {
          officerId: officerId,
          officerName: user?.fullName || user?.name || 'Field Officer',
          relatedRecordId: newPermId,
          metadata: {
            requestType: 'permission',
            date: permissionForm.date,
            startTime: permissionForm.startTime,
            endTime: permissionForm.endTime,
            supervisorId: targetSupervisorId,
            supervisorName,
          },
        }
      ).catch(() => {});

      // 4. Log in Supervisor Activity Log ("add request in supervisor activity log")
      if (targetSupervisorId && targetSupervisorId !== 'all') {
        ActivityLogger.log(
          'REQUEST_RECEIVED',
          `Request received: ${user?.fullName || user?.name || 'Field Officer'} submitted permission request on ${permissionForm.date} (${permissionForm.startTime} – ${permissionForm.endTime})`,
          {
            officerId: targetSupervisorId,
            userId: targetSupervisorId,
            officerName: supervisorName,
            relatedRecordId: newPermId,
            metadata: {
              requestType: 'permission',
              date: permissionForm.date,
              startTime: permissionForm.startTime,
              endTime: permissionForm.endTime,
              fromOfficerId: officerId,
              fromOfficerName: user?.fullName || user?.name || 'Field Officer',
            },
          }
        ).catch(() => {});
      }

      window.dispatchEvent(new CustomEvent('fieldsync-request-updated'));
      setShowPermissionModal(false);
      setPermissionForm({
        date: '',
        startTime: '09:00',
        endTime: '11:00',
        reason: '',
        attachmentName: '',
        attachmentData: '',
      });
    } catch (err: any) {
      toast.error(err?.message || userT('Failed to submit permission request.'));
    } finally {
      setIsSubmittingPermission(false);
    }
  };

  // 3. Supervisor Decision (Approve / Reject)
  const handleDecisionSubmit = async () => {
    const { type, item, requestCategory } = decisionModal;
    if (!item) return;

    if (type === 'reject' && (!decisionNote || decisionNote.trim().length < 3)) {
      setDecisionError(userT('A rejection reason / decision note is required when rejecting.'));
      return;
    }

    setIsSubmittingDecision(true);
    setDecisionError('');

    const newStatus = type === 'approve' ? 'approved' : 'rejected';
    const nowIso = new Date().toISOString();
    const decidedByName = user?.fullName || user?.name || (isManager ? 'System Manager' : 'Supervisor');

    const updatePayload = {
      status: newStatus,
      decisionNote: decisionNote.trim() || (type === 'approve' ? 'Request approved by supervisor.' : ''),
      decidedBy: user?.id,
      decidedByName,
      decidedAt: nowIso,
      approvedBy: user?.id,
      approvedAt: nowIso,
      synced: false,
    };

    try {
      if (requestCategory === 'leave') {
        if (db.leaves) {
          await db.leaves.update(item.id, updatePayload as any);
        }
        if (setLeaves) {
          setLeaves((prev) =>
            prev.map((l) => (l.id === item.id ? { ...l, ...updatePayload } : l))
          );
        }
        if (navigator.onLine) {
          await fetch(`${API_BASE}/leaves/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload),
          }).catch(() => {});
        }
      } else {
        if (db.permissions) {
          await db.permissions.update(item.id, updatePayload as any);
        }
        if (setPermissions) {
          setPermissions((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, ...updatePayload } : p))
          );
        }
        if (navigator.onLine) {
          await fetch(`${API_BASE}/permissions/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload),
          }).catch(() => {});
        }
      }

      toast.success(
        type === 'approve'
          ? userT('Request approved successfully!')
          : userT('Request rejected with reason note.')
      );

      const reqLabel = requestCategory === 'leave' ? userT('Leave') : userT('Permission');
      const supervisorName = user?.fullName || user?.name || userT('Supervisor');

      if (type === 'approve') {
        createLocalNotification({
          recipientId: item.employeeId || item.employee_id,
          title: userT('Request Approved'),
          message: userT(`Your ${reqLabel} request was approved by ${supervisorName}.${decisionNote.trim() ? ` Note: "${decisionNote.trim()}"` : ''}`),
          type: 'REQUEST_APPROVED',
          priority: 'IMPORTANT',
          actionUrl: '/requests',
        }).catch(() => {});

        createLocalNotification({
          recipientId: user?.id || officerId,
          title: userT('Request Approved by You'),
          message: userT(`You approved ${item.employeeName || 'Field Officer'}'s ${reqLabel} request.`),
          type: 'REQUEST_APPROVED',
          priority: 'NORMAL',
          actionUrl: '/requests',
        }).catch(() => {});
      } else {
        createLocalNotification({
          recipientId: item.employeeId || item.employee_id,
          title: userT('Request Rejected'),
          message: userT(`Your ${reqLabel} request was rejected by ${supervisorName}. Reason: "${decisionNote.trim()}"`),
          type: 'REQUEST_REJECTED',
          priority: 'IMPORTANT',
          actionUrl: '/requests',
        }).catch(() => {});

        createLocalNotification({
          recipientId: user?.id || officerId,
          title: userT('Request Rejected by You'),
          message: userT(`You rejected ${item.employeeName || 'Field Officer'}'s ${reqLabel} request. Reason: "${decisionNote.trim()}"`),
          type: 'REQUEST_REJECTED',
          priority: 'NORMAL',
          actionUrl: '/requests',
        }).catch(() => {});
      }

      // 1. Log Confirmation from Supervisor in Officer's Activity Log ("confirmation from supervisor")
      ActivityLogger.log(
        'SUPERVISOR_CONFIRMATION',
        `Confirmation from supervisor: ${reqLabel} request ${type === 'approve' ? 'approved' : 'rejected'} by ${supervisorName}${decisionNote.trim() ? ` (${decisionNote.trim()})` : ''}`,
        {
          officerId: item.employeeId || item.employee_id || item.officerId,
          officerName: item.employeeName,
          relatedRecordId: item.id,
          metadata: {
            status: newStatus,
            requestCategory,
            supervisorId: user?.id,
            supervisorName,
            decisionNote: decisionNote.trim(),
          },
        }
      ).catch(() => {});

      // 2. Log in Supervisor's Activity Log
      ActivityLogger.log(
        type === 'approve' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
        `${type === 'approve' ? 'Approved' : 'Rejected'} ${reqLabel} request for ${item.employeeName || 'Field Officer'}${decisionNote.trim() ? ` (${decisionNote.trim()})` : ''}`,
        {
          officerId: user?.id || user?.employeeId,
          officerName: supervisorName,
          relatedRecordId: item.id,
          metadata: {
            status: newStatus,
            requestCategory,
            targetOfficerId: item.employeeId || item.employee_id || item.officerId,
            targetOfficerName: item.employeeName,
            decisionNote: decisionNote.trim(),
          },
        }
      ).catch(() => {});

      setDetailModal((prev) => prev.isOpen && prev.item?.id === item.id ? { ...prev, item: { ...prev.item, ...updatePayload } } : prev);
      window.dispatchEvent(new CustomEvent('fieldsync-request-updated'));
      setDecisionModal({ isOpen: false, type: 'approve', item: null, requestCategory: 'leave' });
      setDecisionNote('');
    } catch (err: any) {
      toast.error(err?.message || userT('Failed to record decision.'));
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // 4. Officer Cancellation of Pending Request
  const handleCancelRequest = async () => {
    const { item, requestCategory } = cancelModal;
    if (!item) return;

    try {
      const cancelPayload = {
        status: 'cancelled',
        decisionNote: 'Cancelled by officer.',
        decidedAt: new Date().toISOString(),
      };

      if (requestCategory === 'leave') {
        if (db.leaves) {
          await db.leaves.update(item.id, cancelPayload as any);
        }
        if (setLeaves) {
          setLeaves((prev) =>
            prev.map((l) => (l.id === item.id ? { ...l, ...cancelPayload } : l))
          );
        }
        if (navigator.onLine) {
          await fetch(`${API_BASE}/leaves/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cancelPayload),
          }).catch(() => {});
        }
      } else {
        if (db.permissions) {
          await db.permissions.update(item.id, cancelPayload as any);
        }
        if (setPermissions) {
          setPermissions((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, ...cancelPayload } : p))
          );
        }
        if (navigator.onLine) {
          await fetch(`${API_BASE}/permissions/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cancelPayload),
          }).catch(() => {});
        }
      }

      toast.success(userT('Request cancelled successfully.'));

      const reqLabel = requestCategory === 'leave' ? userT('Leave') : userT('Permission');
      const officerDisplayName = user?.fullName || user?.name || userT('Field Officer');

      createLocalNotification({
        recipientId: officerId,
        title: userT('Request Cancelled'),
        message: userT(`You cancelled your pending ${reqLabel} request.`),
        type: 'REQUEST_CANCELLED',
        priority: 'NORMAL',
        actionUrl: '/requests',
      }).catch(() => {});

      setDetailModal((prev) => prev.isOpen && prev.item?.id === item.id ? { ...prev, item: { ...prev.item, ...cancelPayload } } : prev);
      window.dispatchEvent(new CustomEvent('fieldsync-request-updated'));
      setCancelModal({ isOpen: false, item: null, requestCategory: 'leave' });
    } catch (err: any) {
      toast.error(err?.message || userT('Failed to cancel request.'));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {isOfficer ? userT('My Requests (Leaves & Permissions)') : userT('Leave & Permission Requests')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {isOfficer
              ? userT('Submit and track your formal leave and temporary workday permission requests. Approved absence periods are recorded separately from screen time.')
              : userT('Review, approve, or reject leave and permission requests submitted by field officers with transparent decision notes.')}
          </p>
        </div>

        {/* Action Buttons for Field Officers */}
        {isOfficer && (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setLeaveErrors({});
                setShowLeaveModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium text-xs sm:text-sm shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>{userT('Request Leave')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPermissionErrors({});
                setShowPermissionModal(true);
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-medium text-xs sm:text-sm shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{userT('Request Permission')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Interactive KPI Status Cards */}
      <div className={`grid ${isOfficer ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'} gap-3 sm:gap-4`}>
        {/* Card 1: Total Requests */}
        <button
          type="button"
          onClick={() => setSelectedStatusTab('all')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs select-none hover:shadow-md hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between ${
            selectedStatusTab === 'all'
              ? 'bg-blue-50/40 dark:bg-blue-950/25 border-blue-500 ring-2 ring-blue-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {userT('Total Requests')}
            </span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {stats.total}
            </div>
          </div>
          <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 pt-1">
            {selectedStatusTab === 'all' ? (
              <span className="text-blue-600 dark:text-blue-400 font-semibold">● {userT('Showing All')}</span>
            ) : (
              <span>{userT('Click to show all')}</span>
            )}
          </div>
        </button>

        {/* Card 2: Pending */}
        <button
          type="button"
          onClick={() => setSelectedStatusTab(selectedStatusTab === 'pending' ? 'all' : 'pending')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs select-none hover:shadow-md hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between ${
            selectedStatusTab === 'pending'
              ? 'bg-amber-50/40 dark:bg-amber-950/25 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {userT('Pending')}
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
              {stats.pending}
            </div>
          </div>
          <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 pt-1">
            {selectedStatusTab === 'pending' ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">● {userT('Filtered')}</span>
            ) : (
              <span>{userT('Click to filter')}</span>
            )}
          </div>
        </button>

        {/* Card 3: Approved */}
        <button
          type="button"
          onClick={() => setSelectedStatusTab(selectedStatusTab === 'approved' ? 'all' : 'approved')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs select-none hover:shadow-md hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between ${
            selectedStatusTab === 'approved'
              ? 'bg-emerald-50/40 dark:bg-emerald-950/25 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {userT('Approved')}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
              {stats.approved}
            </div>
          </div>
          <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 pt-1">
            {selectedStatusTab === 'approved' ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">● {userT('Filtered')}</span>
            ) : (
              <span>{userT('Click to filter')}</span>
            )}
          </div>
        </button>

        {/* Card 4: Rejected */}
        <button
          type="button"
          onClick={() => setSelectedStatusTab(selectedStatusTab === 'rejected' ? 'all' : 'rejected')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs select-none hover:shadow-md hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between ${
            selectedStatusTab === 'rejected'
              ? 'bg-rose-50/40 dark:bg-rose-950/25 border-rose-500 ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-700'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {userT('Rejected')}
            </span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-600 dark:text-rose-400">
              {stats.rejected}
            </div>
          </div>
          <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 pt-1">
            {selectedStatusTab === 'rejected' ? (
              <span className="text-rose-600 dark:text-rose-400 font-semibold">● {userT('Filtered')}</span>
            ) : (
              <span>{userT('Click to filter')}</span>
            )}
          </div>
        </button>

        {/* Card 5: Cancelled (Officers only) */}
        {isOfficer && (
          <button
            type="button"
            onClick={() => setSelectedStatusTab(selectedStatusTab === 'cancelled' ? 'all' : 'cancelled')}
            className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs select-none hover:shadow-md hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between ${
              selectedStatusTab === 'cancelled'
                ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-500 ring-2 ring-slate-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {userT('Cancelled')}
              </span>
              <Ban className="w-4 h-4 text-slate-500" />
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-700 dark:text-slate-300">
                {stats.cancelled}
              </div>
            </div>
            <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 pt-1">
              {selectedStatusTab === 'cancelled' ? (
                <span className="text-slate-700 dark:text-slate-300 font-semibold">● {userT('Filtered')}</span>
              ) : (
                <span>{userT('Click to filter')}</span>
              )}
            </div>
          </button>
        )}
      </div>

      {/* Category & Officer Filter Toolbar */}
      <div className="p-3.5 sm:p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pill Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            {userT('Category')}:
          </span>
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedTypeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {userT('All')}
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('leave')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedTypeFilter === 'leave'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {userT('Leaves')}
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('permission')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedTypeFilter === 'permission'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {userT('Permissions')}
            </button>
          </div>
        </div>

        {/* Supervisor Officer Filter */}
        {!isOfficer && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
              {userT('Officer')}:
            </span>
            <select
              value={selectedOfficerFilter}
              onChange={(e) => setSelectedOfficerFilter(e.target.value)}
              className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-700 dark:text-slate-200 font-medium focus:outline-hidden focus:ring-1 focus:ring-slate-400 cursor-pointer"
            >
              <option value="all">{userT('All Officers')}</option>
              {teamMembers.map((m) => {
                const label = m.name || m.fullName || 'Officer';
                const idDisplay = m.employeeId && !m.employeeId.includes('-')
                  ? `(${m.employeeId})`
                  : (m.woreda ? `(${m.woreda})` : '');
                return (
                  <option key={m.id || m.employeeId} value={m.employeeId || m.id}>
                    {label} {idDisplay}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* Requests Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {unifiedRequests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              {userT('No requests found')}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              {isOfficer
                ? userT('You have not submitted any leave or permission requests in this category yet.')
                : userT('No requests matching the selected filters were found.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 pl-4 sm:pl-6 pr-3">{userT('Category & Type')}</th>
                  {!isOfficer && (
                    <th className="py-3.5 px-3">{userT('Officer / Requester')}</th>
                  )}
                  <th className="py-3.5 px-3">{userT('Schedule / Date')}</th>
                  <th className="py-3.5 px-3">{userT('Stated Reason')}</th>
                  <th className="py-3.5 px-3 text-center">{userT('Attachment')}</th>
                  <th className="py-3.5 px-3 text-center">{userT('Status')}</th>
                  <th className="py-3.5 pr-4 sm:pr-6 pl-3 text-right">{userT('Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {unifiedRequests.map((req, idx) => {
                  const isLeave = req.requestCategory === 'leave';
                  const status = (req.status || 'pending').toLowerCase();
                  const officerName = req.employeeName || req.employee_name || userT('Officer');
                  const empId = req.employeeId || req.employee_id;
                  const hasAttachment = Boolean(req.attachmentName || req.attachment_name || req.attachmentData || req.attachment_data);

                  // Prevent raw 36-character UUID from wrapping across lines
                  const isRawUuid = Boolean(empId && (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(empId) || (empId.includes('-') && empId.length > 20)));
                  const matchedOfficer = (teamMembers || []).find((m) => m.id === empId || m.employeeId === empId) || (users || []).find((u) => u.id === empId || u.employeeId === empId);
                  const cleanEmpId = matchedOfficer?.employeeId && !matchedOfficer.employeeId.includes('-') ? matchedOfficer.employeeId : (!isRawUuid ? empId : null);
                  const displaySubtitle = cleanEmpId || matchedOfficer?.woreda || (matchedOfficer?.role ? matchedOfficer.role.replace('_', ' ') : null);

                  return (
                    <tr
                      key={req.id || idx}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Category & Type */}
                      <td className="py-3.5 pl-4 sm:pl-6 pr-3 align-middle">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                          {isLeave ? `${userT('Leave')}: ${userT(req.type || 'Annual')}` : userT('Workday Permission')}
                        </div>
                      </td>

                      {/* Officer / Requester (Supervisor / Manager View) */}
                      {!isOfficer && (
                        <td className="py-3.5 px-3 align-middle">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-semibold text-xs border border-slate-200 dark:border-slate-700 shrink-0">
                              {(officerName || 'O').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 dark:text-white text-xs truncate max-w-[150px] sm:max-w-[190px]">
                                {officerName}
                              </p>
                              {displaySubtitle && (
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[150px]">
                                  {displaySubtitle}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Schedule / Date */}
                      <td className="py-3.5 px-3 align-middle whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                          {req.displayDate}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">
                          {userT('Submitted')}: {new Date(req.createdAt || req.created_at || req.requestedAt || req.requested_at || Date.now()).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Stated Reason */}
                      <td className="py-3.5 px-3 align-middle max-w-xs">
                        <p
                          className="truncate text-xs text-slate-600 dark:text-slate-300 font-normal"
                          title={req.reason}
                        >
                          {req.reason}
                        </p>
                      </td>

                      {/* Attachment */}
                      <td className="py-3.5 px-3 align-middle text-center">
                        {hasAttachment ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (req.attachmentData || req.attachment_data) {
                                setPreviewAttachment({
                                  isOpen: true,
                                  name: req.attachmentName || req.attachment_name || 'document',
                                  data: req.attachmentData || req.attachment_data,
                                });
                              } else {
                                toast(userT('Attachment metadata saved without binary'));
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer transition-colors border border-slate-200 dark:border-slate-700"
                            title={req.attachmentName || req.attachment_name || userT('Attached Document')}
                          >
                            <Paperclip className="w-3 h-3 text-slate-400" />
                            <span className="max-w-[70px] truncate text-[11px]">
                              {req.attachmentName || req.attachment_name || userT('File')}
                            </span>
                          </button>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 align-middle text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            status === 'approved'
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40'
                              : status === 'rejected'
                              ? 'bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40'
                              : status === 'cancelled'
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              : 'bg-amber-50/70 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              status === 'approved'
                                ? 'bg-emerald-500'
                                : status === 'rejected'
                                ? 'bg-rose-500'
                                : status === 'cancelled'
                                ? 'bg-slate-400'
                                : 'bg-amber-500'
                            }`}
                          />
                          <span className="capitalize">{userT(status)}</span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 pr-4 sm:pr-6 pl-3 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          {/* Detail Modal Trigger */}
                          <button
                            type="button"
                            onClick={() => setDetailModal({ isOpen: true, item: req })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer transition-colors shadow-2xs"
                            title={userT('View Details')}
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                            <span>{userT('Details')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: REQUEST LEAVE FORM                                     */}
      {/* ============================================================== */}
      {showLeaveModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowLeaveModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                  <Calendar className="w-4.5 h-4.5 text-slate-600 dark:text-slate-300" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{userT('Submit Leave Request')}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{userT('Request one or more days away from field duties')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} className="p-6 space-y-4">
              {/* Leave Type */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {userT('Leave Type')} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={leaveForm.type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value as LeaveType })}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-slate-400 focus:outline-hidden"
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {userT(t.label)}
                    </option>
                  ))}
                </select>
                {leaveErrors.type && <p className="text-xs text-rose-500 font-medium">{leaveErrors.type}</p>}
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {userT('Start Date')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-slate-400 focus:outline-hidden"
                  />
                  {leaveErrors.startDate && (
                    <p className="text-xs text-rose-500 font-medium">{leaveErrors.startDate}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {userT('End Date')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-slate-400 focus:outline-hidden"
                  />
                  {leaveErrors.endDate && (
                    <p className="text-xs text-rose-500 font-medium">{leaveErrors.endDate}</p>
                  )}
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {userT('Reason')} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder={userT('Please describe the purpose and details of your leave request...')}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 font-medium focus:ring-2 focus:ring-slate-400 focus:outline-hidden"
                />
                {leaveErrors.reason && <p className="text-xs text-rose-500 font-medium">{leaveErrors.reason}</p>}
              </div>

              {/* Optional Attachment */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    {userT('Optional Attachment (Doctor note, travel permit, etc.)')}
                  </span>
                  {leaveForm.attachmentName && (
                    <button
                      type="button"
                      onClick={() => setLeaveForm({ ...leaveForm, attachmentName: '', attachmentData: '' })}
                      className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                    >
                      {userT('Remove')}
                    </button>
                  )}
                </label>
                {leaveForm.attachmentName ? (
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold truncate">
                    ✓ {leaveForm.attachmentName}
                  </p>
                ) : (
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={(e) => handleAttachmentChange(e, 'leave')}
                    className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-800 dark:file:bg-slate-700 dark:file:text-slate-200 cursor-pointer"
                  />
                )}
                <p className="text-[10px] text-slate-400">{userT('Supported files: PDF, JPG, PNG, DOC (max 5MB)')}</p>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {userT('Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLeave}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white text-xs font-semibold shadow-xs disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingLeave ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{userT('Submit Request')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: REQUEST PERMISSION FORM                                */}
      {/* ============================================================== */}
      {showPermissionModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowPermissionModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                  <Clock className="w-4.5 h-4.5 text-slate-600 dark:text-slate-300" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{userT('Submit Permission Request')}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{userT('Request a temporary absence during the official workday')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPermissionModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPermission} className="p-6 space-y-4">
              {/* Permission Date */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {userT('Date')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={permissionForm.date}
                  onChange={(e) => setPermissionForm({ ...permissionForm, date: e.target.value })}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                {permissionErrors.date && (
                  <p className="text-xs text-rose-500 font-medium">{permissionErrors.date}</p>
                )}
              </div>

              {/* Start Time & End Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {userT('Start Time')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={permissionForm.startTime}
                    onChange={(e) => setPermissionForm({ ...permissionForm, startTime: e.target.value })}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  {permissionErrors.startTime && (
                    <p className="text-xs text-rose-500 font-medium">{permissionErrors.startTime}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {userT('End Time')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={permissionForm.endTime}
                    onChange={(e) => setPermissionForm({ ...permissionForm, endTime: e.target.value })}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  {permissionErrors.endTime && (
                    <p className="text-xs text-rose-500 font-medium">{permissionErrors.endTime}</p>
                  )}
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {userT('Reason')} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder={userT('Example: I need permission from 2:00 PM to 4:00 PM for a medical appointment.')}
                  value={permissionForm.reason}
                  onChange={(e) => setPermissionForm({ ...permissionForm, reason: e.target.value })}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                {permissionErrors.reason && (
                  <p className="text-xs text-rose-500 font-medium">{permissionErrors.reason}</p>
                )}
              </div>

              {/* Optional Attachment */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-500" />
                    {userT('Optional Attachment (Appointment slip, official summons, etc.)')}
                  </span>
                  {permissionForm.attachmentName && (
                    <button
                      type="button"
                      onClick={() => setPermissionForm({ ...permissionForm, attachmentName: '', attachmentData: '' })}
                      className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                    >
                      {userT('Remove')}
                    </button>
                  )}
                </label>
                {permissionForm.attachmentName ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                    ✓ {permissionForm.attachmentName}
                  </p>
                ) : (
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={(e) => handleAttachmentChange(e, 'permission')}
                    className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950 dark:file:text-emerald-300 cursor-pointer"
                  />
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPermissionModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {userT('Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPermission}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white text-xs font-semibold shadow-xs disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingPermission ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{userT('Submit Request')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: SUPERVISOR DECISION MODAL (APPROVE / REJECT)           */}
      {/* ============================================================== */}
      {decisionModal.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setDecisionModal({ isOpen: false, type: 'approve', item: null, requestCategory: 'leave' })}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    decisionModal.type === 'approve'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                  }`}
                >
                  {decisionModal.type === 'approve' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {decisionModal.type === 'approve' ? userT('Approve Request') : userT('Reject Request')}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {decisionModal.item?.employeeName || decisionModal.item?.employee_name || userT('Field Officer')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDecisionModal({ isOpen: false, type: 'approve', item: null, requestCategory: 'leave' })}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <p className="font-bold text-slate-800 dark:text-white">
                  {decisionModal.requestCategory === 'leave' ? userT('Leave Request') : userT('Permission Request')}
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  <strong>{userT('Period')}:</strong> {decisionModal.item?.displayDate}
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  <strong>{userT('Reason')}:</strong> "{decisionModal.item?.reason}"
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {decisionModal.type === 'reject' ? (
                    <>
                      {userT('Rejection Reason / Decision Note')} <span className="text-rose-500">*</span>
                    </>
                  ) : (
                    userT('Optional Approval Note')
                  )}
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    decisionModal.type === 'reject'
                      ? userT('Explain why this request is being rejected (required)...')
                      : userT('Optional feedback note to the officer...')
                  }
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 font-medium focus:ring-2 focus:ring-slate-400 focus:outline-hidden"
                />
                {decisionError && <p className="text-xs text-rose-500 font-medium">{decisionError}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDecisionModal({ isOpen: false, type: 'approve', item: null, requestCategory: 'leave' })}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {userT('Cancel')}
                </button>
                <button
                  type="button"
                  disabled={isSubmittingDecision}
                  onClick={handleDecisionSubmit}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-xs disabled:opacity-60 flex items-center gap-1.5 cursor-pointer ${
                    decisionModal.type === 'approve'
                      ? 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmittingDecision ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : decisionModal.type === 'approve' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{decisionModal.type === 'approve' ? userT('Confirm Approval') : userT('Confirm Rejection')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: CANCEL REQUEST CONFIRMATION                            */}
      {/* ============================================================== */}
      {cancelModal.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setCancelModal({ isOpen: false, item: null, requestCategory: 'leave' })}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {userT('Cancel this request?')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {userT('Are you sure you want to cancel this pending request? This action cannot be undone.')}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModal({ isOpen: false, item: null, requestCategory: 'leave' })}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                {userT('Keep Request')}
              </button>
              <button
                type="button"
                onClick={handleCancelRequest}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                {userT('Yes, Cancel Request')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: ATTACHMENT PREVIEW MODAL                              */}
      {/* ============================================================== */}
      {previewAttachment.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewAttachment({ isOpen: false, name: '', data: '' })}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {previewAttachment.name}
              </span>
              <button
                type="button"
                onClick={() => setPreviewAttachment({ isOpen: false, name: '', data: '' })}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 rounded-2xl">
              {previewAttachment.data.startsWith('data:image/') ? (
                <img
                  src={previewAttachment.data}
                  alt={previewAttachment.name}
                  className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-md"
                />
              ) : (
                <div className="text-center py-8 space-y-3">
                  <FileText className="w-16 h-16 text-blue-500 mx-auto" />
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                    {previewAttachment.name}
                  </p>
                  <a
                    href={previewAttachment.data}
                    download={previewAttachment.name}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {userT('Download Document')}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: COMPREHENSIVE REQUEST DETAILS VIEW                    */}
      {/* ============================================================== */}
      {detailModal.isOpen && detailModal.item && (() => {
        const item = detailModal.item;
        const isLeave = item.requestCategory === 'leave';
        const status = (item.status || 'pending').toLowerCase();
        const officerName = item.employeeName || item.employee_name || user?.name || user?.fullName || userT('Officer');
        const empId = item.employeeId || item.employee_id || user?.employeeId;
        const hasAttachment = Boolean(item.attachmentName || item.attachment_name || item.attachmentData || item.attachment_data);
        const attachmentName = item.attachmentName || item.attachment_name || userT('Attached Document');
        const attachmentData = item.attachmentData || item.attachment_data;

        return (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
            onClick={() => setDetailModal({ isOpen: false, item: null })}
          >
            <div
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 space-y-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {isLeave ? <Calendar className="w-4.5 h-4.5" /> : <Clock className="w-4.5 h-4.5" />}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {isLeave ? userT('Leave Request Details') : userT('Workday Permission Request')}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      ID: {item.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status Indicator */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      status === 'approved'
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40'
                        : status === 'rejected'
                        ? 'bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40'
                        : status === 'cancelled'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        : 'bg-amber-50/70 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        status === 'approved'
                          ? 'bg-emerald-500'
                          : status === 'rejected'
                          ? 'bg-rose-500'
                          : status === 'cancelled'
                          ? 'bg-slate-400'
                          : 'bg-amber-500'
                      }`}
                    />
                    <span className="capitalize">{userT(status)}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setDetailModal({ isOpen: false, item: null })}
                    className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Requester Information */}
                {(() => {
                  const isModalRawUuid = Boolean(empId && (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(empId) || (empId.includes('-') && empId.length > 20)));
                  const modalMatchedOfficer = (teamMembers || []).find((m) => m.id === empId || m.employeeId === empId) || (users || []).find((u) => u.id === empId || u.employeeId === empId);
                  const modalCleanEmpId = modalMatchedOfficer?.employeeId && !modalMatchedOfficer.employeeId.includes('-') ? modalMatchedOfficer.employeeId : (!isModalRawUuid ? empId : null);
                  const modalDisplaySubtitle = modalCleanEmpId || modalMatchedOfficer?.woreda || (modalMatchedOfficer?.role ? modalMatchedOfficer.role.replace('_', ' ') : null);

                  return (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {userT('Requester Information')}
                      </span>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs border border-slate-200 dark:border-slate-700 shrink-0">
                            {(officerName || 'O').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {officerName}
                            </p>
                            {modalDisplaySubtitle && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                {modalDisplaySubtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                          <p>
                            {userT('Submitted')}:{' '}
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {new Date(item.createdAt || item.created_at || item.requestedAt || item.requested_at || Date.now()).toLocaleString()}
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {item.synced ? userT('Synced with server') : userT('Saved locally')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Timing & Classification */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {userT('Category & Type')}
                    </span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {isLeave ? `${userT('Leave')}: ${userT(item.type || 'Annual')}` : userT('Workday Permission')}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {userT('Schedule / Timing')}
                    </span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.displayDate}
                    </p>
                  </div>
                </div>

                {/* Stated Reason */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {userT('Stated Reason')}
                  </span>
                  <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal whitespace-pre-wrap">
                      "{item.reason}"
                    </p>
                  </div>
                </div>

                {/* Attachment Section */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {userT('Attached Document')}
                  </span>
                  {hasAttachment ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                          <Paperclip className="w-4 h-4 text-slate-500" />
                        </div>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {attachmentName}
                        </span>
                      </div>

                      {attachmentData && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewAttachment({
                                isOpen: true,
                                name: attachmentName,
                                data: attachmentData,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{userT('View / Preview')}</span>
                          </button>
                          <a
                            href={attachmentData}
                            download={attachmentName}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-400" />
                            <span>{userT('Download')}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      {userT('No attachment uploaded')}
                    </p>
                  )}
                </div>

                {/* Supervisor Decision Note & Metadata (If Approved / Rejected) */}
                {(status === 'approved' || status === 'rejected') && (
                  <div
                    className={`p-4 rounded-2xl border space-y-2 ${
                      status === 'approved'
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40'
                        : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span
                        className={
                          status === 'approved'
                            ? 'text-emerald-800 dark:text-emerald-300'
                            : 'text-rose-800 dark:text-rose-300'
                        }
                      >
                        {status === 'approved' ? userT('Supervisor Decision: Approved') : userT('Supervisor Decision: Rejected')}
                      </span>
                      {item.decidedAt && (
                        <span className="text-slate-400 font-normal">
                          {new Date(item.decidedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {(item.decisionNote || item.decision_note) && (
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        <strong>{userT('Supervisor Remarks')}:</strong> "{item.decisionNote || item.decision_note}"
                      </p>
                    )}
                    {item.decidedByName && (
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                        {userT('Decided by')}: {item.decidedByName}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div>
                  {isOfficer && status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => {
                        setDetailModal({ isOpen: false, item: null });
                        setCancelModal({ isOpen: true, item, requestCategory: item.requestCategory });
                      }}
                      className="px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{userT('Cancel Request')}</span>
                    </button>
                  )}

                  {!isOfficer && status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDetailModal({ isOpen: false, item: null });
                          setDecisionNote('');
                          setDecisionError('');
                          setDecisionModal({
                            isOpen: true,
                            type: 'approve',
                            item,
                            requestCategory: item.requestCategory,
                          });
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{userT('Approve')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDetailModal({ isOpen: false, item: null });
                          setDecisionNote('');
                          setDecisionError('');
                          setDecisionModal({
                            isOpen: true,
                            type: 'reject',
                            item,
                            requestCategory: item.requestCategory,
                          });
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{userT('Reject')}</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setDetailModal({ isOpen: false, item: null })}
                  className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  {userT('Close')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
