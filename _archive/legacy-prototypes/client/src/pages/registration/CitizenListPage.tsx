import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Search, 
  Download, 
  Plus, 
  Users, 
  Clock, 
  CheckCircle2, 
  Eye
} from 'lucide-react';
import db from '../../db/index.ts';
import { LocalCitizenRecord } from '../../types/index.ts';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Badge from '../../components/ui/Badge.tsx';
import Modal from '../../components/ui/Modal.tsx';

export interface CitizenListPageProps {
  onRegisterClick?: () => void;
}

export const CitizenListPage: React.FC<CitizenListPageProps> = ({ onRegisterClick }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedCitizen, setSelectedCitizen] = useState<LocalCitizenRecord | null>(null);

  // Live Reactive Query against IndexedDB
  const localCitizens = useLiveQuery(
    () => db.citizens.orderBy('createdAt').reverse().toArray(),
    []
  ) || [];

  // Filter & Search Logic
  const filteredCitizens = useMemo(() => {
    return localCitizens.filter((citizen) => {
      // Status Filter
      if (statusFilter && citizen.syncStatus !== statusFilter) {
        return false;
      }

      // Search Filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = citizen.fullName.toLowerCase().includes(q);
        const matchesPhone = citizen.phoneNumber ? citizen.phoneNumber.includes(q) : false;
        const matchesAddress = citizen.address.toLowerCase().includes(q);
        const matchesKebele = citizen.kebeleName ? citizen.kebeleName.toLowerCase().includes(q) : false;
        const matchesId = citizen.clientRecordId.toLowerCase().includes(q);

        if (!matchesName && !matchesPhone && !matchesAddress && !matchesKebele && !matchesId) {
          return false;
        }
      }

      return true;
    });
  }, [localCitizens, statusFilter, search]);

  // Metric Computations
  const metrics = useMemo(() => {
    const total = localCitizens.length;
    const pending = localCitizens.filter((c) => c.syncStatus === 'PENDING').length;
    const synced = localCitizens.filter((c) => c.syncStatus === 'SYNCED').length;
    return { total, pending, synced };
  }, [localCitizens]);

  // Export CSV Helper
  const handleExportCSV = () => {
    if (filteredCitizens.length === 0) return;

    const headers = [
      'Client Record ID',
      'Full Name',
      'Date of Birth',
      'Gender',
      'Phone Number',
      'Address',
      'Region',
      'Zone',
      'Woreda',
      'Kebele',
      'Sync Status',
      'Created At',
    ];

    const rows = filteredCitizens.map((c) => [
      `"${c.clientRecordId}"`,
      `"${c.fullName}"`,
      `"${c.dateOfBirth}"`,
      `"${c.gender}"`,
      `"${c.phoneNumber || ''}"`,
      `"${c.address}"`,
      `"${c.regionName || ''}"`,
      `"${c.zoneName || ''}"`,
      `"${c.woredaName || ''}"`,
      `"${c.kebeleName || ''}"`,
      `"${c.syncStatus}"`,
      `"${c.createdAt}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fieldsync_citizens_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Citizen Registrations Directory
            </h1>
            <Badge variant="success" size="sm">
              IndexedDB Reactive
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Local device records &bull; Changes update in real-time with zero latency
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredCitizens.length === 0}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>
          {onRegisterClick && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={onRegisterClick}
            >
              New Registration
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">Total Device Records</span>
            <span className="text-xl font-bold text-slate-900">{metrics.total}</span>
          </div>
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-amber-700 block font-medium">Pending Sync</span>
            <span className="text-xl font-bold text-amber-600">{metrics.pending}</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-700 block font-medium">Synced with Cloud</span>
            <span className="text-xl font-bold text-emerald-600">{metrics.synced}</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <Card noPadding className="border-slate-200 shadow-xs">
        <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, phone, kebele, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">All Sync Statuses</option>
              <option value="PENDING">Pending Sync</option>
              <option value="SYNCED">Synced</option>
              <option value="FAILED">Failed</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
            </select>

            {(search || statusFilter) && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                }}
                className="text-xs text-slate-500 hover:text-emerald-600 font-medium px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Citizen Demographics</th>
                <th className="px-4 py-3">Phone &amp; Contact</th>
                <th className="px-4 py-3">Ethiopian Jurisdiction</th>
                <th className="px-4 py-3">Sync Status</th>
                <th className="px-4 py-3">Registered Date</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCitizens.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No citizen records found</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {localCitizens.length === 0
                        ? 'You have not registered any citizens on this device yet.'
                        : 'No records match your active search or filter criteria.'}
                    </p>
                    {localCitizens.length === 0 && onRegisterClick && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="mt-4"
                        onClick={onRegisterClick}
                        leftIcon={<Plus className="w-4 h-4" />}
                      >
                        Register First Citizen
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredCitizens.map((c) => (
                  <tr key={c.clientRecordId} className="hover:bg-slate-50/80 transition-colors">
                    {/* Demographics */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {c.photoUrl ? (
                          <img
                            src={c.photoUrl}
                            alt={c.fullName}
                            className="w-8 h-8 rounded-full object-cover border shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                            {c.fullName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900">{c.fullName}</div>
                          <div className="text-[11px] text-slate-500">
                            {c.dateOfBirth} &bull; {c.gender}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Phone & Address */}
                    <td className="px-4 py-3.5">
                      <div className="font-mono text-slate-800">{c.phoneNumber || 'N/A'}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                        {c.address}
                      </div>
                    </td>

                    {/* Jurisdiction */}
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-900">
                        {c.kebeleName || 'Kebele'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {c.woredaName || 'Woreda'} &bull; {c.regionName || 'Region'}
                      </div>
                    </td>

                    {/* Sync Status */}
                    <td className="px-4 py-3.5">
                      <Badge status={c.syncStatus} size="sm">
                        {c.syncStatus === 'PENDING'
                          ? 'Pending Sync'
                          : c.syncStatus === 'SYNCED'
                          ? 'Synced'
                          : c.syncStatus}
                      </Badge>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCitizen(c)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50/75 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Displaying <span className="font-semibold text-slate-700">{filteredCitizens.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{localCitizens.length}</span> local records
          </div>
          <div className="text-[11px] text-slate-400">
            Offline-First Device Storage (Dexie.js / IndexedDB)
          </div>
        </div>
      </Card>

      {/* Citizen Details Modal */}
      {selectedCitizen && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCitizen(null)}
          title="Citizen Demographic Profile"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              {selectedCitizen.photoUrl ? (
                <img
                  src={selectedCitizen.photoUrl}
                  alt={selectedCitizen.fullName}
                  className="w-14 h-14 rounded-lg object-cover border"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-lg flex items-center justify-center">
                  {selectedCitizen.fullName.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">{selectedCitizen.fullName}</h3>
                <p className="text-xs text-slate-500">
                  {selectedCitizen.dateOfBirth} &bull; {selectedCitizen.gender}
                </p>
                <div className="mt-1">
                  <Badge status={selectedCitizen.syncStatus} size="sm">
                    {selectedCitizen.syncStatus}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block">Phone Number:</span>
                <span className="font-mono font-medium text-slate-800">
                  {selectedCitizen.phoneNumber || 'None provided'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block">Residential Address:</span>
                <span className="font-medium text-slate-800">{selectedCitizen.address}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg space-y-1 text-xs">
              <span className="text-slate-400 block">Administrative Placement (4-Tier):</span>
              <div className="font-medium text-slate-900">
                Region: {selectedCitizen.regionName || selectedCitizen.regionId} &rarr; Zone:{' '}
                {selectedCitizen.zoneName || selectedCitizen.zoneId}
              </div>
              <div className="font-medium text-slate-900">
                Woreda: {selectedCitizen.woredaName || selectedCitizen.woredaId} &rarr; Kebele:{' '}
                {selectedCitizen.kebeleName || selectedCitizen.kebeleId}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Device Record ID:</span>
                <span className="font-mono text-[11px] text-slate-600">
                  {selectedCitizen.clientRecordId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Registered By:</span>
                <span className="text-slate-700">{selectedCitizen.registeredByName || 'Field Officer'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Registered Timestamp:</span>
                <span className="text-slate-700">{new Date(selectedCitizen.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedCitizen(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CitizenListPage;
