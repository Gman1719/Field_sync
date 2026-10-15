import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  User, Mail, Phone, ShieldCheck, MapPin, Building2,
  Edit3, Power, Copy, Check, KeyRound, Trash2, AlertTriangle, Users,
  Activity, Clock, RefreshCw
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import ErrorBoundary from '../common/ErrorBoundary';
import { API_BASE } from '../../config/api';
import { offlineDb } from '../../db/offlineDb';
import { useUserLanguage } from '../../context/UserLanguageContext';
import { translateText } from '../../services/translationEngine';

interface UserDetailsModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (user: any) => void;
  onReassign?: (user: any) => void;
  onChangeRole?: (user: any) => void;
  onToggleStatus?: (user: any) => Promise<void> | void;
  onDeleteUser?: (user: any) => Promise<void> | void;
  onDelete?: (user: any) => Promise<void> | void;
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
  onDeleteUser,
  onDelete,
  onResetPassword,
  allUsers = [],
}: UserDetailsModalProps) {
  const { userT, language } = useUserLanguage();
  const [userDetails, setUserDetails] = useState<any>(user);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [superviseesList, setSuperviseesList] = useState<any[]>([]);
  const [modalTab, setModalTab] = useState<'profile' | 'activity'>('profile');
  const [userLogs, setUserLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) {
      setUserDetails(null);
      setSuperviseesList([]);
      setUserLogs([]);
      setModalTab('profile');
      return;
    }

    setUserDetails(user);
    setSuperviseesList([]);
    setUserLogs([]);
    setModalTab('profile');

    if (!user.id) return;

    let isMounted = true;
    const fetchFullDetails = async () => {
      setLoadingDetails(true);
      try {
        const token = localStorage.getItem('fieldsync_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch(`${API_BASE}/users/${user.id}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok && isMounted) {
          const resData = await res.json();
          if (resData.success && resData.data) {
            const d = resData.data;
            const normalized = {
              ...d,
              region: typeof d.region === 'object' && d.region ? d.region.name : (d.region || ''),
              regionId: d.regionId || (typeof d.region === 'object' ? d.region?.id : null),
              zone: typeof d.zone === 'object' && d.zone ? d.zone.name : (d.zone || ''),
              zoneId: d.zoneId || (typeof d.zone === 'object' ? d.zone?.id : null),
              woreda: typeof d.woreda === 'object' && d.woreda ? d.woreda.name : (d.woreda || ''),
              woredaId: d.woredaId || (typeof d.woreda === 'object' ? d.woreda?.id : null),
              supervisorName: d.supervisor?.fullName || d.supervisor?.name || d.supervisorName || null,
              phoneNumber: d.phoneNumber || d.phone || null,
              phone: d.phoneNumber || d.phone || null,
              registeredCitizensCount: Number(d.registeredCitizensCount ?? d._count?.registeredCitizens ?? 0),
            };
            setUserDetails((prev: any) => ({ ...(prev || {}), ...normalized }));
          }
        }

        // If user is supervisor, fetch their supervised officers
        const role = (user.role || '').toLowerCase();
        if (role === 'supervisor') {
          const supRes = await fetch(`${API_BASE}/users/${user.id}/supervisees`, {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
          if (supRes.ok && isMounted) {
            const supData = await supRes.json();
            if (supData.success && Array.isArray(supData.data)) {
              setSuperviseesList(supData.data);
            }
          }
        }
      } catch (err: any) {
        console.warn('Could not fetch remote user details, using cached:', err.message);
      } finally {
        if (isMounted) setLoadingDetails(false);
      }
    };

    const fetchUserActivityLogs = async () => {
      setLoadingLogs(true);
      try {
        const token = localStorage.getItem('fieldsync_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch(`${API_BASE}/activity-logs?officerId=${encodeURIComponent(user.id)}&limit=100`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok && isMounted) {
          const resData = await res.json();
          if (resData.success && Array.isArray(resData.data)) {
            setUserLogs(resData.data);
            return;
          }
        }
      } catch (_e) {}

      // Fallback from Dexie cache for this specific user's work
      try {
        const local = await offlineDb.activityLogs
          .filter((l) => l.officerId === user.id || (user.employeeId && l.officerId === user.employeeId))
          .toArray();
        if (isMounted) {
          const sorted = local.sort(
            (a, b) => new Date(b.deviceTimestamp || 0).getTime() - new Date(a.deviceTimestamp || 0).getTime()
          );
          setUserLogs(sorted);
        }
      } catch (_err) {
        if (isMounted) setUserLogs([]);
      } finally {
        if (isMounted) setLoadingLogs(false);
      }
    };

    fetchFullDetails();
    fetchUserActivityLogs();

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const current = userDetails || user;
  const isActive = current.status === 'active' || current.isActive === true;
  const isSupervisor = (current.role || '').toLowerCase() === 'supervisor';

  // Safe string coercion helper to prevent [object Object] or React child crashes
  const getSafeString = (val: any): string => {
    if (val == null) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object') {
      if (typeof val.fullName === 'string') return val.fullName;
      if (typeof val.name === 'string') return val.name;
      if (typeof val.title === 'string') return val.title;
      if (typeof val.email === 'string') return val.email;
    }
    return '';
  };

  const getSafeLocationName = (loc: any): string => {
    if (!loc) return '';
    if (typeof loc === 'string') return loc;
    if (typeof loc === 'object') {
      if (typeof loc.name === 'string') return loc.name;
      if (typeof loc.title === 'string') return loc.title;
      if (typeof loc.label === 'string') return loc.label;
    }
    return '';
  };

  // Compute supervised field officers across server API list and local allUsers state
  const localSupervised = useMemo(() => {
    if (!isSupervisor || !current) return [];
    const supId = current.id != null ? String(current.id) : null;
    const supEmpId = current.employeeId != null ? String(current.employeeId) : null;
    const supEmail = current.email ? String(current.email).toLowerCase() : null;

    const safeUsers = Array.isArray(allUsers) ? allUsers : [];
    return safeUsers.filter((u) => {
      if (!u) return false;
      const role = (u.role || '').toLowerCase();
      if (role !== 'field_officer') return false;

      const oSupId = u.supervisorId != null ? String(u.supervisorId) : null;
      const oSupEmpId = u.supervisorEmployeeId != null ? String(u.supervisorEmployeeId) : null;
      const oSupEmail = u.supervisorEmail ? String(u.supervisorEmail).toLowerCase() : null;

      return (
        Boolean(supId && (oSupId === supId || oSupEmpId === supId)) ||
        Boolean(supEmpId && (oSupId === supEmpId || oSupEmpId === supEmpId)) ||
        Boolean(supEmail && (oSupId === supEmail || oSupEmail === supEmail))
      );
    });
  }, [isSupervisor, current, allUsers]);

  const effectiveSupervisees = Array.isArray(superviseesList) && superviseesList.length > 0 ? superviseesList : (Array.isArray(localSupervised) ? localSupervised : []);
  const hasSupervisedOfficers = isSupervisor && effectiveSupervisees.length > 0;
  const superviseesCount = effectiveSupervisees.length;

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${userT('Copied')} ${userT(field)}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleStatusToggle = async () => {
    if (!onToggleStatus) return;

    // Block deactivating supervisor if they oversee officers
    if (hasSupervisedOfficers && isActive) {
      toast.error(
        userT(
          `Reassignment Required: This Supervisor currently oversees ${superviseesCount} Field Officer(s). You must reassign all Field Officers to other active Supervisors before deactivating this account.`
        ),
        { duration: 6000 }
      );
      return;
    }

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

  const nameParts = [
    getSafeString(current?.firstName),
    getSafeString(current?.middleName),
    getSafeString(current?.lastName),
  ].filter(Boolean);

  const fullName = nameParts.length > 0
    ? nameParts.join(' ')
    : (getSafeString(current?.fullName) || getSafeString(current?.name) || 'User');

  const initial = (fullName.trim()[0] || 'U').toUpperCase();

  const regionDisplay = getSafeLocationName(current?.region);
  const zoneDisplay = getSafeLocationName(current?.zone);
  const woredaDisplay = getSafeLocationName(current?.woreda);
  const supervisorDisplay =
    (typeof current?.supervisor === 'object' && current?.supervisor
      ? (getSafeString(current.supervisor.fullName) || getSafeString(current.supervisor.name))
      : null) ||
    getSafeString(current?.supervisorName) ||
    (current?.supervisorId ? String(current.supervisorId) : null) ||
    (userT ? userT('Unassigned') : 'Unassigned');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={userT('Staff Account & Profile Details')}
      size="lg"
    >
      <ErrorBoundary onReset={onClose} onClose={onClose} fallbackTitle={userT('Unable to render user details modal')}>
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
                    onClick={() => copyToClipboard(String(current.employeeId || current.id || ''), 'Employee ID')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                    title={userT('Copy ID')}
                  >
                    {copiedField === 'Employee ID' ? <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40 capitalize shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {userT(typeof current.role === 'string' ? current.role.replace('_', ' ') : 'Role')}
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
                {(Number(current.registeredCitizensCount || current.registrationsCount || 0) || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
          <button
            type="button"
            onClick={() => setModalTab('profile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              modalTab === 'profile'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{userT('Profile & Jurisdictions')}</span>
          </button>
          <button
            type="button"
            onClick={() => setModalTab('activity')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              modalTab === 'activity'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{userT('Activity Log')}</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 dark:bg-slate-700 text-current font-mono">
              {userLogs.length}
            </span>
          </button>
        </div>

        {modalTab === 'profile' && (
          <>
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
                      {regionDisplay ? userT(regionDisplay) : '—'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">{userT('Zone / Sub-City')}</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">
                      {zoneDisplay ? userT(zoneDisplay) : '—'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">{userT('Woreda / Station')}</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">
                      {current.role === 'supervisor' ? userT('All Woredas') : (woredaDisplay ? userT(woredaDisplay) : '—')}
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
                          {supervisorDisplay}
                        </span>
                      </div>
                    </div>
                    {supervisorDisplay && supervisorDisplay !== userT('Unassigned') && (
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

        {/* 3.5 Supervised Officers Warning Banner (Strict Reassignment Requirement) */}
        {hasSupervisedOfficers && (
          <div className="p-3.5 sm:p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/70 space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                  {userT('Reassignment Required Before Modifications')}
                </span>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                  {userT(
                    `This supervisor currently oversees ${superviseesCount} Field Officer(s). All supervised officers must be reassigned to another active supervisor before changing their role, changing location, deactivating, or deleting this account.`
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-1 pl-7">
              <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 tracking-wider">
                {userT('Supervised Officers')}:
              </span>
              {effectiveSupervisees.map((off: any, idx: number) => (
                <span
                  key={off?.id || off?.employeeId || `sup-off-${idx}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800"
                >
                  <Users className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>{off?.fullName || off?.name || off?.email || 'Field Officer'}</span>
                </span>
              ))}
            </div>
          </div>
        )}

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

            {/* 2. Change Role */}
            {onChangeRole && current.role !== 'manager' && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (hasSupervisedOfficers) {
                    toast.error(
                      userT(
                        `Reassignment Required: This Supervisor currently oversees ${superviseesCount} Field Officer(s). Please reassign all officers to other active supervisors before changing their role.`
                      ),
                      { duration: 6000 }
                    );
                    return;
                  }
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
                  if (hasSupervisedOfficers) {
                    toast.error(
                      userT(
                        `Reassignment Required: This Supervisor currently oversees ${superviseesCount} Field Officer(s). Please reassign all officers to other active supervisors before changing location.`
                      ),
                      { duration: 6000 }
                    );
                    return;
                  }
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

            {/* 5. Deactivate Account / Activate Account */}
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

            {/* 6. Delete User Account (Next to Deactivate Account) */}
            {(onDeleteUser || onDelete) && current.role !== 'manager' && (
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (hasSupervisedOfficers) {
                    toast.error(
                      userT(
                        `Reassignment Required: This Supervisor currently oversees ${superviseesCount} Field Officer(s). You must reassign all officers to another active supervisor before deleting this account.`
                      ),
                      { duration: 6000 }
                    );
                    return;
                  }
                  setIsDeleting(true);
                  try {
                    const deleteFn = onDeleteUser || onDelete;
                    if (deleteFn) {
                      await deleteFn(current);
                    }
                    onClose();
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-300 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800/80 hover:bg-rose-50 dark:hover:bg-rose-900/30 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                title={userT('Permanently Delete User Account')}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>{userT('Delete User')}</span>
              </button>
            )}
          </div>
        </div>
          </>
        )}

        {/* 5. User Activity Log Tab */}
        {modalTab === 'activity' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{userT('Work Activities Logged by This User')}</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">
                {userLogs.length} {userT('total activities')}
              </span>
            </div>

            {loadingLogs ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-xs font-medium">{userT('Loading activity logs...')}</p>
              </div>
            ) : userLogs.length === 0 ? (
              <div className="py-12 text-center bg-slate-50/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {userT('No Work Activities Recorded for This User')}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  {userT('This log strictly displays only actions and submissions performed by this specific user.')}
                </p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {userLogs.map((log: any, logIdx: number) => {
                  const ts = log?.deviceTimestamp || log?.timestamp || log?.createdAt;
                  const parsedDate = ts ? new Date(ts) : null;
                  const isDateValid = parsedDate instanceof Date && !isNaN(parsedDate.getTime());
                  const timeStr = isDateValid
                    ? parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '—';
                  const dateStr = isDateValid
                    ? parsedDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—';

                  const rawDesc = typeof log?.description === 'string' ? log.description : (log?.description ? String(log.description) : '');
                  const translatedDesc = rawDesc ? translateText(rawDesc, language) : userT('Activity logged');

                  return (
                    <div
                      key={log?.id || `log-${logIdx}`}
                      className="p-3 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                            {String(log?.eventType || 'ACTIVITY').replace(/_/g, ' ')}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {dateStr} • {timeStr}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                          {translatedDesc}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                          log?.syncStatus === 'SYNCED'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40'
                        }`}
                      >
                        {log?.syncStatus === 'SYNCED' ? userT('Synced') : userT('Local')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-200/80 dark:border-slate-700/80">
          <Button variant="secondary" onClick={onClose} className="font-semibold px-6 text-sm">
            {userT('Close')}
          </Button>
        </div>
      </div>
      </ErrorBoundary>
    </Modal>
  );
}
