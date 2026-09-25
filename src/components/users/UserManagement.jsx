// src/components/users/UserManagement.jsx – Enterprise User & Staff Management Module

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  UserPlus, Search, KeyRound, ShieldCheck, CheckCircle2,
  XCircle, Filter, Power, Mail, Phone, MapPin, User,
  Building, Home, Eye, Edit3, RefreshCw, AlertTriangle, Users
} from 'lucide-react';
import { db, syncQueue, checkRealInternet } from '../../services/database';
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
  const [formErrors, setFormErrors] = useState({});

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
    const set = new Set();
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
    const errs = {};

    if (!newUser.firstName.trim()) errs.firstName = 'First name is required';
    else if (/[0-9]/.test(newUser.firstName)) errs.firstName = 'First name cannot contain numbers';

    if (!newUser.middleName.trim()) errs.middleName = 'Middle name (Father) is required';
    else if (/[0-9]/.test(newUser.middleName)) errs.middleName = 'Middle name cannot contain numbers';

    if (!newUser.lastName.trim()) errs.lastName = 'Last name (Grandfather) is required';
    else if (/[0-9]/.test(newUser.lastName)) errs.lastName = 'Last name cannot contain numbers';

    if (!newUser.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
      errs.email = 'Invalid email address format';
    }

    if (newUser.phone) {
      const phoneErr = validateEthiopianPhone(newUser.phone, false);
      if (phoneErr) errs.phone = phoneErr;
    }

    // Role-specific location rules
    if (newUser.role === 'supervisor') {
      if (!newUser.regionId) errs.regionId = 'Region is required for Supervisors';
      if (!newUser.zoneId) errs.zoneId = 'Zone is required for Supervisors';
    } else if (newUser.role === 'field_officer') {
      if (!newUser.regionId) errs.regionId = 'Region is required for Field Officers';
      if (!newUser.zoneId) errs.zoneId = 'Zone is required for Field Officers';
      if (!newUser.woredaId) errs.woredaId = 'Woreda is required for Field Officers';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // 6. Handle Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!validateNewUser()) {
      toast.error('Please resolve validation errors in the form.');
      return;
    }

    const emailExists = users.some(u => u.email.toLowerCase() === newUser.email.trim().toLowerCase());
    if (emailExists) {
      toast.error('A user with this email address already exists');
      return;
    }

    setIsSubmitting(true);
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

      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to create user');
      }

      const createdUser = resData.user || resData.data;
      const temporaryPassword = resData.temporaryPassword || resData.data?.temporaryPassword;

      // Update state and Dexie DB
      await db.users.put(createdUser);
      if (setUsers) {
        setUsers(prev => [createdUser, ...prev]);
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
    } catch (err) {
      console.error('User creation failed:', err);
      toast.error(err.message || 'Could not create user account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. Handle Status Toggle
  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const actionName = newStatus === 'active' ? 'activate' : 'deactivate';

    if (!window.confirm(`Are you sure you want to ${actionName} ${user.name}'s account?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('fieldsync_token');
      const response = await fetch(`${API_BASE}/users/${user.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || `Failed to ${actionName} user`);
      }

      const updated = resData.user || resData.data;
      await db.users.update(user.id, updated);
      if (setUsers) {
        setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
      }
      if (selectedUserDetails && selectedUserDetails.id === user.id) {
        setSelectedUserDetails(updated);
      }

      toast.success(`User ${actionName}d successfully`);
      fetchStats();
    } catch (err) {
      console.error('Status toggle error:', err);
      toast.error('Failed to change status: ' + err.message);
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
          <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-[#2563EB] dark:text-[#60A5FA]" />
            User & Workstation Management
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">
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
            className="w-full sm:w-auto bg-[#2563EB] hover:bg-blue-700 text-white font-bold h-11 px-5 rounded-xl shadow-md shadow-blue-600/20"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Users
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
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-3.5 sm:p-4 shadow-xs transition-colors duration-200">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by staff name, email, employee ID, or location..."
              className="w-full h-10 pl-9 pr-8 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-slate-50/70 dark:bg-[#0F172A] text-slate-900 dark:text-[#F8FAFC] text-xs sm:text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all"
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
              className="h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all cursor-pointer min-w-[130px]"
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
              className="h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all cursor-pointer min-w-[130px]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Accounts</option>
              <option value="inactive">Inactive Accounts</option>
            </select>

            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all cursor-pointer min-w-[140px]"
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
                className="h-10 px-3 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#0F172A] hover:bg-slate-200 dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-[#334155] transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
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
      <Card className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
              Staff Directory ({filteredUsers.length} records)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
              Authorized personnel, Ethiopian location hierarchy assignments, and workstation status
            </CardDescription>
          </div>
          {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all' || regionFilter !== 'all' || specialFilter !== 'all') && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-900">
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
                  <tr className="bg-slate-50/90 dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#334155] text-xs font-bold text-slate-600 dark:text-slate-200 uppercase tracking-wider">
                    <th className="py-3.5 pl-4 sm:pl-6 pr-3">Staff Member</th>
                    <th className="py-3.5 px-3">Role</th>
                    <th className="py-3.5 px-3">Contact</th>
                    <th className="py-3.5 px-3">Region</th>
                    <th className="py-3.5 px-3">Zone</th>
                    <th className="py-3.5 px-3">Woreda</th>
                    <th className="py-3.5 px-3">Supervisor</th>
                    <th className="py-3.5 px-3 text-center">Status</th>
                    <th className="py-3.5 pr-4 sm:pr-6 pl-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155]">
                  {filteredUsers.map((u, idx) => {
                    const isActive = u.status === 'active';

                    return (
                      <tr
                        key={u.id}
                        className={`transition-colors duration-150 hover:bg-blue-50/20 dark:hover:bg-[#182234]/70 ${
                          idx % 2 === 1 ? 'bg-slate-50/40 dark:bg-[#182234]/30' : 'bg-white dark:bg-[#1E293B]'
                        }`}
                      >
                        {/* 1. Name & ID */}
                        <td className="py-3 pl-4 sm:pl-6 pr-3 whitespace-nowrap">
                          <p className="font-bold text-slate-900 dark:text-[#F8FAFC]">
                            {u.name}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                            {u.employeeId}
                          </p>
                        </td>

                        {/* 2. Role Badge */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {u.role === 'manager' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                              Manager
                            </span>
                          )}
                          {u.role === 'supervisor' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/80 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              <Building className="w-3 h-3 text-[#2563EB] dark:text-blue-400" />
                              Supervisor
                            </span>
                          )}
                          {u.role === 'field_officer' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                              <User className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                              Field Officer
                            </span>
                          )}
                          {u.role !== 'manager' && u.role !== 'supervisor' && u.role !== 'field_officer' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 capitalize">
                              {u.role?.replace('_', ' ')}
                            </span>
                          )}
                        </td>

                        {/* 3. Contact */}
                        <td className="py-3 px-3">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate max-w-[150px]" title={u.email}>
                            {u.email}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                            {u.phone || '—'}
                          </p>
                        </td>

                        {/* 4. Region */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                            {u.role === 'manager' ? 'National' : (u.region || '—')}
                          </span>
                        </td>

                        {/* 5. Zone */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="text-xs text-slate-600 dark:text-slate-300">
                            {u.role === 'manager' ? 'All Zones' : (u.zone || '—')}
                          </span>
                        </td>

                        {/* 6. Woreda */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="text-xs text-slate-600 dark:text-slate-300">
                            {u.role === 'manager' || u.role === 'supervisor' ? 'All Woredas' : (u.woreda || '—')}
                          </span>
                        </td>

                        {/* 7. Supervisor */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {u.role === 'field_officer' ? (
                            u.supervisorName || u.supervisorId ? (
                              <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                {u.supervisorName || u.supervisorId}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                Unassigned
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </td>

                        {/* 8. Status */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* 9. Actions */}
                        <td className="py-3 pr-4 sm:pr-6 pl-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedUserDetails(u)}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0F172A] border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedUserEdit(u)}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0F172A] border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
                              title="Edit Profile"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {u.role !== 'manager' && (
                              <button
                                type="button"
                                onClick={() => setSelectedUserReassign(u)}
                                className="p-1.5 rounded-lg text-[#2563EB] dark:text-[#60A5FA] hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-transparent hover:border-blue-200 dark:hover:border-blue-900 transition-all cursor-pointer"
                                title="Reassign Workstation"
                              >
                                <MapPin className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleResetPassword(u)}
                              className="p-1.5 rounded-lg text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 border border-transparent hover:border-amber-200 dark:hover:border-amber-900 transition-all cursor-pointer"
                              title="Reset Password"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                isActive
                                  ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                              }`}
                              title={isActive ? 'Deactivate Account' : 'Activate Account'}
                            >
                              <Power className="w-3.5 h-3.5" />
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
            <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0] dark:border-[#334155]">
              <User className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider">
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
                type="number"
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
            <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0] dark:border-[#334155]">
              <ShieldCheck className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider">
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
            <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0] dark:border-[#334155]">
              <MapPin className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider">
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
          <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0] dark:border-[#334155]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddModal(false)}
              disabled={isSubmitting}
              className="dark:bg-[#1E293B] dark:border-[#334155] dark:text-[#F8FAFC]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold"
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
        onToggleStatus={(u) => {
          handleToggleStatus(u);
        }}
        onResetPassword={(u) => {
          handleResetPassword(u);
        }}
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

      {/* 9. Temporary Password Modal */}
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