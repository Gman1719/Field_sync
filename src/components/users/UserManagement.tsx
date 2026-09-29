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

export default function UserManagement({
  users = [],
  setUsers,
  addNotification
}) {
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

  // 3. Extract unique regions for filter dropdown
  const availableRegions = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => {
      if (u.region && u.region !== 'Organization-wide') {
        set.add(u.region);
      }
    });
    return Array.from(set).sort();
  }, [users]);

  // 4. Filtered User List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
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

    if (!newUser.firstName.trim()) errs.firstName = 'First name is required';
    else if (/[0-9]/.test(newUser.firstName)) errs.firstName = 'First name cannot contain numbers';

    if (newUser.middleName && /[0-9]/.test(newUser.middleName)) {
      errs.middleName = 'Middle name cannot contain numbers';
    }

    if (newUser.lastName && /[0-9]/.test(newUser.lastName)) {
      errs.lastName = 'Last name cannot contain numbers';
    }

    // Require at least one secondary name (Father or Grandfather)
    if (!newUser.middleName?.trim() && !newUser.lastName?.trim()) {
      errs.middleName = 'Father name or last name is required';
    }

    if (!newUser.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
      errs.email = 'Invalid email address format';
    }

    if (newUser.phone && newUser.phone.trim()) {
      const phoneRes = validateEthiopianPhone(newUser.phone.trim(), false);
      if (phoneRes && !phoneRes.isValid) {
        errs.phone = phoneRes.message || 'Invalid Ethiopian phone format';
      }
    }

    // Role-specific location rules
    if (newUser.role === 'supervisor') {
      if (!newUser.regionId) errs.regionId = 'Region is required for Supervisors';
    } else if (newUser.role === 'field_officer') {
      if (!newUser.regionId) errs.regionId = 'Region is required for Field Officers';
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
      toast.error('Please resolve validation errors in the form.');
      return;
    }

    const emailExists = users.some(u => u && u.email && u.email.toLowerCase() === newUser.email.trim().toLowerCase());
    if (emailExists) {
      toast.error('A user with this email address already exists');
      return;
    }

    setIsSubmitting(true);
    let createdUser: any = null;
    let temporaryPassword: any = null;

    try {
      const token = localStorage.getItem('fieldsync_token');
      const payload = {
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
        const id = crypto.randomUUID();
        const genTempPass = `FieldSync#${Math.floor(1000 + Math.random() * 9000)}!`;
        temporaryPassword = genTempPass;
        const fullName = [newUser.firstName, newUser.middleName, newUser.lastName].filter(Boolean).join(' ');

        createdUser = {
          id,
          employeeId: `EMP-${Math.floor(10000 + Math.random() * 90000)}`,
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

      toast.success('User account created successfully!');
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
      toast.error(err.message || 'Could not create user account');
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

    if (!window.confirm(`Are you sure you want to ${actionName} ${displayName}'s account?`)) {
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

      toast.success(`User ${actionName}d successfully`);
      fetchStats();
    } catch (err: any) {
      console.error('Status toggle error:', err);
      toast.error('Failed to change status: ' + (err.message || 'Unknown error'));
    }
  };

  // 8. Handle Password Reset
  const handleResetPassword = async (user) => {
    if (!window.confirm(`Reset password for ${user.name}? A new temporary password will be generated and required to change on next login.`)) {
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

      toast.success('Password reset successfully');
      setTempPasswordModalData({
        userName: user.name || user.fullName,
        userEmail: user.email,
        tempPassword: tempPassword,
      });
    } catch (err) {
      console.error('Reset error:', err);
      toast.error('Failed to reset password: ' + err.message);
    }
  };

  // 9. Callback when user is updated in Edit or Reassign modals
  const handleUserUpdated = (updatedUser) => {
    if (setUsers) {
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    }
    if (selectedUserDetails && selectedUserDetails.id === updatedUser.id) {
      setSelectedUserDetails(updatedUser);
    }
    fetchStats();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            User & Workstation Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Administer system accounts, assign Ethiopian administrative hierarchies, and oversee role permissions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => {
              setNewUser(initialFormState);
              setFormErrors({});
              setShowAddModal(true);
            }}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold h-10 px-4 rounded-xl shadow-sm shadow-blue-600/20 text-xs sm:text-sm"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create User
          </Button>
        </div>
      </div>

      {/* 2. Summary KPI Metrics (6 Evenly Spaced Cards - Responsive on click, No Icons) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
        <StatCard
          label="Total Personnel"
          value={stats.totalUsers}
          variant="primary"
          subtitle="All staff records"
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
          label="Active Accounts"
          value={stats.activeUsers}
          variant="success"
          subtitle="Operational"
          active={statusFilter === 'active' && roleFilter === 'all' && specialFilter === 'all'}
          onClick={() => {
            setStatusFilter(prev => prev === 'active' && roleFilter === 'all' ? 'all' : 'active');
            setRoleFilter('all');
            setSpecialFilter('all');
          }}
        />
        <StatCard
          label="Field Officers"
          value={stats.fieldOfficers}
          variant="neutral"
          subtitle="Frontline agents"
          active={roleFilter === 'field_officer' && specialFilter === 'all'}
          onClick={() => {
            setRoleFilter(prev => prev === 'field_officer' && specialFilter === 'all' ? 'all' : 'field_officer');
            setStatusFilter('all');
            setSpecialFilter('all');
          }}
        />
        <StatCard
          label="Supervisors"
          value={stats.supervisors}
          variant="info"
          subtitle="Zonal oversight"
          active={roleFilter === 'supervisor' && specialFilter === 'all'}
          onClick={() => {
            setRoleFilter(prev => prev === 'supervisor' ? 'all' : 'supervisor');
            setStatusFilter('all');
            setSpecialFilter('all');
          }}
        />
        <StatCard
          label="Managers"
          value={stats.managers}
          variant="primary"
          subtitle="Command tier"
          active={roleFilter === 'manager' && specialFilter === 'all'}
          onClick={() => {
            setRoleFilter(prev => prev === 'manager' ? 'all' : 'manager');
            setStatusFilter('all');
            setSpecialFilter('all');
          }}
        />
        <StatCard
          label={stats.unassignedFieldOfficers > 0 ? "Unassigned" : "Inactive"}
          value={stats.unassignedFieldOfficers > 0 ? stats.unassignedFieldOfficers : stats.inactiveUsers}
          variant={stats.unassignedFieldOfficers > 0 ? "warning" : "error"}
          subtitle={stats.unassignedFieldOfficers > 0 ? "Needs assignment" : "Disabled accounts"}
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
              placeholder="Search by staff name, email, employee ID, or location..."
              className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 text-xs sm:text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setSpecialFilter('all');
              }}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer min-w-[130px]"
            >
              <option value="all">All Roles</option>
              <option value="field_officer">Field Officers</option>
              <option value="supervisor">Supervisors</option>
              <option value="manager">Managers</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setSpecialFilter('all');
              }}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer min-w-[130px]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Accounts</option>
              <option value="inactive">Inactive Accounts</option>
            </select>

            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer min-w-[140px]"
            >
              <option value="all">All Regions</option>
              {availableRegions.map((reg) => (
                <option key={reg} value={reg}>{reg}</option>
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
                className="h-9 px-3.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-2xs"
                title="Reset all filters"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Staff Directory Table (Contained Layout, Separate Location Columns) */}
      <Card className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/70 rounded-xl shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              Staff Directory ({filteredUsers.length} records)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Authorized personnel, Ethiopian location hierarchy assignments, and workstation status
            </CardDescription>
          </div>
          {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all' || regionFilter !== 'all' || specialFilter !== 'all') && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              Filtered Records
            </span>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <User className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No staff accounts found</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Try adjusting your search criteria or resetting filters
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 pl-4 sm:pl-6 pr-3">Staff Member</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-3">Region</th>
                    <th className="py-3 px-3">Zone</th>
                    <th className="py-3 px-3">Woreda</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 pr-4 sm:pr-6 pl-3 text-right">Actions</th>
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
                            {u.role?.replace('_', ' ')}
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
                            {u.role === 'manager' ? 'National' : (u.region || '—')}
                          </span>
                        </td>

                        {/* 5. Zone */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {u.role === 'manager' ? 'All Zones' : (u.zone || '—')}
                          </span>
                        </td>

                        {/* 6. Woreda */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {u.role === 'manager' || u.role === 'supervisor' ? 'All Woredas' : (u.woreda || '—')}
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
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        {/* 8. Actions (Detail only) */}
                        <td className="py-3 pr-4 sm:pr-6 pl-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedUserDetails(u)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Add User Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New User"
        size="lg"
      >
        <form onSubmit={handleCreateUser} noValidate className="space-y-6">
          {/* Section 1: Personal Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
              <User className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100 uppercase tracking-wider">
                1. Personal Information (Ethiopian Naming)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="First Name"
                value={newUser.firstName}
                onChange={(e) => setNewUser(p => ({ ...p, firstName: e.target.value }))}
                placeholder="e.g. Almaz"
                required
                error={formErrors.firstName}
              />
              <Input
                label="Middle Name (Father)"
                value={newUser.middleName}
                onChange={(e) => setNewUser(p => ({ ...p, middleName: e.target.value }))}
                placeholder="e.g. Tadesse"
                required
                error={formErrors.middleName}
              />
              <Input
                label="Last Name (Grandfather)"
                value={newUser.lastName}
                onChange={(e) => setNewUser(p => ({ ...p, lastName: e.target.value }))}
                placeholder="e.g. Kebede"
                required
                error={formErrors.lastName}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Email Address"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))}
                placeholder="staff@fieldsync.com"
                required
                error={formErrors.email}
              />
              <Input
                label="Phone Number"
                type="tel"
                value={newUser.phone}
                onChange={(e) => setNewUser(p => ({ ...p, phone: e.target.value }))}
                placeholder="09XXXXXXXX or 07XXXXXXXX"
                helperText="10 digits starting with 09/07 (or +2519/+2517 with 8 digits)"
                error={formErrors.phone}
              />
            </div>
          </div>

          {/* Section 2: Role Details (Work Shift & Department Removed as requested) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
              <ShieldCheck className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100 uppercase tracking-wider">
                2. System Role Assignment
              </h3>
            </div>

            <div>
              <Select
                label="System Role"
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
                <option value="field_officer">Field Officer (Frontline Intake)</option>
                <option value="supervisor">Supervisor (Zonal Oversight)</option>
                <option value="manager">Manager (National Command)</option>
              </Select>
            </div>
          </div>

          {/* Section 3: Ethiopian Administrative Location Assignment */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
              <MapPin className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100 uppercase tracking-wider">
                3. Ethiopian Administrative Hierarchy Assignment
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
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. User Details Modal */}
      <UserDetailsModal
        user={selectedUserDetails}
        isOpen={Boolean(selectedUserDetails)}
        onClose={() => setSelectedUserDetails(null)}
        onEdit={(u) => {
          setSelectedUserDetails(null);
          setSelectedUserEdit(u);
        }}
        onReassign={(u) => {
          setSelectedUserDetails(null);
          setSelectedUserReassign(u);
        }}
        onChangeRole={(u) => {
          setSelectedUserDetails(null);
          setSelectedUserRole(u);
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
      />

      {/* 9. User Role Modal */}
      <UserRoleModal
        user={selectedUserRole}
        isOpen={Boolean(selectedUserRole)}
        onClose={() => setSelectedUserRole(null)}
        onUserUpdated={handleUserUpdated}
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
    </div>
  );
}