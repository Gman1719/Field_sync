// Modal for changing a staff member's operational role and workstation location
// Features mandatory Field Officer reassignment validation when modifying a Supervisor's role

import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  ShieldCheck, UserCheck, AlertCircle, Building2, User,
  Users, MapPin, AlertTriangle, ArrowRight, CheckCircle2,
  GitBranch, RefreshCw, Loader2
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LocationDropdown from './LocationDropdown';
import { API_BASE } from '../../config/api';
import { db } from '../../services/database';
import { offlineDb } from '../../db/offlineDb';
import { ActivityLogger } from '../../services/activityLogger';
import { useUserLanguage } from '../../context/UserLanguageContext';

interface UserRoleModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated?: (user?: any, transferredOfficerIds?: string[], newSupervisorId?: string | null, officerTransferMap?: Record<string, string>) => void;
  allUsers?: any[];
}

const ROLES = [
  {
    id: 'field_officer',
    title: 'Field Officer',
    badge: 'neutral',
    description: 'Frontline citizen intake, biometric capture, and daily activity reporting at the woreda level.',
    icon: User,
  },
  {
    id: 'supervisor',
    title: 'Supervisor',
    badge: 'info',
    description: 'Zonal operational oversight, officer coordination, and monitoring aggregate registrations.',
    icon: Users,
  },
  {
    id: 'manager',
    title: 'Manager',
    badge: 'primary',
    description: 'National command authority, full system administration, staff management, and analytics.',
    icon: Building2,
  },
];

export default function UserRoleModal({
  user,
  isOpen,
  onClose,
  onUserUpdated,
  allUsers = [],
}: UserRoleModalProps) {
  const { userT } = useUserLanguage();
  const [selectedRole, setSelectedRole] = useState('field_officer');
  const [assignment, setAssignment] = useState({
    regionId: '',
    zoneId: '',
    woredaId: '',
    supervisorId: '',
  });
  const [locationErrors, setLocationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Supervised officers and replacement supervisor state
  const [supervisedOfficers, setSupervisedOfficers] = useState<any[]>([]);
  const [loadingSupervisedOfficers, setLoadingSupervisedOfficers] = useState(false);
  const [availableSupervisors, setAvailableSupervisors] = useState<any[]>([]);
  const [selectedTransferSupervisorId, setSelectedTransferSupervisorId] = useState('');
  const [officerTransferMap, setOfficerTransferMap] = useState<Record<string, string>>({});
  const [reassignError, setReassignError] = useState('');
  const [isTransferringDirectly, setIsTransferringDirectly] = useState(false);
  const [transferSuccessMessage, setTransferSuccessMessage] = useState('');

  const currentRole = user?.role?.toLowerCase() || 'field_officer';
  const isCurrentlySupervisor = currentRole === 'supervisor';

  // 1. Fetch supervised officers and other active supervisors when modal opens
  useEffect(() => {
    if (!user || !isOpen) {
      setSupervisedOfficers([]);
      setSelectedTransferSupervisorId('');
      setOfficerTransferMap({});
      setReassignError('');
      setTransferSuccessMessage('');
      return;
    }

    setSelectedRole(user.role?.toLowerCase() || 'field_officer');
    setAssignment({
      regionId: user.regionId || '',
      zoneId: user.zoneId || '',
      woredaId: user.woredaId || '',
      supervisorId: user.supervisorId || '',
    });
    setLocationErrors({});
    setSelectedTransferSupervisorId('');
    setOfficerTransferMap({});
    setReassignError('');
    setTransferSuccessMessage('');

    if (user.role?.toLowerCase() === 'supervisor') {
      let isMounted = true;
      const fetchSupervised = async () => {
        setLoadingSupervisedOfficers(true);
        let officersList: any[] = [];

        // Try API first
        try {
          if (navigator.onLine) {
            const token = localStorage.getItem('fieldsync_token');
            const res = await fetch(`${API_BASE}/users/${user.id}/supervisees`, {
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            });
            if (res.ok) {
              const data = await res.json();
              if (data.success && Array.isArray(data.data)) {
                officersList = data.data;
              }
            }
          }
        } catch (_err) {}

        // Fallback to local DB and allUsers prop
        if (officersList.length === 0) {
          try {
            const localUsers = await db.users.toArray();
            officersList = localUsers.filter(
              (u) =>
                u.supervisorId === user.id &&
                (u.role?.toLowerCase() === 'field_officer' || u.role === 'FIELD_OFFICER')
            );
          } catch (_e) {}
        }

        if (officersList.length === 0 && allUsers && allUsers.length > 0) {
          officersList = allUsers.filter(
            (u) =>
              u.supervisorId === user.id &&
              (u.role?.toLowerCase() === 'field_officer' || u.role === 'FIELD_OFFICER')
          );
        }

        if (isMounted) {
          setSupervisedOfficers(officersList);
          setLoadingSupervisedOfficers(false);
        }
      };

      // Fetch other active supervisors
      const fetchSupervisors = async () => {
        let supList: any[] = [];

        // Check allUsers prop
        if (allUsers && allUsers.length > 0) {
          supList = allUsers.filter(
            (u) =>
              u.id !== user.id &&
              (u.role?.toLowerCase() === 'supervisor' || u.role === 'SUPERVISOR') &&
              (u.status === 'active' || u.isActive !== false)
          );
        }

        // Also query IndexedDB
        if (supList.length === 0) {
          try {
            const localUsers = await db.users.toArray();
            supList = localUsers.filter(
              (u) =>
                u.id !== user.id &&
                (u.role?.toLowerCase() === 'supervisor' || u.role === 'SUPERVISOR') &&
                (u.status === 'active' || u.isActive !== false)
            );
          } catch (_e) {}
        }

        // Try API
        try {
          if (navigator.onLine && supList.length === 0) {
            const token = localStorage.getItem('fieldsync_token');
            const res = await fetch(`${API_BASE}/users?role=SUPERVISOR&status=active`, {
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            });
            if (res.ok) {
              const data = await res.json();
              if (data.success && Array.isArray(data.users || data.data)) {
                const apiList = data.users || data.data;
                supList = apiList.filter((u: any) => u.id !== user.id && (u.isActive !== false && u.status !== 'inactive'));
              }
            }
          }
        } catch (_err) {}

        if (isMounted) {
          setAvailableSupervisors(supList);
        }
      };

      fetchSupervised();
      fetchSupervisors();

      return () => {
        isMounted = false;
      };
    }
  }, [user, isOpen, allUsers]);

  // Helper for safe string extraction (prevents object rendering errors in React)
  const getSafeString = (val: any, fallback: string = ''): string => {
    if (!val) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object' && typeof val.name === 'string') return val.name;
    if (typeof val === 'object' && typeof val.fullName === 'string') return val.fullName;
    return fallback;
  };

  // Bulk transfer setter
  const handleBulkTransferChange = (supId: string) => {
    setSelectedTransferSupervisorId(supId);
    setReassignError('');
    if (supId) {
      const nextMap: Record<string, string> = {};
      for (const off of supervisedOfficers) {
        nextMap[off.id] = supId;
      }
      setOfficerTransferMap(nextMap);
    }
  };

  // Individual officer transfer setter
  const handleSingleOfficerTransferChange = (officerId: string, supId: string) => {
    setOfficerTransferMap((prev) => {
      const next = { ...prev };
      if (supId) {
        next[officerId] = supId;
      } else {
        delete next[officerId];
      }
      return next;
    });
    setReassignError('');
  };

  // Computed: Unassigned officers
  const unassignedOfficers = useMemo(() => {
    return supervisedOfficers.filter(
      (off) => !officerTransferMap[off.id] || !officerTransferMap[off.id].trim()
    );
  }, [supervisedOfficers, officerTransferMap]);

  const allOfficersAssigned =
    supervisedOfficers.length > 0 && unassignedOfficers.length === 0;

  // Computed: Distribution summary grouped by replacement supervisor
  const distributionSummary = useMemo(() => {
    const groups: Record<string, { supervisor: any; officers: any[] }> = {};
    for (const off of supervisedOfficers) {
      const supId = officerTransferMap[off.id];
      if (supId) {
        if (!groups[supId]) {
          const supObj = availableSupervisors.find((s) => s.id === supId) || {
            id: supId,
            fullName: 'Supervisor',
          };
          groups[supId] = { supervisor: supObj, officers: [] };
        }
        groups[supId].officers.push(off);
      }
    }
    return Object.values(groups);
  }, [supervisedOfficers, officerTransferMap, availableSupervisors]);

  // Selected replacement supervisor entity (fallback for single supervisor preview)
  const selectedTargetSupervisor = useMemo(() => {
    if (!selectedTransferSupervisorId) return null;
    return availableSupervisors.find((s) => s.id === selectedTransferSupervisorId) || null;
  }, [selectedTransferSupervisorId, availableSupervisors]);

  // Is reassignment mandatory right now?
  const isReassignmentRequired =
    isCurrentlySupervisor &&
    selectedRole !== 'supervisor' &&
    supervisedOfficers.length > 0;

  if (!isOpen || !user) return null;

  const handleLocationChange = (values: Record<string, string>) => {
    setAssignment((prev) => ({
      ...prev,
      ...values,
    }));
    if (Object.keys(values).length > 0) {
      setLocationErrors((prev) => {
        const next = { ...prev };
        Object.keys(values).forEach((k) => delete next[k]);
        return next;
      });
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};

    // 1. Reassignment validation
    if (isReassignmentRequired) {
      if (!allOfficersAssigned) {
        const msg = `${userT("This Supervisor currently supervises active Field Officers. Reassign these officers before changing the user's role.")} (${unassignedOfficers.length} ${userT('officer(s) must be assigned before role change can be applied.')})`;
        setReassignError(msg);
        errs.transferSupervisorId = msg;
      }
    }

    // 2. Location validations
    if (selectedRole === 'supervisor') {
      if (!assignment.regionId) errs.regionId = userT('Region is required for Supervisor');
      if (!assignment.zoneId) errs.zoneId = userT('Zone is required for Supervisor');
    } else if (selectedRole === 'field_officer') {
      if (!assignment.regionId) errs.regionId = userT('Region is required for Field Officer');
      if (!assignment.zoneId) errs.zoneId = userT('Zone is required for Field Officer');
      if (!assignment.woredaId) errs.woredaId = userT('Woreda station is required for Field Officer');

      // Strict validation: A Field Officer can only be registered, assigned, or transferred to a Woreda
      // if that area has at least one active Supervisor responsible for that Zone.
      if (assignment.zoneId) {
        const zoneSups = (allUsers || []).filter(
          (u: any) =>
            u &&
            (u.role?.toLowerCase() === 'supervisor' || u.role === 'SUPERVISOR') &&
            (u.status === 'active' || u.isActive !== false) &&
            (u.zoneId === assignment.zoneId || u.zone?.id === assignment.zoneId)
        );
        const fromAvailable = availableSupervisors.filter(
          (s: any) => s.zoneId === assignment.zoneId || s.zone?.id === assignment.zoneId
        );
        if (zoneSups.length === 0 && fromAvailable.length === 0) {
          errs.zoneId = userT(
            'A Field Officer can only be assigned to a Woreda if that area has at least one active Supervisor responsible for that Zone.'
          );
        }
      }
    }

    setLocationErrors(errs);
    return { isValid: Object.keys(errs).length === 0, errors: errs };
  };

  // Immediate transfer action button handler
  const handleDirectTransfer = async () => {
    if (!allOfficersAssigned) {
      toast.error(
        `${userT('Please assign all officers to replacement supervisors first.')} (${unassignedOfficers.length} ${userT('officer(s) must be assigned before role change can be applied.')})`
      );
      return;
    }

    setIsTransferringDirectly(true);
    try {
      const token = localStorage.getItem('fieldsync_token') || localStorage.getItem('token');
      if (navigator.onLine && token) {
        const res = await fetch(`${API_BASE}/users/${user.id}/transfer-supervisees`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            officerTransfers: officerTransferMap,
            transferSupervisorId: selectedTransferSupervisorId || undefined,
          }),
        });
        const resData = await res.json();
        if (!res.ok || !resData.success) {
          throw new Error(resData.error || 'Failed to transfer officers');
        }
      }

      // Update local storage
      const officerIds = Object.keys(officerTransferMap);
      for (const [oId, targetSupId] of Object.entries(officerTransferMap)) {
        try {
          await db.users.update(oId, { supervisorId: targetSupId });
          await offlineDb.users.update(oId, { supervisorId: targetSupId });
        } catch (_e) {}
      }

      setTransferSuccessMessage(
        userT(
          'All field officers have been successfully transferred! You can now complete the role change.'
        )
      );
      toast.success(`${userT('Successfully transferred')} ${supervisedOfficers.length} ${userT('field officers!')}`);

      if (onUserUpdated) {
        onUserUpdated(user, officerIds, selectedTransferSupervisorId || null, officerTransferMap);
      }
      setSupervisedOfficers([]);
      setOfficerTransferMap({});
      setReassignError('');
    } catch (err: any) {
      console.error('Direct transfer failed:', err);
      toast.error(err.message ? userT(err.message) : userT('Failed to transfer officers'));
    } finally {
      setIsTransferringDirectly(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { isValid, errors } = validate();
    if (!isValid) {
      if (errors.transferSupervisorId) {
        toast.error(errors.transferSupervisorId, { duration: 6000 });
      } else {
        const firstMsg = Object.values(errors)[0];
        toast.error(firstMsg || userT('Please complete all required fields.'));
      }
      return;
    }

    setIsSubmitting(true);

    const finalRegionId = selectedRole === 'manager' ? null : assignment.regionId || null;
    const finalZoneId = selectedRole === 'manager' ? null : assignment.zoneId || null;
    const finalWoredaId = selectedRole === 'field_officer' ? assignment.woredaId || null : null;
    const finalSupervisorId = selectedRole === 'field_officer' ? assignment.supervisorId || null : null;

    let updatedUser = {
      ...user,
      role: selectedRole,
      regionId: finalRegionId,
      zoneId: finalZoneId,
      woredaId: finalWoredaId,
      supervisorId: finalSupervisorId,
      updatedAt: new Date().toISOString(),
    };

    const transferredOfficerIds = supervisedOfficers.map((o) => o.id);

    try {
      const token = localStorage.getItem('fieldsync_token') || localStorage.getItem('token');
      const authHeaders = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      if (navigator.onLine && token) {
        // 1. Update Role with transferSupervisorId and officerTransfers in payload
        const roleRes = await fetch(`${API_BASE}/users/${user.id}/role`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({
            role: selectedRole.toUpperCase(),
            regionId: finalRegionId,
            zoneId: finalZoneId,
            woredaId: finalWoredaId,
            supervisorId: finalSupervisorId,
            transferSupervisorId: selectedTransferSupervisorId || undefined,
            officerTransfers: officerTransferMap,
          }),
        });

        const roleData = await roleRes.json();
        if (!roleRes.ok || !roleData.success) {
          if (roleData.code === 'REASSIGNMENT_REQUIRED') {
            throw new Error(roleData.error || 'Reassignment Required: Please reassign all Field Officers first.');
          }
          throw new Error(roleData.error || 'Failed to update user role');
        }

        if (roleData.user || roleData.data) {
          updatedUser = { ...updatedUser, ...(roleData.user || roleData.data) };
        }

        // 2. Also ensure assignment endpoint is synced if not manager
        if (selectedRole !== 'manager') {
          try {
            const assignRes = await fetch(`${API_BASE}/users/${user.id}/assignment`, {
              method: 'PATCH',
              headers: authHeaders,
              body: JSON.stringify({
                regionId: finalRegionId,
                zoneId: finalZoneId,
                woredaId: finalWoredaId,
                supervisorId: finalSupervisorId,
              }),
            });
            if (assignRes.ok) {
              const assignData = await assignRes.json();
              if (assignData.success && (assignData.user || assignData.data)) {
                updatedUser = { ...updatedUser, ...(assignData.user || assignData.data) };
              }
            }
          } catch (_e) {}
        }
      }

      // Persist in local databases
      try {
        await db.users.put(updatedUser);
        await offlineDb.users.put(updatedUser);
      } catch (_e) {
        try {
          await db.users.update(user.id, updatedUser);
        } catch (_inner) {}
      }

      // If officers were transferred, update each one in Dexie & offlineDb
      if (Object.keys(officerTransferMap).length > 0) {
        for (const [oId, targetSupId] of Object.entries(officerTransferMap)) {
          try {
            await db.users.update(oId, { supervisorId: targetSupId });
            await offlineDb.users.update(oId, { supervisorId: targetSupId });
          } catch (_e) {}
        }
      } else if (selectedTransferSupervisorId && transferredOfficerIds.length > 0) {
        for (const oId of transferredOfficerIds) {
          try {
            await db.users.update(oId, { supervisorId: selectedTransferSupervisorId });
            await offlineDb.users.update(oId, { supervisorId: selectedTransferSupervisorId });
          } catch (_e) {}
        }
      }

      // Log activity
      try {
        await ActivityLogger.log(
          'ROLE_AND_LOCATION_CHANGE',
          `Updated role to ${selectedRole} and location for ${user.fullName || user.name}${
            selectedTransferSupervisorId ? ` (Transferred ${transferredOfficerIds.length} officers to ${selectedTargetSupervisor?.fullName || selectedTargetSupervisor?.name})` : ''
          }`,
          {
            officerId: 'manager',
            relatedRecordId: user.id,
            metadata: {
              newRole: selectedRole,
              regionId: finalRegionId,
              zoneId: finalZoneId,
              woredaId: finalWoredaId,
              transferredOfficerIds,
              newSupervisorId: selectedTransferSupervisorId || null,
            },
          }
        );
      } catch (_logErr) {}

      if (selectedTransferSupervisorId && transferredOfficerIds.length > 0) {
        toast.success(
          `${userT('Role changed to')} ${selectedRole.replace('_', ' ')} & ${transferredOfficerIds.length} ${userT('officers reassigned to')} ${
            selectedTargetSupervisor?.fullName || selectedTargetSupervisor?.name
          }`
        );
      } else {
        toast.success(`${userT('Role & workstation updated to')} ${selectedRole.replace('_', ' ')}`);
      }

      if (onUserUpdated) {
        onUserUpdated(updatedUser, transferredOfficerIds, selectedTransferSupervisorId || null, officerTransferMap);
      }
      onClose();
    } catch (err: any) {
      console.error('Role update error:', err);
      toast.error(err.message ? userT(err.message) : userT('Failed to update role & location'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={userT('Change Operational Role & Workstation Location')}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User Card */}
        <div className="p-3.5 bg-slate-50/80 dark:bg-slate-900/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              {(getSafeString(user.firstName || user.fullName || user.name, 'U')[0] || 'U').toUpperCase()}
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block">
                {getSafeString(user.fullName || user.name, 'Staff Member')}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {user.email} • {userT('ID:')} {getSafeString(user.employeeId) || (typeof user.id === 'string' ? user.id.slice(0, 8) : 'ID')}
              </span>
            </div>
          </div>
          <Badge
            variant={currentRole === 'manager' ? 'primary' : currentRole === 'supervisor' ? 'info' : 'neutral'}
            className="capitalize text-xs font-semibold"
          >
            {userT('Current:')} {userT(currentRole.replace('_', ' '))}
          </Badge>
        </div>

        {/* Section 1: Role Options */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            {userT('1. Select New Operational Role')}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {ROLES.map((role) => {
              const isSelected = selectedRole === role.id;
              const Icon = role.icon;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => {
                    setSelectedRole(role.id);
                    setReassignError('');
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-500 dark:border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                      : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected && (
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" /> {userT('Selected')}
                      </span>
                    )}
                  </div>
                  <div>
                    <span
                      className={`text-sm font-bold block mb-1 ${
                        isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {userT(role.title)}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {userT(role.description)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Reassignment Required (When changing Supervisor with active Field Officers) */}
        {isCurrentlySupervisor && selectedRole !== 'supervisor' && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
            {loadingSupervisedOfficers ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 text-slate-500 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                {userT('Checking assigned workforce hierarchy...')}
              </div>
            ) : supervisedOfficers.length > 0 ? (
              <div className="p-4 bg-amber-500/10 dark:bg-amber-950/30 border-2 border-amber-500/40 dark:border-amber-700/60 rounded-xl space-y-3 shadow-xs">
                {/* Warning Header */}
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-amber-900 dark:text-amber-200 tracking-tight uppercase">
                        {userT('Reassignment Required')}
                      </span>
                      <Badge variant="warning" className="text-[10px] font-bold">
                        {supervisedOfficers.length} {userT('Officers Supervised')}
                      </Badge>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                      {userT(
                        "This Supervisor currently supervises active Field Officers. Reassign these officers before changing the user's role."
                      )}
                    </p>
                  </div>
                </div>

                {/* Before & After Visual Hierarchy Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
                  {/* Before Box */}
                  <div className="p-3 bg-white/90 dark:bg-slate-900/90 rounded-lg border border-amber-300 dark:border-amber-800/60 space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                        {userT('Before: Current Unit')}
                      </span>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                        {userT('Supervisor A')}
                      </span>
                    </div>

                    <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded border border-amber-200 dark:border-amber-800/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
                          A
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                            {getSafeString(user.fullName || user.name, 'Supervisor A')}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {userT('Supervisor')} • {getSafeString(user.employeeId) || (typeof user.id === 'string' ? user.id.slice(0, 8) : 'ID')}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/50">
                        → {userT(typeof selectedRole === 'string' ? selectedRole.replace('_', ' ') : 'Field Officer')}
                      </span>
                    </div>

                    {/* Officer Branch List */}
                    <div className="space-y-1 font-mono text-xs pl-1">
                      {supervisedOfficers.map((off, idx) => {
                        const isLast = idx === supervisedOfficers.length - 1;
                        const symbol = isLast ? '└──' : '├──';
                        const offName = getSafeString(off.fullName || off.name, 'Field Officer');
                        const offId = getSafeString(off.employeeId) || (typeof off.id === 'string' ? off.id.slice(0, 6) : '');
                        const offWoreda = getSafeString(off.woreda, 'Woreda');
                        return (
                          <div key={off.id || idx} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <span className="text-amber-500 font-bold select-none">{symbol}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate font-sans">
                              {offName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans">
                              ({offId}{offId && offWoreda ? ' • ' : ''}{offWoreda})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* After Box: Multi-Supervisor Target Selection & Distribution */}
                  <div className="p-3 bg-white/90 dark:bg-slate-900/90 rounded-lg border border-blue-300 dark:border-blue-800/60 space-y-3">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black uppercase text-blue-700 dark:text-blue-300 tracking-wider">
                          {userT('After: Replacement Supervisor(s)')}
                        </span>
                      </div>
                      <Badge variant={allOfficersAssigned ? 'success' : 'warning'} className="text-[10px] font-bold">
                        {supervisedOfficers.length - unassignedOfficers.length}/{supervisedOfficers.length} {userT('Assigned')}
                      </Badge>
                    </div>

                    {/* Quick Bulk Assignment (Assign all to one) */}
                    <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-lg border border-blue-200/80 dark:border-blue-800/40 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-blue-900 dark:text-blue-200 block">
                          {supervisedOfficers.length > 1
                            ? userT('Quick Action: Assign All Officers To Same Supervisor')
                            : userT('Select Replacement Supervisor:')}
                        </label>
                        {supervisedOfficers.length > 1 && (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                            {userT('(Optional Bulk Fill)')}
                          </span>
                        )}
                      </div>
                      <select
                        value={selectedTransferSupervisorId}
                        onChange={(e) => handleBulkTransferChange(e.target.value)}
                        className="w-full text-xs font-medium bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-lg p-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{userT('-- Select Supervisor to Apply to All --')}</option>
                        {availableSupervisors.map((s) => {
                          const sName = getSafeString(s.fullName || s.name, 'Supervisor');
                          const sLoc = getSafeString(s.zone) || getSafeString(s.region) || '';
                          return (
                            <option key={s.id} value={s.id}>
                              {sName} {sLoc ? `(${sLoc})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Individual Officer Reassignment Rows (Enabled for >1 officers or single) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          {supervisedOfficers.length > 1
                            ? userT('Assign Officers to Different Supervisors:')
                            : userT('Assigned Officer:')}
                        </span>
                        {supervisedOfficers.length > 1 && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                            {userT('Each officer can have a different supervisor')}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {supervisedOfficers.map((off, idx) => {
                          const assignedSupId = officerTransferMap[off.id] || '';
                          const offName = getSafeString(off.fullName || off.name, 'Field Officer');
                          const offWoreda = getSafeString(off.woreda, 'Woreda');
                          const offId = getSafeString(off.employeeId) || (typeof off.id === 'string' ? off.id.slice(0, 6) : '');

                          return (
                            <div
                              key={off.id || idx}
                              className={`p-2 rounded-lg border text-xs transition-colors ${
                                assignedSupId
                                  ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'
                                  : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className={`w-6 h-6 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 ${
                                      assignedSupId
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-amber-500 text-white'
                                    }`}
                                  >
                                    {offName.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                                      {offName}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block truncate">
                                      {offId ? `${offId} • ` : ''}{offWoreda || userT('Field Officer')}
                                    </span>
                                  </div>
                                </div>

                                <div className="w-full sm:w-56 shrink-0">
                                  <select
                                    value={assignedSupId}
                                    onChange={(e) => handleSingleOfficerTransferChange(off.id, e.target.value)}
                                    className={`w-full text-xs font-medium bg-white dark:bg-slate-800 border rounded-lg p-1.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 ${
                                      assignedSupId
                                        ? 'border-blue-300 dark:border-blue-700'
                                        : 'border-amber-400 dark:border-amber-600 ring-1 ring-amber-400/30'
                                    }`}
                                  >
                                    <option value="">{userT('-- Select Supervisor --')}</option>
                                    {availableSupervisors.map((s) => {
                                      const sName = getSafeString(s.fullName || s.name, 'Supervisor');
                                      const sLoc = getSafeString(s.zone) || getSafeString(s.region) || '';
                                      return (
                                        <option key={s.id} value={s.id}>
                                          {sName} {sLoc ? `(${sLoc})` : ''}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {availableSupervisors.length === 0 && (
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">
                          {userT('No other active supervisors available in the system. Please promote another officer to supervisor first.')}
                        </p>
                      )}
                    </div>

                    {/* Live Distribution Summary Matrix */}
                    {distributionSummary.length > 0 && (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                          {userT('Reassignment Distribution Preview:')}
                        </span>
                        <div className="space-y-1.5">
                          {distributionSummary.map((group, gIdx) => {
                            const supName = getSafeString(group.supervisor.fullName || group.supervisor.name, 'Supervisor');
                            const supLoc = getSafeString(group.supervisor.zone) || getSafeString(group.supervisor.region) || '';
                            return (
                              <div
                                key={group.supervisor.id || gIdx}
                                className="p-2 bg-white dark:bg-slate-900 rounded border border-blue-200 dark:border-blue-900/50 flex flex-col gap-1 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                                      {supName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                      {supName} {supLoc ? `(${supLoc})` : ''}
                                    </span>
                                  </div>
                                  <Badge variant="primary" className="text-[10px] font-bold">
                                    {group.officers.length} {userT('officer(s)')}
                                  </Badge>
                                </div>
                                <div className="text-[11px] text-slate-600 dark:text-slate-400 pl-6 space-y-0.5">
                                  {group.officers.map((off, oIdx) => (
                                    <div key={off.id || oIdx} className="flex items-center gap-1">
                                      <span className="text-emerald-500 font-bold">✓</span>
                                      <span>{getSafeString(off.fullName || off.name, 'Officer')}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Optional Immediate Transfer Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-amber-200 dark:border-amber-800/40">
                  <span className="text-[11px] text-amber-900 dark:text-amber-300 font-medium">
                    {allOfficersAssigned
                      ? `${userT('All officers will be transferred atomically upon clicking "Change Role" or immediately below:')}`
                      : `${unassignedOfficers.length} ${userT('officer(s) must be assigned before role change can be applied.')}`}
                  </span>
                  {allOfficersAssigned && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDirectTransfer}
                      disabled={isTransferringDirectly || isSubmitting}
                      loading={isTransferringDirectly}
                      className="text-xs font-semibold border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      {userT('Transfer Officers Now')} ({supervisedOfficers.length})
                    </Button>
                  )}
                </div>

                {/* Validation Error Message */}
                {reassignError && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{reassignError}</span>
                  </div>
                )}
              </div>
            ) : transferSuccessMessage ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{transferSuccessMessage}</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Section 3: Workstation Location Assignment */}
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {userT('2. Station & Location Assignment')}
            </h4>
          </div>

          {selectedRole === 'manager' ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-3">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block">
                  {userT('Organization-Wide Scope')}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {userT('Managers hold system-wide administrative oversight. No Zone or Woreda assignment is required.')}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {userT(
                  selectedRole === 'supervisor'
                    ? 'Assign the Region and Zone for this Supervisor. Supervisors coordinate all woredas within their assigned Zone.'
                    : 'Assign the Region, Zone, Woreda/Station, and direct Supervisor for this Field Officer.'
                )}
              </p>
              <LocationDropdown
                role={selectedRole}
                regionId={assignment.regionId}
                zoneId={assignment.zoneId}
                woredaId={assignment.woredaId}
                supervisorId={assignment.supervisorId}
                onChange={handleLocationChange}
                errors={locationErrors}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700/80">
          <div>
            {isReassignmentRequired && !selectedTransferSupervisorId && (
              <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {userT('Reassignment to a replacement supervisor is required.')}
              </span>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting || isTransferringDirectly}
              className="font-medium text-xs sm:text-sm px-4"
            >
              {userT('Cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting || isTransferringDirectly}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm px-5 shadow-sm shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{userT('Change Role')}</span>
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
