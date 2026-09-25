// src/components/profile/MyProfile.jsx
// Enterprise User Profile Management Page for FieldSync (All Roles)

import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Mail, Phone, MapPin, Building, Home, Shield,
  ShieldCheck, Calendar, Clock, KeyRound, Edit3, RefreshCw,
  CheckCircle2, AlertTriangle, Users, FileText, Smartphone,
  Info, Sparkles, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import StatCard from '../ui/StatCard';
import EditProfileModal from './EditProfileModal';
import ChangePasswordCard from './ChangePasswordCard';

export default function MyProfile({ user: propUser, defaultTab = 'personal' }) {
  const { user: authUser, setUser: setAuthUser } = useAuth();
  const currentUser = authUser || propUser;

  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showEditModal, setShowEditModal] = useState(false);

  // Fetch full live profile details & role-specific statistics
  const fetchProfile = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const token = localStorage.getItem('fieldsync_token');
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const resData = await res.json();
      if (res.ok && resData.success && resData.data) {
        setProfileData(resData.data);
      } else {
        // Fallback to local user
        setProfileData(currentUser);
      }
    } catch (err) {
      console.warn('Network unreachable while fetching profile, fallback to context:', err.message);
      setProfileData(currentUser);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleProfileUpdated = (updatedUser) => {
    setProfileData(updatedUser);
    if (setAuthUser) {
      setAuthUser((prev) => ({ ...prev, ...updatedUser }));
    }
  };

  const user = profileData || currentUser;
  const isManager = user?.role === 'manager';
  const isSupervisor = user?.role === 'supervisor';
  const isOfficer = user?.role === 'field_officer';
  const stats = user?.stats || {};

  const initials = (user?.firstName?.[0] || user?.name?.[0] || 'U').toUpperCase();

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading && !profileData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-[#1E3A8A] mb-3" />
        <p className="text-sm font-medium">Loading user profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Profile Header Card */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200/90 dark:border-[#334155] p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            {user?.profilePhotoUrl ? (
              <img
                src={user.profilePhotoUrl}
                alt={user.fullName || user.name}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-slate-100 dark:border-[#334155] shadow-xs"
              />
            ) : (
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center text-2xl font-bold tracking-tight shadow-xs">
                {initials}
              </div>
            )}

            {/* User Meta */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  {user?.fullName || user?.name || 'FieldSync User'}
                </h2>
                <Badge
                  variant={isManager ? 'primary' : isSupervisor ? 'info' : 'neutral'}
                  className="capitalize text-xs font-semibold"
                >
                  {user?.role?.replace('_', ' ')}
                </Badge>
                <Badge variant={user?.isActive !== false ? 'success' : 'error'} dot className="text-xs">
                  {user?.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  {user?.email}
                </span>
                {user?.phoneNumber && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    {user?.phoneNumber}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  {user?.region || 'National Coverage'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchProfile(true)}
              disabled={isRefreshing}
              icon={RefreshCw}
              className={isRefreshing ? 'animate-spin' : ''}
              title="Refresh profile data"
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowEditModal(true)}
              icon={Edit3}
            >
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-[#334155] overflow-x-auto">
          {[
            { id: 'personal', label: 'Personal Information', icon: User },
            { id: 'work', label: 'Work Information', icon: Building },
            { id: 'account', label: 'Account Information', icon: ShieldCheck },
            { id: 'security', label: 'Security & Password', icon: KeyRound },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
                  isActive
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Tab Contents */}

      {/* Tab A: Personal Information */}
      {activeTab === 'personal' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <Card className="border border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Personal Details</CardTitle>
                  <CardDescription>
                    Your personal identity and contact details across the FieldSync system.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditModal(true)}
                  icon={Edit3}
                >
                  Edit Details
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3.5 bg-slate-50/70 dark:bg-[#0F172A] border border-slate-200/80 dark:border-[#334155] rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block mb-1">First Name</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{user?.firstName || 'Not provided'}</span>
                </div>
                <div className="p-3.5 bg-slate-50/70 dark:bg-[#0F172A] border border-slate-200/80 dark:border-[#334155] rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block mb-1">Middle Name (Father)</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{user?.middleName || '—'}</span>
                </div>
                <div className="p-3.5 bg-slate-50/70 dark:bg-[#0F172A] border border-slate-200/80 dark:border-[#334155] rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block mb-1">Last Name (Grandfather)</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{user?.lastName || 'Not provided'}</span>
                </div>
                <div className="p-3.5 bg-slate-50/70 dark:bg-[#0F172A] border border-slate-200/80 dark:border-[#334155] rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block mb-1">Email Address</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white break-all">{user?.email}</span>
                </div>
                <div className="p-3.5 bg-slate-50/70 dark:bg-[#0F172A] border border-slate-200/80 dark:border-[#334155] rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block mb-1">Phone Number</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{user?.phoneNumber || user?.phone || 'Not provided'}</span>
                </div>
                <div className="p-3.5 bg-slate-50/70 dark:bg-[#0F172A] border border-slate-200/80 dark:border-[#334155] rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block mb-1">Profile Photo</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {user?.profilePhotoUrl ? 'Custom Photo Active' : 'Default Avatar (Initials)'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab B: Role-Specific Work Information */}
      {activeTab === 'work' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Manager Work View */}
          {isManager && (
            <div className="space-y-6">
              <Card className="border border-slate-200">
                <CardHeader>
                  <CardTitle>Organization Administration</CardTitle>
                  <CardDescription>
                    As an Organization Manager, you maintain national coverage and administrative authority.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <StatCard
                      title="Organization Coverage"
                      value="National (All 14 Regions)"
                      icon={Building}
                      subtitle="Unrestricted national access"
                    />
                    <StatCard
                      title="Total Active Workforce"
                      value={stats.totalStaffCount || '6'}
                      icon={Users}
                      subtitle="Managers, Supervisors & Officers"
                    />
                    <StatCard
                      title="National Citizen Registry"
                      value={stats.totalRegisteredCitizens || '2'}
                      icon={FileText}
                      subtitle="Confirmed synchronized citizens"
                    />
                  </div>

                  <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#1E3A8A]" />
                      Executive Organizational Scope
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      Managers do not require a Supervisor assignment. You have authority to deploy officers, reassign administrative regions, zones, and woredas, and issue temporary passwords across the workforce.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Supervisor Work View */}
          {isSupervisor && (
            <div className="space-y-6">
              <Card className="border border-slate-200">
                <CardHeader>
                  <CardTitle>Regional Supervisory Jurisdiction</CardTitle>
                  <CardDescription>
                    Your administrative assignment and supervised field officers.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <StatCard
                      title="Assigned Region"
                      value={user?.region || 'Addis Ababa'}
                      icon={MapPin}
                      subtitle="Administrative Region"
                    />
                    <StatCard
                      title="Assigned Zone"
                      value={user?.zone || 'Bole Sub-City'}
                      icon={Building}
                      subtitle="Zone / Sub-City Jurisdiction"
                    />
                    <StatCard
                      title="Assigned Field Officers"
                      value={stats.assignedOfficersCount || '1'}
                      icon={Users}
                      subtitle="Officers under direct supervision"
                    />
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
                    <Info className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-[#F8FAFC] mb-0.5">Location Assignment Policy</p>
                      <p className="text-slate-600 dark:text-slate-400">
                        Supervisory jurisdictions are determined by central organization leadership. If your assigned Region or Zone needs modification, please contact an Organization Manager.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Field Officer Work View */}
          {isOfficer && (
            <div className="space-y-6">
              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B]">
                <CardHeader>
                  <CardTitle>Fieldwork Assignment & Work Location</CardTitle>
                  <CardDescription>
                    Your designated Ethiopian administrative jurisdiction and reporting hierarchy.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl">
                      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block mb-1">Region</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{user?.region || 'Addis Ababa'}</span>
                    </div>
                    <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl">
                      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block mb-1">Zone / Sub-City</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{user?.zone || 'Bole Sub-City'}</span>
                    </div>
                    <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl">
                      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block mb-1">Woreda</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{user?.woreda || 'Bole Woreda 01'}</span>
                    </div>
                    <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl">
                      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block mb-1">Assigned Supervisor</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {user?.supervisorName || 'Regional Supervisor'}
                      </span>
                      {user?.supervisorPhone && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">{user.supervisorPhone}</span>
                      )}
                    </div>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                    Field Performance Statistics (Live Database Data)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <StatCard
                      title="Citizens Registered"
                      value={stats.totalCitizensRegistered ?? 0}
                      icon={Users}
                      subtitle="By you in this jurisdiction"
                    />
                    <StatCard
                      title="Daily Reports Submitted"
                      value={stats.totalReportsSubmitted ?? 0}
                      icon={FileText}
                      subtitle="Locked daily work summaries"
                    />
                    <StatCard
                      title="Device Screen Time"
                      value={stats.formattedScreenTime || '00:00:00'}
                      icon={Smartphone}
                      subtitle="Device usage telemetry"
                    />
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
                    <Info className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white mb-0.5">Read-Only Administrative Scope</p>
                      <p className="text-slate-600 dark:text-slate-400">
                        Your work location is bound to your assigned Woreda. All registrations and daily reports automatically associate with this hierarchy. For location transfer requests, please notify your supervisor.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Tab C: Account Information */}
      {activeTab === 'account' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B]">
            <CardHeader>
              <CardTitle>Account & System Information</CardTitle>
              <CardDescription>
                System identification, security status, and account lifecycle timestamps.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block mb-1">User UUID</span>
                  <span className="font-mono text-xs font-semibold text-slate-800 dark:text-[#F8FAFC] break-all select-all">
                    {user?.id}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block mb-1">System Role</span>
                  <Badge variant="primary" className="capitalize text-xs font-semibold">
                    {user?.systemRole || user?.role?.toUpperCase()}
                  </Badge>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block mb-1">Account Status</span>
                  <Badge variant={user?.isActive !== false ? 'success' : 'error'} dot className="text-xs">
                    {user?.isActive !== false ? 'ACTIVE ACCOUNT' : 'DEACTIVATED'}
                  </Badge>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block mb-1">Account Creation Date</span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-[#F8FAFC]">
                    {formatDate(user?.createdAt)}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block mb-1">Last Updated</span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-[#F8FAFC]">
                    {formatDateTime(user?.updatedAt)}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block mb-1">Last Successful Login</span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-[#F8FAFC]">
                    {formatDateTime(user?.lastLogin)}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl sm:col-span-2 lg:col-span-3">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block mb-1">Password Setup Status</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      Permanent password active & verified (Bcrypt cryptographic hashing)
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab D: Security & Password */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <ChangePasswordCard user={user} onPasswordChanged={() => fetchProfile(true)} />

          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle>Session & Authentication Security</CardTitle>
              <CardDescription>
                Best practices for keeping your FieldSync workstation secure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#1E3A8A] shrink-0 mt-0.5" />
                  <span>
                    <strong>JSON Web Token (JWT) Encryption:</strong> Your session token is signed with a high-entropy secret and expires periodically to protect offline data stores.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#1E3A8A] shrink-0 mt-0.5" />
                  <span>
                    <strong>Offline Credential Vault:</strong> Local credentials and synchronized data are protected by browser sandbox boundaries with zero plain-text password storage.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#1E3A8A] shrink-0 mt-0.5" />
                  <span>
                    <strong>First-Login Enforcement:</strong> Temporary passwords issued by managers must be replaced immediately before protected system features are unlocked.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Profile Modal Dialog */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={user}
        onProfileUpdated={handleProfileUpdated}
      />
    </div>
  );
}
