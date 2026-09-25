// src/components/team/TeamManagement.jsx – Enterprise Field Teams & Working Groups Console
// Displays personnel grouped into operational area teams containing the Supervisor and their assigned Field Officers

import React, { useState, useMemo } from 'react';
import {
  Users, Search, UserCheck, Radio, FileText,
  Award, ShieldCheck, MapPin, CheckCircle2, AlertCircle,
  Eye, Phone, Mail, Clock, Building, User, ChevronRight,
  AlertTriangle, Filter, RefreshCw
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
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState('All');
  const [selectedTeam, setSelectedTeam] = useState(null);

  // 1. Group Users into Operational Area Teams (Supervisor + Assigned Officers)
  const teams = useMemo(() => {
    const supervisors = users.filter(u => u.role === 'supervisor');
    const officers = users.filter(u => u.role === 'field_officer');

    const teamList = [];
    const assignedOfficerIds = new Set();

    // A. Create a team card for each Supervisor
    supervisors.forEach(sup => {
      // Find officers assigned directly to this supervisor OR matching their exact region & zone
      const teamOfficers = officers.filter(o => {
        const directMatch = o.supervisorId === sup.id || (o.supervisorName && o.supervisorName === sup.name);
        const areaMatch = !o.supervisorId && o.region && sup.region && o.region === sup.region && o.zone && sup.zone && o.zone === sup.zone;
        return directMatch || areaMatch;
      });

      teamOfficers.forEach(o => assignedOfficerIds.add(o.id));

      const totalRegs = citizens.filter(c =>
        teamOfficers.some(o => o.employeeId === c.registeredBy || o.id === c.registeredById) ||
        sup.employeeId === c.registeredBy
      ).length;

      const totalReps = reports.filter(r =>
        teamOfficers.some(o => o.employeeId === r.employeeId) || sup.employeeId === r.employeeId
      ).length;

      const activeOfficers = teamOfficers.filter(o => o.status === 'active').length;
      const onlineOfficers = (liveStatus || []).filter(l =>
        teamOfficers.some(o => o.employeeId === l.employeeId) && l.status === 'online'
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
          isSupervisorOnline: (liveStatus || []).some(l => l.employeeId === sup.employeeId && l.status === 'online'),
        }
      });
    });

    // B. Group unassigned field officers working in areas without a supervisor
    const unassignedOfficers = officers.filter(o => !assignedOfficerIds.has(o.id));
    const areaGroups = {};

    unassignedOfficers.forEach(o => {
      const reg = o.region || 'Unassigned Region';
      const zone = o.zone || 'Unassigned Zone';
      const key = `${reg}__${zone}`;
      if (!areaGroups[key]) {
        areaGroups[key] = {
          region: reg,
          zone: zone,
          officers: []
        };
      }
      areaGroups[key].officers.push(o);
    });

    Object.entries(areaGroups).forEach(([key, group], idx) => {
      const totalRegs = citizens.filter(c =>
        group.officers.some(o => o.employeeId === c.registeredBy || o.id === c.registeredById)
      ).length;

      const totalReps = reports.filter(r =>
        group.officers.some(o => o.employeeId === r.employeeId)
      ).length;

      const activeOfficers = group.officers.filter(o => o.status === 'active').length;
      const onlineOfficers = (liveStatus || []).filter(l =>
        group.officers.some(o => o.employeeId === l.employeeId) && l.status === 'online'
      ).length;

      teamList.push({
        id: `unsupervised-${idx}`,
        name: `${group.zone !== 'Unassigned Zone' ? group.zone : group.region} Frontline Intake Unit`,
        region: group.region,
        zone: group.zone,
        woreda: 'Multiple Woredas',
        supervisor: null,
        officers: group.officers,
        stats: {
          officersCount: group.officers.length,
          activeOfficers,
          onlineOfficers,
          totalRegistrations: totalRegs,
          totalReports: totalReps,
          isSupervisorOnline: false,
        }
      });
    });

    return teamList;
  }, [users, citizens, reports, liveStatus]);

  // 2. Ethiopian Regions for Filter Dropdown
  const availableRegions = useMemo(() => {
    const list = [...REAL_ETHIOPIAN_REGIONS];
    // Also include any custom/existing regions in teams if not already present
    teams.forEach(t => {
      if (t.region && t.region !== 'Organization-wide' && !list.includes(t.region)) {
        list.push(t.region);
      }
    });
    return list;
  }, [teams]);

  // 3. Filtered Teams
  const filteredTeams = useMemo(() => {
    return teams.filter(t => {
      if (filterRegion !== 'All') {
        const teamReg = (t.region || '').toLowerCase();
        const selReg = filterRegion.toLowerCase();
        if (teamReg !== selReg && !teamReg.includes(selReg)) return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const matchesName = t.name.toLowerCase().includes(query);
        const matchesRegion = (t.region || '').toLowerCase().includes(query);
        const matchesZone = (t.zone || '').toLowerCase().includes(query);
        const matchesSupervisor = t.supervisor?.name?.toLowerCase().includes(query);
        const matchesOfficer = t.officers.some(o =>
          o.name?.toLowerCase().includes(query) || o.employeeId?.toLowerCase().includes(query)
        );

        if (!matchesName && !matchesRegion && !matchesZone && !matchesSupervisor && !matchesOfficer) {
          return false;
        }
      }

      return true;
    });
  }, [teams, searchTerm, filterRegion]);

  // 4. Overall Aggregated Stats
  const overallStats = useMemo(() => {
    const totalTeams = teams.length;
    const totalSupervisors = teams.filter(t => t.supervisor).length;
    const totalOfficers = teams.reduce((acc, t) => acc + t.officers.length, 0);
    const fullyStaffed = teams.filter(t => t.supervisor && t.officers.length > 0).length;
    const totalRegistrations = teams.reduce((acc, t) => acc + t.stats.totalRegistrations, 0);

    return { totalTeams, totalSupervisors, totalOfficers, fullyStaffed, totalRegistrations };
  }, [teams]);

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#2563EB] dark:text-[#60A5FA]" />
            Field Operations Teams & Working Groups
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
            Frontline teams grouped by Ethiopian jurisdiction, containing assigned Zonal Supervisors and Field Officers
          </p>
        </div>
      </div>

      {/* 2. Summary KPI Metrics (No icons, responsive, interactive filter) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
        <StatCard
          label="Total Field Teams"
          value={overallStats.totalTeams}
          variant="primary"
          subtitle="Operational units"
          active={filterRegion === 'All' && !searchTerm}
          onClick={() => {
            setFilterRegion('All');
            setSearchTerm('');
          }}
        />
        <StatCard
          label="Zonal Supervisors"
          value={overallStats.totalSupervisors}
          variant="info"
          subtitle="Team commanders"
        />
        <StatCard
          label="Field Officers"
          value={overallStats.totalOfficers}
          variant="neutral"
          subtitle="Frontline agents"
        />
        <StatCard
          label="Fully Staffed"
          value={overallStats.fullyStaffed}
          variant="success"
          subtitle="Supervisor + Officers"
        />
        <StatCard
          label="Team Registrations"
          value={overallStats.totalRegistrations}
          variant="primary"
          subtitle="Combined citizens"
        />
      </div>

      {/* 3. Search & Filter Toolbar */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] p-3.5 sm:p-4 shadow-xs transition-colors duration-200">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by team name, supervisor, officer, or jurisdiction..."
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

          {/* Region Dropdown (Real Ethiopian Regions) */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[190px]">
              <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                className="w-full h-10 pl-8 pr-3 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all cursor-pointer font-medium"
              >
                <option value="All">All Ethiopian Regions</option>
                {availableRegions.map((reg) => (
                  <option key={reg} value={reg}>{reg}</option>
                ))}
              </select>
            </div>

            {(searchTerm || filterRegion !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterRegion('All');
                }}
                className="h-10 px-3.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#0F172A] hover:bg-slate-200 dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-[#334155] transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-2xs"
                title="Reset filters"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Team Groups Grid (Cards containing Supervisor and their Officers) */}
      {filteredTeams.length === 0 ? (
        <Card className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl">
          <CardContent className="py-16 text-center text-slate-400 dark:text-slate-500">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No Field Teams Found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Try adjusting your search criteria or assigning officers to supervisors in the User Directory
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((team) => {
            const hasSupervisor = !!team.supervisor;

            return (
              <Card
                key={team.id}
                className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Team Card Header */}
                <div className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-[#334155] space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-base truncate">
                        {team.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8] flex items-center gap-1.5 mt-0.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA] shrink-0" />
                        <span className="truncate">{team.region} &gt; {team.zone}</span>
                      </p>
                    </div>

                    <Badge
                      variant={hasSupervisor ? 'primary' : 'warning'}
                      className="text-[11px] font-semibold shrink-0"
                    >
                      {hasSupervisor ? `${team.officers.length} Officers` : 'Open Lead'}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-4 flex-1">
                  {/* Supervisor Block (The Leader of the Group) */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                      Zonal Supervisor (Team Lead)
                    </span>
                    {hasSupervisor ? (
                      <div className="p-3 bg-blue-50/50 dark:bg-[#0F172A] border border-blue-200/60 dark:border-[#334155] rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#2563EB] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {(team.supervisor.name?.[0] || 'S').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-xs truncate">
                              {team.supervisor.name}
                            </h4>
                            <p className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-mono">
                              {team.supervisor.employeeId}
                            </p>
                          </div>
                        </div>

                        <Badge variant={team.stats.isSupervisorOnline ? 'success' : 'neutral'} dot className="text-[10px] shrink-0">
                          {team.stats.isSupervisorOnline ? 'Online' : 'Offline'}
                        </Badge>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 rounded-xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="font-medium text-[11px]">No Supervisor Assigned to this Area</span>
                      </div>
                    )}
                  </div>

                  {/* Field Officers Contained in this Group */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Assigned Field Officers ({team.officers.length})
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {team.stats.activeOfficers} Active
                      </span>
                    </div>

                    {team.officers.length === 0 ? (
                      <div className="p-3 bg-slate-50 dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-center text-xs text-slate-400 dark:text-slate-500 py-4">
                        <User className="w-5 h-5 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                        <span>No field officers assigned to this team yet.</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {team.officers.map(officer => {
                          const isOnline = (liveStatus || []).some(
                            l => l.employeeId === officer.employeeId && l.status === 'online'
                          );

                          return (
                            <div
                              key={officer.id}
                              className="p-2.5 bg-slate-50/70 dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-lg flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-md bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {(officer.name?.[0] || 'O').toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900 dark:text-[#F8FAFC] truncate text-[11px]">
                                    {officer.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono truncate">
                                    {officer.woreda ? `${officer.woreda}` : officer.employeeId}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                  {isOnline ? 'Active' : 'Standby'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Team Aggregate Performance Row (Clean 2-Column: Staff & Citizens) */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#E2E8F0] dark:border-[#334155] text-center">
                    <div className="p-2.5 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-[#E2E8F0] dark:border-[#334155]">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider">
                        Staff Members
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">
                        {team.officers.length + (hasSupervisor ? 1 : 0)} Personnel
                      </span>
                    </div>

                    <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50">
                      <span className="text-[10px] text-[#2563EB] dark:text-[#60A5FA] font-bold block uppercase tracking-wider">
                        Citizens Registered
                      </span>
                      <span className="text-xs font-black text-[#2563EB] dark:text-[#60A5FA] font-mono">
                        {team.stats.totalRegistrations.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Team Card Footer */}
                <div className="p-3 px-4 sm:px-5 bg-slate-50/70 dark:bg-[#0F172A] border-t border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 truncate max-w-[65%]">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{team.woreda}</span>
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTeam(team)}
                    className="h-8 text-xs font-semibold dark:border-[#334155] dark:text-[#F8FAFC] dark:hover:bg-[#1E293B] shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1 text-[#2563EB] dark:text-[#60A5FA]" />
                    Inspect Team
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 5. Team Details Modal */}
      {selectedTeam && (
        <Modal
          isOpen={!!selectedTeam}
          onClose={() => setSelectedTeam(null)}
          title={`Team Details — ${selectedTeam.name}`}
          size="lg"
        >
          <div className="space-y-5 text-xs">
            {/* Jurisdiction Banner */}
            <div className="p-4 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-[#E2E8F0] dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">{selectedTeam.name}</h4>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
                  <span>{selectedTeam.region} &gt; {selectedTeam.zone} &gt; {selectedTeam.woreda}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Total Staff</span>
                  <span className="text-base font-black text-slate-800 dark:text-[#F8FAFC] font-mono">
                    {selectedTeam.officers.length + (selectedTeam.supervisor ? 1 : 0)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Citizens Registered</span>
                  <span className="text-base font-black text-[#2563EB] dark:text-[#60A5FA] font-mono">
                    {selectedTeam.stats.totalRegistrations.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Supervisor Profile */}
            <div className="space-y-2">
              <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block text-[11px]">
                Zonal Supervisor & Team Lead
              </span>
              {selectedTeam.supervisor ? (
                <div className="p-3.5 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white font-bold flex items-center justify-center">
                      {(selectedTeam.supervisor.name?.[0] || 'S').toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-[#F8FAFC]">{selectedTeam.supervisor.name}</h4>
                      <p className="text-[11px] text-slate-500 font-mono">ID: {selectedTeam.supervisor.employeeId}</p>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                    <p className="font-mono">{formatEthiopianPhone(selectedTeam.supervisor.phone)}</p>
                    <p>{selectedTeam.supervisor.email}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-800 dark:text-amber-300">
                  No supervisor assigned to this unit. Assign an active supervisor via the User Directory.
                </div>
              )}
            </div>

            {/* Officers Roster Table */}
            <div className="space-y-2">
              <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block text-[11px]">
                Field Officers Roster ({selectedTeam.officers.length})
              </span>

              {selectedTeam.officers.length === 0 ? (
                <div className="p-6 bg-slate-50 dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-center text-slate-400">
                  No officers assigned to this working group.
                </div>
              ) : (
                <div className="rounded-xl border border-[#E2E8F0] dark:border-[#334155] overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/90 dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#334155] text-[11px] font-bold text-slate-600 dark:text-slate-200 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Officer</th>
                        <th className="py-2.5 px-3">Woreda Station</th>
                        <th className="py-2.5 px-3">Contact</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155]">
                      {selectedTeam.officers.map(officer => (
                        <tr key={officer.id} className="hover:bg-slate-50/50 dark:hover:bg-[#0F172A]/50">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 dark:text-[#F8FAFC] block">{officer.name}</span>
                            <span className="font-mono text-[10px] text-slate-400">{officer.employeeId}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                            {officer.woreda || 'General Field'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                            {formatEthiopianPhone(officer.phone) || officer.email}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge variant={officer.status === 'active' ? 'success' : 'neutral'} className="text-[10px]">
                              {officer.status === 'active' ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-3 border-t border-[#E2E8F0] dark:border-[#334155]">
              <Button
                variant="secondary"
                onClick={() => setSelectedTeam(null)}
                className="dark:bg-[#1E293B] dark:border-[#334155] dark:text-[#F8FAFC]"
              >
                Close Team Roster
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}