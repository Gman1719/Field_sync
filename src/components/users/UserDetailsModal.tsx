// View Full Details of User Account, Ethiopian Hierarchy Assignment & Manager Actions

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  User, Mail, Phone, ShieldCheck, MapPin, Building,
  Edit3, Power, RefreshCw, Copy, Check
} from 'lucide-react';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { API_BASE } from '../../config/api';

interface UserDetailsModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (user: any) => void;
  onReassign?: (user: any) => void;
  onChangeRole?: (user: any) => void;
  onToggleStatus?: (user: any) => Promise<void> | void;
  onResetPassword?: (user: any) => void;
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
  const [userDetails, setUserDetails] = useState(user);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user?.id) {
      setUserDetails(user);
      return;
    }

    setUserDetails(user);

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
      // Immediately reflect local toggle
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Account & Profile Details"
      size="lg"
    >
      <div className="space-y-5">
        {/* 1. Profile Header Banner */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {current.profilePhotoUrl ? (
              <img
                src={current.profilePhotoUrl}
                alt={current.fullName || current.name}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                {(current.firstName?.[0] || current.fullName?.[0] || current.name?.[0] || 'U').toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
                {current.fullName || current.name}
              </h3>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>Employee ID:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{current.employeeId || current.id}</span>
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant={current.role === 'manager' ? 'primary' : current.role === 'supervisor' ? 'info' : 'neutral'}
                  className="capitalize font-semibold text-xs"
                >
                  {current.role?.replace('_', ' ')}
                </Badge>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-400'}`} />
                  {isActive ? 'ACTIVE ACCOUNT' : 'INACTIVE'}
                </span>
              </div>
            </div>
          </div>

          {loadingDetails && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 self-start sm:self-center">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
              <span>Syncing profile...</span>
            </div>
          )}
        </div>

        {/* 2. Personal & Contact Information */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Personal & Contact Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-1">Full Name</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {[current.firstName, current.middleName, current.lastName].filter(Boolean).join(' ') || current.name}
              </span>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-1">Email Address</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 truncate block">{current.email}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(current.email, 'Email')}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Copy email"
              >
                {copiedField === 'Email' ? <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-1">Phone Number</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 font-mono">
                  {current.phoneNumber || current.phone || 'Not provided'}
                </span>
              </div>
              {(current.phoneNumber || current.phone) && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(current.phoneNumber || current.phone, 'Phone')}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  title="Copy phone"
                >
                  {copiedField === 'Phone' ? <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Ethiopian Administrative Hierarchy Location */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Ethiopian Administrative Hierarchy
          </h4>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
            {current.role === 'manager' ? (
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold py-1">
                <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Organization-wide Coverage (National / Federal Democratic Republic of Ethiopia)</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Region</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{current.region || current.regionName || 'Unassigned'}</span>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Zone / Sub-City</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{current.zone || current.zoneName || 'Unassigned'}</span>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Woreda / Station</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {current.role === 'supervisor' ? 'All Woredas in Zone' : (current.woreda || current.woredaName || 'Unassigned')}
                  </span>
                </div>
                {current.role === 'field_officer' && (
                  <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:col-span-3 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Direct Assigned Supervisor:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {current.supervisorName || current.supervisorId || 'Unassigned'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 4. Manager-Only Administrative Actions */}
        {(onEdit || onReassign || onChangeRole || onToggleStatus || onResetPassword) && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Manager Actions
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(current)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Edit Profile</span>
                </button>
              )}
              {onChangeRole && (
                <button
                  type="button"
                  onClick={() => onChangeRole(current)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Change Role</span>
                </button>
              )}
              {onReassign && current.role !== 'manager' && (
                <button
                  type="button"
                  onClick={() => onReassign(current)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/60 hover:border-blue-300 dark:hover:border-blue-700 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Change Location</span>
                </button>
              )}
              {onResetPassword && (
                <button
                  type="button"
                  onClick={() => onResetPassword(current)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                  <span>Reset Password</span>
                </button>
              )}
              {onToggleStatus && (
                <button
                  type="button"
                  onClick={handleStatusToggle}
                  disabled={isTogglingStatus}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    isActive
                      ? 'text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50/50 dark:hover:bg-rose-950/30'
                      : 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/30'
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
        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-700">
          <Button variant="secondary" onClick={onClose} className="font-semibold px-6">
            Close Profile
          </Button>
        </div>
      </div>
    </Modal>
  );
}
