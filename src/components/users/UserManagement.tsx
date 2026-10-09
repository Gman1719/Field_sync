import React, { useState, useMemo, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  UserPlus, Search, KeyRound, ShieldCheck, CheckCircle2,
  XCircle, Filter, Power, Mail, Phone, MapPin, User,
  Building, Home, Eye, Edit3, RefreshCw, AlertTriangle, Users
} from 'lucide-react';
import { db, syncQueue, checkRealInternet } from '../../services/database';
import { offlineDb } from '../../db/offlineDb';
import ActivityLogger from '../../services/activityLogger';
import { validateEthiopianPhone } from '../../utils/phoneValidation';
import { API_BASE } from '../../config/api';
import { generateUserId, formatDisplayUserId } from '../../utils/idGenerator';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import StatCard from '../ui/StatCard';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';

import LocationDropdown from './LocationDropdown';
import TempPasswordModal from './TempPasswordModal';
import UserDetailsModal from './UserDetailsModal';
import UserEditModal from './UserEditModal';
import UserReassignModal from './UserReassignModal';
import UserRoleModal from './UserRoleModal';
import { useUserLanguage } from '../../context/UserLanguageContext';

export default function UserManagement({
  users = [],
  setUsers,
  addNotification
}) {
  const { userT } = useUserLanguage();
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [selectedUserEdit, setSelectedUserEdit] = useState(null);
  const [selectedUserReassign, setSelectedUserReassign] = useState(null);
  const [selectedUserRole, setSelectedUserRole] = useState(null);
  const [tempPasswordModalData, setTempPasswordModalData] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [specialFilter, setSpecialFilter] = useState('all'); // 'all' | 'unassigned'

  // Server Stats state
  const [serverStats, setServerStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add User Form State
  const initialFormState = {
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'field_officer',
    shift: 'Day',
    department: 'Field Operations',
    regionId: '',
    zoneId: '',
    woredaId: '',
    supervisorId: ''
  };

  const [newUser, setNewUser] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 1. Fetch live KPI stats and sync with server
  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const token = localStorage.getItem('fieldsync_token');
      const res = await fetch(`${API_BASE}/users/stats`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setServerStats(data.data);
      }
    } catch (err) {
      console.warn('Could not fetch server user stats, using client computation:', err.message);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, users.length]);

  // 2. Computed KPI Stats fallback & live updates
  const stats = useMemo(() => {
    const total = users.length;
    const managers = users.filter(u => u.role === 'manager').length;
    const supervisors = users.filter(u => u.role === 'supervisor').length;
    const fieldOfficers = users.filter(u => u.role === 'field_officer').length;
    const active = users.filter(u => u.status === 'active').length;
    const inactive = users.filter(u => u.status === 'inactive').length;
    const unassignedOfficers = users.filter(
      u => u.role === 'field_officer' && (!u.supervisorId || !u.woredaId)
    ).length;

    return {
      totalUsers: serverStats?.totalUsers ?? total,
      managers: serverStats?.managers ?? managers,
      supervisors: serverStats?.supervisors ?? supervisors,
      fieldOfficers: serverStats?.fieldOfficers ?? fieldOfficers,
      activeUsers: serverStats?.activeUsers ?? active,
      inactiveUsers: serverStats?.inactiveUsers ?? inactive,
      unassignedFieldOfficers: serverStats?.unassignedFieldOfficers ?? unassignedOfficers
    };
  }, [users, serverStats]);

  // Helper to exclude legacy directional mock users
  const isInvalidDirectional = (u: any) => {
    const reg = (u.region || '').trim().toLowerCase();
    const zone = (u.zone || '').trim().toLowerCase();
    const name = (u.name || u.fullName || '').trim().toLowerCase();
    const isDirectionalReg = ['north', 'south', 'east', 'west', 'all'].includes(reg);
    const isZonalDummy = zone.includes('zonal jurisdiction') || reg.includes('organization-wide');
    const isLegacyMockId = /^([so]\d+|m1)$/i.test(u.id) || /^FO00[1-9]/i.test(u.employeeId || '') || /^SUP00[1-9]/i.test(u.employeeId || '');
    const isMockName = ['ብርሃን ገብረእግዚአብሔር', 'ሣህለ ሙሉጌታ', 'ኪዳን ጥላሁን', 'dawit haile mariam'].includes(name);
    return isDirectionalReg || isZonalDummy || isLegacyMockId || isMockName;
  };

  // 3. Extract unique regions for filter dropdown
  const availableRegions = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => {
      if (isInvalidDirectional(u)) return;
      if (u.region && u.region !== 'Organization-wide') {
        set.add(u.region);
      }
    });
    return Array.from(set).sort();
  }, [users]);

  // 4. Filtered User List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (isInvalidDirectional(u)) return false;
      if (specialFilter === 'unassigned') {
        if (u.role !== 'field_officer' || (u.supervisorId && u.woredaId)) return false;
      }
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (regionFilter !== 'all' && u.region !== regionFilter) return false;

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = u.name?.toLowerCase().includes(query);
        const matchesEmail = u.email?.toLowerCase().includes(query);
        const matchesId = u.employeeId?.toLowerCase().includes(query);
        const matchesRegion = u.region?.toLowerCase().includes(query);
        const matchesZone = u.zone?.toLowerCase().includes(query);
        const matchesWoreda = u.woreda?.toLowerCase().includes(query);

        if (!matchesName && !matchesEmail && !matchesId && !matchesRegion && !matchesZone && !matchesWoreda) {
          return false;
        }
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, regionFilter, specialFilter, searchTerm]);

  // 5. Validation for Add User
  const validateNewUser = () => {
    const errs: Record<string, string> = {};

    if (!newUser.firstName.trim()) errs.firstName = userT('First name is required');
    else if (/[0-9]/.test(newUser.firstName)) errs.firstName = userT('First name cannot contain numbers');

    if (newUser.middleName && /[0-9]/.test(newUser.middleName)) {
      errs.middleName = userT('Middle name cannot contain numbers');
    }

    if (newUser.lastName && /[0-9]/.test(newUser.lastName)) {
      errs.lastName = userT('Last name cannot contain numbers');
    }

    // Require at least one secondary name (Father or Grandfather)
    if (!newUser.middleName?.trim() && !newUser.lastName?.trim()) {
      errs.middleName = userT('Father name or last name is required');
    }

    if (!newUser.email.trim()) {
      errs.email = userT('Email address is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
      errs.email = userT('Invalid email address format');
    }

    if (newUser.phone && newUser.phone.trim()) {
      const phoneRes = validateEthiopianPhone(newUser.phone.trim(), false);
      if (phoneRes && !phoneRes.isValid) {
        errs.phone = userT('Invalid Ethiopian phone format');
      }
    }

    // Only Field Officer and Supervisor can be registered; system is limited to a single Manager
    if (newUser.role === 'manager') {
      errs.role = userT('There is only one Manager in the system (manager@fieldsync.com). Additional managers cannot be registered.');
    }

    // Role-specific location rules
    if (newUser.role === 'supervisor') {
      if (!newUser.regionId) errs.regionId = userT('Region is required for Supervisors');
      if (!newUser.zoneId) errs.zoneId = userT('Zone is required for Supervisors');
    } else if (newUser.role === 'field_officer') {
      if (!newUser.regionId) errs.regionId = userT('Region is required for Field Officers');
      if (!newUser.zoneId) errs.zoneId = userT('Zone is required for Field Officers');
      if (!newUser.woredaId) errs.woredaId = userT('Woreda is required for Field Officers');

      // Strict validation: A Field Officer can only be registered, assigned, or transferred to a Woreda
      // if that area has at least one active Supervisor responsible for that Zone.
      if (newUser.zoneId) {
        const zoneSupervisors = users.filter(
          (u) =>
            u &&
            (u.role === 'supervisor' || u.role === 'SUPERVISOR') &&
            (u.status === 'active' || u.isActive !== false) &&
            (u.zoneId === newUser.zoneId || u.zone?.id === newUser.zoneId)
        );
        if (zoneSupervisors.length === 0) {
          errs.zoneId = userT(
            'A Field Officer can only be registered to a Woreda if that area has at least one active Supervisor responsible for that Zone.'
          );
        }
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // 6. Handle Create User
  const handleCreateUser = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (!validateNewUser()) {
      toast.error(userT('Please resolve validation errors in the form.'));
      return;
    }

    const emailExists = users.some(u => u && u.email && u.email.toLowerCase() === newUser.email.trim().toLowerCase());
    if (emailExists) {
      toast.error(userT('A user with this email address already exists'));
      return;
    }

    setIsSubmitting(true);
    let createdUser: any = null;
    let temporaryPassword: any = null;

    try {
      const token = localStorage.getItem('fieldsync_token');
      const customId = generateUserId(newUser.role);
      const payload = {
        id: customId,
        employeeId: customId,
        firstName: newUser.firstName.trim(),
        middleName: newUser.middleName.trim(),
        lastName: newUser.lastName.trim(),
        email: newUser.email.trim(),
        phone: newUser.phone ? newUser.phone.trim() : null,
        phoneNumber: newUser.phone ? newUser.phone.trim() : null,
        role: newUser.role.toUpperCase(),
        shift: newUser.shift,
        department: newUser.department,
        regionId: newUser.regionId || null,
        zoneId: newUser.zoneId || null,
        woredaId: newUser.woredaId || null,
        supervisorId: newUser.supervisorId || null,
      };

      if (navigator.onLine && token) {
        try {
          const response = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const resData = await response.json();
            if (resData.success) {
              createdUser = resData.user || resData.data;
              temporaryPassword = resData.temporaryPassword || resData.data?.temporaryPassword;
            }
          }
        } catch (netErr: any) {
          console.warn('Backend API unreachable, creating user locally in offline database:', netErr.message);
        }
      }

      // If offline or backend didn't respond, create locally with complete schema
      if (!createdUser) {
        const id = customId;
        const genTempPass = `FieldSync#${Math.floor(1000 + Math.random() * 9000)}!`;
        temporaryPassword = genTempPass;
        const fullName = [newUser.firstName, newUser.middleName, newUser.lastName].filter(Boolean).join(' ');

        createdUser = {
          id,
          employeeId: customId,
          firstName: newUser.firstName.trim(),
          middleName: newUser.middleName.trim(),
          lastName: newUser.lastName.trim(),
          fullName,
          name: fullName,
          email: newUser.email.trim(),
          phoneNumber: newUser.phone?.trim() || null,
          phone: newUser.phone?.trim() || null,
          role: newUser.role.toLowerCase(),
          status: 'active',
          isActive: true,
          mustChangePassword: true,
          password: genTempPass,
          passwordHash: genTempPass,
          regionId: newUser.regionId || null,
          region: (newUser as any).region || (newUser as any).regionName || null,
          regionName: (newUser as any).region || (newUser as any).regionName || null,
          zoneId: newUser.zoneId || null,
          zone: (newUser as any).zone || (newUser as any).zoneName || null,
          zoneName: (newUser as any).zone || (newUser as any).zoneName || null,
          woredaId: newUser.woredaId || null,
          woreda: (newUser as any).woreda || (newUser as any).woredaName || null,
          woredaName: (newUser as any).woreda || (newUser as any).woredaName || null,
          supervisorId: newUser.supervisorId || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          synced: false,
        };
      }

      // Update state and Dexie DB
      await db.users.put(createdUser);
      try {
        await offlineDb.users.put(createdUser);
      } catch (_e) {}

      // Log activity
      try {
        await ActivityLogger.log('USER_CREATED', `Created new staff account for ${createdUser.name || createdUser.fullName} (${createdUser.role})`, {
          officerId: 'manager',
          relatedRecordId: createdUser.id,
          metadata: { email: createdUser.email, role: createdUser.role },
        });
      } catch (_e) {}

      if (setUsers) {
        setUsers((prev: any[]) => [createdUser, ...prev]);
      }

      toast.success(userT('User account created successfully!'));
      setShowAddModal(false);
      setNewUser(initialFormState);
      setFormErrors({});

      // Open One-Time Temporary Password Display Modal
      setTempPasswordModalData({
        userName: createdUser.name || createdUser.fullName,
        userEmail: createdUser.email,
        tempPassword: temporaryPassword,
      });

      fetchStats();
    } catch (err: any) {
      console.error('User creation failed:', err);
      toast.error(err.message ? userT(err.message) : userT('Could not create user account'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. Handle Status Toggle
  const handleToggleStatus = async (user) => {
    const isCurrentlyActive = user.status === 'active' || user.isActive;
    const newStatus = isCurrentlyActive ? 'inactive' : 'active';
    const actionName = newStatus === 'active' ? 'activate' : 'deactivate';
    const displayName = user.fullName || user.name || 'User';

    // Validation: prevent deactivating the permanent system manager
    if (user.role === 'manager') {
      toast.error(userT('The System Manager account is permanent and cannot be deactivated.'));
      return;
    }

    // Validation: prevent deactivating a supervisor with assigned field officers
    if (user.role === 'supervisor' && newStatus === 'inactive') {
      const superviseesCount = (users || []).filter(
        (u) => u.supervisorId === user.id && (u.role?.toLowerCase() === 'field_officer' || u.role === 'FIELD_OFFICER')
      ).length;
      if (superviseesCount > 0) {
        toast.error(
          userT('Reassignment Required: This Supervisor currently oversees active Field Officers. Please reassign all Field Officers to other active Supervisors before deactivating this account.'),
          { duration: 6000 }
        );
        setSelectedUserRole(user);
        return;
      }
    }

    const actionLabel = actionName === 'activate' ? userT('Activate Account') : userT('Deactivate Account');
    if (!window.confirm(`${userT('Are you sure you want to')} ${actionLabel} (${displayName})?`)) {
      return;
    }

    let updated = {
      ...user,
      status: newStatus,
      isActive: newStatus === 'active',
      updatedAt: new Date().toISOString()
    };

    try {
      const token = localStorage.getItem('fieldsync_token');
      if (navigator.onLine && token) {
        try {
          const response = await fetch(`${API_BASE}/users/${user.id}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status: newStatus, isActive: newStatus === 'active' }),
          });

          if (response.ok) {
            const resData = await response.json();
            if (resData.success && (resData.user || resData.data)) {
              updated = { ...updated, ...(resData.user || resData.data) };
            }
          }
        } catch (netErr: any) {
          console.warn('Backend API status update failed, saving locally:', netErr.message);
        }
      }

      // Update Dexie database
      try {
        await db.users.put(updated);
        await offlineDb.users.put(updated);
      } catch (_dbErr) {
        try {
          await db.users.update(user.id, updated);
        } catch (_e) {}
      }

      // Update state
      if (setUsers) {
        setUsers((prev: any[]) => prev.map(u => u.id === user.id ? updated : u));
      }
      if (selectedUserDetails && selectedUserDetails.id === user.id) {
        setSelectedUserDetails(updated);
      }

      // Log activity
      try {
        await ActivityLogger.log('USER_STATUS_CHANGE', `${actionName.toUpperCase()} account for ${displayName}`, {
          officerId: 'manager',
          relatedRecordId: user.id,
          metadata: { status: newStatus }
        });
      } catch (_e) {}

      toast.success(
        actionName === 'activate'
          ? userT('User account activated successfully')
          : userT('User account deactivated successfully')
      );
      fetchStats();
    } catch (err: any) {
      console.error('Status toggle error:', err);
      toast.error(`${userT('Failed to change status:')} ${err.message ? userT(err.message) : userT('Unknown error')}`);
    }
  };

  // 8. Handle Password Reset
  const handleResetPassword = async (user) => {
    const displayName = user.fullName || user.name || 'User';
    const confirmResetPrompt = `${userT('Reset Password')} - ${displayName}?\n${userT('A new temporary password will be generated and required to change on next login.')}`;
    if (!window.confirm(confirmResetPrompt)) {
      return;
    }

    try {
      const token = localStorage.getItem('fieldsync_token');
      const response = await fetch(`${API_BASE}/users/${user.id}/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to reset password');
      }

      const tempPassword = resData.temporaryPassword || resData.data?.temporaryPassword;

      // Update local state to require password change
      const updated = { ...user, mustChangePassword: true };
      await db.users.update(user.id, updated);
      if (setUsers) {
        setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
      }
      if (selectedUserDetails && selectedUserDetails.id === user.id) {
        setSelectedUserDetails(prev => ({ ...prev, mustChangePassword: true }));
      }

      toast.success(userT('Password reset successfully'));

      // Log activity
      try {
        await ActivityLogger.log(
          'USER_PASSWORD_RESET',
          `Generated temporary password for ${displayName} (${user.email})`,
          {
            relatedRecordId: user.id,
            metadata: { targetUserId: user.id, email: user.email },
          }
        );
      } catch (_e) {}

      setTempPasswordModalData({
        userName: displayName,
        userEmail: user.email,
        tempPassword: tempPassword,
      });
    } catch (err: any) {
      console.error('Reset error:', err);
      toast.error(`${userT('Failed to reset password:')} ${err.message ? userT(err.message) : userT('Unknown error')}`);
    }
  };

  // 9. Callback when user is updated in Edit, Reassign, or Role modals
  const handleUserUpdated = (
    updatedUser: any,
    transferredOfficerIds: string[] = [],
    newSupervisorId: string | null = null,
    officerTransferMap: Record<string, string> = {}
  ) => {
    if (setUsers) {
      setUsers((prev: any[]) =>
        prev.map((u) => {
          if (u.id === updatedUser.id) return updatedUser;
          if (officerTransferMap && officerTransferMap[u.id]) {
            return { ...u, supervisorId: officerTransferMap[u.id] };
          }
          if (transferredOfficerIds && transferredOfficerIds.includes(u.id) && newSupervisorId) {
            return { ...u, supervisorId: newSupervisorId };
          }
          return u;
        })
      );
    }
    if (selectedUserDetails && selectedUserDetails.id === updatedUser.id) {
      setSelectedUserDetails(updatedUser);
    }
    fetchStats();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Add Action */}
      <div className="flex flex-row items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{userT('Staff & Roles')}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
              {filteredUsers.length}
            </span>
          </h2>
          <p className="hidden sm:block text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {userT('Administer system accounts, assign Ethiopian administrative hierarchies, and oversee role permissions')}
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setNewUser(initialFormState);
            setFormErrors({});
            setShowAddModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold h-9 sm:h-10 px-3 sm:px-4 rounded-xl shadow-sm shadow-blue-600/20 text-xs sm:text-sm shrink-0 flex items-center gap-1.5"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden xs:inline sm:inline">{userT('Create User')}</span>
          <span className="xs:hidden sm:hidden">{userT('Add')}</span>
        </Button>
      </div>

      {/* Mobile-Friendly Horizontal Filter Pills (Visible ONLY on mobile < sm) */}
      <div className="sm:hidden -mx-4 px-4 overflow-x-auto no-scrollbar flex items-center gap-2 py-1">
        <button
          type="button"
          onClick={() => {
            setRoleFilter('all');
            setStatusFilter('all');
            setRegionFilter('all');
            setSpecialFilter('all');
            setSearchTerm('');
          }}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
            roleFilter === 'all' && statusFilter === 'all' && regionFilter === 'all' && specialFilter === 'all' && !searchTerm
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <span>{userT('All')}</span>
          <span className="opacity-80 text-[11px]">({stats.totalUsers})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter(prev => prev === 'active' && roleFilter === 'all' ? 'all' : 'active');
            setRoleFilter('all');
            setSpecialFilter('all');
          }}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
            statusFilter === 'active' && roleFilter === 'all' && specialFilter === 'all'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          <span>{userT('Active')}</span>
          <span className="opacity-80 text-[11px]">({stats.activeUsers})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setRoleFilter(prev => prev === 'field_officer' && specialFilter === 'all' ? 'all' : 'field_officer');
            setStatusFilter('all');
            setSpecialFilter('all');
          }}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
            roleFilter === 'field_officer' && specialFilter === 'all'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <span>{userT('Officers')}</span>
          <span className="opacity-80 text-[11px]">({stats.fieldOfficers})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setRoleFilter(prev => prev === 'supervisor' ? 'all' : 'supervisor');
            setStatusFilter('all');
            setSpecialFilter('all');
          }}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
            roleFilter === 'supervisor' && specialFilter === 'all'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <span>{userT('Supervisors')}</span>
          <span className="opacity-80 text-[11px]">({stats.supervisors})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setRoleFilter(prev => prev === 'manager' ? 'all' : 'manager');
            setStatusFilter('all');
            setSpecialFilter('all');
          }}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
            roleFilter === 'manager' && specialFilter === 'all'
              ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <span>{userT('Managers')}</span>
          <span className="opacity-80 text-[11px]">({stats.managers})</span>
        </button>

        {(stats.unassignedFieldOfficers > 0 || stats.inactiveUsers > 0) && (
          <button
            type="button"
            onClick={() => {
              if (stats.unassignedFieldOfficers > 0) {
                setSpecialFilter(prev => prev === 'unassigned' ? 'all' : 'unassigned');
                setRoleFilter('field_officer');
                setStatusFilter('all');
              } else {
                setStatusFilter(prev => prev === 'inactive' ? 'all' : 'inactive');
                setRoleFilter('all');
                setSpecialFilter('all');
              }
            }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              specialFilter === 'unassigned' || statusFilter === 'inactive'
                ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span>{stats.unassignedFieldOfficers > 0 ? userT('Unassigned') : userT('Inactive')}</span>
            <span className="opacity-80 text-[11px]">({stats.unassignedFieldOfficers > 0 ? stats.unassignedFieldOfficers : stats.inactiveUsers})</span>
          </button>
        )}
      </div>

      {/* 2. Summary KPI Metrics (Hidden on mobile < sm, visible on tablet & desktop sm:) */}
      <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
        <StatCard
          label={userT('Total Personnel')}
          value={stats.totalUsers}
          variant="primary"
          subtitle={userT('All staff records')}
          className="p-3 sm:p-4 lg:p-5"
          active={roleFilter === 'all' && statusFilter === 'all' && regionFilter === 'all' && specialFilter === 'all' && !searchTerm}
          onClick={() => {
            setRoleFilter('all');
            setStatusFilter('all');
            setRegionFilter('all');
            setSpecialFilter('all');
            setSearchTerm('');
          }}
        />
        <StatCard
          label={userT('Active Accounts')}
          value={stats.activeUsers}
          variant="success"
          subtitle={userT('Operational')}
          className="p-3 sm:p-4 lg:p-5"
          active={statusFilter === 'active' && roleFilter === 'all' && specialFilter === 'all'}
          onClick={() => {
            setStatusFilter(prev => prev === 'active' && roleFilter === 'all' ? 'all' : 'active');
            setRoleFilter('all');
            setSpecialFilter('all');
          }}
        />
        <StatCard
          label={userT('Field Officers')}
          value={stats.fieldOfficers}
          variant="neutral"
          subtitle={userT('Frontline agents')}
          className="p-3 sm:p-4 lg:p-5"
          active={roleFilter === 'field_officer' && specialFilter === 'all'}
          onClick={() => {
            setRoleFilter(prev => prev === 'field_officer' && specialFilter === 'all' ? 'all' : 'field_officer');
            setStatusFilter('all');
            setSpecialFilter('all');
          }}
        />
        <StatCard
          label={userT('Supervisors')}
          value={stats.supervisors}
          variant="info"
          subtitle={userT('Zonal oversight')}
          className="p-3 sm:p-4 lg:p-5"
          active={roleFilter === 'supervisor' && specialFilter === 'all'}
          onClick={() => {
            setRoleFilter(prev => prev === 'supervisor' ? 'all' : 'supervisor');
            setStatusFilter('all');
            setSpecialFilter('all');
          }}
        />
        <StatCard
          label={userT('Managers')}
          value={stats.managers}
          variant="primary"
          subtitle={userT('Command tier')}
          className="p-3 sm:p-4 lg:p-5"
          active={roleFilter === 'manager' && specialFilter === 'all'}
          onClick={() => {
            setRoleFilter(prev => prev === 'manager' ? 'all' : 'manager');
            setStatusFilter('all');
            setSpecialFilter('all');
          }}
        />
        <StatCard
          label={stats.unassignedFieldOfficers > 0 ? userT('Unassigned') : userT('Inactive')}
          value={stats.unassignedFieldOfficers > 0 ? stats.unassignedFieldOfficers : stats.inactiveUsers}
          variant={stats.unassignedFieldOfficers > 0 ? "warning" : "error"}
          subtitle={stats.unassignedFieldOfficers > 0 ? userT('Needs assignment') : userT('Disabled accounts')}
          className="p-3 sm:p-4 lg:p-5"
          active={specialFilter === 'unassigned' || (stats.unassignedFieldOfficers === 0 && statusFilter === 'inactive' && roleFilter === 'all')}
          onClick={() => {
            if (stats.unassignedFieldOfficers > 0) {
              setSpecialFilter(prev => prev === 'unassigned' ? 'all' : 'unassigned');
              setRoleFilter('field_officer');
              setStatusFilter('all');
            } else {
              setStatusFilter(prev => prev === 'inactive' ? 'all' : 'inactive');
              setRoleFilter('all');
              setSpecialFilter('all');
            }
          }}
        />
      </div>

      {/* 3. Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700/70 p-3 sm:p-3.5 shadow-xs transition-colors duration-200">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={userT('Search by staff name, email, employee ID, or location...')}
              className="w-full h-10 sm:h-9 pl-9 pr-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 text-xs sm:text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
                title={userT('Clear search')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setSpecialFilter('all');
              }}
              className="h-10 sm:h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer w-full lg:w-auto lg:min-w-[130px]"
            >
              <option value="all">{userT('All Roles')}</option>
              <option value="field_officer">{userT('Field Officers')}</option>
              <option value="supervisor">{userT('Supervisors')}</option>
              <option value="manager">{userT('Managers')}</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setSpecialFilter('all');
              }}
              className="h-10 sm:h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer w-full lg:w-auto lg:min-w-[130px]"
            >
              <option value="all">{userT('All Statuses')}</option>
              <option value="active">{userT('Active Accounts')}</option>
              <option value="inactive">{userT('Inactive Accounts')}</option>
            </select>

            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="h-10 sm:h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer w-full lg:w-auto lg:min-w-[140px]"
            >
              <option value="all">{userT('All Regions')}</option>
              {availableRegions.map((reg) => (
                <option key={reg} value={reg}>{userT(reg)}</option>
              ))}
            </select>

            {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all' || regionFilter !== 'all' || specialFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('all');
                  setStatusFilter('all');
                  setRegionFilter('all');
                  setSpecialFilter('all');
                }}
                className="h-10 sm:h-9 px-3.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer shadow-2xs col-span-1 sm:col-span-3 lg:col-span-1"
                title={userT('Reset all filters')}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{userT('Clear Filters')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Staff Directory Table & Responsive Mobile/Tablet Cards */}
      <Card className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/70 rounded-xl shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              {userT('Staff Directory')} ({filteredUsers.length} {userT('records')})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {userT('Authorized personnel, Ethiopian location hierarchy assignments, and workstation status')}
            </CardDescription>
          </div>
          {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all' || regionFilter !== 'all' || specialFilter !== 'all') && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-900 self-start sm:self-auto">
              {userT('Filtered Records')}
            </span>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <User className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{userT('No staff accounts found')}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {userT('Try adjusting your search criteria or resetting filters')}
              </p>
            </div>
          ) : (
            <>
              {/* ============================================================== */}
              {/* MOBILE & TABLET CARD VIEW (Visible on < lg screens)           */}
              {/* ============================================================== */}
              <div className="block lg:hidden divide-y divide-slate-100 dark:divide-slate-700/60 p-3 sm:p-4 space-y-3">
                {filteredUsers.map((u) => {
                  const isActive = u.status === 'active';
                  const initials = (u.name || u.fullName || 'FS')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n: string) => n[0].toUpperCase())
                    .join('');

                  return (
                    <div
                      key={u.id}
                      className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/70 shadow-2xs space-y-3 hover:border-blue-300 dark:hover:border-slate-600 transition-all"
                    >
                      {/* Top: Avatar, Name, Employee ID & Status Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            u.role === 'manager'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                              : u.role === 'supervisor'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                          }`}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                              {u.name}
                            </h4>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {u.employeeId}
                            </span>
                          </div>
                        </div>

                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          {isActive ? userT('Active') : userT('Inactive')}
                        </span>
                      </div>

                      {/* Role and Location Badge */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          u.role === 'manager'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30'
                            : u.role === 'supervisor'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30'
                            : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}>
                          {userT(u.role?.replace('_', ' '))}
                        </span>

                        <div className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {u.role === 'manager'
                              ? userT('National Overview (All Regions)')
                              : [u.region ? userT(u.region) : null, u.zone ? userT(u.zone) : null, u.woreda ? userT(u.woreda) : null]
                                  .filter(Boolean)
                                  .join(' • ') || '—'}
                          </span>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/50 rounded-lg p-2.5 border border-slate-100 dark:border-slate-700/40">
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate font-medium text-slate-700 dark:text-slate-300">{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-2 font-mono">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{u.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedUserDetails(u)}
                          className="w-full py-2.5 px-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{userT('View Details & Manage')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ============================================================== */}
              {/* DESKTOP TABLE VIEW (Visible on >= lg screens)                 */}
              {/* ============================================================== */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-3 pl-4 sm:pl-6 pr-3">{userT('Staff Member')}</th>
                      <th className="py-3 px-3">{userT('Role')}</th>
                      <th className="py-3 px-3">{userT('Contact')}</th>
                      <th className="py-3 px-3">{userT('Region')}</th>
                      <th className="py-3 px-3">{userT('Zone')}</th>
                      <th className="py-3 px-3">{userT('Woreda')}</th>
                      <th className="py-3 px-3 text-center">{userT('Status')}</th>
                      <th className="py-3 pr-4 sm:pr-6 pl-3 text-right">{userT('Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {filteredUsers.map((u, idx) => {
                      const isActive = u.status === 'active';

                      return (
                        <tr
                          key={u.id}
                          className={`transition-colors ${
                            idx % 2 === 1
                              ? 'bg-slate-50/40 dark:bg-slate-800/30 hover:bg-slate-100/60 dark:hover:bg-slate-700/40'
                              : 'bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                          }`}
                        >
                          {/* 1. Name & ID */}
                          <td className="py-3 pl-4 sm:pl-6 pr-3 whitespace-nowrap">
                            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {u.name}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {u.employeeId}
                            </p>
                          </td>

                          {/* 2. Role */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                              u.role === 'manager'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30'
                                : u.role === 'supervisor'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30'
                                : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            }`}>
                              {userT(u.role?.replace('_', ' '))}
                            </span>
                          </td>

                          {/* 3. Contact */}
                          <td className="py-3 px-3">
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate max-w-[150px]" title={u.email}>
                              {u.email}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              {u.phone || '—'}
                            </p>
                          </td>

                          {/* 4. Region */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {u.role === 'manager' ? userT('National') : (u.region ? userT(u.region) : '—')}
                            </span>
                          </td>

                          {/* 5. Zone */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              {u.role === 'manager' ? userT('All Zones') : (u.zone ? userT(u.zone) : '—')}
                            </span>
                          </td>

                          {/* 6. Woreda */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              {u.role === 'manager' || u.role === 'supervisor' ? userT('All Woredas') : (u.woreda ? userT(u.woreda) : '—')}
                            </span>
                          </td>

                          {/* 7. Status */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'
                                : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {isActive ? userT('Active') : userT('Inactive')}
                            </span>
                          </td>

                          {/* 8. Actions */}
                          <td className="py-3 pr-4 sm:pr-6 pl-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => setSelectedUserDetails(u)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer shadow-xs active:scale-95"
                              >
                                {userT('Detail')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 5. Add User Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={userT('Add New User')}
        size="lg"
      >
        <form onSubmit={handleCreateUser} noValidate className="space-y-6">
          {/* Section 1: Personal Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
              <User className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100 uppercase tracking-wider">
                {userT('1. Personal Information (Ethiopian Naming)')}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label={userT('First Name')}
                value={newUser.firstName}
                onChange={(e) => setNewUser(p => ({ ...p, firstName: e.target.value }))}
                placeholder={userT('e.g. Almaz')}
                required
                error={formErrors.firstName ? userT(formErrors.firstName) : undefined}
              />
              <Input
                label={userT('Middle Name (Father)')}
                value={newUser.middleName}
                onChange={(e) => setNewUser(p => ({ ...p, middleName: e.target.value }))}
                placeholder={userT('e.g. Tadesse')}
                required
                error={formErrors.middleName ? userT(formErrors.middleName) : undefined}
              />
              <Input
                label={userT('Last Name (Grandfather)')}
                value={newUser.lastName}
                onChange={(e) => setNewUser(p => ({ ...p, lastName: e.target.value }))}
                placeholder={userT('e.g. Kebede')}
                required
                error={formErrors.lastName ? userT(formErrors.lastName) : undefined}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={userT('Email Address')}
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))}
                placeholder="staff@fieldsync.com"
                required
                error={formErrors.email ? userT(formErrors.email) : undefined}
              />
              <Input
                label={userT('Phone Number')}
                type="tel"
                value={newUser.phone}
                onChange={(e) => setNewUser(p => ({ ...p, phone: e.target.value }))}
                placeholder={userT('09XXXXXXXX or 07XXXXXXXX')}
                helperText={userT('10 digits starting with 09/07 (or +2519/+2517 with 8 digits)')}
                error={formErrors.phone ? userT(formErrors.phone) : undefined}
              />
            </div>
          </div>

          {/* Section 2: Role Details (Work Shift & Department Removed as requested) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
              <ShieldCheck className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100 uppercase tracking-wider">
                {userT('2. System Role Assignment')}
              </h3>
            </div>

            <div>
              <Select
                label={userT('System Role')}
                value={newUser.role}
                onChange={(e) => setNewUser(p => ({
                  ...p,
                  role: e.target.value,
                  regionId: '',
                  zoneId: '',
                  woredaId: '',
                  supervisorId: ''
                }))}
                required
              >
                <option value="field_officer">{userT('Field Officer (Frontline Intake)')}</option>
                <option value="supervisor">{userT('Supervisor (Zonal Oversight)')}</option>
              </Select>
            </div>
          </div>

          {/* Section 3: Ethiopian Administrative Location Assignment */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
              <MapPin className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100 uppercase tracking-wider">
                {userT('3. Ethiopian Administrative Hierarchy Assignment')}
              </h3>
            </div>

            <LocationDropdown
              role={newUser.role}
              regionId={newUser.regionId}
              zoneId={newUser.zoneId}
              woredaId={newUser.woredaId}
              supervisorId={newUser.supervisorId}
              onChange={(locationValues) => {
                setNewUser(p => ({ ...p, ...locationValues }));
                setFormErrors(prev => {
                  const cleaned = { ...prev };
                  delete cleaned.regionId;
                  delete cleaned.zoneId;
                  delete cleaned.woredaId;
                  return cleaned;
                });
              }}
              errors={formErrors}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddModal(false)}
              disabled={isSubmitting}
              className="dark:bg-slate-700 dark:hover:bg-slate-600 dark:border-slate-600 dark:text-slate-100"
            >
              {userT('Cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {userT('Create User')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. User Details Modal */}
      <UserDetailsModal
        user={selectedUserDetails}
        isOpen={Boolean(selectedUserDetails)}
        onClose={() => setSelectedUserDetails(null)}
        allUsers={users}
        onEdit={(u) => {
          const target = u || selectedUserDetails;
          setSelectedUserDetails(null);
          setTimeout(() => {
            setSelectedUserEdit(target);
          }, 50);
        }}
        onChangeRole={(u) => {
          const target = u || selectedUserDetails;
          setSelectedUserDetails(null);
          setTimeout(() => {
            setSelectedUserRole(target);
          }, 50);
        }}
        onReassign={(u) => {
          const target = u || selectedUserDetails;
          setSelectedUserDetails(null);
          setTimeout(() => {
            setSelectedUserReassign(target);
          }, 50);
        }}
        onToggleStatus={(u) => {
          handleToggleStatus(u);
        }}
        onResetPassword={(u) => {
          handleResetPassword(u);
        }}
        onUserUpdated={handleUserUpdated}
      />

      {/* 7. User Edit Modal */}
      <UserEditModal
        user={selectedUserEdit}
        isOpen={Boolean(selectedUserEdit)}
        onClose={() => setSelectedUserEdit(null)}
        onUserUpdated={handleUserUpdated}
      />

      {/* 8. User Reassign Modal */}
      <UserReassignModal
        user={selectedUserReassign}
        isOpen={Boolean(selectedUserReassign)}
        onClose={() => setSelectedUserReassign(null)}
        onUserUpdated={handleUserUpdated}
        allUsers={users}
      />

      {/* 9. User Role Modal */}
      <UserRoleModal
        user={selectedUserRole}
        isOpen={Boolean(selectedUserRole)}
        onClose={() => setSelectedUserRole(null)}
        onUserUpdated={handleUserUpdated}
        allUsers={users}
      />

      {/* 10. Temporary Password Modal */}
      {tempPasswordModalData && (
        <TempPasswordModal
          userName={tempPasswordModalData.userName}
          userEmail={tempPasswordModalData.userEmail}
          tempPassword={tempPasswordModalData.tempPassword}
          onClose={() => setTempPasswordModalData(null)}
        />
      )}

      {/* 11. Mobile Floating Action Button (FAB) for quick add */}
      <button
        type="button"
        onClick={() => {
          setNewUser(initialFormState);
          setFormErrors({});
          setShowAddModal(true);
        }}
        aria-label={userT('Create User')}
        className="sm:hidden fixed bottom-20 right-4 z-20 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-lg shadow-blue-600/40 flex items-center justify-center transition-all focus:outline-none"
      >
        <UserPlus className="w-5 h-5" />
      </button>
    </div>
  );
}