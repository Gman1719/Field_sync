import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  UserCheck, 
  MapPin, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2,
  Building2,
  Compass
} from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Badge from '../../components/ui/Badge.tsx';
import StatsCard from '../../components/ui/StatsCard.tsx';
import CreateUserModal from '../../components/users/CreateUserModal.tsx';
import UserService from '../../services/userService.ts';
import GeographicService from '../../services/geographicService.ts';
import { User, Region, Zone } from '../../types/index.ts';

export const UserManagementPage: React.FC = () => {
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // 1. Initial Load of Users and Regions
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await UserService.getUsers();
      setUsers(data);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to load workforce users.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    GeographicService.getRegions()
      .then((data) => setRegions(data))
      .catch((err) => console.error('Failed to load regions:', err));
  }, []);

  // 2. Cascade Zones when Region filter changes
  useEffect(() => {
    if (!selectedRegionId) {
      setZones([]);
      setSelectedZoneId('');
      return;
    }

    GeographicService.getZonesByRegion(selectedRegionId)
      .then((data: Zone[]) => {
        setZones(data);
        setSelectedZoneId('');
      })
      .catch((err: any) => console.error('Failed to load zones for filter:', err));
  }, [selectedRegionId]);

  // 3. User Status Toggle
  const handleToggleStatus = async (targetUser: User) => {
    const newStatus = !targetUser.isActive;
    try {
      setIsUpdatingStatus(targetUser.id);
      await UserService.toggleUserStatus(targetUser.id, newStatus);
      
      // Update locally for instant responsiveness
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, isActive: newStatus } : u))
      );

      setFeedbackMessage({
        type: 'success',
        text: `${targetUser.fullName} has been ${newStatus ? 'activated' : 'deactivated'}.`,
      });

      // Auto dismiss success feedback
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to change account status.',
      });
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // 4. Filter Logic
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (selectedRole && u.role !== selectedRole) return false;

      // Status filter
      if (selectedStatus === 'active' && !u.isActive) return false;
      if (selectedStatus === 'inactive' && u.isActive) return false;

      // Region filter
      if (selectedRegionId && u.regionId !== selectedRegionId) return false;

      // Zone filter
      if (selectedZoneId && u.zoneId !== selectedZoneId) return false;

      // Search Query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = u.fullName.toLowerCase().includes(query);
        const matchesEmail = u.email.toLowerCase().includes(query);
        const matchesPhone = u.phoneNumber ? u.phoneNumber.toLowerCase().includes(query) : false;
        const matchesWoreda = u.woreda?.name.toLowerCase().includes(query) ?? false;
        const matchesKebele = u.kebele?.name.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesWoreda && !matchesKebele) {
          return false;
        }
      }

      return true;
    });
  }, [users, selectedRole, selectedStatus, selectedRegionId, selectedZoneId, searchQuery]);

  // 5. Compute Overview Metrics
  const metrics = useMemo(() => {
    const total = users.length;
    const supervisors = users.filter((u) => u.role === 'SUPERVISOR').length;
    const officers = users.filter((u) => u.role === 'FIELD_OFFICER').length;
    const active = users.filter((u) => u.isActive).length;
    const activePercent = total > 0 ? Math.round((active / total) * 100) : 0;

    return { total, supervisors, officers, active, activePercent };
  }, [users]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedRole('');
    setSelectedRegionId('');
    setSelectedZoneId('');
    setSelectedStatus('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Workforce &amp; User Management
            </h1>
            <Badge variant="purple" size="sm">
              Ethiopia 4-Tier Hierarchy
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Deploy and manage Woreda Supervisors, Kebele Field Officers, and System Administrators.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Register New User
          </Button>
        </div>
      </div>

      {/* Alert / Feedback Notification */}
      {feedbackMessage && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-lg border text-sm transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs font-semibold underline hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Personnel"
          value={metrics.total}
          subtitle="Registered staff accounts"
          icon={<Users className="w-5 h-5" />}
        />
        <StatsCard
          title="Woreda Supervisors"
          value={metrics.supervisors}
          subtitle="Stationed at Woreda level"
          icon={<ShieldCheck className="w-5 h-5" />}
        />
        <StatsCard
          title="Kebele Officers"
          value={metrics.officers}
          subtitle="Stationed at Kebele level"
          icon={<Compass className="w-5 h-5" />}
        />
        <StatsCard
          title="Active Workforce"
          value={`${metrics.activePercent}%`}
          subtitle={`${metrics.active} active accounts`}
          icon={<UserCheck className="w-5 h-5" />}
        />
      </div>

      {/* Filter and Search Bar Card */}
      <Card className="p-4 bg-slate-50/50 border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email, woreda, or kebele..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-2.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">All Roles</option>
              <option value="FIELD_OFFICER">Kebele Field Officer</option>
              <option value="SUPERVISOR">Woreda Supervisor</option>
              <option value="MANAGER">Manager</option>
            </select>

            {/* Region Filter */}
            <select
              value={selectedRegionId}
              onChange={(e) => setSelectedRegionId(e.target.value)}
              className="px-2.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">All Regions</option>
              {regions.map((reg) => (
                <option key={reg.id} value={reg.id}>
                  {reg.name}
                </option>
              ))}
            </select>

            {/* Zone Filter (Cascading) */}
            <select
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              disabled={!selectedRegionId || zones.length === 0}
              className="px-2.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">
                {!selectedRegionId ? 'Select Region 1st' : zones.length === 0 ? 'No Zones' : 'All Zones'}
              </option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {(searchQuery || selectedRole || selectedRegionId || selectedZoneId || selectedStatus) && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-medium text-slate-500 hover:text-emerald-600 transition-colors whitespace-nowrap self-center"
            >
              Reset Filters
            </button>
          )}
        </div>
      </Card>

      {/* Workforce Table Card */}
      <Card className="overflow-hidden border-slate-200 p-0 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                <th className="py-3 px-4">Personnel</th>
                <th className="py-3 px-4">Role &amp; Jurisdiction</th>
                <th className="py-3 px-4">Administrative Station</th>
                <th className="py-3 px-4">Direct Supervisor</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span className="text-xs font-medium text-slate-500">
                      Loading personnel directory...
                    </span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No personnel found</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {users.length === 0
                        ? 'No user accounts have been registered yet.'
                        : 'No accounts match the current filter criteria.'}
                    </p>
                    {users.length === 0 ? (
                      <Button
                        variant="primary"
                        size="sm"
                        className="mt-4"
                        onClick={() => setIsCreateModalOpen(true)}
                        leftIcon={<UserPlus className="w-4 h-4" />}
                      >
                        Register First User
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={handleResetFilters}
                      >
                        Clear Filter
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  // Initials for avatar
                  const initials = u.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  // Role badge color & label
                  let roleBadgeVariant: 'purple' | 'info' | 'success' = 'info';
                  let roleLabel = 'Field Officer';
                  if (u.role === 'MANAGER') {
                    roleBadgeVariant = 'purple';
                    roleLabel = 'Manager';
                  } else if (u.role === 'SUPERVISOR') {
                    roleBadgeVariant = 'info';
                    roleLabel = 'Woreda Supervisor';
                  } else if (u.role === 'FIELD_OFFICER') {
                    roleBadgeVariant = 'success';
                    roleLabel = 'Kebele Field Officer';
                  }

                  const isCurrentUpdating = isUpdatingStatus === u.id;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Column 1: Personnel Profile */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              u.role === 'MANAGER'
                                ? 'bg-purple-100 text-purple-700'
                                : u.role === 'SUPERVISOR'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {u.fullName}
                            </div>
                            <div className="text-xs text-slate-500 truncate">{u.email}</div>
                            {u.phoneNumber && (
                              <div className="text-[11px] text-slate-400 truncate">
                                {u.phoneNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Role */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <Badge variant={roleBadgeVariant} size="sm">
                            {roleLabel}
                          </Badge>
                          {u.region && (
                            <div className="text-xs text-slate-600 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span>{u.region.name}</span>
                              {u.zone && (
                                <span className="text-slate-400">&bull; {u.zone.name}</span>
                              )}
                            </div>
                          )}
                          {!u.region && (
                            <div className="text-xs text-slate-400 italic">
                              National HQ / Unrestricted
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Column 3: Administrative Station */}
                      <td className="py-3.5 px-4">
                        {u.role === 'SUPERVISOR' ? (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                            <div>
                              <div className="font-medium text-xs text-slate-900">
                                {u.woreda?.name || 'Unassigned Woreda'}
                              </div>
                              <div className="text-[11px] text-blue-600 font-medium">
                                Level: Woreda Head
                              </div>
                            </div>
                          </div>
                        ) : u.role === 'FIELD_OFFICER' ? (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                            <div>
                              <div className="font-medium text-xs text-slate-900">
                                {u.kebele?.name || 'Unassigned Kebele'}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Woreda: {u.woreda?.name || 'N/A'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Headquarters Level
                          </span>
                        )}
                      </td>

                      {/* Column 4: Supervisor */}
                      <td className="py-3.5 px-4">
                        {u.role === 'FIELD_OFFICER' ? (
                          u.supervisor ? (
                            <div className="text-xs">
                              <div className="font-medium text-slate-800">
                                {u.supervisor.fullName}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {u.supervisor.email || 'Assigned Supervisor'}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              Unassigned
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-slate-400">&mdash;</span>
                        )}
                      </td>

                      {/* Column 5: Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {u.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      {/* Column 6: Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant={u.isActive ? 'outline' : 'secondary'}
                          size="sm"
                          disabled={isCurrentUpdating || u.role === 'MANAGER'}
                          isLoading={isCurrentUpdating}
                          onClick={() => handleToggleStatus(u)}
                          className={u.isActive ? 'hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200' : ''}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Summary */}
        <div className="p-3.5 bg-slate-50/75 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{filteredUsers.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{users.length}</span> personnel accounts
          </div>
          <div className="text-[11px] text-slate-400">
            FieldSync Role-Based Access Control &bull; PostgreSQL Enforced
          </div>
        </div>
      </Card>

      {/* Modal for Creating New User */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={() => {
          setIsCreateModalOpen(false);
          fetchUsers();
          setFeedbackMessage({
            type: 'success',
            text: 'New user account successfully created and stationed.',
          });
          setTimeout(() => setFeedbackMessage(null), 5000);
        }}
      />
    </div>
  );
};

export default UserManagementPage;
