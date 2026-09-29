// View Full Details of User Account, Ethiopian Hierarchy Assignment & Manager Actions

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  User, Mail, Phone, ShieldCheck, MapPin, Building2,
  Edit3, Power, RefreshCw, Copy, Check, CheckCircle2, ChevronRight, KeyRound
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { API_BASE } from '../../config/api';
import { db } from '../../services/database';
import { offlineDb } from '../../db/offlineDb';
import { ActivityLogger } from '../../services/activityLogger';

interface UserDetailsModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (user: any) => void;
  onReassign?: (user: any) => void;
  onChangeRole?: (user: any) => void;
  onToggleStatus?: (user: any) => Promise<void> | void;
  onResetPassword?: (user: any) => void;
  onUserUpdated?: (user?: any) => void;
}

const AVAILABLE_ROLES = [
  { id: 'field_officer', label: 'Field Officer', desc: 'Frontline citizen registration & woreda field intake' },
  { id: 'supervisor', label: 'Supervisor', desc: 'Zonal operations coordination & field officer oversight' },
  { id: 'manager', label: 'Manager', desc: 'National command authority & complete administration' },
];

export default function UserDetailsModal({
  user,
  isOpen,
  onClose,
  onEdit,
  onReassign,
  onChangeRole,
  onToggleStatus,
  onResetPassword,
  onUserUpdated,
}: UserDetailsModalProps) {
  const [userDetails, setUserDetails] = useState(user);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // In-modal Role Change State
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user?.role?.toLowerCase() || 'field_officer');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  useEffect(() => {
    if (!isOpen || !user?.id) {
      setUserDetails(user);
      setShowRoleSelector(false);
      return;
    }

    setUserDetails(user);
    setSelectedRole(user.role?.toLowerCase() || 'field_officer');
    setShowRoleSelector(false);

    // Fetch full profile and live data from backend API
    const fetchFullDetails = async () => {
      setLoadingDetails(true);
      try {
        const token = localStorage.getItem('fieldsync_token');
        const res = await fetch(`${API_BASE}/users/${user.id}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData.success && resData.data) {
            setUserDetails((prev: any) => ({ ...prev, ...resData.data }));
            if (resData.data.role) {
              setSelectedRole(resData.data.role.toLowerCase());
            }
          }
        }
      } catch (err: any) {
        console.warn('Could not fetch remote user details, using cached:', err.message);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchFullDetails();
  }, [isOpen, user]);

  if (!user) return null;

  const current = userDetails || user;
  const isActive = current.status === 'active' || current.isActive;

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`Copied ${field}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleStatusToggle = async () => {
    if (!onToggleStatus) return;
    setIsTogglingStatus(true);
    try {
      await onToggleStatus(current);
      setUserDetails((prev: any) => ({
        ...prev,
        status: isActive ? 'inactive' : 'active',
        isActive: !isActive,
      }));
    } catch (err: any) {
      console.error('Error toggling status:', err);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleSaveRole = async () => {
    if (selectedRole === (current.role || '').toLowerCase()) {
      setShowRoleSelector(false);
      return;
    }

    setIsUpdatingRole(true);
    let updated = {
      ...current,
      role: selectedRole,
      updatedAt: new Date().toISOString(),
    };

    try {
      const token = localStorage.getItem('fieldsync_token');
      if (navigator.onLine && token) {
        try {
          const res = await fetch(`${API_BASE}/users/${current.id}/role`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ role: selectedRole.toUpperCase() }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && (data.user || data.data)) {
              updated = { ...updated, ...(data.user || data.data) };
            }
          }
        } catch (netErr: any) {
          console.warn('Backend API role update unreachable, applying locally:', netErr.message);
        }
      }

      // Persist in local IndexedDB
      try {
        await db.users.put(updated);
      } catch (_e) {
        try { await db.users.update(current.id, updated); } catch (_inner) {}
      }
      try {
        await offlineDb.users.put(updated);
      } catch (_e) {}

      // Log activity
      try {
        await ActivityLogger.log('USER_ROLE_CHANGED', `Changed role for ${current.fullName || current.name} to ${selectedRole}`, {
          officerId: 'manager',
          relatedRecordId: current.id,
          metadata: { newRole: selectedRole },
        });
      } catch (_logErr) {}

      setUserDetails(updated);
      setShowRoleSelector(false);
      toast.success(`Role updated to ${selectedRole.replace('_', ' ')} successfully`);
      if (onUserUpdated) onUserUpdated(updated);
    } catch (err: any) {
      console.error('Role update error:', err);
      toast.error('Failed to change role: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const fullName = [current.firstName, current.middleName, current.lastName].filter(Boolean).join(' ') || current.fullName || current.name;
  const initial = (current.firstName?.[0] || fullName?.[0] || 'U').toUpperCase();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Account & Profile Details"
      size="lg"
    >
      <div className="space-y-5">
        {/* 1. Hero Profile Banner */}
        <div className="relative overflow-hidden p-5 sm:p-5.5 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {current.profilePhotoUrl ? (
                <img
                  src={current.profilePhotoUrl}
                  alt={fullName}
                  className="w-14 h-14 rounded-xl object-cover border border-white dark:border-slate-700 shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white flex items-center justify-center font-bold text-xl shadow-sm shadow-blue-500/20 ring-1 ring-white/20 shrink-0">
                  {initial}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  {fullName}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700">
                    <span>ID:</span>
                    <span className="font-semibold text-slate-700 dark:text-white">{current.employeeId || current.id}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(current.employeeId || current.id, 'Employee ID')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                    title="Copy ID"
                  >
                    {copiedField === 'Employee ID' ? <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40 capitalize shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {current.role?.replace('_', ' ')}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-2xs ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                      : 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {isActive ? 'ACTIVE ACCOUNT' : 'INACTIVE'}
                  </span>
                </div>
              </div>
            </div>

            {loadingDetails && (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700 self-start sm:self-center shadow-2xs">
                <RefreshCw className="w-3 h-3 animate-spin text-blue-600 dark:text-blue-400" />
                <span>Syncing live stats...</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Personal & Contact Information */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-700">
            <div className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-300">
              <User className="w-3 h-3" />
            </div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Personal & Contact Information
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Full Name */}
            <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-xl shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-all">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">Full Legal Name</span>
              <span className="font-semibold text-sm text-slate-900 dark:text-white block leading-snug">
                {fullName}
              </span>
            </div>

            {/* Email Address */}
            <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-xl shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-all flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">Email Address</span>
                <span className="font-semibold text-sm text-slate-900 dark:text-white truncate block">
                  {current.email}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(current.email, 'Email')}
                className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                title="Copy email"
              >
                {copiedField === 'Email' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Phone Number */}
            <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-xl shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-all flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">Phone Number</span>
                <span className="font-semibold text-sm text-slate-900 dark:text-white font-mono block">
                  {current.phoneNumber || current.phone || 'Not provided'}
                </span>
              </div>
              {(current.phoneNumber || current.phone) && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(current.phoneNumber || current.phone, 'Phone')}
                  className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                  title="Copy phone"
                >
                  {copiedField === 'Phone' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Ethiopian Administrative Hierarchy Location */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-700">
            <div className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
              <MapPin className="w-3 h-3" />
            </div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Ethiopian Administrative Hierarchy
            </h4>
          </div>

          <div className="p-3.5 bg-slate-50/70 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700 rounded-xl space-y-3">
            {current.role === 'manager' ? (
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white block">
                    National Operational Scope
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-300">
                    Federal Democratic Republic of Ethiopia (Organization-wide Authority)
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">Region</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {current.region || current.regionName || 'Unassigned'}
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">Zone / Sub-City</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {current.zone || current.zoneName || 'Unassigned'}
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">Woreda / Station</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {current.role === 'supervisor' ? 'All Woredas in Zone' : (current.woreda || current.woredaName || 'Unassigned')}
                    </span>
                  </div>
                </div>

                {current.role === 'field_officer' && (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Direct Assigned Supervisor</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {current.supervisorName || current.supervisorId || 'Unassigned'}
                        </span>
                      </div>
                    </div>
                    {current.supervisorName && (
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-700">
                        Zonal Supervisor
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 4. In-Modal Change Role Panel (Expanded when Change Role clicked) */}
        {showRoleSelector && (
          <div className="p-4 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 dark:from-slate-800/90 dark:via-slate-800 dark:to-slate-900/90 rounded-xl border border-blue-500/40 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Change Operational Role
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Select new functional authority for this staff member
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRoleSelector(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {AVAILABLE_ROLES.map((r) => {
                const isSelected = selectedRole === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRole(r.id)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-white dark:bg-slate-800 shadow-sm ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
                        {r.label}
                      </span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {r.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowRoleSelector(false)}
                className="font-medium text-xs px-3.5"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={isUpdatingRole}
                onClick={handleSaveRole}
                className="font-semibold bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 shadow-xs"
              >
                Confirm Role Change
              </Button>
            </div>
          </div>
        )}

        {/* 5. Manager-Only Administrative Actions */}
        {(onEdit || onReassign || onChangeRole || onToggleStatus || onResetPassword) && (
          <div className="p-3.5 sm:p-4 bg-slate-50/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Manager Administrative Actions</span>
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(current)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                  <span>Edit Profile</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (onChangeRole) {
                    onChangeRole(current);
                  } else {
                    setShowRoleSelector(prev => !prev);
                  }
                }}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Change Role</span>
              </button>
              {onReassign && current.role !== 'manager' && (
                <button
                  type="button"
                  onClick={() => onReassign(current)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/40 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Change Location</span>
                </button>
              )}
              {onResetPassword && (
                <button
                  type="button"
                  onClick={() => onResetPassword(current)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Reset Password</span>
                </button>
              )}
              {onToggleStatus && (
                <button
                  type="button"
                  onClick={handleStatusToggle}
                  disabled={isTogglingStatus}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50 ${
                    isActive
                      ? 'text-rose-600 dark:text-rose-300 bg-white dark:bg-slate-800 border-rose-200 dark:border-rose-800/80 hover:bg-rose-50 dark:hover:bg-rose-900/30'
                      : 'text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{isActive ? 'Deactivate Account' : 'Activate Account'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-200/80 dark:border-slate-700/80">
          <Button variant="secondary" onClick={onClose} className="font-semibold px-6 text-sm">
            Close Profile
          </Button>
        </div>
      </div>
    </Modal>
  );
}
