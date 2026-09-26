// Displays personnel grouped into operational area teams or directly assigned field officers for supervisors
// Zone-scoped access, real-time live status, performance metrics, and officer inspection

import React, { useState, useMemo } from 'react';
import {
  Users, Search, UserCheck, Radio, FileText,
  Award, ShieldCheck, MapPin, CheckCircle2, AlertCircle,
  Eye, Phone, Mail, Clock, Building, User, ChevronRight,
  AlertTriangle, Filter, RefreshCw, LayoutGrid, List,
  Smartphone, Activity, CheckCircle, HelpCircle
} from 'lucide-react';
import { getToday } from '../../utils/helpers';
import { formatEthiopianPhone } from '../../utils/phoneUtils';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import StatCard from '../ui/StatCard';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState('All');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'ONLINE', 'ACTIVE'
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [selectedOfficer, setSelectedOfficer] = useState<any>(null);
  const [liveOfficerData, setLiveOfficerData] = useState<any[]>([]);

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
    const assignedOfficerIds = new Set();

    supervisors.forEach((sup: any) => {
      const teamOfficers = officers.filter((o: any) => {
        const directMatch = o.supervisorId === sup.id || (o.supervisorName && o.supervisorName === sup.name);
        const areaMatch = !o.supervisorId && o.region && sup.region && o.region === sup.region && o.zone && sup.zone && o.zone === sup.zone;
        return directMatch || areaMatch;
      });

      teamOfficers.forEach((o: any) => assignedOfficerIds.add(o.id));

      const totalRegs = citizens.filter((c: any) =>
        teamOfficers.some((o: any) => o.employeeId === c.registeredBy || o.id === c.registeredById) ||
        sup.employeeId === c.registeredBy
      ).length;

      const totalReps = reports.filter((r: any) =>
        teamOfficers.some((o: any) => o.employeeId === r.employeeId) || sup.employeeId === r.employeeId
      ).length;

      const activeOfficers = teamOfficers.filter((o: any) => o.status === 'active').length;
      const onlineOfficers = (liveStatus || []).filter((l: any) =>
        teamOfficers.some((o: any) => o.employeeId === l.employeeId) && l.status === 'online'
      ).length;

      teamList.push({
        id: `team-${sup.id}`,
        name: `${sup.zone || sup.region || 'Zonal'} Operations Team`,
        region: sup.region || 'Organization-wide',
        zone: sup.zone || 'Zonal Jurisdiction',
        woreda: sup.woreda || 'All Woredas in Zone',
        supervisor: sup,
        officers: teamOfficers,
        stats: {
          officersCount: teamOfficers.length,
          activeOfficers,
          onlineOfficers,
          totalRegistrations: totalRegs,
          totalReports: totalReps,
          isSupervisorOnline: (liveStatus || []).some((l: any) => l.employeeId === sup.employeeId && l.status === 'online'),
        }
      });
    });

    // Frontline officers pool
    const unassignedOfficers = officers.filter((o: any) => !assignedOfficerIds.has(o.id));
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
            unassignedOfficers.some((o: any) => o.employeeId === l.employeeId) && l.status === 'online'
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-[#3B82F6] border border-blue-200 dark:border-blue-900/40">
                Supervisor Field Team
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {(user?.zone && user.zone !== 'Unassigned') ? user.zone : ((user?.region && user.region !== 'Unassigned') ? user.region : 'Assigned Zone')}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F4F4F5] mt-2">
              Team
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Direct field officers assigned to your operational unit
            </p>
          </div>

          {/* Quick Controls: View Mode & Search */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center border border-slate-200 dark:border-[#272A35] rounded-xl overflow-hidden bg-slate-50 dark:bg-[#1E222D] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-[#14161D] text-blue-600 dark:text-[#3B82F6] shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
                title="Cards Layout"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-[#14161D] text-blue-600 dark:text-[#3B82F6] shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
                title="Table Layout"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Assigned Officers
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {totalOfficers}
              </span>
              <span className="text-xs text-slate-400">Personnel</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] shadow-xs">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Online Now
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {onlineCount}
              </span>
              <span className="text-xs text-slate-400">Connected</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] shadow-xs">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              Active Status
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-600 dark:text-[#3B82F6] font-mono">
                {activeCount}
              </span>
              <span className="text-xs text-slate-400">Active</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] shadow-xs">
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
              Citizens Registered
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
                {totalCitizens.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">Total</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3.5 bg-white dark:bg-[#14161D] rounded-xl border border-slate-200 dark:border-[#272A35] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search officer by name, ID, or woreda..."
              className="w-full pl-10 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#1E222D] border border-slate-200 dark:border-[#272A35] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-blue-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#1E222D] text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All ({supervisorOfficers.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ONLINE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                statusFilter === 'ONLINE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#1E222D] text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Online ({onlineCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                statusFilter === 'ACTIVE'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#1E222D] text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Active ({activeCount})
            </button>
          </div>
        </div>

        {/* Officers Presentation */}
        {filteredSupervisorOfficers.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] p-6">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Field Officers Found</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or status filter.'
                : 'No field officers have been assigned to your supervision zone yet.'}
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
                  className="rounded-2xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] shadow-xs hover:border-blue-400 dark:hover:border-blue-800 transition-all flex flex-col justify-between overflow-hidden p-5"
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
                            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#14161D] ${
                              isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                            title={isOnline ? 'Online' : 'Offline'}
                          />
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {officer.name || officer.fullName}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span>ID: {officer.id || officer.employeeId}</span>
                          </div>
                        </div>
                      </div>

                      <Badge
                        variant={isOnline ? 'success' : 'neutral'}
                        dot
                        className="text-[10px] shrink-0 font-medium"
                      >
                        {isOnline ? 'Online' : 'Offline'}
                      </Badge>
                    </div>

                    {/* Location Row - Kebele removed per user request */}
                    <div className="mt-3.5 p-2.5 rounded-xl bg-slate-50 dark:bg-[#1E222D] border border-slate-100 dark:border-[#272A35] flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">
                        {officer.woreda && officer.woreda !== 'Unassigned'
                          ? officer.woreda
                          : (officer.zone && officer.zone !== 'Unassigned' ? officer.zone : 'Field Station')}
                      </span>
                    </div>

                    {/* Performance Row */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1E222D] border border-slate-100 dark:border-[#272A35] text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Citizens Registered
                        </span>
                        <span className="text-sm font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
                          {regCount}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1E222D] border border-slate-100 dark:border-[#272A35] text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Daily Report
                        </span>
                        <div className="mt-0.5 flex items-center justify-center gap-1">
                          {todayReport ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Submitted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                              <Clock className="w-3.5 h-3.5" />
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#272A35] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {officer.phone && (
                        <a
                          href={`tel:${officer.phone}`}
                          className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          title={`Call ${officer.phone}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {officer.email && (
                        <a
                          href={`mailto:${officer.email}`}
                          className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          title={`Email ${officer.email}`}
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedOfficer(officer)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1E222D] hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detail</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table Layout */
          <div className="rounded-2xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#1E222D] border-b border-slate-200 dark:border-[#272A35] text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Officer</th>
                    <th className="py-3 px-4">Woreda Station</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Registrations</th>
                    <th className="py-3 px-4 text-center">Daily Report</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#272A35]">
                  {filteredSupervisorOfficers.map((officer: any) => {
                    const { regCount, todayReport, isOnline } = getOfficerStats(officer);
                    return (
                      <tr
                        key={officer.id || officer.employeeId}
                        className="hover:bg-slate-50/80 dark:hover:bg-[#1E222D]/60 transition-colors"
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
                          {officer.woreda && officer.woreda !== 'Unassigned' ? officer.woreda : (officer.zone && officer.zone !== 'Unassigned' ? officer.zone : 'Assigned Station')}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={isOnline ? 'success' : 'neutral'}
                            className="text-[10px]"
                          >
                            {isOnline ? 'Online' : 'Offline'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center font-bold font-mono text-slate-900 dark:text-white">
                          {regCount}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {todayReport ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Submitted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
                              <Clock className="w-3.5 h-3.5" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedOfficer(officer)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-blue-500 hover:text-white dark:bg-[#1E222D] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
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
          </div>
        )}

        {/* Officer Detail Modal */}
        {selectedOfficer && (
          <Modal
            isOpen={!!selectedOfficer}
            onClose={() => setSelectedOfficer(null)}
            title={`Officer Detail — ${selectedOfficer.name || selectedOfficer.fullName}`}
            size="md"
          >
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1E222D] border border-slate-200 dark:border-[#272A35] flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedOfficer.name || selectedOfficer.fullName}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    ID: {selectedOfficer.id || selectedOfficer.employeeId} • Role: Field Officer
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    <span>{[selectedOfficer.region, selectedOfficer.zone, selectedOfficer.woreda].filter(Boolean).filter((s: string) => s !== 'Unassigned').join(' > ') || 'Operational Unit'}</span>
                  </p>
                </div>

                <Badge
                  variant={selectedOfficer.status === 'active' ? 'success' : 'neutral'}
                  className="capitalize text-xs font-semibold"
                >
                  {selectedOfficer.status || 'Active'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-[#272A35]">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Phone</span>
                  <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {formatEthiopianPhone(selectedOfficer.phone) || 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-[#272A35]">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Email</span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                    {selectedOfficer.email || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-[#3B82F6]">
                    Cumulative Citizens Registered
                  </span>
                  <span className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono block mt-0.5">
                    {getOfficerStats(selectedOfficer).regCount}
                  </span>
                </div>
                <UserCheck className="w-8 h-8 text-blue-500/40" />
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // ==========================================
  // MANAGER VIEW: ALL REGIONAL TEAMS
  // ==========================================
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] shadow-xs">
        <div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-[#3B82F6] border border-blue-200 dark:border-blue-900/40">
            Workforce Hierarchy
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F4F4F5] mt-2">
            Team
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Zonal supervisor structures and assigned field officer units
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 bg-white dark:bg-[#14161D] rounded-xl border border-slate-200 dark:border-[#272A35] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search teams by name, zone, or supervisor..."
            className="w-full pl-10 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#1E222D] border border-slate-200 dark:border-[#272A35] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="text-xs font-medium py-2 px-3 rounded-xl border border-slate-200 dark:border-[#272A35] bg-slate-50 dark:bg-[#1E222D] text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="All">All Regions</option>
            {REAL_ETHIOPIAN_REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeams.map((team: any) => (
          <div
            key={team.id}
            className="rounded-2xl border bg-white dark:bg-[#14161D] border-slate-200 dark:border-[#272A35] shadow-xs p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {team.name}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    <span>{team.region} &gt; {team.zone}</span>
                  </p>
                </div>
                <Badge variant="primary" className="text-[10px]">
                  {team.officers.length} Officers
                </Badge>
              </div>

              {/* Supervisor info */}
              <div className="mt-3.5 p-3 rounded-xl bg-slate-50 dark:bg-[#1E222D] border border-slate-100 dark:border-[#272A35]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Lead Supervisor
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {team.supervisor?.name || 'Assigned Lead'}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#272A35] flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {team.stats.activeOfficers} Active Personnel
              </span>
              <button
                type="button"
                onClick={() => setSelectedTeam(team)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-500 hover:text-white dark:bg-[#1E222D] text-xs font-semibold transition-colors cursor-pointer"
              >
                Detail
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}