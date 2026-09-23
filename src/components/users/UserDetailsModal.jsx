// src/components/users/UserDetailsModal.jsx
// View Full Details of User Account, Ethiopian Hierarchy Assignment & Manager Actions

import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, ShieldCheck, MapPin, Building,
  Home, Calendar, Clock, KeyRound, CheckCircle2, XCircle,
  FileText, Users, Smartphone, Edit3, Power, RefreshCw
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Account & Profile Details"
      size="lg"
    >
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-4">
            {current.profilePhotoUrl ? (
              <img
                src={current.profilePhotoUrl}
                alt={current.fullName || current.name}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-xs"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#1E3A8A] text-white flex items-center justify-center font-bold text-xl shadow-xs">
                {(current.firstName?.[0] || current.fullName?.[0] || current.name?.[0] || 'U').toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">
                {current.fullName || current.name}
              </h3>
              <p className="text-xs font-mono text-slate-500">
                User ID: {current.id}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge
                  variant={current.role === 'manager' ? 'primary' : current.role === 'supervisor' ? 'info' : 'neutral'}
                  className="capitalize"
                >
                  {current.role?.replace('_', ' ')}
                </Badge>
                <Badge variant={isActive ? 'success' : 'error'} dot>
                  {isActive ? 'ACTIVE ACCOUNT' : 'INACTIVE'}
                </Badge>
              </div>
            </div>
          </div>

          {loadingDetails && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#1E3A8A]" />
              <span>Updating live stats...</span>
            </div>
          )}
        </div>

        {/* Contact & Personal Information */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Contact & Personal Details
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 block mb-0.5">First / Middle / Last</span>
              <span className="font-semibold text-slate-800">
                {[current.firstName, current.middleName, current.lastName].filter(Boolean).join(' ') || current.name}
              </span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 block mb-0.5">Email Address</span>
              <span className="font-semibold text-slate-800 break-all">{current.email}</span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 block mb-0.5">Phone Number</span>
              <span className="font-semibold text-slate-800">{current.phoneNumber || current.phone || 'Not provided'}</span>
            </div>
          </div>
        </div>

        {/* Ethiopian Location Assignment Hierarchy */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Ethiopian Administrative Assignment
          </h4>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            {current.role === 'manager' ? (
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <Building className="w-4 h-4 text-[#1E3A8A]" />
                <span>Organization-wide Coverage (National / All 14 Regions)</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#1E3A8A]" />
                    Region:
                  </span>
                  <span className="font-semibold text-slate-900">{current.region || 'Unassigned'}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#1E3A8A]" />
                    Zone / Sub-City:
                  </span>
                  <span className="font-semibold text-slate-900">{current.zone || 'Unassigned'}</span>
                </div>
                {current.role === 'field_officer' && (
                  <>
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-[#1E3A8A]" />
                        Woreda:
                      </span>
                      <span className="font-semibold text-slate-900">{current.woreda || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#1E3A8A]" />
                        Direct Supervisor:
                      </span>
                      <span className="font-semibold text-slate-900">
                        {current.supervisorName || (current.supervisorId ? current.supervisorId : 'Unassigned')}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Relevant Activity Statistics */}
        {stats.roleType && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Work & Performance Telemetry
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {stats.roleType === 'field_officer' && (
                <>
                  <div className="p-3 bg-blue-50/50 border border-blue-200/70 rounded-xl">
                    <span className="text-slate-500 block mb-0.5">Citizens Registered</span>
                    <span className="text-lg font-bold text-[#1E3A8A]">{stats.totalCitizensRegistered ?? 0}</span>
                  </div>
                  <div className="p-3 bg-blue-50/50 border border-blue-200/70 rounded-xl">
                    <span className="text-slate-500 block mb-0.5">Daily Reports</span>
                    <span className="text-lg font-bold text-[#1E3A8A]">{stats.totalReportsSubmitted ?? 0}</span>
                  </div>
                  <div className="p-3 bg-blue-50/50 border border-blue-200/70 rounded-xl col-span-2 sm:col-span-1">
                    <span className="text-slate-500 block mb-0.5">Screen Time</span>
                    <span className="text-lg font-bold text-[#1E3A8A] font-mono">{stats.formattedScreenTime || '00:00:00'}</span>
                  </div>
                </>
              )}
              {stats.roleType === 'supervisor' && (
                <>
                  <div className="p-3 bg-blue-50/50 border border-blue-200/70 rounded-xl">
                    <span className="text-slate-500 block mb-0.5">Supervised Officers</span>
                    <span className="text-lg font-bold text-[#1E3A8A]">{stats.assignedOfficersCount ?? 0}</span>
                  </div>
                  <div className="p-3 bg-blue-50/50 border border-blue-200/70 rounded-xl">
                    <span className="text-slate-500 block mb-0.5">Team Daily Reports</span>
                    <span className="text-lg font-bold text-[#1E3A8A]">{stats.teamReportsCount ?? 0}</span>
                  </div>
                </>
              )}
              {stats.roleType === 'manager' && (
                <>
                  <div className="p-3 bg-blue-50/50 border border-blue-200/70 rounded-xl">
                    <span className="text-slate-500 block mb-0.5">Total Staff</span>
                    <span className="text-lg font-bold text-[#1E3A8A]">{stats.totalStaffCount ?? 0}</span>
                  </div>
                  <div className="p-3 bg-blue-50/50 border border-blue-200/70 rounded-xl">
                    <span className="text-slate-500 block mb-0.5">National Citizens</span>
                    <span className="text-lg font-bold text-[#1E3A8A]">{stats.totalRegisteredCitizens ?? 0}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Security & Access History */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Security & Login History
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 block mb-0.5">Password Change Status</span>
              {current.mustChangePassword ? (
                <span className="text-amber-700 font-semibold flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  Reset Required on Next Login
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Active Permanent Password
                </span>
              )}
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 block mb-0.5">Account Created</span>
              <span className="font-semibold text-slate-800">
                {current.createdAt ? new Date(current.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 block mb-0.5">Last Login</span>
              <span className="font-semibold text-slate-800">
                {current.lastLogin ? new Date(current.lastLogin).toLocaleString() : 'Never logged in'}
              </span>
            </div>
          </div>
        </div>

        {/* Manager-Only Administrative Actions */}
        {(onEdit || onReassign || onToggleStatus || onResetPassword) && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Manager Administrative Actions
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(current)}
                  icon={Edit3}
                >
                  Edit User
                </Button>
              )}
              {onReassign && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReassign(current)}
                  icon={MapPin}
                >
                  Reassign Location
                </Button>
              )}
              {onToggleStatus && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onToggleStatus(current)}
                  icon={Power}
                  className={isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}
                >
                  {isActive ? 'Deactivate Account' : 'Activate Account'}
                </Button>
              )}
              {onResetPassword && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onResetPassword(current)}
                  icon={KeyRound}
                  className="text-indigo-600 hover:bg-indigo-50"
                >
                  Generate Temporary Password
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <Button variant="primary" onClick={onClose}>
            Close Profile
          </Button>
        </div>
      </div>
    </Modal>
  );
}
