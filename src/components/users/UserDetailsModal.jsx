// src/components/users/UserDetailsModal.jsx
// View Full Details of User Account, Ethiopian Hierarchy Assignment & Manager Actions

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  User, Mail, Phone, ShieldCheck, MapPin, Building,
  Home, Calendar, Clock, KeyRound, CheckCircle2, XCircle,
  FileText, Users, Smartphone, Edit3, Power, RefreshCw, Copy, Check
} from 'lucide-react';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { API_BASE } from '../../config/api';

export default function UserDetailsModal({
  user,
  isOpen,
  onClose,
  onEdit,
  onReassign,
  onToggleStatus,
  onResetPassword,
}) {
  const [userDetails, setUserDetails] = useState(user);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    if (!isOpen || !user?.id) {
      setUserDetails(user);
      return;
    }

    setUserDetails(user);

    // Fetch full profile and live stats from backend API
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
            setUserDetails(resData.data);
          }
        }
      } catch (err) {
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
  const stats = current.stats || {};

  const copyToClipboard = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`Copied ${field}`);
    setTimeout(() => setCopiedField(null), 2000);
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
        <div className="p-4 bg-slate-50 dark:bg-[#0F172A] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {current.profilePhotoUrl ? (
              <img
                src={current.profilePhotoUrl}
                alt={current.fullName || current.name}
                className="w-14 h-14 rounded-2xl object-cover border border-[#E2E8F0] dark:border-[#334155] shadow-xs"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#1E3A8A] to-[#2563EB] text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                {(current.firstName?.[0] || current.fullName?.[0] || current.name?.[0] || 'U').toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                {current.fullName || current.name}
              </h3>
              <p className="text-xs font-mono text-slate-500 dark:text-[#94A3B8] flex items-center gap-1.5 mt-0.5">
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
                <Badge variant={isActive ? 'success' : 'error'} dot className="text-xs font-semibold">
                  {isActive ? 'ACTIVE ACCOUNT' : 'INACTIVE'}
                </Badge>
              </div>
            </div>
          </div>

          {loadingDetails && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 self-start sm:self-center">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2563EB] dark:text-[#60A5FA]" />
              <span>Syncing live stats...</span>
            </div>
          )}
        </div>

        {/* 2. Personal & Contact Information */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
            Personal & Contact Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl">
              <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-1">Ethiopian Name (3 Parts)</span>
              <span className="font-semibold text-slate-900 dark:text-[#F8FAFC]">
                {[current.firstName, current.middleName, current.lastName].filter(Boolean).join(' ') || current.name}
              </span>
            </div>
            <div className="p-3 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-1">Email Address</span>
                <span className="font-semibold text-slate-900 dark:text-[#F8FAFC] truncate block">{current.email}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(current.email, 'Email')}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0F172A] transition-colors"
                title="Copy email"
              >
                {copiedField === 'Email' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="p-3 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-1">Phone Number</span>
                <span className="font-semibold text-slate-900 dark:text-[#F8FAFC] font-mono">
                  {current.phoneNumber || current.phone || 'Not provided'}
                </span>
              </div>
              {(current.phoneNumber || current.phone) && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(current.phoneNumber || current.phone, 'Phone')}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0F172A] transition-colors"
                  title="Copy phone"
                >
                  {copiedField === 'Phone' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Ethiopian Administrative Hierarchy Location */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
            Ethiopian Administrative Hierarchy
          </h4>
          <div className="p-4 bg-slate-50 dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-xs">
            {current.role === 'manager' ? (
              <div className="flex items-center gap-2 text-slate-700 dark:text-[#CBD5E1] font-semibold py-1">
                <Building className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
                <span>Organization-wide Coverage (National / Federal Democratic Republic of Ethiopia)</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-2.5 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg">
                  <span className="text-slate-400 dark:text-slate-500 text-[11px] block">Region</span>
                  <span className="font-bold text-slate-900 dark:text-[#F8FAFC]">{current.region || 'Unassigned'}</span>
                </div>
                <div className="p-2.5 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg">
                  <span className="text-slate-400 dark:text-slate-500 text-[11px] block">Zone / Sub-City</span>
                  <span className="font-bold text-slate-900 dark:text-[#F8FAFC]">{current.zone || 'Unassigned'}</span>
                </div>
                <div className="p-2.5 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg">
                  <span className="text-slate-400 dark:text-slate-500 text-[11px] block">Woreda / Station</span>
                  <span className="font-bold text-slate-900 dark:text-[#F8FAFC]">
                    {current.role === 'supervisor' ? 'All Woredas in Zone' : (current.woreda || 'Unassigned')}
                  </span>
                </div>
                {current.role === 'field_officer' && (
                  <div className="p-2.5 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg sm:col-span-3 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Direct Assigned Supervisor:</span>
                    <span className="font-bold text-[#2563EB] dark:text-[#60A5FA]">
                      {current.supervisorName || current.supervisorId || 'Unassigned'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 4. Relevant Activity Telemetry (if stats exist) */}
        {stats.roleType && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
              Operational Activity Telemetry
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {stats.roleType === 'field_officer' && (
                <>
                  <div className="p-3 bg-blue-50/50 dark:bg-[#0F172A] border border-blue-200/60 dark:border-[#334155] rounded-xl">
                    <span className="text-slate-500 dark:text-[#94A3B8] block text-[11px]">Citizens Registered</span>
                    <span className="text-lg font-bold text-[#2563EB] dark:text-[#60A5FA]">{stats.totalCitizensRegistered ?? 0}</span>
                  </div>
                  <div className="p-3 bg-blue-50/50 dark:bg-[#0F172A] border border-blue-200/60 dark:border-[#334155] rounded-xl">
                    <span className="text-slate-500 dark:text-[#94A3B8] block text-[11px]">Daily Reports</span>
                    <span className="text-lg font-bold text-[#2563EB] dark:text-[#60A5FA]">{stats.totalReportsSubmitted ?? 0}</span>
                  </div>
                  <div className="p-3 bg-blue-50/50 dark:bg-[#0F172A] border border-blue-200/60 dark:border-[#334155] rounded-xl col-span-2 sm:col-span-1">
                    <span className="text-slate-500 dark:text-[#94A3B8] block text-[11px]">Active Screen Time</span>
                    <span className="text-lg font-bold text-[#2563EB] dark:text-[#60A5FA] font-mono">{stats.formattedScreenTime || '00:00:00'}</span>
                  </div>
                </>
              )}
              {stats.roleType === 'supervisor' && (
                <>
                  <div className="p-3 bg-blue-50/50 dark:bg-[#0F172A] border border-blue-200/60 dark:border-[#334155] rounded-xl">
                    <span className="text-slate-500 dark:text-[#94A3B8] block text-[11px]">Supervised Officers</span>
                    <span className="text-lg font-bold text-[#2563EB] dark:text-[#60A5FA]">{stats.assignedOfficersCount ?? 0}</span>
                  </div>
                  <div className="p-3 bg-blue-50/50 dark:bg-[#0F172A] border border-blue-200/60 dark:border-[#334155] rounded-xl">
                    <span className="text-slate-500 dark:text-[#94A3B8] block text-[11px]">Team Daily Reports</span>
                    <span className="text-lg font-bold text-[#2563EB] dark:text-[#60A5FA]">{stats.teamReportsCount ?? 0}</span>
                  </div>
                </>
              )}
              {stats.roleType === 'manager' && (
                <>
                  <div className="p-3 bg-blue-50/50 dark:bg-[#0F172A] border border-blue-200/60 dark:border-[#334155] rounded-xl">
                    <span className="text-slate-500 dark:text-[#94A3B8] block text-[11px]">Total Personnel</span>
                    <span className="text-lg font-bold text-[#2563EB] dark:text-[#60A5FA]">{stats.totalStaffCount ?? 0}</span>
                  </div>
                  <div className="p-3 bg-blue-50/50 dark:bg-[#0F172A] border border-blue-200/60 dark:border-[#334155] rounded-xl">
                    <span className="text-slate-500 dark:text-[#94A3B8] block text-[11px]">National Intake Records</span>
                    <span className="text-lg font-bold text-[#2563EB] dark:text-[#60A5FA]">{stats.totalRegisteredCitizens ?? 0}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 5. Security & Access History */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
            Security & Login History
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl">
              <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-1">Password Status</span>
              {current.mustChangePassword ? (
                <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  Reset Required on Login
                </span>
              ) : (
                <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Active Permanent
                </span>
              )}
            </div>
            <div className="p-3 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl">
              <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-1">Account Created</span>
              <span className="font-semibold text-slate-800 dark:text-[#F8FAFC]">
                {current.createdAt ? new Date(current.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="p-3 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl">
              <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-1">Last Login</span>
              <span className="font-semibold text-slate-800 dark:text-[#F8FAFC]">
                {current.lastLogin ? new Date(current.lastLogin).toLocaleString() : 'Never logged in'}
              </span>
            </div>
          </div>
        </div>

        {/* 6. Manager-Only Administrative Actions */}
        {(onEdit || onReassign || onToggleStatus || onResetPassword) && (
          <div className="p-4 bg-slate-50 dark:bg-[#0F172A] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] space-y-3">
            <h4 className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">
              Manager Actions
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(current)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] hover:border-slate-300 dark:hover:border-slate-500 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              )}
              {onReassign && current.role !== 'manager' && (
                <button
                  type="button"
                  onClick={() => onReassign(current)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] bg-white dark:bg-[#1E293B] border border-blue-200 dark:border-blue-900 hover:border-blue-300 dark:hover:border-blue-700 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Reassign Workstation</span>
                </button>
              )}
              {onResetPassword && (
                <button
                  type="button"
                  onClick={() => onResetPassword(current)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-400 bg-white dark:bg-[#1E293B] border border-amber-200 dark:border-amber-900/60 hover:border-amber-300 dark:hover:border-amber-700 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Reset Password</span>
                </button>
              )}
              {onToggleStatus && (
                <button
                  type="button"
                  onClick={() => onToggleStatus(current)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#1E293B] border shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                      : 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
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
        <div className="flex justify-end pt-3 border-t border-[#E2E8F0] dark:border-[#334155]">
          <Button variant="secondary" onClick={onClose} className="dark:bg-[#1E293B] dark:border-[#334155] dark:text-[#F8FAFC]">
            Close Profile
          </Button>
        </div>
      </div>
    </Modal>
  );
}
