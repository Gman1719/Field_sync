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
  }, [users, roleFilter, statusFilter, regionFilter, searchTerm]);

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
      const phoneErr = validateEthiopianPhone(newUser.phone, false, 'Phone format: +2519... or 09...');
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

      toast.success('Staff account provisioned successfully!');
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
      toast.error(err.message || 'Could not provision staff account');
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
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#1E3A8A]" />
            User & Workstation Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
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
            className="w-full sm:w-auto"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Provision Staff Account
          </Button>
        </div>
      </div>

      {/* 2. Summary KPI Metrics (7 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard
          label="Total Staff"
          value={stats.totalUsers}
          icon={Users}
          variant="default"
        />
        <StatCard
          label="Managers"
          value={stats.managers}
          icon={ShieldCheck}
          variant="primary"
        />
        <StatCard
          label="Supervisors"
          value={stats.supervisors}
          icon={Building}
          variant="info"
        />
        <StatCard
          label="Field Officers"
          value={stats.fieldOfficers}
          icon={User}
          variant="neutral"
        />
        <StatCard
          label="Active"
          value={stats.activeUsers}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          label="Inactive"
          value={stats.inactiveUsers}
          icon={XCircle}
          variant="error"
        />
        <StatCard
          label="Unassigned Officers"
          value={stats.unassignedFieldOfficers}
          icon={AlertTriangle}
          variant={stats.unassignedFieldOfficers > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* 3. Filter Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff, ID, zone, email..."
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] transition-all"
              />
            </div>

            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 text-xs"
            >
              <option value="all">All Roles</option>
              <option value="field_officer">Field Officers</option>
              <option value="supervisor">Supervisors</option>
              <option value="manager">Managers</option>
            </Select>

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Accounts</option>
              <option value="inactive">Inactive Accounts</option>
            </Select>

            <Select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="h-10 text-xs"
            >
              <option value="all">All Regions</option>
              {availableRegions.map(reg => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 4. Staff Directory Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">
                Staff Directory ({filteredUsers.length} records)
              </CardTitle>
              <CardDescription>
                System users, Ethiopian location hierarchy assignments, and access status
              </CardDescription>
            </div>
            {/* Note: NO Export Users button as per explicit system requirement */}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <span>No user accounts matching the specified filters</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3.5 pl-6">Staff Member</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Assigned Workstation (Region &gt; Zone &gt; Woreda)</th>
                    <th className="py-3.5 px-4">Supervisor</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(u => {
                    const isActive = u.status === 'active';

                    // Format hierarchy text
                    let locationString = 'Organization-wide';
                    if (u.role === 'supervisor') {
                      locationString = `${u.region || 'Region'} > ${u.zone || 'Zone'}`;
                    } else if (u.role === 'field_officer') {
                      locationString = `${u.region || 'Region'} > ${u.zone || 'Zone'} > ${u.woreda || 'Woreda'}`;
                    }

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Name & ID */}
                        <td className="py-3.5 pl-6">
                          <p className="font-semibold text-slate-900">{u.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{u.employeeId}</p>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          <Badge variant={u.role === 'manager' ? 'primary' : u.role === 'supervisor' ? 'info' : 'neutral'} className="capitalize">
                            {u.role?.replace('_', ' ')}
                          </Badge>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4 text-slate-600">
                          <p className="font-medium">{u.email}</p>
                          <p className="text-[11px] text-slate-400">{u.phone || 'No phone'}</p>
                        </td>

                        {/* Administrative Hierarchy */}
                        <td className="py-3.5 px-4 text-slate-700">
                          {u.role === 'manager' ? (
                            <span className="text-slate-500 italic">Organization-wide</span>
                          ) : (
                            <div className="flex items-center gap-1.5 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />
                              <span className="truncate max-w-[200px]" title={locationString}>
                                {locationString}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Direct Supervisor */}
                        <td className="py-3.5 px-4 text-slate-600">
                          {u.role === 'field_officer' ? (
                            u.supervisorName || u.supervisorId ? (
                              <span className="font-medium text-slate-800">
                                {u.supervisorName || u.supervisorId}
                              </span>
                            ) : (
                              <Badge variant="warning" className="text-[10px]">
                                Unassigned
                              </Badge>
                            )
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <Badge variant={isActive ? 'success' : 'error'} dot>
                            {isActive ? 'ACTIVE' : 'INACTIVE'}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Details */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedUserDetails(u)}
                              className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Details
                            </Button>

                            {/* Edit */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedUserEdit(u)}
                              className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900"
                              title="Edit Profile & Role"
                            >
                              <Edit3 className="w-3.5 h-3.5 mr-1" />
                              Edit
                            </Button>

                            {/* Reassign Workstation (Supervisor or Field Officer) */}
                            {u.role !== 'manager' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedUserReassign(u)}
                                className="h-8 px-2 text-xs text-blue-700 hover:text-blue-900"
                                title="Reassign Workstation"
                              >
                                <MapPin className="w-3.5 h-3.5 mr-1" />
                                Reassign
                              </Button>
                            )}

                            {/* Reset Password */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetPassword(u)}
                              className="h-8 px-2 text-xs text-amber-700 hover:text-amber-900"
                              title="Reset Password"
                            >
                              <KeyRound className="w-3.5 h-3.5 mr-1" />
                              Reset
                            </Button>

                            {/* Status Toggle */}
                            <Button
                              variant={isActive ? 'outline' : 'success'}
                              size="sm"
                              onClick={() => handleToggleStatus(u)}
                              className={`h-8 px-2.5 text-xs ${isActive ? 'text-rose-600 hover:bg-rose-50 border-rose-200' : ''}`}
                            >
                              <Power className="w-3.5 h-3.5 mr-1" />
                              {isActive ? 'Deactivate' : 'Activate'}
                            </Button>
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

      {/* 5. Add User Modal (3 Structured Sections) */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Provision New Staff Account"
        size="lg"
      >
        <form onSubmit={handleCreateUser} noValidate className="space-y-6">
          {/* Section 1: Personal Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <User className="w-4 h-4 text-[#1E3A8A]" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
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
                label="Work Email Address"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))}
                placeholder="staff@fieldsync.com"
                required
                error={formErrors.email}
              />
              <Input
                label="Phone Number"
                value={newUser.phone}
                onChange={(e) => setNewUser(p => ({ ...p, phone: e.target.value }))}
                placeholder="+2519XXXXXXXX"
                helperText="Format: +2519... or 09..."
                error={formErrors.phone}
              />
            </div>
          </div>

          {/* Section 2: Role & Workstation Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-[#1E3A8A]" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                2. System Role & Work Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                <option value="field_officer">Field Officer</option>
                <option value="supervisor">Supervisor</option>
                <option value="manager">Manager</option>
              </Select>

              <Select
                label="Work Shift"
                value={newUser.shift}
                onChange={(e) => setNewUser(p => ({ ...p, shift: e.target.value }))}
              >
                <option value="Day">Day</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
              </Select>

              <Input
                label="Department"
                value={newUser.department}
                onChange={(e) => setNewUser(p => ({ ...p, department: e.target.value }))}
                placeholder="Field Operations"
              />
            </div>
          </div>

          {/* Section 3: Ethiopian Administrative Location Assignment */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-[#1E3A8A]" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
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
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Provision Account & Generate Password
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