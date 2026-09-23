// src/components/team/TeamManagement.jsx – Enterprise Field Team Directory

import React, { useState, useMemo } from 'react';
import {
  Users, Search, UserCheck, Radio, FileText,
  Award, ShieldCheck, MapPin, CheckCircle2, AlertCircle,
  Eye, Phone, Mail, Clock
} from 'lucide-react';
import { getToday } from '../../utils/helpers';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import StatCard from '../ui/StatCard';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';

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
  selectedOfficer: externalSelectedOfficer,
  setSelectedOfficer: externalSetSelectedOfficer,
  citizens = []
}) {
  const [internalSelectedOfficer, setInternalSelectedOfficer] = useState(null);
  const selectedOfficer = externalSelectedOfficer !== undefined ? externalSelectedOfficer : internalSelectedOfficer;
  const setSelectedOfficer = externalSetSelectedOfficer || setInternalSelectedOfficer;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState('All');

  const displayMembers = useMemo(() => {
    let members = isManager
      ? users.filter(u => u.role === 'field_officer' || u.role === 'supervisor')
      : teamMembers;

    if (searchTerm) {
      members = members.filter(m =>
        m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterRegion !== 'All') {
      members = members.filter(m => m.region === filterRegion);
    }

    return members;
  }, [users, teamMembers, isManager, searchTerm, filterRegion]);

  const teamStats = useMemo(() => {
    const totalMembers = displayMembers.length;
    const activeMembers = displayMembers.filter(m => m.status === 'active').length;
    const onlineMembers = liveStatus?.filter(l =>
      displayMembers.some(m => m.employeeId === l.employeeId) && l.status === 'online'
    ).length || 0;

    const totalReports = reports.filter(r =>
      displayMembers.some(m => m.employeeId === r.employeeId)
    ).length;

    const totalRegistrations = citizens.filter(c =>
      displayMembers.some(m => m.employeeId === c.registeredBy)
    ).length;

    return { totalMembers, activeMembers, onlineMembers, totalReports, totalRegistrations };
  }, [displayMembers, reports, liveStatus, citizens]);

  const getMemberPerformance = (member) => {
    const perf = employeePerformance?.find(p => p.employeeId === member.employeeId);
    const todayAtt = attendance?.find(a => a.employeeId === member.employeeId && a.date === getToday());
    const memberScreen = screenTime?.find(s => s.employeeId === member.employeeId && s.date === getToday());
    const memberStatus = liveStatus?.find(l => l.employeeId === member.employeeId);
    const actualRegistrations = citizens.filter(c => c.registeredBy === member.employeeId).length;

    return {
      reports: perf?.totalReports || 0,
      registrations: actualRegistrations,
      efficiency: perf?.avgEfficiency || 0,
      attendance: todayAtt?.status || 'Not Marked',
      trustScore: memberScreen?.trustScore || 0,
      status: memberStatus?.status || 'offline',
      productivity: memberStatus?.productivityScore || 0
    };
  };

  const regions = ['All', 'North', 'South', 'East', 'West', 'Central'];
  const officerDetailPerf = selectedOfficer ? getMemberPerformance(selectedOfficer) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#1E3A8A]" />
            Field Operations Directory
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isManager ? 'Overview of all active field supervisors and officers' : 'Assigned field team members under your supervision'}
          </p>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <StatCard
          title="Total Staff"
          value={teamStats.totalMembers}
          subtitle="Directory count"
          icon={Users}
          iconColor="text-blue-700"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Active Status"
          value={teamStats.activeMembers}
          subtitle="Enabled accounts"
          icon={UserCheck}
          iconColor="text-emerald-700"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Online Now"
          value={teamStats.onlineMembers}
          subtitle="Live session active"
          icon={Radio}
          iconColor="text-teal-700"
          iconBg="bg-teal-50"
        />
        <StatCard
          title="Reports Filed"
          value={teamStats.totalReports}
          subtitle="Field submissions"
          icon={FileText}
          iconColor="text-indigo-700"
          iconBg="bg-indigo-50"
        />
        <StatCard
          title="Registrations"
          value={teamStats.totalRegistrations}
          subtitle="Total citizens"
          icon={Award}
          iconColor="text-amber-700"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Search & Filter Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff by name or employee ID..."
                className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] transition-all"
              />
            </div>

            <Select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="h-10 text-xs"
            >
              {regions.map(r => (
                <option key={r} value={r}>Region: {r}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Team Cards Grid */}
      {displayMembers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-xs text-slate-400">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <span>No team members found matching your search</span>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayMembers.map(member => {
            const perf = getMemberPerformance(member);
            const isOnlineNow = perf.status === 'online';

            return (
              <Card key={member.id} className="flex flex-col justify-between hover:border-slate-300 transition-all">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                        {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-900 text-sm truncate">{member.name}</h4>
                        <p className="text-[11px] text-slate-400 font-mono">{member.employeeId}</p>
                      </div>
                    </div>

                    <Badge variant={isOnlineNow ? 'success' : 'neutral'} dot>
                      {isOnlineNow ? 'Online' : 'Offline'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Citizens</span>
                      <span className="text-sm font-bold text-slate-900 font-mono">{perf.registrations}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Reports</span>
                      <span className="text-sm font-bold text-slate-900 font-mono">{perf.reports}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Shift Att</span>
                      <span className="text-xs font-bold text-slate-700 capitalize truncate block mt-0.5">{perf.attendance}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{member.region || 'Region Unassigned'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{member.email || '--'}</span>
                    </div>
                  </div>
                </CardContent>

                <div className="p-3 px-5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                  <Badge variant="primary" className="capitalize text-[10px]">
                    {member.role?.replace('_', ' ') || 'Staff'}
                  </Badge>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedOfficer(member)}
                    className="h-7 text-xs text-[#1E3A8A]"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    View Details
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Member Detail Modal */}
      <Modal
        isOpen={!!selectedOfficer}
        onClose={() => setSelectedOfficer(null)}
        title={selectedOfficer ? `${selectedOfficer.name} — Profile & Metrics` : 'Staff Detail'}
        size="md"
      >
        {selectedOfficer && officerDetailPerf && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">{selectedOfficer.name}</h4>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">ID: {selectedOfficer.employeeId}</p>
                <p className="text-[11px] text-slate-500">{selectedOfficer.email}</p>
              </div>
              <Badge variant="primary" className="capitalize">
                {selectedOfficer.role?.replace('_', ' ')}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Region Jurisdiction</span>
                <span className="text-sm font-semibold text-slate-900">{selectedOfficer.region || 'Unassigned'}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Today's Shift Attendance</span>
                <span className="text-sm font-semibold text-slate-900 capitalize">{officerDetailPerf.attendance}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Total Beneficiaries Registered</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{officerDetailPerf.registrations}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Total Daily Reports Filed</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{officerDetailPerf.reports}</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setSelectedOfficer(null)}
              >
                Close Profile
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}