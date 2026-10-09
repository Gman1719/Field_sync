// View Full Details of User Account, Ethiopian Hierarchy Assignment & Manager Actions
// Clean, reliable detail modal featuring all 5 functional Manager Administrative Actions

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  User, Mail, Phone, ShieldCheck, MapPin, Building2,
  Edit3, Power, Copy, Check, KeyRound
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { API_BASE } from '../../config/api';
import { useUserLanguage } from '../../context/UserLanguageContext';

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
  allUsers?: any[];
}

export default function UserDetailsModal({
  user,
  isOpen,
  onClose,
  onEdit,
  onReassign,
  onChangeRole,
  onToggleStatus,
  onResetPassword,
}: UserDetailsModalProps) {
  const { userT } = useUserLanguage();
  const [userDetails, setUserDetails] = useState<any>(user);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Sync state whenever user prop changes or modal opens
  useEffect(() => {
    if (!isOpen || !user) {
      setUserDetails(null);
      return;
    }

    setUserDetails(user);

    if (!user.id) return;

    let isMounted = true;
    const fetchFullDetails = async () => {
      setLoadingDetails(true);
      try {
        const token = localStorage.getItem('fieldsync_token') || localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/users/${user.id}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok && isMounted) {
          const resData = await res.json();
          if (resData.success && resData.data) {
            setUserDetails((prev: any) => ({ ...(prev || {}), ...resData.data }));
          }
        }
      } catch (err: any) {
        console.warn('Could not fetch remote user details, using cached:', err.message);
      } finally {
        if (isMounted) setLoadingDetails(false);
      }
    };

    fetchFullDetails();
    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const current = userDetails || user;
  const isActive = current.status === 'active' || current.isActive === true;

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${userT('Copied')} ${userT(field)}`);
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

  const fullName = [current.firstName, current.middleName, current.lastName].filter(Boolean).join(' ') || current.fullName || current.name || 'User';
  const initial = (current.firstName?.[0] || fullName?.[0] || 'U').toUpperCase();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={userT('Staff Account & Profile Details')}
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
                    <span>{userT('ID')}:</span>
                    <span className="font-semibold text-slate-700 dark:text-white">{current.employeeId || current.id}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(current.employeeId || current.id, 'Employee ID')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                    title={userT('Copy ID')}
                  >
                    {copiedField === 'Employee ID' ? <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40 capitalize shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {userT(current.role ? current.role.replace('_', ' ') : 'Role')}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-2xs ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                      : 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {isActive ? userT('ACTIVE ACCOUNT') : userT('INACTIVE')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{userT('Citizens Registered')}</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {(current.registeredCitizensCount || current.registrationsCount || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Contact Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 bg-slate-50/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-100/70 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">{userT('Email Address')}</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {current.email || '—'}
                </span>
              </div>
            </div>
            {current.email && (
              <button
                type="button"
                onClick={() => copyToClipboard(current.email, 'Email')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer shrink-0"
                title={userT('Copy Email')}
              >
                {copiedField === 'Email' ? <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          <div className="p-3.5 bg-slate-50/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">{userT('Phone Number')}</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block font-mono">
                  {current.phoneNumber || '—'}
                </span>
              </div>
            </div>
            {current.phoneNumber && (
              <button
                type="button"
                onClick={() => copyToClipboard(current.phoneNumber, 'Phone')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer shrink-0"
                title={userT('Copy Phone')}
              >
                {copiedField === 'Phone' ? <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* 3. Operational Hierarchy Assignment Card */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{userT('Operational Workstation & Jurisdiction')}</span>
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {current.role === 'manager' ? userT('National Scope') : userT('Assigned Area')}
            </span>
          </div>

          <div className="space-y-2.5">
            {current.role === 'manager' ? (
              <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-blue-200/60 dark:border-blue-800/40 flex items-center gap-3">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">{userT('National System Oversight')}</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {userT('Managers hold system-wide administrative oversight across all regions, zones, and woredas.')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">{userT('Region')}</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">
                      {current.region ? userT(current.region) : '—'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">{userT('Zone / Sub-City')}</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">
                      {current.zone ? userT(current.zone) : '—'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">{userT('Woreda / Station')}</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">
                      {current.role === 'supervisor' ? userT('All Woredas') : (current.woreda ? userT(current.woreda) : '—')}
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
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">{userT('Direct Assigned Supervisor')}</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {current.supervisorName || current.supervisorId || userT('Unassigned')}
                        </span>
                      </div>
                    </div>
                    {current.supervisorName && (
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-700">
                        {userT('Zonal Supervisor')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 4. Manager-Only Administrative Actions */}
        <div className="p-3.5 sm:p-4 bg-slate-50/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
          <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>{userT('Manager Administrative Actions')}</span>
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Edit Profile */}
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(current);
                }}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                <span>{userT('Edit Profile')}</span>
              </button>
            )}

            {/* 2. Change Role (Disabled for single System Manager) */}
            {onChangeRole && current.role !== 'manager' && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChangeRole(current);
                }}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 hover:bg-blue-50/60 dark:hover:bg-blue-900/40 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{userT('Change Role')}</span>
              </button>
            )}

            {/* 3. Change Location */}
            {onReassign && current.role !== 'manager' && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onReassign(current);
                }}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/40 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{userT('Change Location')}</span>
              </button>
            )}

            {/* 4. Reset Password */}
            {onResetPassword && (
              <button
                type="button"
                onClick={() => onResetPassword(current)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>{userT('Reset Password')}</span>
              </button>
            )}

            {/* 5. Deactivate Account / Activate Account (Manager cannot be deactivated) */}
            {onToggleStatus && current.role !== 'manager' && (
              <button
                type="button"
                onClick={handleStatusToggle}
                disabled={isTogglingStatus}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50 active:scale-95 ${
                  isActive
                    ? 'text-rose-600 dark:text-rose-300 bg-white dark:bg-slate-800 border-rose-200 dark:border-rose-800/80 hover:bg-rose-50 dark:hover:bg-rose-900/30'
                    : 'text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{isActive ? userT('Deactivate Account') : userT('Activate Account')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-200/80 dark:border-slate-700/80">
          <Button variant="secondary" onClick={onClose} className="font-semibold px-6 text-sm">
            {userT('Close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
