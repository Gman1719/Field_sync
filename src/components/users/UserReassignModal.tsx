// Reassign Staff Workstation Location & Supervisor Assignment with Modern UI
// Strictly validates that supervisors with active Field Officers under their control
// MUST reassign all officers to active replacement supervisors before changing their operational location.

import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  MapPin, ShieldAlert, CheckCircle2, ArrowRight, Building,
  AlertTriangle, Users, Loader2, RefreshCw, Lock
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LocationDropdown from './LocationDropdown';
import { API_BASE } from '../../config/api';
import { db } from '../../services/database';
import { offlineDb } from '../../db/offlineDb';
import { useUserLanguage } from '../../context/UserLanguageContext';
import ActivityLogger from '../../services/activityLogger';

interface UserReassignModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated?: (user?: any, transferredOfficerIds?: string[], newSupervisorId?: string | null, officerTransferMap?: Record<string, string>) => void;
  allUsers?: any[];
}

export default function UserReassignModal({
  user,
  isOpen,
  onClose,
  onUserUpdated,
  allUsers = [],
}: UserReassignModalProps) {
  const { userT } = useUserLanguage();
  const [assignment, setAssignment] = useState({
    regionId: '',
    zoneId: '',
    woredaId: '',
    supervisorId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Supervised officers and replacement supervisor state
  const [supervisedOfficers, setSupervisedOfficers] = useState<any[]>([]);
  const [loadingSupervisedOfficers, setLoadingSupervisedOfficers] = useState(false);
  const [availableSupervisors, setAvailableSupervisors] = useState<any[]>([]);
  const [selectedTransferSupervisorId, setSelectedTransferSupervisorId] = useState('');
  const [officerTransferMap, setOfficerTransferMap] = useState<Record<string, string>>({});
  const [reassignError, setReassignError] = useState('');
  const [isTransferringDirectly, setIsTransferringDirectly] = useState(false);
  const [transferSuccessMessage, setTransferSuccessMessage] = useState('');

  const isSupervisor = Boolean(
    user && (user.role?.toLowerCase() === 'supervisor' || user.role === 'SUPERVISOR')
  );

  // 1. Initialize modal state and fetch supervised officers if user is supervisor
  useEffect(() => {
    if (!user || !isOpen) {
      setSupervisedOfficers([]);
      setSelectedTransferSupervisorId('');
      setOfficerTransferMap({});
      setReassignError('');
      setTransferSuccessMessage('');
      return;
    }

    setAssignment({
      regionId: user.regionId || '',
      zoneId: user.zoneId || '',
      woredaId: user.woredaId || '',
      supervisorId: user.supervisorId || '',
    });
    setErrors({});
    setSelectedTransferSupervisorId('');
    setOfficerTransferMap({});
    setReassignError('');
    setTransferSuccessMessage('');

    if (user.role?.toLowerCase() === 'supervisor' || user.role === 'SUPERVISOR') {
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

  // Helper for safe string extraction
  const getSafeString = (val: any, fallback: string = ''): string => {
    if (!val) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object' && typeof val.name === 'string') return val.name;
    if (typeof val === 'object' && typeof val.fullName === 'string') return val.fullName;
    return fallback;
  };

  // Is this supervisor relocating to a different zone or region?
  const isLocationChanging = useMemo(() => {
    if (!user) return false;
    const zoneChanged = Boolean(assignment.zoneId && assignment.zoneId !== user.zoneId);
    const regionChanged = Boolean(assignment.regionId && assignment.regionId !== user.regionId);
    return zoneChanged || regionChanged;
  }, [user, assignment.zoneId, assignment.regionId]);

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

  if (!user) return null;

  // Direct transfer handler: transfers officers immediately so location can be changed cleanly
  const handleDirectTransfer = async () => {
    if (!allOfficersAssigned) {
      toast.error(
        `${userT('Please assign all officers to replacement supervisors first.')} (${unassignedOfficers.length} ${userT('officer(s) must be assigned first before changing location.')})`
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
          "All field officers have been successfully transferred! You can now safely apply the supervisor's new workstation location."
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

    // 1. Validation based on role
    const newErrors: Record<string, string> = {};
    const roleLower = user.role?.toLowerCase() || '';
    if (roleLower === 'supervisor') {
      if (!assignment.regionId) newErrors.regionId = userT('Region is required');
      if (!assignment.zoneId) newErrors.zoneId = userT('Zone is required');
    } else if (roleLower === 'field_officer') {
      if (!assignment.regionId) newErrors.regionId = userT('Region is required');
      if (!assignment.zoneId) newErrors.zoneId = userT('Zone is required');
      if (!assignment.woredaId) newErrors.woredaId = userT('Woreda is required');

      // Strict validation: A Field Officer can only be registered, assigned, or transferred to a Woreda
      // if that area has at least one active Supervisor responsible for that Zone.
      if (assignment.zoneId) {
        const zoneSupervisors = allUsers.filter(
          (u: any) =>
            u &&
            (u.role === 'supervisor' || u.role === 'SUPERVISOR') &&
            (u.status === 'active' || u.isActive !== false) &&
            (u.zoneId === assignment.zoneId || u.zone?.id === assignment.zoneId)
        );
        if (zoneSupervisors.length === 0) {
          newErrors.zoneId = userT(
            'A Field Officer can only be transferred to a Woreda if that area has at least one active Supervisor responsible for that Zone.'
          );
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(userT('Please complete all required location fields'));
      return;
    }

    // 2. Strict Supervisor Location Change Validation:
    // If the supervisor has officers under his control, the system MUST validate that:
    // Because it has officers, reassign the officers first before changing location!
    if (isSupervisor && supervisedOfficers.length > 0) {
      if (isLocationChanging && !allOfficersAssigned) {
        const errorMsg = userT(
          `Validation Blocked: This supervisor currently oversees ${supervisedOfficers.length} Field Officer(s) under their control. You must reassign all officers to replacement supervisors first before changing this supervisor's location (${unassignedOfficers.length} officer(s) still unassigned).`
        );
        setReassignError(errorMsg);
        toast.error(errorMsg, { duration: 6000 });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('fieldsync_token');
      const payload: any = {
        ...assignment,
      };

      if (isSupervisor && supervisedOfficers.length > 0) {
        payload.transferSupervisorId = selectedTransferSupervisorId || undefined;
        payload.officerTransfers = officerTransferMap;
      }

      let updatedUser: any = {
        ...user,
        regionId: assignment.regionId || user.regionId,
        region: (assignment as any).region || user.region,
        zoneId: assignment.zoneId || user.zoneId,
        zone: (assignment as any).zone || user.zone,
        woredaId: assignment.woredaId || user.woredaId,
        woreda: (assignment as any).woreda || user.woreda,
        supervisorId: assignment.supervisorId !== undefined && assignment.supervisorId !== '' ? assignment.supervisorId : user.supervisorId,
        updatedAt: new Date().toISOString(),
      };

      if (assignment.supervisorId && allUsers && allUsers.length > 0) {
        const foundSup = allUsers.find((u: any) => u.id === assignment.supervisorId);
        if (foundSup) {
          updatedUser.supervisor = foundSup.fullName || foundSup.name;
        }
      }

      if (navigator.onLine && token) {
        try {
          const response = await fetch(`${API_BASE}/users/${user.id}/assignment`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const resData = await response.json();
            if (resData.success && (resData.user || resData.data)) {
              updatedUser = { ...updatedUser, ...(resData.user || resData.data) };
            }
          } else {
            const resData = await response.json().catch(() => ({}));
            if (resData.code === 'REASSIGNMENT_REQUIRED') {
              throw new Error(resData.error || 'Reassignment Required: All Field Officers must be transferred first.');
            }
            console.warn('Backend assignment update returned non-OK, persisting locally:', resData.error);
          }
        } catch (apiErr: any) {
          if (apiErr.message && apiErr.message.includes('Reassignment Required')) {
            throw apiErr;
          }
          console.warn('Backend API update failed, persisting locally:', apiErr.message);
        }
      }

      // Update user in local DB
      try {
        await db.users.put(updatedUser);
        await offlineDb.users.put(updatedUser);
      } catch (_e) {
        try {
          await db.users.update(user.id, updatedUser);
          await offlineDb.users.update(user.id, updatedUser);
        } catch (_inner) {}
      }

      // If officers were transferred, update each one in local DB
      if (Object.keys(officerTransferMap).length > 0) {
        for (const [oId, targetSupId] of Object.entries(officerTransferMap)) {
          try {
            await db.users.update(oId, { supervisorId: targetSupId });
            await offlineDb.users.update(oId, { supervisorId: targetSupId });
          } catch (_e) {}
        }
      }

      // Record Activity Log
      await ActivityLogger.log(
        'WORKSTATION_REASSIGNED',
        `Reassigned workstation & supervisor for ${user.name || user.fullName}${
          Object.keys(officerTransferMap).length > 0
            ? ` (Reassigned ${Object.keys(officerTransferMap).length} field officers across active supervisors)`
            : ''
        }`,
        {
          relatedRecordId: user.id,
          metadata: {
            targetUserId: user.id,
            targetUserName: user.name || user.fullName,
            regionId: assignment.regionId,
            zoneId: assignment.zoneId,
            woredaId: assignment.woredaId,
            supervisorId: assignment.supervisorId,
            transferredOfficersCount: Object.keys(officerTransferMap).length,
          },
        }
      );

      toast.success(`${userT('Workstation location reassigned for')} ${user.name || user.fullName}`);
      if (onUserUpdated) {
        onUserUpdated(
          updatedUser,
          Object.keys(officerTransferMap),
          selectedTransferSupervisorId || null,
          officerTransferMap
        );
      }
      onClose();
    } catch (err: any) {
      console.error('Reassignment error:', err);
      toast.error(err.message ? userT(err.message) : userT('Reassignment failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={userT('Reassign Operational Workstation')}
      description={userT('Modify administrative jurisdiction and ensure supervisory hierarchy integrity')}
      size={isSupervisor && supervisedOfficers.length > 0 ? 'lg' : 'md'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User Identity Banner */}
        <div className="p-3.5 bg-slate-50/80 dark:bg-slate-900/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
              {user.name || user.fullName}
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {user.email}
            </span>
          </div>
          <Badge
            variant={isSupervisor ? 'info' : 'neutral'}
            className="capitalize text-xs font-semibold"
          >
            {userT(user.role?.replace('_', ' ') || '')}
          </Badge>
        </div>

        {/* Current Station vs New Station */}
        <div className="p-3 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs space-y-1">
          <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block text-[10px]">
            {userT('Current Active Jurisdiction:')}
          </span>
          <p className="text-slate-800 dark:text-slate-100 font-semibold flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>
              {user.role === 'manager'
                ? userT('Organization-wide (National)')
                : `${user.region ? userT(user.region) : userT('No Region')} / ${
                    user.zone ? userT(user.zone) : userT('No Zone')
                  }${user.woreda ? ` / ${userT(user.woreda)}` : ''}`}
            </span>
          </p>
        </div>

        {/* MANDATORY VALIDATION: Active Supervised Officers Section for Supervisors */}
        {isSupervisor && (
          <div className="space-y-3">
            {loadingSupervisedOfficers ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 text-slate-500 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                {userT('Checking assigned workforce hierarchy for this supervisor...')}
              </div>
            ) : supervisedOfficers.length > 0 ? (
              <div className="p-3.5 bg-amber-500/10 dark:bg-amber-950/30 border-2 border-amber-500/40 dark:border-amber-700/60 rounded-xl space-y-3">
                {/* Warning Header */}
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-amber-900 dark:text-amber-200 tracking-tight uppercase">
                        {userT('Reassignment Required: Active Officers Under Control')}
                      </span>
                      <Badge variant="warning" className="text-[10px] font-bold">
                        {supervisedOfficers.length} {userT('Officers Supervised')}
                      </Badge>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed font-medium">
                      {userT('This supervisor currently has active Field Officers under their control. A supervisor cannot change their operational location while having officers under their supervision. You must reassign these officers to replacement active supervisors first before changing location.')}
                    </p>
                  </div>
                </div>

                {/* Transfer Configuration Box */}
                <div className="p-3 bg-white/95 dark:bg-slate-900/95 rounded-lg border border-blue-300 dark:border-blue-800/60 space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-black uppercase text-blue-700 dark:text-blue-300 tracking-wider">
                      {userT('Step 1: Reassign Officers To Active Supervisors')}
                    </span>
                    <Badge variant={allOfficersAssigned ? 'success' : 'warning'} className="text-[10px] font-bold">
                      {supervisedOfficers.length - unassignedOfficers.length}/{supervisedOfficers.length} {userT('Assigned')}
                    </Badge>
                  </div>

                  {/* Bulk Fill Selector */}
                  <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-lg border border-blue-200/80 dark:border-blue-800/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-blue-900 dark:text-blue-200 block">
                        {supervisedOfficers.length > 1
                          ? userT('Quick Action: Transfer All Officers To Same Supervisor')
                          : userT('Select Replacement Supervisor:')}
                      </label>
                      {supervisedOfficers.length > 1 && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          {userT('(Bulk Fill)')}
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

                  {/* Individual Officer Reassignment Rows */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        {supervisedOfficers.length > 1
                          ? userT('Assign Officers to Different Supervisors:')
                          : userT('Assigned Officer:')}
                      </span>
                      {supervisedOfficers.length > 1 && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                          {userT('Each officer can be assigned to a different active supervisor')}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
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
                                    assignedSupId ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'
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

                              <div className="w-full sm:w-52 shrink-0">
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

                  {/* Distribution Preview */}
                  {distributionSummary.length > 0 && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/80 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                        {userT('Reassignment Distribution Preview:')}
                      </span>
                      <div className="space-y-1">
                        {distributionSummary.map((group, gIdx) => {
                          const supName = getSafeString(group.supervisor.fullName || group.supervisor.name, 'Supervisor');
                          const supLoc = getSafeString(group.supervisor.zone) || getSafeString(group.supervisor.region) || '';
                          return (
                            <div
                              key={group.supervisor.id || gIdx}
                              className="p-1.5 bg-white dark:bg-slate-900 rounded border border-blue-200 dark:border-blue-900/50 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                  {supName} {supLoc ? `(${supLoc})` : ''}
                                </span>
                              </div>
                              <Badge variant="primary" className="text-[10px] font-bold">
                                {group.officers.length} {userT('officer(s)')}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Immediate Direct Transfer Action Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                      {allOfficersAssigned
                        ? userT('You can reassign officers immediately below, or automatically when applying location change:')
                        : `${unassignedOfficers.length} ${userT('officer(s) must be assigned first before changing location.')}`}
                    </span>
                    {allOfficersAssigned && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDirectTransfer}
                        disabled={isTransferringDirectly || isSubmitting}
                        loading={isTransferringDirectly}
                        className="text-xs font-semibold border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        {userT('Reassign Officers Now')} ({supervisedOfficers.length})
                      </Button>
                    )}
                  </div>
                </div>

                {/* Validation Error Banner */}
                {reassignError && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{reassignError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {transferSuccessMessage || userT('No frontline field officers currently assigned to this supervisor. Location change is safe to proceed.')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Cascading Location Hierarchy Dropdowns (Step 2) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              {isSupervisor && supervisedOfficers.length > 0
                ? userT('Step 2: Select New Ethiopian Workstation Location')
                : userT('Select New Ethiopian Hierarchy Assignment')}
            </span>
          </div>
          <LocationDropdown
            role={user.role}
            regionId={assignment.regionId}
            zoneId={assignment.zoneId}
            woredaId={assignment.woredaId}
            supervisorId={assignment.supervisorId}
            onChange={(newValues) => {
              setAssignment((prev) => ({ ...prev, ...newValues }));
              setErrors({});
              setReassignError('');
            }}
            errors={errors}
          />
        </div>

        {/* Actions Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700/80">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="font-medium text-xs sm:text-sm px-4"
          >
            {userT('Cancel')}
          </Button>

          {isSupervisor && supervisedOfficers.length > 0 && isLocationChanging && !allOfficersAssigned ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                const msg = userT(
                  `Validation Blocked: This supervisor has ${supervisedOfficers.length} field officers under their control. You must reassign all officers to replacement supervisors first before changing this supervisor's location.`
                );
                setReassignError(msg);
                toast.error(msg, { duration: 6000 });
              }}
              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs sm:text-sm px-4 shadow-sm shadow-amber-500/20"
            >
              <Lock className="w-4 h-4 mr-1.5" />
              {userT('Reassign Officers First')}
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm px-4 shadow-sm shadow-blue-500/20"
            >
              <MapPin className="w-4 h-4 mr-1.5" />
              {isSupervisor && supervisedOfficers.length > 0
                ? userT('Apply Reassignment & Location Change')
                : userT('Apply Reassignment')}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
