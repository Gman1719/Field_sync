// src/components/citizens/CitizensDatabase.jsx
// Registered Citizens Directory: Scoped strictly to Field Officer for officer role, zero icons as requested, clean typography, responsive data table, and attractive details modal

import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';

import { offlineDb } from '../../db/offlineDb';
import { API_BASE } from '../../config/api';
import { formatEthiopianPhone } from '../../utils/phoneUtils';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import StatCard from '../ui/StatCard';
import Modal from '../ui/Modal';

export default function CitizensDatabase({ user, users = [], setActiveTab }) {
  const isOfficer = user?.role === 'field_officer' || user?.role === 'FIELD_OFFICER';

  // --- Filter State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [filterSyncStatus, setFilterSyncStatus] = useState('ALL');
  const [filterGender, setFilterGender] = useState('ALL');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [regions, setRegions] = useState([]);

  // --- Data State ---
  const [allCitizens, setAllCitizens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCitizen, setSelectedCitizen] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // 1. Load regions for filter dropdown
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const regs = await offlineDb.regions.orderBy('name').toArray();
        setRegions(regs);
      } catch (e) {
        console.error('Error fetching filter regions:', e);
      }
    };
    fetchRegions();
  }, []);

  // 2. Load citizens from Dexie & optionally refresh from server
  const loadCitizens = async () => {
    setIsLoading(true);
    try {
      // Step A: Load from local Dexie database
      const localRecords = await offlineDb.citizens.toArray();

      // Step B: If online and token exists, fetch server records to populate local store
      const authToken = localStorage.getItem('fieldsync_token');
      if (navigator.onLine && authToken) {
        try {
          const res = await fetch(`${API_BASE}/citizens?limit=250`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (res.ok) {
            const resData = await res.json();
            if (resData.success && resData.data) {
              for (const serverCitizen of resData.data) {
                await offlineDb.citizens.put({
                  ...serverCitizen,
                  syncStatus: 'SYNCED',
                });
              }
            }
          }
        } catch (serverErr) {
          console.warn('Could not fetch server citizens, using offline Dexie:', serverErr.message);
        }
      }

      // Re-read from Dexie
      const updatedLocalRecords = await offlineDb.citizens.toArray();

      // Sort descending by registration date
      updatedLocalRecords.sort((a, b) => {
        const dateA = new Date(a.registrationTimestamp || a.createdAt || a.registrationDate || 0).getTime();
        const dateB = new Date(b.registrationTimestamp || b.createdAt || b.registrationDate || 0).getTime();
        return dateB - dateA;
      });

      setAllCitizens(updatedLocalRecords);
    } catch (error) {
      console.error('Error loading citizens:', error);
      toast.error('Failed to load registered citizens');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadCitizens();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadCitizens();
    toast.success('Citizen records refreshed');
  };

  // Helper to match a citizen record to an officer user object
  const matchesOfficer = (citizen, targetUser) => {
    if (!targetUser || !citizen) return false;
    const targetId = targetUser.id;
    const targetEmpId = targetUser.employeeId;
    const targetName = (targetUser.name || targetUser.fullName || '').toLowerCase().trim();

    const cOfficerId = citizen.registeredById || citizen.registeredBy;
    const cEmpId = citizen.registeredByEmployeeId;
    const cOfficerName = (citizen.registeredByName || '').toLowerCase().trim();

    if (targetId && (cOfficerId === targetId || cOfficerId === String(targetId))) return true;
    if (targetEmpId && (cOfficerId === targetEmpId || cEmpId === targetEmpId)) return true;
    if (targetName && cOfficerName && cOfficerName === targetName) return true;
    if (cOfficerId === 'offline_officer') return true;
    return false;
  };

  // 3. BASE CITIZENS SCOPE:
  // For Field Officers: strictly only display citizens registered by this officer!
  // For Supervisors/Managers: access all citizens in their jurisdiction.
  const baseCitizens = useMemo(() => {
    if (isOfficer) {
      return allCitizens.filter((c) => matchesOfficer(c, user));
    }
    return allCitizens;
  }, [allCitizens, isOfficer, user]);

  // 4. Computed Unique Officers for "Registered By" Dropdown (for managers/supervisors)
  const registeredByOptions = useMemo(() => {
    if (isOfficer) return [];

    const map = new Map();

    // From loaded citizen records
    allCitizens.forEach((c) => {
      const officerId = c.registeredById || c.registeredBy;
      if (officerId && !map.has(officerId)) {
        const matchedUser = (users || []).find(
          u => u.id === officerId || u.employeeId === officerId
        );
        const name = c.registeredByName || matchedUser?.name || matchedUser?.fullName || `Officer ${officerId.slice(0, 8)}`;
        const empId = matchedUser?.employeeId || c.registeredByEmployeeId || (officerId.startsWith('FO') ? officerId : '');
        map.set(officerId, { id: officerId, name, employeeId: empId });
      }
    });

    // Also include any field officers in system users
    (users || []).forEach((u) => {
      if ((u.role === 'field_officer' || u.role === 'FIELD_OFFICER') && !map.has(u.id)) {
        map.set(u.id, {
          id: u.id,
          name: u.name || u.fullName || u.email,
          employeeId: u.employeeId || ''
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allCitizens, users, isOfficer]);

  // Selected officer object for managers/supervisors
  const currentOfficer = useMemo(() => {
    if (isOfficer) {
      return {
        id: user?.id,
        name: user?.name || user?.fullName || 'Field Officer',
        employeeId: user?.employeeId || ''
      };
    }
    if (!selectedOfficerId) return null;
    return registeredByOptions.find(o => o.id === selectedOfficerId) || { id: selectedOfficerId, name: selectedOfficerId };
  }, [isOfficer, user, selectedOfficerId, registeredByOptions]);

  // 5. Computed KPI Stats (Strictly based on baseCitizens)
  const stats = useMemo(() => {
    const total = baseCitizens.length;
    const synced = baseCitizens.filter((c) => c.syncStatus === 'SYNCED').length;
    const pending = baseCitizens.filter((c) => c.syncStatus === 'PENDING').length;
    const male = baseCitizens.filter((c) => (c.gender || '').toUpperCase() === 'MALE').length;
    const female = baseCitizens.filter((c) => (c.gender || '').toUpperCase() === 'FEMALE').length;

    return { total, synced, pending, male, female };
  }, [baseCitizens]);

  // 6. Comprehensive Filtering Logic (Applied onto baseCitizens)
  const filteredCitizens = useMemo(() => {
    return baseCitizens.filter((c) => {
      // A. Text Search (name, phone, national ID, woreda, kebele, village)
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const fullName = `${c.firstName || ''} ${c.middleName || ''} ${c.lastName || ''}`.toLowerCase();
        const idMatch = (c.clientRecordId || '').toLowerCase().includes(query) || (c.id || '').toLowerCase().includes(query) || (c.nationalId || '').toLowerCase().includes(query);
        const phoneMatch = (c.phoneNumber || '').includes(query) || (c.phone || '').includes(query);
        const emailMatch = (c.email || '').toLowerCase().includes(query);
        const woredaMatch = (c.woredaName || c.woreda || '').toLowerCase().includes(query);
        const kebeleMatch = (c.kebeleName || c.kebele || '').toLowerCase().includes(query);
        const villageMatch = (c.village || '').toLowerCase().includes(query);

        if (!fullName.includes(query) && !idMatch && !phoneMatch && !emailMatch && !woredaMatch && !kebeleMatch && !villageMatch) {
          return false;
        }
      }

      // B. Filter by Registered By (For Managers/Supervisors only)
      if (!isOfficer && selectedOfficerId) {
        const targetOfficer = registeredByOptions.find(o => o.id === selectedOfficerId);
        const matchesThisOfficer = matchesOfficer(c, targetOfficer || { id: selectedOfficerId });
        if (!matchesThisOfficer) {
          return false;
        }
      }

      // C. Filter by When / Date (Registration Date YYYY-MM-DD)
      if (selectedDate) {
        const rawDate = c.registrationTimestamp || c.createdAt || c.registrationDate;
        if (!rawDate) return false;
        const citizenDateStr = new Date(rawDate).toISOString().slice(0, 10);
        if (citizenDateStr !== selectedDate) return false;
      }

      // D. Sync Status Filter
      if (filterSyncStatus !== 'ALL') {
        if (c.syncStatus !== filterSyncStatus) return false;
      }

      // E. Gender Filter
      if (filterGender !== 'ALL') {
        if ((c.gender || '').toUpperCase() !== filterGender) return false;
      }

      // F. Region Filter
      if (selectedRegionId) {
        if (c.regionId !== selectedRegionId && c.region !== selectedRegionId && c.regionName !== selectedRegionId) {
          return false;
        }
      }

      return true;
    });
  }, [baseCitizens, searchTerm, isOfficer, selectedOfficerId, registeredByOptions, selectedDate, filterSyncStatus, filterGender, selectedRegionId]);

  // Today helper date string
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const copyCitizenId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    toast.success('12-Digit Citizen ID copied');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const copyPhoneNumber = (phone) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    toast.success('Phone number copied');
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    if (!isOfficer) {
      setSelectedOfficerId('');
    }
    setSelectedDate('');
    setSelectedRegionId('');
    setFilterSyncStatus('ALL');
    setFilterGender('ALL');
  };

  const hasActiveFilters = searchTerm || (!isOfficer && selectedOfficerId) || selectedDate || selectedRegionId || filterSyncStatus !== 'ALL' || filterGender !== 'ALL';

  return (
    <div className="space-y-6">
      {/* 1. Header with Clean Typography (No Icons) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#1E293B] p-5 sm:p-6 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
            {isOfficer ? 'My Registered Citizens' : 'Registered Citizens'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
            {isOfficer
              ? 'Frontline citizen enrollment directory with administrative jurisdiction'
              : 'Master national biographic registry with intake provenance and regional telemetry'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={isRefreshing}
            className="text-xs h-10 px-4 rounded-xl border-[#E2E8F0] dark:border-[#334155] text-slate-700 dark:text-[#F8FAFC] dark:hover:bg-[#0F172A]"
          >
            Refresh
          </Button>

          {/* Quick link to register citizen for field officers */}
          {isOfficer && setActiveTab && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setActiveTab('register')}
              className="text-xs h-10 px-4 rounded-xl shadow-xs"
            >
              Register Citizen
            </Button>
          )}
        </div>
      </div>

      {/* 2. Interactive KPI Stats Cards (No icons, responsive, clickable to filter) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
        <StatCard
          label={isOfficer ? "My Total Registered" : "Total Registered"}
          value={stats.total}
          variant="primary"
          subtitle={isOfficer ? "Enrolled by you" : "All registered citizens"}
          active={!hasActiveFilters}
          onClick={clearAllFilters}
        />
        <StatCard
          label="Synced to Cloud"
          value={stats.synced}
          variant="success"
          subtitle="Persisted on central server"
          active={filterSyncStatus === 'SYNCED'}
          onClick={() => {
            setFilterSyncStatus(prev => prev === 'SYNCED' ? 'ALL' : 'SYNCED');
          }}
        />
        <StatCard
          label="Pending Local Sync"
          value={stats.pending}
          variant="warning"
          subtitle="Buffered on this device"
          active={filterSyncStatus === 'PENDING'}
          onClick={() => {
            setFilterSyncStatus(prev => prev === 'PENDING' ? 'ALL' : 'PENDING');
          }}
        />
        <StatCard
          label="Male Citizens"
          value={stats.male}
          variant="info"
          subtitle="Registered males"
          active={filterGender === 'MALE'}
          onClick={() => {
            setFilterGender(prev => prev === 'MALE' ? 'ALL' : 'MALE');
          }}
        />
        <StatCard
          label="Female Citizens"
          value={stats.female}
          variant="neutral"
          subtitle="Registered females"
          active={filterGender === 'FEMALE'}
          onClick={() => {
            setFilterGender(prev => prev === 'FEMALE' ? 'ALL' : 'FEMALE');
          }}
        />
      </div>

      {/* 3. Search & Filter Toolbar (No Icons) */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] p-4 shadow-xs transition-colors duration-200 space-y-3">
        {/* Row 1: Search & Date Filter */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by citizen name, 12-digit ID, phone, email, woreda, or kebele/village..."
              className="w-full h-11 px-4 pr-9 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50/70 dark:bg-[#0F172A] text-slate-900 dark:text-[#F8FAFC] text-xs sm:text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Date Picker Filter (When / The Date) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              title="Filter by registration date"
              className="h-11 px-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all cursor-pointer font-medium"
            />

            {/* Quick "Today" shortcut */}
            <button
              type="button"
              onClick={() => setSelectedDate(selectedDate === todayStr ? '' : todayStr)}
              className={`h-11 px-3.5 rounded-xl text-xs font-bold transition-all border ${
                selectedDate === todayStr
                  ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                  : 'bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 border-[#E2E8F0] dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Filter records registered today"
            >
              Today
            </button>
          </div>
        </div>

        {/* Row 2: Region, Sync Status, Gender Filters & Manager Officer Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {/* Manager/Supervisor View: Registered By Dropdown (Hidden for Field Officers) */}
          {!isOfficer && (
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <select
                value={selectedOfficerId}
                onChange={(e) => setSelectedOfficerId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all cursor-pointer font-medium"
              >
                <option value="">Registered By: All Officers</option>
                {registeredByOptions.map((off) => (
                  <option key={off.id} value={off.id}>
                    {off.name} {off.employeeId ? `(${off.employeeId})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Region Dropdown */}
          <div className="relative min-w-[140px]">
            <select
              value={selectedRegionId}
              onChange={(e) => setSelectedRegionId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all cursor-pointer font-medium"
            >
              <option value="">All Regions</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sync Status Filter */}
          <select
            value={filterSyncStatus}
            onChange={(e) => setFilterSyncStatus(e.target.value)}
            className="h-10 px-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all cursor-pointer min-w-[130px]"
          >
            <option value="ALL">All Sync States</option>
            <option value="SYNCED">Synced to Cloud</option>
            <option value="PENDING">Pending Local Sync</option>
          </select>

          {/* Gender Filter */}
          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="h-10 px-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all cursor-pointer min-w-[110px]"
          >
            <option value="ALL">All Genders</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="h-10 px-3.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#0F172A] hover:bg-slate-200 dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-[#334155] transition-all whitespace-nowrap cursor-pointer shadow-2xs ml-auto"
              title="Reset all filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* 4. Filter Throughput Banner (No icons) */}
      {(selectedDate || (!isOfficer && selectedOfficerId)) && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-blue-50/90 dark:from-[#1E293B] dark:via-[#1E293B] dark:to-[#1E293B] border border-blue-200/80 dark:border-blue-900/50 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider">
                Officer Intake Throughput
              </span>
              {selectedDate && (
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 dark:bg-blue-900/60 text-[#2563EB] dark:text-blue-300">
                  Date: {selectedDate === todayStr ? 'Today' : selectedDate}
                </span>
              )}
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F8FAFC] mt-0.5">
              {currentOfficer ? currentOfficer.name : 'All Field Officers'}
              {currentOfficer?.employeeId && (
                <span className="ml-1.5 text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                  ({currentOfficer.employeeId})
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedDate
                ? `Citizens enrolled on ${selectedDate === todayStr ? 'today' : selectedDate}`
                : 'Citizens enrolled by this officer'}
            </p>
          </div>

          {/* Result Metric Box */}
          <div className="flex items-center gap-4 bg-white dark:bg-[#0F172A] p-3 px-5 rounded-2xl border border-blue-100 dark:border-[#334155] shadow-xs shrink-0 sm:self-center">
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Citizens
              </span>
              <div className="flex items-baseline justify-end gap-1.5">
                <span className="text-3xl font-black text-[#2563EB] dark:text-[#60A5FA] font-mono leading-none">
                  {filteredCitizens.length}
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {filteredCitizens.length === 1 ? 'citizen' : 'citizens'}
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />

            <div className="text-xs space-y-1">
              <div className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                {filteredCitizens.filter(c => c.syncStatus === 'SYNCED').length} Synced
              </div>
              <div className="text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                {filteredCitizens.filter(c => c.syncStatus !== 'SYNCED').length} Pending
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modern Data Table (No Icons) */}
      <Card className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
              {isOfficer ? 'My Registered Citizens' : 'Registered Citizens'} ({filteredCitizens.length} {filteredCitizens.length === 1 ? 'record' : 'records'})
            </CardTitle>
          </div>
          {hasActiveFilters && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              Showing {filteredCitizens.length} of {baseCitizens.length} {isOfficer ? 'enrolled by you' : 'total'}
            </span>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center text-xs text-slate-500 dark:text-slate-400">
              Loading citizen database records...
            </div>
          ) : filteredCitizens.length === 0 ? (
            <div className="py-20 text-center text-slate-400 dark:text-slate-500 space-y-3 px-4">
              <p className="font-bold text-slate-800 dark:text-slate-200 text-base">
                {isOfficer ? 'No Citizen Records Registered Yet' : 'No Citizen Records Found'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                {hasActiveFilters
                  ? 'No citizen registrations match your current filter parameters. Try clearing or expanding your filters.'
                  : isOfficer
                  ? 'You have not registered any citizens yet. Use the Citizen Registration console to register citizens in your assigned woreda or kebele.'
                  : 'No citizen registrations recorded in the system yet.'}
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                {hasActiveFilters ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-xs"
                  >
                    Reset All Filters
                  </Button>
                ) : isOfficer && setActiveTab ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveTab('register')}
                    className="text-xs px-5 rounded-xl shadow-xs"
                  >
                    Register Citizen Now
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#334155] text-xs font-bold text-slate-600 dark:text-slate-200 uppercase tracking-wider">
                    <th className="py-4 pl-4 sm:pl-6 pr-3">Citizen Name & 12-Digit ID</th>
                    <th className="py-4 px-3">Contact</th>
                    <th className="py-4 px-3">Gender / Age</th>
                    <th className="py-4 px-3">Region</th>
                    <th className="py-4 px-3">Zone</th>
                    <th className="py-4 px-3">Woreda</th>
                    <th className="py-4 px-3">Kebele / Village</th>
                    <th className="py-4 px-3 text-center">Sync Status</th>
                    <th className="py-4 pr-4 sm:pr-6 pl-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155]">
                  {filteredCitizens.map((citizen, idx) => {
                    const isSynced = citizen.syncStatus === 'SYNCED';
                    const citizenId = citizen.clientRecordId || citizen.nationalId || citizen.idNumber || citizen.id;

                    return (
                      <tr
                        key={citizen.clientRecordId || citizen.id || idx}
                        className={`transition-colors duration-150 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 ${
                          idx % 2 === 1 ? 'bg-slate-50/40 dark:bg-[#182234]/30' : 'bg-white dark:bg-[#1E293B]'
                        }`}
                      >
                        {/* 1. Name & 12-Digit ID */}
                        <td className="py-3.5 pl-4 sm:pl-6 pr-3 whitespace-nowrap">
                          <p className="font-bold text-slate-900 dark:text-[#F8FAFC] text-sm">
                            {[citizen.firstName, citizen.middleName, citizen.lastName].filter(Boolean).join(' ') || 'Unnamed Citizen'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] font-mono font-semibold text-[#2563EB] dark:text-[#60A5FA] bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-900/50">
                              {citizenId}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyCitizenId(citizenId)}
                              className="text-[11px] font-semibold text-slate-400 hover:text-[#2563EB] dark:hover:text-[#60A5FA] px-1 py-0.5 rounded transition-colors"
                              title="Copy 12-digit Citizen ID"
                            >
                              Copy
                            </button>
                          </div>
                        </td>

                        {/* 2. Contact */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {citizen.phoneNumber || citizen.phone ? (
                            <p className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-xs">
                              {formatEthiopianPhone(citizen.phoneNumber || citizen.phone)}
                            </p>
                          ) : (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">No phone</span>
                          )}
                          {citizen.email && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-[150px] truncate" title={citizen.email}>
                              {citizen.email}
                            </p>
                          )}
                        </td>

                        {/* 3. Gender / Age */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {citizen.gender || '—'}
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 mx-1.5">•</span>
                          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                            {citizen.age ? `${citizen.age} yrs` : (citizen.dateOfBirth || '—')}
                          </span>
                        </td>

                        {/* 4. Region */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {citizen.regionName || citizen.region || '—'}
                          </span>
                        </td>

                        {/* 5. Zone */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="text-xs text-slate-600 dark:text-slate-300">
                            {citizen.zoneName || citizen.zone || '—'}
                          </span>
                        </td>

                        {/* 6. Woreda */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="text-xs text-slate-600 dark:text-slate-300">
                            {citizen.woredaName || citizen.woreda || '—'}
                          </span>
                        </td>

                        {/* 7. Kebele / Village */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
                            {citizen.kebeleName || citizen.kebele || 'Kebele'}
                          </span>
                          {citizen.village && (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate max-w-[120px]" title={citizen.village}>
                              {citizen.village}
                            </span>
                          )}
                        </td>

                        {/* 8. Sync Status (No icons) */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          {isSynced ? (
                            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Synced
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              Pending
                            </span>
                          )}
                        </td>

                        {/* 9. Action (Details Button - No icons) */}
                        <td className="py-3.5 pr-4 sm:pr-6 pl-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedCitizen(citizen)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] bg-blue-50/60 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/70 dark:border-blue-800/70 transition-all inline-block cursor-pointer shadow-2xs"
                            title="View Citizen Details"
                          >
                            Details
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

      {/* 6. Citizen Details Modal (Zero Icons) */}
      {selectedCitizen && (
        <Modal
          isOpen={!!selectedCitizen}
          onClose={() => setSelectedCitizen(null)}
          title="Citizen Details"
          size="lg"
        >
          <div className="space-y-5">
            {/* Top Accent Bar */}
            <div className="h-1.5 w-full -mt-2 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 opacity-90" />

            {/* Profile Overview Card */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#0F172A] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#1E3A8A] to-[#2563EB] text-white flex items-center justify-center font-extrabold text-xl shadow-md shrink-0">
                  {(selectedCitizen.firstName?.[0] || 'C').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                    {[selectedCitizen.firstName, selectedCitizen.middleName, selectedCitizen.lastName].filter(Boolean).join(' ') || 'Unnamed Citizen'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs font-mono font-bold text-[#2563EB] dark:text-[#60A5FA] bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/60 px-2 py-0.5 rounded-md">
                      ID: {selectedCitizen.clientRecordId || selectedCitizen.nationalId || selectedCitizen.idNumber || selectedCitizen.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyCitizenId(selectedCitizen.clientRecordId || selectedCitizen.nationalId || selectedCitizen.idNumber || selectedCitizen.id)}
                      className="text-xs font-semibold text-slate-500 hover:text-[#2563EB] dark:hover:text-[#60A5FA] px-1.5 py-0.5 rounded bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 transition-colors"
                      title="Copy full 12-digit record ID"
                    >
                      {copiedId ? 'Copied' : 'Copy ID'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                {selectedCitizen.syncStatus === 'SYNCED' ? (
                  <span className="inline-block px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                    Synced to Cloud
                  </span>
                ) : (
                  <span className="inline-block px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs">
                    Buffered on Device
                  </span>
                )}
              </div>
            </div>

            {/* Section 1: Demographics */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">
                Personal Demographics
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl shadow-2xs">
                  <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-0.5">Gender</span>
                  <span className="font-bold text-slate-800 dark:text-[#F8FAFC] text-sm">{selectedCitizen.gender || '—'}</span>
                </div>
                <div className="p-3 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl shadow-2xs">
                  <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-0.5">Calculated Age</span>
                  <span className="font-bold text-slate-800 dark:text-[#F8FAFC] text-sm">
                    {selectedCitizen.age ? `${selectedCitizen.age} years` : 'Unspecified'}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl shadow-2xs">
                  <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-0.5">Date of Birth</span>
                  <span className="font-bold text-slate-800 dark:text-[#F8FAFC] text-sm">{selectedCitizen.dateOfBirth || '—'}</span>
                </div>
                <div className="p-3 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl shadow-2xs">
                  <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-0.5">Marital Status</span>
                  <span className="font-bold text-slate-800 dark:text-[#F8FAFC] text-sm">{selectedCitizen.maritalStatus || '—'}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Contact Information */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">
                Contact Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-0.5">Mobile Phone Number</span>
                    <span className="font-bold text-slate-800 dark:text-[#F8FAFC] font-mono text-sm">
                      {selectedCitizen.phoneNumber || selectedCitizen.phone
                        ? formatEthiopianPhone(selectedCitizen.phoneNumber || selectedCitizen.phone)
                        : 'No phone registered'}
                    </span>
                  </div>
                  {(selectedCitizen.phoneNumber || selectedCitizen.phone) && (
                    <button
                      type="button"
                      onClick={() => copyPhoneNumber(selectedCitizen.phoneNumber || selectedCitizen.phone)}
                      className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#2563EB] dark:hover:text-[#60A5FA] bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700"
                      title="Copy phone"
                    >
                      {copiedPhone ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>

                <div className="p-3.5 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl shadow-2xs">
                  <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-0.5">Email Address</span>
                  <span className="font-bold text-slate-800 dark:text-[#F8FAFC] text-sm">
                    {selectedCitizen.email || 'None registered'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Ethiopian Administrative Jurisdiction */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">
                Ethiopian Administrative Jurisdiction
              </h4>
              <div className="p-4 bg-slate-50 dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-xl">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg shadow-2xs">
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] block font-semibold uppercase">Region</span>
                    <span className="font-bold text-slate-900 dark:text-[#F8FAFC] text-sm">
                      {selectedCitizen.regionName || selectedCitizen.region || '—'}
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg shadow-2xs">
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] block font-semibold uppercase">Zone / Sub-City</span>
                    <span className="font-bold text-slate-900 dark:text-[#F8FAFC] text-sm">
                      {selectedCitizen.zoneName || selectedCitizen.zone || '—'}
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg shadow-2xs">
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] block font-semibold uppercase">Woreda Station</span>
                    <span className="font-bold text-slate-900 dark:text-[#F8FAFC] text-sm">
                      {selectedCitizen.woredaName || selectedCitizen.woreda || '—'}
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg shadow-2xs">
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] block font-semibold uppercase">Kebele & Village</span>
                    <span className="font-bold text-slate-900 dark:text-[#F8FAFC] text-sm">
                      {[selectedCitizen.kebeleName || selectedCitizen.kebele, selectedCitizen.village].filter(Boolean).join(' • ') || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Officer Provenance & Intake Audit */}
            <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50/40 dark:from-[#0F172A] dark:to-[#1E293B]/70 border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-xs space-y-2">
              <span className="text-slate-400 dark:text-[#94A3B8] font-bold uppercase tracking-wider block text-[10px]">
                Registration Provenance & Device Audit
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-600 dark:text-slate-300 text-[11px] pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">Registered By (Officer)</span>
                  <strong className="text-slate-900 dark:text-[#F8FAFC]">
                    {selectedCitizen.registeredByName ||
                      (users || []).find(u => u.id === selectedCitizen.registeredById || u.employeeId === selectedCitizen.registeredById)?.name ||
                      (selectedCitizen.registeredById === user?.id ? (user?.name || user?.fullName) : selectedCitizen.registeredById) || 'Field Officer'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Officer Employee ID</span>
                  <strong className="text-slate-900 dark:text-[#F8FAFC] font-mono">
                    {selectedCitizen.registeredByEmployeeId ||
                      (users || []).find(u => u.id === selectedCitizen.registeredById || u.employeeId === selectedCitizen.registeredById)?.employeeId ||
                      (selectedCitizen.registeredById === user?.id ? user?.employeeId : selectedCitizen.registeredById) || '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Intake Timestamp</span>
                  <strong className="text-slate-900 dark:text-[#F8FAFC]">
                    {selectedCitizen.registrationTimestamp || selectedCitizen.createdAt
                      ? new Date(selectedCitizen.registrationTimestamp || selectedCitizen.createdAt).toLocaleString()
                      : 'N/A'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end pt-3 border-t border-[#E2E8F0] dark:border-[#334155]">
              <Button
                variant="secondary"
                onClick={() => setSelectedCitizen(null)}
                className="dark:bg-[#1E293B] dark:border-[#334155] dark:text-[#F8FAFC] text-xs font-bold px-6 rounded-xl"
              >
                Close Details
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}