// src/components/citizens/CitizensDatabase.jsx
// Registered Citizens Directory with Full Ethiopian Address & Sync Status Tracking (Phase 3)

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users, Search, Filter, MapPin,
  CheckCircle2, Clock, AlertTriangle, RefreshCw,
  Phone, UserCheck, Shield, Calendar, Eye, X, User
} from 'lucide-react';
import toast from 'react-hot-toast';

import { offlineDb } from '../../db/offlineDb';
import { API_BASE } from '../../config/api';
import { formatEthiopianPhone } from '../../utils/phoneUtils';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import StatCard from '../ui/StatCard';

export default function CitizensDatabase({ user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSyncStatus, setFilterSyncStatus] = useState('ALL');
  const [filterDuplicateStatus, setFilterDuplicateStatus] = useState('ALL');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [regions, setRegions] = useState([]);

  const [allCitizens, setAllCitizens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCitizen, setSelectedCitizen] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
          const res = await fetch(`${API_BASE}/citizens?limit=100`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (res.ok) {
            const resData = await res.json();
            if (resData.success && resData.data) {
              // Upsert server records into Dexie
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
        const dateA = new Date(a.registrationTimestamp || a.createdAt || 0).getTime();
        const dateB = new Date(b.registrationTimestamp || b.createdAt || 0).getTime();
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

  // 3. Computed KPI Stats
  const stats = useMemo(() => {
    const total = allCitizens.length;
    const synced = allCitizens.filter((c) => c.syncStatus === 'SYNCED').length;
    const pending = allCitizens.filter((c) => c.syncStatus === 'PENDING').length;
    const needsReview = allCitizens.filter(
      (c) => c.duplicateReviewStatus === 'NEEDS_REVIEW' || c.duplicateReviewStatus === 'POSSIBLE_DUPLICATE'
    ).length;

    return { total, synced, pending, needsReview };
  }, [allCitizens]);

  // 4. Filtering & Search Logic
  const filteredCitizens = useMemo(() => {
    return allCitizens.filter((c) => {
      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const fullName = `${c.firstName} ${c.middleName || ''} ${c.lastName}`.toLowerCase();
        const idMatch = c.clientRecordId?.toLowerCase().includes(query) || c.id?.toLowerCase().includes(query);
        const phoneMatch = c.phoneNumber?.includes(query);
        const villageMatch = c.village?.toLowerCase().includes(query);

        if (!fullName.includes(query) && !idMatch && !phoneMatch && !villageMatch) {
          return false;
        }
      }

      // Sync status filter
      if (filterSyncStatus !== 'ALL') {
        if (c.syncStatus !== filterSyncStatus) return false;
      }

      // Duplicate review status filter
      if (filterDuplicateStatus !== 'ALL') {
        if (filterDuplicateStatus === 'NEEDS_REVIEW') {
          if (c.duplicateReviewStatus !== 'NEEDS_REVIEW' && c.duplicateReviewStatus !== 'POSSIBLE_DUPLICATE') {
            return false;
          }
        } else if (c.duplicateReviewStatus !== filterDuplicateStatus) {
          return false;
        }
      }

      // Region filter
      if (selectedRegionId) {
        if (c.regionId !== selectedRegionId) return false;
      }

      return true;
    });
  }, [allCitizens, searchTerm, filterSyncStatus, filterDuplicateStatus, selectedRegionId]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-card">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Registered Citizens Directory
              </h1>
              <p className="text-xs text-slate-500">
                Offline-persisted beneficiary registry with full Ethiopian administrative address hierarchy
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={isRefreshing}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh Records
          </Button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered"
          value={stats.total}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Synced with Server"
          value={stats.synced}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Pending Local Sync"
          value={stats.pending}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Duplicate Review Flagged"
          value={stats.needsReview}
          icon={AlertTriangle}
          color="rose"
        />
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, phone, or UUID..."
                className="w-full h-10 pl-9 pr-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
              />
            </div>

            {/* Region Filter */}
            <div>
              <select
                value={selectedRegionId}
                onChange={(e) => setSelectedRegionId(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
              >
                <option value="">All Administrative Regions</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sync Status Filter */}
            <div>
              <select
                value={filterSyncStatus}
                onChange={(e) => setFilterSyncStatus(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
              >
                <option value="ALL">All Sync Statuses</option>
                <option value="SYNCED">Synced with Server</option>
                <option value="PENDING">Pending Local Sync</option>
              </select>
            </div>

            {/* Duplicate Review Filter */}
            <div>
              <select
                value={filterDuplicateStatus}
                onChange={(e) => setFilterDuplicateStatus(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
              >
                <option value="ALL">All Duplicate Flags</option>
                <option value="NO_DUPLICATE_DETECTED">No Duplicate Detected</option>
                <option value="NEEDS_REVIEW">Needs Review / Suspected Duplicate</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Citizens Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <RefreshCw className="w-6 h-6 text-[#1E3A8A] animate-spin mx-auto mb-2" />
              Loading citizen database records...
            </div>
          ) : filteredCitizens.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 space-y-2">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700 text-sm">No Citizen Records Found</p>
              <p className="text-slate-400">
                {searchTerm || selectedRegionId || filterSyncStatus !== 'ALL'
                  ? 'No citizens match the selected filter criteria.'
                  : 'No citizens have been registered on this device yet. Click Register to create records.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Citizen Name & Demographics</th>
                  <th className="py-3.5 px-4">Citizen UUID</th>
                  <th className="py-3.5 px-4">Administrative Location</th>
                  <th className="py-3.5 px-4">Phone Number</th>
                  <th className="py-3.5 px-4">Sync Status</th>
                  <th className="py-3.5 px-4">Duplicate Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCitizens.map((citizen) => {
                  const isSynced = citizen.syncStatus === 'SYNCED';
                  const isNeedsReview =
                    citizen.duplicateReviewStatus === 'NEEDS_REVIEW' ||
                    citizen.duplicateReviewStatus === 'POSSIBLE_DUPLICATE';

                  return (
                    <tr
                      key={citizen.clientRecordId || citizen.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Name & Demographics */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 text-sm">
                          {[citizen.firstName, citizen.middleName, citizen.lastName].filter(Boolean).join(' ')}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{citizen.gender}</span>
                          <span>•</span>
                          <span>{citizen.age ? `${citizen.age} yrs` : (citizen.dateOfBirth || 'Age unrecorded')}</span>
                          {citizen.maritalStatus && (
                            <>
                              <span>•</span>
                              <span>{citizen.maritalStatus}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Citizen UUID */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        <span title={citizen.clientRecordId}>
                          {citizen.clientRecordId ? citizen.clientRecordId.slice(0, 18) + '...' : '—'}
                        </span>
                      </td>

                      {/* Full Address */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">
                          {[citizen.woredaName || citizen.woreda, citizen.kebeleName || citizen.kebele].filter(Boolean).join(', ') || 'District registered'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {[citizen.regionName || citizen.region, citizen.village].filter(Boolean).join(' • ')}
                        </div>
                      </td>

                      {/* Phone Number */}
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {formatEthiopianPhone(citizen.phoneNumber)}
                      </td>

                      {/* Sync Status Badge */}
                      <td className="py-3 px-4">
                        {isSynced ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Synced
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Saved Locally — Pending Sync
                          </span>
                        )}
                      </td>

                      {/* Duplicate Status Badge */}
                      <td className="py-3 px-4">
                        {isNeedsReview ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            Needs Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-slate-500 bg-slate-100">
                            No Duplicate
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCitizen(citizen)}
                          className="h-8 text-xs text-[#1E3A8A] hover:bg-blue-50"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Citizen Details Modal */}
      {selectedCitizen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] text-white flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Citizen Profile Details</h3>
                  <p className="text-[11px] text-slate-500">Official National Identification Registry</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCitizen(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="text-base font-bold text-slate-900">
                  {[selectedCitizen.firstName, selectedCitizen.middleName, selectedCitizen.lastName].filter(Boolean).join(' ')}
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  UUID: {selectedCitizen.clientRecordId || selectedCitizen.id}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-0.5">Demographics</span>
                  <span className="font-medium text-slate-800">
                    {selectedCitizen.gender} • {selectedCitizen.age ? `${selectedCitizen.age} years` : (selectedCitizen.dateOfBirth || 'Unspecified')}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-0.5">Phone Number</span>
                  <span className="font-medium text-slate-800">
                    {formatEthiopianPhone(selectedCitizen.phoneNumber)}
                  </span>
                </div>
              </div>

              {/* Full Administrative Address */}
              <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Full Administrative Address</span>
                <div className="flex items-start gap-1.5 text-slate-800">
                  <MapPin className="w-4 h-4 text-[#1E3A8A] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {[selectedCitizen.regionName || selectedCitizen.region, selectedCitizen.zoneName || selectedCitizen.zone].filter(Boolean).join(' > ')}
                    </p>
                    <p className="text-slate-600">
                      {[selectedCitizen.woredaName || selectedCitizen.woreda, selectedCitizen.kebeleName || selectedCitizen.kebele].filter(Boolean).join(' > ')}
                    </p>
                    <p className="text-slate-900 font-semibold mt-1">
                      Village / Community: {selectedCitizen.village || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status and Timestamps */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Sync Status</span>
                  <Badge variant={selectedCitizen.syncStatus === 'SYNCED' ? 'success' : 'warning'} className="mt-1">
                    {selectedCitizen.syncStatus === 'SYNCED' ? 'Synced with Central DB' : 'Saved Locally — Pending Sync'}
                  </Badge>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Registration Timestamp</span>
                  <span className="text-slate-700 font-medium block mt-1">
                    {selectedCitizen.registrationTimestamp ? new Date(selectedCitizen.registrationTimestamp).toLocaleString() : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedCitizen(null)}
              >
                Close Profile
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}