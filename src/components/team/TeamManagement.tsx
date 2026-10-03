// Displays personnel grouped into operational area teams or directly assigned field officers for supervisors
// Zone-scoped access, real-time live status, performance metrics, and officer inspection

import React, { useState, useMemo } from 'react';
import {
  Users, Search, UserCheck, Radio, FileText,
  Award, ShieldCheck, MapPin, CheckCircle2, AlertCircle,
  Eye, Phone, Mail, Clock, Building, User, ChevronRight,
  AlertTriangle, Filter, RefreshCw, LayoutGrid, List,
  Smartphone, Activity, CheckCircle, HelpCircle,
  Copy, Check
} from 'lucide-react';
import { getToday } from '../../utils/helpers';
import { formatEthiopianPhone } from '../../utils/phoneUtils';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import StatCard from '../ui/StatCard';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { useUserLanguage } from '../../context/UserLanguageContext';

const REAL_ETHIOPIAN_REGIONS = [
  'Addis Ababa',
  'Afar',
  'Amhara',
  'Benishangul-Gumuz',
  'Central Ethiopia',
  'Dire Dawa',
  'Gambela',
  'Harari',
  'Oromia',
  'Sidama',
  'Somali',
  'South Ethiopia',
  'South West Ethiopia Peoples',
  'Tigray',
];

export default function TeamManagement({
  users = [],
  user,
  isManager,
  isSupervisor,
  teamMembers = [],
  reports = [],
  attendance = [],
  screenTime = [],
  liveStatus = [],
  employeePerformance = [],
  citizens = []
}: any) {
  const { userT } = useUserLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState('All');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'ONLINE', 'ACTIVE'
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [selectedOfficer, setSelectedOfficer] = useState<any>(null);
  const [liveOfficerData, setLiveOfficerData] = useState<any[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  React.useEffect(() => {
    if (!isSupervisor) return;
    let isMounted = true;
    const fetchLiveOfficers = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('fieldsync_token') || sessionStorage.getItem('token');
        const res = await fetch('/api/work-monitoring/officers', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && isMounted) {
            setLiveOfficerData(json.data);
          }
        }
      } catch (_e) {
        // Fallback gracefully
      }
    };
    fetchLiveOfficers();
    const interval = setInterval(fetchLiveOfficers, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isSupervisor]);

  // 1. Determine Supervisor's Dedicated Officers
  const supervisorOfficers = useMemo(() => {
    if (!isSupervisor) return [];

    let baseOfficers: any[] = [];
    if (teamMembers && teamMembers.length > 0) {
      baseOfficers = teamMembers;
    } else {
      baseOfficers = users.filter((u: any) => {
        if (u.role !== 'field_officer') return false;
        const directMatch =
          (user?.id && (u.supervisorId === user.id || u.supervisor_id === user.id)) ||
          (user?.name && u.supervisorName === user.name) ||
          (user?.employeeId && u.supervisorEmployeeId === user.employeeId);

        const zoneMatch =
          user?.zone && u.zone && u.zone.toLowerCase() === user.zone.toLowerCase();

        const woredaMatch =
          user?.woreda && u.woreda && u.woreda.toLowerCase() === user.woreda.toLowerCase();

        return directMatch || zoneMatch || woredaMatch;
      });
    }

    return baseOfficers.map((off: any) => {
      const live = liveOfficerData.find((l: any) => l.id === off.id);
      return live ? { ...off, ...live } : off;
    });
  }, [isSupervisor, teamMembers, users, user, liveOfficerData]);

  // Filtered supervisor officers list
  const filteredSupervisorOfficers = useMemo(() => {
    return supervisorOfficers.filter((off: any) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (off.name || off.fullName || '').toLowerCase().includes(q) ||
        (off.employeeId || '').toLowerCase().includes(q) ||
        (off.woreda || '').toLowerCase().includes(q) ||
        (off.kebele || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const isOnline = (liveStatus || []).some(
        (l: any) => (l.employeeId === off.employeeId || l.userId === off.id) && l.status === 'online'
      );

      if (statusFilter === 'ONLINE' && !isOnline) return false;
      if (statusFilter === 'ACTIVE' && off.status !== 'active') return false;

      return true;
    });
  }, [supervisorOfficers, searchTerm, statusFilter, liveStatus]);

  // 2. Manager Multi-Team Groups
  const teams = useMemo(() => {
    if (isSupervisor) return [];

    const supervisors = users.filter((u: any) => u.role === 'supervisor');
    const officers = users.filter((u: any) => u.role === 'field_officer');

    const teamList: any[] = [];
    const assignedOfficerIds = new Set<string>();
    const supervisorOfficersMap = new Map<string, any[]>();

    supervisors.forEach((sup: any) => {
      const supKey = String(sup.id || sup.employeeId);
      supervisorOfficersMap.set(supKey, []);
    });

    // Pass 1: Direct matches (by ID, employeeId, name, or assignedSupervisorId)
    officers.forEach((o: any) => {
      const directSup = supervisors.find((sup: any) => {
        const supId = sup.id != null ? String(sup.id) : null;
        const supEmpId = sup.employeeId != null ? String(sup.employeeId) : null;
        const oSupId = o.supervisorId != null ? String(o.supervisorId) : null;
        const oSupIdAlt = o.supervisor_id != null ? String(o.supervisor_id) : null;
        const oSupEmpId = o.supervisorEmployeeId != null ? String(o.supervisorEmployeeId) : null;
        const oAssignedSupId = o.assignedSupervisorId != null ? String(o.assignedSupervisorId) : null;

        const idMatch =
          Boolean(supId && (oSupId === supId || oSupIdAlt === supId || oAssignedSupId === supId)) ||
          Boolean(supEmpId && (oSupId === supEmpId || oSupIdAlt === supEmpId || oSupEmpId === supEmpId || oAssignedSupId === supEmpId));

        const supName = (sup.name || sup.fullName || '').trim().toLowerCase();
        const oSupName = (o.supervisorName || o.supervisor_name || (o.supervisor && (o.supervisor.name || o.supervisor.fullName)) || '').trim().toLowerCase();
        const nameMatch = Boolean(supName && oSupName && (supName === oSupName || supName.includes(oSupName) || oSupName.includes(supName)));

        return idMatch || nameMatch;
      });

      if (directSup) {
        const supKey = String(directSup.id || directSup.employeeId);
        supervisorOfficersMap.get(supKey)?.push(o);
        assignedOfficerIds.add(String(o.id || o.employeeId));
      }
    });

    // Pass 2: Geographic matching for any officer without a direct supervisor match
    officers.forEach((o: any) => {
      const oKey = String(o.id || o.employeeId);
      if (assignedOfficerIds.has(oKey)) return;

      const areaSup = supervisors.find((sup: any) => {
        const oZone = (o.zone || '').trim().toLowerCase();
        const supZone = (sup.zone || '').trim().toLowerCase();
        const oRegion = (o.region || '').trim().toLowerCase();
        const supRegion = (sup.region || '').trim().toLowerCase();

        const zoneMatch = Boolean(oZone && supZone && oZone === supZone);
        const regionMatch = Boolean(oRegion && supRegion && oRegion === supRegion);

        return zoneMatch || (regionMatch && (!oZone || !supZone));
      });

      if (areaSup) {
        const supKey = String(areaSup.id || areaSup.employeeId);
        supervisorOfficersMap.get(supKey)?.push(o);
        assignedOfficerIds.add(oKey);
      }
    });

    supervisors.forEach((sup: any) => {
      const supKey = String(sup.id || sup.employeeId);
      const teamOfficers = supervisorOfficersMap.get(supKey) || [];

      const totalRegs = citizens.filter((c: any) =>
        teamOfficers.some((o: any) => o.employeeId === c.registeredBy || o.id === c.registeredById || o.id === c.registeredBy) ||
        sup.employeeId === c.registeredBy || sup.id === c.registeredBy
      ).length;

      const totalReps = reports.filter((r: any) =>
        teamOfficers.some((o: any) => o.employeeId === r.employeeId || o.id === r.userId) ||
        sup.employeeId === r.employeeId
      ).length;

      const activeOfficers = teamOfficers.filter((o: any) => o.status === 'active').length;
      const onlineOfficers = (liveStatus || []).filter((l: any) =>
        teamOfficers.some((o: any) => o.employeeId === l.employeeId || o.id === l.userId) && l.status === 'online'
      ).length;

      teamList.push({
        id: `team-${sup.id || sup.employeeId}`,
        name: `${sup.zone || sup.region || 'Zonal'} Operations Team`,
        region: sup.region || 'Organization-wide',
        zone: sup.zone || 'Zonal Jurisdiction',
        woreda: sup.woreda || '',
        supervisor: sup,
        officers: teamOfficers,
        stats: {
          officersCount: teamOfficers.length,
          activeOfficers,
          onlineOfficers,
          totalRegistrations: totalRegs,
          totalReports: totalReps,
          isSupervisorOnline: (liveStatus || []).some(
            (l: any) => (l.employeeId === sup.employeeId || l.userId === sup.id) && l.status === 'online'
          ),
        }
      });
    });

    // Frontline officers pool
    const unassignedOfficers = officers.filter((o: any) => !assignedOfficerIds.has(String(o.id || o.employeeId)));
    if (unassignedOfficers.length > 0) {
      teamList.push({
        id: 'unassigned-team',
        name: 'Frontline Officers Pool',
        region: 'Regional Scope',
        zone: 'General Field',
        woreda: 'Multiple',
        supervisor: null,
        officers: unassignedOfficers,
        stats: {
          officersCount: unassignedOfficers.length,
          activeOfficers: unassignedOfficers.filter((o: any) => o.status === 'active').length,
          onlineOfficers: (liveStatus || []).filter((l: any) =>
            unassignedOfficers.some((o: any) => o.employeeId === l.employeeId || o.id === l.userId) && l.status === 'online'
          ).length,
          totalRegistrations: 0,
          totalReports: 0,
          isSupervisorOnline: false,
        }
      });
    }

    return teamList;
  }, [isSupervisor, users, citizens, reports, liveStatus]);

  const filteredTeams = useMemo(() => {
    return teams.filter((t: any) => {
      if (filterRegion !== 'All' && t.region && !t.region.toLowerCase().includes(filterRegion.toLowerCase())) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          (t.zone || '').toLowerCase().includes(q) ||
          (t.supervisor?.name || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [teams, filterRegion, searchTerm]);

  // Today string
  const todayStr = getToday();

  // Helper for officer stats
  const getOfficerStats = (officer: any) => {
    const fromProps = citizens.filter((c: any) =>
      c.registeredById === officer.id ||
      c.registeredBy === officer.id ||
      (officer.employeeId && (c.registeredBy === officer.employeeId || c.registeredById === officer.employeeId))
    ).length;

    const fromOfficerObj =
      officer.registeredCitizensCount ??
      officer._count?.registeredCitizens ??
      officer.stats?.totalCitizensRegistered ??
      officer.stats?.citizenCount ??
      0;

    const regCount = Math.max(fromProps, fromOfficerObj);

    const todayReport = reports.find((r: any) =>
      (r.employeeId === officer.employeeId || r.officerId === officer.id || r.userId === officer.id) &&
      r.reportDate === todayStr
    );

    const isOnline = (liveStatus || []).some(
      (l: any) => (l.employeeId === officer.employeeId || l.userId === officer.id) && l.status === 'online'
    );

    return { regCount, todayReport, isOnline };
  };

  const renderOfficerDetailModal = () => {
    if (!selectedOfficer) return null;
    const { isOnline } = getOfficerStats(selectedOfficer);
    const initials = ((selectedOfficer.name || selectedOfficer.fullName || 'FO')[0] || 'O').toUpperCase();
    const directSupervisor =
      selectedOfficer.supervisorName ||
      selectedOfficer.supervisor?.name ||
      selectedTeam?.supervisor?.name ||
      (users.find((u: any) => u.id === selectedOfficer.supervisorId || u.id === selectedOfficer.assignedSupervisorId)?.name) ||
      'Zonal Field Supervisor';

    const officerId = selectedOfficer.employeeId || selectedOfficer.id || 'N/A';

    return (
      <Modal
        isOpen={!!selectedOfficer}
        onClose={() => setSelectedOfficer(null)}
        title={userT('Field Officer Profile & Operational Information')}
        size="lg"
      >
        <div className="space-y-5 text-xs">
          {/* 1. Profile Header Banner */}
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#1E3A8A] to-[#2563EB] text-white flex items-center justify-center font-extrabold text-xl shadow-md shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  {selectedOfficer.name || selectedOfficer.fullName}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs font-mono font-bold text-[#2563EB] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/80 px-2 py-0.5 rounded-md">
                    ID: {officerId}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="primary" className="text-[10px] font-semibold">
                    {userT('Field Officer')}
                  </Badge>
                  <Badge variant={isOnline ? 'success' : 'neutral'} dot className="text-[10px] font-semibold">
                    {isOnline ? userT('Online Now') : userT('Offline')}
                  </Badge>
                  <Badge variant={selectedOfficer.status === 'active' ? 'success' : 'neutral'} className="text-[10px] font-semibold">
                    {selectedOfficer.status ? userT(String(selectedOfficer.status).toUpperCase()) : userT('Active')}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Personal & Contact Information */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
              {userT('Personal & Contact Details')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                <span className="text-slate-400 dark:text-slate-400 block text-[11px] mb-1">{userT('Ethiopian Name')}</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {[selectedOfficer.firstName, selectedOfficer.middleName, selectedOfficer.lastName].filter(Boolean).join(' ') || selectedOfficer.name || selectedOfficer.fullName}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <span className="text-slate-400 dark:text-slate-400 block text-[11px] mb-1">{userT('Phone Number')}</span>
                  <span className="font-semibold text-slate-900 dark:text-white font-mono truncate block">
                    {formatEthiopianPhone(selectedOfficer.phone) || userT('Not provided')}
                  </span>
                </div>
                {selectedOfficer.phone && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedOfficer.phone, 'Phone')}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title={userT('Copy Phone')}
                  >
                    {copiedField === 'Phone' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <span className="text-slate-400 dark:text-slate-400 block text-[11px] mb-1">{userT('Email Address')}</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate block">
                    {selectedOfficer.email || userT('Not provided')}
                  </span>
                </div>
                {selectedOfficer.email && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedOfficer.email, 'Email')}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title={userT('Copy Email')}
                  >
                    {copiedField === 'Email' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3. Jurisdictional & Administrative Station */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
              {userT('Administrative Deployment & Hierarchy')}
            </h4>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <span className="text-slate-400 dark:text-slate-400 text-[11px] block">{userT('Region')}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedOfficer.region || selectedTeam?.region || userT('Unassigned')}</span>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <span className="text-slate-400 dark:text-slate-400 text-[11px] block">{userT('Zone / Sub-City')}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedOfficer.zone || selectedTeam?.zone || userT('Unassigned')}</span>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <span className="text-slate-400 dark:text-slate-400 text-[11px] block">{userT('Woreda / Field Station')}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedOfficer.woreda || userT('Assigned Station')}</span>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:col-span-3 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 dark:text-slate-400 text-[11px] block">{userT('Direct Assigned Lead Supervisor')}</span>
                    <span className="font-bold text-[#2563EB] dark:text-blue-400">
                      {directSupervisor}
                    </span>
                  </div>
                  <Badge variant="neutral" className="text-[10px]">{userT('Supervisor Lead')}</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    );
  };

  // ==========================================
  // SUPERVISOR VIEW: ONLY THEIR ASSIGNED OFFICERS
  // ==========================================
  if (isSupervisor) {
    const totalOfficers = supervisorOfficers.length;
    const onlineCount = supervisorOfficers.filter((o: any) => {
      return (liveStatus || []).some((l: any) => (l.employeeId === o.employeeId || l.userId === o.id) && l.status === 'online');
    }).length;
    const activeCount = supervisorOfficers.filter((o: any) => o.status === 'active').length;
    const totalCitizens = supervisorOfficers.reduce((acc: number, o: any) => acc + getOfficerStats(o).regCount, 0);

    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/60 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-500 border border-blue-200 dark:border-blue-900/40">
                {userT('Supervisor Field Team')}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {(user?.zone && user.zone !== 'Unassigned') ? user.zone : ((user?.region && user.region !== 'Unassigned') ? user.region : userT('Assigned Zone'))}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">
              {userT('Team')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {userT('Direct field officers assigned to your operational unit')}
            </p>
          </div>

          {/* Quick Controls: View Mode & Search */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/60 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-500 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
                title={userT('Cards Layout')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-500 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
                title={userT('Table Layout')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/60 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              {userT('Assigned Officers')}
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {totalOfficers}
              </span>
              <span className="text-xs text-slate-400">{userT('Personnel')}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/60 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              {userT('Online Now')}
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {onlineCount}
              </span>
              <span className="text-xs text-slate-400">{userT('Connected')}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/60 shadow-xs">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              {userT('Active Status')}
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-600 dark:text-blue-500 font-mono">
                {activeCount}
              </span>
              <span className="text-xs text-slate-400">{userT('Active')}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/60 shadow-xs">
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
              {userT('Citizens Registered')}
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
                {totalCitizens.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">{userT('Total')}</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm dark:shadow-slate-950/20">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-300 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={userT('Search officer by name, ID, or woreda...')}
              className="w-full pl-10 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-200 border border-transparent dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {userT('All')} ({supervisorOfficers.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ONLINE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                statusFilter === 'ONLINE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-200 border border-transparent dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {userT('Online')} ({onlineCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                statusFilter === 'ACTIVE'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-200 border border-transparent dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {userT('Active')} ({activeCount})
            </button>
          </div>
        </div>

        {/* Officers Presentation */}
        {filteredSupervisorOfficers.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 p-6">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{userT('No Field Officers Found')}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'ALL'
                ? userT('Try adjusting your search query or status filter.')
                : userT('No field officers have been assigned to your supervision zone yet.')}
            </p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSupervisorOfficers.map((officer: any) => {
              const { regCount, todayReport, isOnline } = getOfficerStats(officer);
              const initials = ((officer.name || officer.fullName || 'FO')[0] || 'O').toUpperCase();

              return (
                <div
                  key={officer.id || officer.employeeId}
                  className="rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-slate-950/40 hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col justify-between overflow-hidden p-5"
                >
                  {/* Top: Avatar, Name & Live Status */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                            {initials}
                          </div>
                          <span
                            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 ${
                              isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                            title={isOnline ? userT('Online') : userT('Offline')}
                          />
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {officer.name || officer.fullName}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-400 font-mono mt-0.5">
                            <span>ID: {officer.id || officer.employeeId}</span>
                          </div>
                        </div>
                      </div>

                      <Badge
                        variant={isOnline ? 'success' : 'neutral'}
                        dot
                        className="text-[10px] shrink-0 font-medium"
                      >
                        {isOnline ? userT('Online') : userT('Offline')}
                      </Badge>
                    </div>

                    {/* Location Row - Kebele removed per user request */}
                    <div className="mt-3.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-700 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">
                        {officer.woreda && officer.woreda !== 'Unassigned'
                          ? officer.woreda
                          : (officer.zone && officer.zone !== 'Unassigned' ? officer.zone : userT('Field Station'))}
                      </span>
                    </div>

                    {/* Performance Row */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-700 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400 block tracking-wider">
                          {userT('Citizens Registered')}
                        </span>
                        <span className="text-sm font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
                          {regCount}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-700 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400 block tracking-wider">
                          {userT('Daily Report')}
                        </span>
                        <div className="mt-0.5 flex items-center justify-center gap-1">
                          {todayReport ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle className="w-3.5 h-3.5" />
                              {userT('Submitted')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                              <Clock className="w-3.5 h-3.5" />
                              {userT('Pending')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {officer.phone && (
                        <a
                          href={`tel:${officer.phone}`}
                          className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          title={`${userT('Call')} ${officer.phone}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {officer.email && (
                        <a
                          href={`mailto:${officer.email}`}
                          className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          title={`${userT('Email')} ${officer.email}`}
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedOfficer(officer)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-bold text-white transition-all cursor-pointer shadow-xs"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{userT('Detail')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table Layout */
          <div className="rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/60 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">{userT('Officer')}</th>
                    <th className="py-3 px-4">{userT('Woreda Station')}</th>
                    <th className="py-3 px-4">{userT('Status')}</th>
                    <th className="py-3 px-4 text-center">{userT('Registrations')}</th>
                    <th className="py-3 px-4 text-center">{userT('Daily Report')}</th>
                    <th className="py-3 px-4 text-right">{userT('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredSupervisorOfficers.map((officer: any) => {
                    const { regCount, todayReport, isOnline } = getOfficerStats(officer);
                    return (
                      <tr
                        key={officer.id || officer.employeeId}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                              }`}
                            />
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {officer.name || officer.fullName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ID: {officer.id || officer.employeeId}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {officer.woreda && officer.woreda !== 'Unassigned' ? officer.woreda : (officer.zone && officer.zone !== 'Unassigned' ? officer.zone : userT('Assigned Station'))}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={isOnline ? 'success' : 'neutral'}
                            className="text-[10px]"
                          >
                            {isOnline ? userT('Online') : userT('Offline')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center font-bold font-mono text-slate-900 dark:text-white">
                          {regCount}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {todayReport ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                              <CheckCircle className="w-3.5 h-3.5" />
                              {userT('Submitted')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
                              <Clock className="w-3.5 h-3.5" />
                              {userT('Pending')}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedOfficer(officer)}
                            className="px-3.5 py-1.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-xs"
                          >
                            {userT('Detail')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Officer Detail Modal */}
        {renderOfficerDetailModal()}
      </div>
    );
  }

  // ==========================================
  // MANAGER VIEW: ALL REGIONAL TEAMS
  // ==========================================
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-slate-950/30">
        <div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700">
            {userT('Workforce Hierarchy')}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">
            {userT('Team')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300 mt-0.5">
            {userT('Zonal supervisor structures and assigned field officer units')}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm dark:shadow-slate-950/20">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-300 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={userT('Search teams by name, zone, or supervisor...')}
            className="w-full pl-10 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="text-xs font-medium py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="All">{userT('All Regions')}</option>
            {REAL_ETHIOPIAN_REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTeams.map((team: any) => (
          <div
            key={team.id}
            className="rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md dark:shadow-slate-950/40 p-5 flex flex-col justify-between transition-all"
          >
            <div className="space-y-4">
              {/* Team Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {team.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">{team.region} &gt; {team.zone}</span>
                  </p>
                </div>
                <Badge variant="primary" className="text-[10px] shrink-0">
                  {team.officers.length} {team.officers.length === 1 ? userT('Officer') : userT('Officers')}
                </Badge>
              </div>

              {/* Supervisor info */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-blue-400 block tracking-wider">
                    {userT('Lead Supervisor')}
                  </span>
                  {team.supervisor && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-300">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          team.stats.isSupervisorOnline ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      />
                      {team.stats.isSupervisorOnline ? userT('Online') : userT('Offline')}
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white mt-1 block">
                  {team.supervisor?.name || team.supervisor?.fullName || userT('Frontline Pool')}
                </span>
                {team.supervisor && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    ID: {team.supervisor.employeeId || team.supervisor.id}
                  </p>
                )}
              </div>

              {/* All Officers under this Supervisor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-300 tracking-wider">
                    {userT('Officers')} ({team.officers.length})
                  </span>
                  {team.stats.onlineOfficers > 0 && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {team.stats.onlineOfficers} {userT('online')}
                    </span>
                  )}
                </div>

                {team.officers.length === 0 ? (
                  <div className="py-4 text-center rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-400 dark:text-slate-400">{userT('No officers assigned to this supervisor')}</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {team.officers.map((officer: any) => {
                      const { isOnline } = getOfficerStats(officer);
                      const initials = ((officer.name || officer.fullName || 'FO')[0] || 'O').toUpperCase();
                      return (
                        <div
                          key={officer.id || officer.employeeId}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-700 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs border border-blue-200/50 dark:border-blue-700/50">
                                {initials}
                              </div>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${
                                  isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                                }`}
                              />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-slate-800 dark:text-white block truncate">
                                {officer.name || officer.fullName}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block truncate">
                                {officer.employeeId || officer.id} • {officer.woreda || officer.zone || userT('Field')}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Card Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-300">
                <strong className="text-slate-800 dark:text-white">{team.stats.activeOfficers}</strong> {userT('Active Personnel')}
              </span>
              <button
                type="button"
                onClick={() => setSelectedTeam(team)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all cursor-pointer shadow-xs"
              >
                {userT('Detail')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Team Detail Modal for Manager */}
      {selectedTeam && (
        <Modal
          isOpen={!!selectedTeam}
          onClose={() => setSelectedTeam(null)}
          title={`${userT('Team Details')} — ${selectedTeam.name}`}
          size="lg"
        >
          <div className="space-y-5 text-xs">
            {/* Header info */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  {selectedTeam.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-300 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span>
                    {[selectedTeam.region, selectedTeam.zone, (selectedTeam.woreda && selectedTeam.woreda !== 'All Woredas in Zone' ? selectedTeam.woreda : null)]
                      .filter(Boolean)
                      .filter((s: string) => s !== 'Unassigned')
                      .join(' > ') || userT('Operational Unit')}
                  </span>
                </p>
              </div>
              <Badge variant="primary" className="text-xs font-semibold self-start sm:self-auto">
                {selectedTeam.officers.length} {userT('Assigned Officers')}
              </Badge>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">{userT('Total Officers')}</span>
                <span className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
                  {selectedTeam.stats.officersCount}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase block">{userT('Online Now')}</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                  {selectedTeam.stats.onlineOfficers}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase block">{userT('Active Status')}</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5 block">
                  {selectedTeam.stats.activeOfficers}
                </span>
              </div>
            </div>

            {/* Supervisor Info Card */}
            {selectedTeam.supervisor && (
              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60">
                <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block tracking-wider mb-2">
                  {userT('Lead Supervisor Information')}
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                      {selectedTeam.supervisor.name || selectedTeam.supervisor.fullName}
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      ID: {selectedTeam.supervisor.employeeId || selectedTeam.supervisor.id} • {userT('Role')}: {userT('Zonal Supervisor')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedTeam.supervisor.phone && (
                      <a
                        href={`tel:${selectedTeam.supervisor.phone}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{formatEthiopianPhone(selectedTeam.supervisor.phone)}</span>
                      </a>
                    )}
                    {selectedTeam.supervisor.email && (
                      <a
                        href={`mailto:${selectedTeam.supervisor.email}`}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 transition-colors"
                        title={selectedTeam.supervisor.email}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Officers List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-xs uppercase text-slate-700 dark:text-slate-200 tracking-wider">
                  {userT('Officers Under This Supervisor')} ({selectedTeam.officers.length})
                </h5>
              </div>

              {selectedTeam.officers.length === 0 ? (
                <div className="py-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-4">
                  <Users className="w-8 h-8 text-slate-300 dark:text-slate-500 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">{userT('No field officers currently assigned to this supervisor.')}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">{userT('Officer')}</th>
                          <th className="py-2.5 px-3">{userT('Station')}</th>
                          <th className="py-2.5 px-3">{userT('Status')}</th>
                          <th className="py-2.5 px-3 text-center">{userT('Registrations')}</th>
                          <th className="py-2.5 px-3 text-right">{userT('Actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
                        {selectedTeam.officers.map((officer: any) => {
                          const { regCount, isOnline } = getOfficerStats(officer);
                          return (
                            <tr
                              key={officer.id || officer.employeeId}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
                            >
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                      isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                                    }`}
                                  />
                                  <div>
                                    <span className="font-bold text-slate-900 dark:text-white block">
                                      {officer.name || officer.fullName}
                                    </span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-mono">
                                      ID: {officer.employeeId || officer.id}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                {officer.woreda || officer.zone || userT('Assigned Station')}
                              </td>
                              <td className="py-2.5 px-3">
                                <Badge variant={isOnline ? 'success' : 'neutral'} className="text-[10px]">
                                  {isOnline ? userT('Online') : userT('Offline')}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                                {regCount}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedOfficer(officer)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer border border-transparent dark:border-slate-700"
                                >
                                  {userT('Detail')}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Officer Detail Modal */}
      {renderOfficerDetailModal()}
    </div>
  );
}