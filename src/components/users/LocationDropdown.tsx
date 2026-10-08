// Cascading Ethiopian Administrative Location Dropdowns (Region -> Zone -> Woreda -> Supervisor)

import React, { useState, useEffect } from 'react';
import { MapPin, Building, Home, UserCheck, Loader2, AlertCircle } from 'lucide-react';
import Select from '../ui/Select';
import { API_BASE } from '../../config/api';
import { offlineDb } from '../../db/offlineDb';
import { db } from '../../services/database';
import { useUserLanguage } from '../../context/UserLanguageContext';

const DEFAULT_ETHIOPIA_REGIONS = [
  { id: 'reg-addis-ababa', code: 'AA', name: 'Addis Ababa' },
  { id: 'reg-oromia', code: 'OR', name: 'Oromia' },
  { id: 'reg-amhara', code: 'AM', name: 'Amhara' },
  { id: 'reg-sidama', code: 'SI', name: 'Sidama' },
  { id: 'reg-somali', code: 'SO', name: 'Somali' },
  { id: 'reg-tigray', code: 'TG', name: 'Tigray' },
  { id: 'reg-dire-dawa', code: 'DD', name: 'Dire Dawa' },
  { id: 'reg-afar', code: 'AF', name: 'Afar' },
  { id: 'reg-benishangul', code: 'BG', name: 'Benishangul-Gumuz' },
  { id: 'reg-gambela', code: 'GA', name: 'Gambela' },
  { id: 'reg-harari', code: 'HA', name: 'Harari' },
  { id: 'reg-south-ethiopia', code: 'SE', name: 'South Ethiopia' },
  { id: 'reg-central-ethiopia', code: 'CE', name: 'Central Ethiopia' },
  { id: 'reg-south-west', code: 'SWE', name: 'South West Ethiopia' },
];

const DEFAULT_ETHIOPIA_ZONES: Record<string, Array<{ id: string; name: string }>> = {
  'reg-addis-ababa': [
    { id: 'zone-aa-bole', name: 'Bole Sub-City' },
    { id: 'zone-aa-yeka', name: 'Yeka Sub-City' },
    { id: 'zone-aa-kirkos', name: 'Kirkos Sub-City' },
    { id: 'zone-aa-arada', name: 'Arada Sub-City' },
    { id: 'zone-aa-gullele', name: 'Gullele Sub-City' },
    { id: 'zone-aa-lideta', name: 'Lideta Sub-City' },
    { id: 'zone-aa-nifassilk', name: 'Nifas Silk-Lafto Sub-City' },
    { id: 'zone-aa-akaki', name: 'Akaki Kality Sub-City' },
    { id: 'zone-aa-kolfe', name: 'Kolfe Keranio Sub-City' },
    { id: 'zone-aa-lemikura', name: 'Lemi Kura Sub-City' },
  ],
  'reg-oromia': [
    { id: 'zone-or-sheger', name: 'Sheger City Zone' },
    { id: 'zone-or-finfinne', name: 'Finfinne Special Zone' },
    { id: 'zone-or-east-shewa', name: 'East Shewa Zone' },
    { id: 'zone-or-jimma', name: 'Jimma Zone' },
    { id: 'zone-or-arsi', name: 'Arsi Zone' },
  ],
  'reg-amhara': [
    { id: 'zone-am-north-shewa', name: 'North Shewa Zone' },
    { id: 'zone-am-south-gondar', name: 'South Gondar Zone' },
    { id: 'zone-am-west-gojjam', name: 'West Gojjam Zone' },
  ],
  'reg-sidama': [
    { id: 'zone-si-hawassa', name: 'Hawassa City Administration' },
    { id: 'zone-si-central', name: 'Central Sidama Zone' },
  ],
  'reg-tigray': [
    { id: 'zone-tg-mekelle', name: 'Mekelle Special Zone' },
    { id: 'zone-tg-central', name: 'Central Tigray Zone' },
  ],
  'reg-somali': [
    { id: 'zone-so-jigjiga', name: 'Jigjiga City Administration' },
    { id: 'zone-so-faafan', name: 'Faafan Zone' },
  ],
  'reg-dire-dawa': [
    { id: 'zone-dd-admin', name: 'Dire Dawa Administration' },
  ],
};

const DEFAULT_ETHIOPIA_WOREDAS: Record<string, Array<{ id: string; name: string }>> = {
  'zone-aa-bole': [
    { id: 'wor-aa-bol-01', name: 'Bole Woreda 01' },
    { id: 'wor-aa-bol-02', name: 'Bole Woreda 02' },
    { id: 'wor-aa-bol-03', name: 'Bole Woreda 03' },
    { id: 'wor-aa-bol-04', name: 'Bole Woreda 04' },
    { id: 'wor-aa-bol-05', name: 'Bole Woreda 05' },
    { id: 'wor-aa-bol-06', name: 'Bole Woreda 06' },
  ],
  'zone-aa-yeka': [
    { id: 'wor-aa-yek-01', name: 'Yeka Woreda 01' },
    { id: 'wor-aa-yek-02', name: 'Yeka Woreda 02' },
    { id: 'wor-aa-yek-03', name: 'Yeka Woreda 03' },
  ],
  'zone-aa-kirkos': [
    { id: 'wor-aa-kir-01', name: 'Kirkos Woreda 01' },
    { id: 'wor-aa-kir-02', name: 'Kirkos Woreda 02' },
  ],
  'zone-or-sheger': [
    { id: 'wor-or-sh-01', name: 'Sheger Sub-District 01' },
    { id: 'wor-or-sh-02', name: 'Sheger Sub-District 02' },
  ],
  'zone-or-east-shewa': [
    { id: 'wor-or-es-adama', name: 'Adama Rural Woreda' },
    { id: 'wor-or-es-bishoftu', name: 'Bishoftu Woreda' },
  ],
};

export interface LocationDropdownProps {
  role?: string;
  regionId?: string;
  zoneId?: string;
  woredaId?: string;
  supervisorId?: string;
  onChange?: (values: Record<string, string>) => void;
  disabled?: boolean;
  errors?: Record<string, string>;
}

export default function LocationDropdown({
  role = 'field_officer',
  regionId = '',
  zoneId = '',
  woredaId = '',
  supervisorId = '',
  onChange,
  disabled = false,
  errors = {}
}: LocationDropdownProps) {
  const { userT } = useUserLanguage();
  const [regions, setRegions] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [woredas, setWoredas] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);

  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);
  const [loadingWoredas, setLoadingWoredas] = useState(false);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);

  // 1. Fetch Regions on mount (API -> IndexedDB -> Fallback constants)
  useEffect(() => {
    let isMounted = true;
    const fetchRegions = async () => {
      setLoadingRegions(true);
      try {
        if (navigator.onLine) {
          const res = await fetch(`${API_BASE}/locations/regions`);
          if (res.ok) {
            const data = await res.json();
            if (isMounted && data.success && Array.isArray(data.data) && data.data.length > 0) {
              setRegions(data.data);
              setLoadingRegions(false);
              offlineDb.regions.bulkPut(data.data).catch(() => {});
              return;
            }
          }
        }
      } catch (err: any) {
        console.warn('Could not fetch regions from API, trying offline storage:', err.message);
      }

      try {
        const offRegs = await offlineDb.regions.orderBy('name').toArray();
        if (isMounted && offRegs.length > 0) {
          setRegions(offRegs);
          setLoadingRegions(false);
          return;
        }
      } catch (_e) {}

      if (isMounted) {
        setRegions(DEFAULT_ETHIOPIA_REGIONS);
      }
      setLoadingRegions(false);
    };

    fetchRegions();
    return () => { isMounted = false; };
  }, []);

  // 2. Fetch Zones when regionId changes
  useEffect(() => {
    if (!regionId) {
      setZones([]);
      setWoredas([]);
      setSupervisors([]);
      return;
    }

    let isMounted = true;
    const fetchZones = async () => {
      setLoadingZones(true);
      try {
        if (navigator.onLine) {
          const res = await fetch(`${API_BASE}/locations/regions/${regionId}/zones`);
          if (res.ok) {
            const data = await res.json();
            if (isMounted && data.success && Array.isArray(data.data) && data.data.length > 0) {
              setZones(data.data);
              setLoadingZones(false);
              offlineDb.zones.bulkPut(data.data).catch(() => {});
              return;
            }
          }
        }
      } catch (err: any) {
        console.warn('Could not fetch zones from API, trying offline storage:', err.message);
      }

      try {
        const offZones = await offlineDb.zones.where('regionId').equals(regionId).toArray();
        if (isMounted && offZones.length > 0) {
          setZones(offZones);
          setLoadingZones(false);
          return;
        }
      } catch (_e) {}

      if (isMounted) {
        setZones(DEFAULT_ETHIOPIA_ZONES[regionId] || [
          { id: `${regionId}-zone-01`, name: 'Central Zone' },
          { id: `${regionId}-zone-02`, name: 'Metropolitan Zone' }
        ]);
      }
      setLoadingZones(false);
    };

    fetchZones();
    return () => { isMounted = false; };
  }, [regionId]);

  // 3. Fetch Woredas and Supervisors when zoneId changes
  useEffect(() => {
    if (!zoneId) {
      setWoredas([]);
      setSupervisors([]);
      return;
    }

    let isMounted = true;
    const fetchWoredasAndSupervisors = async () => {
      setLoadingWoredas(true);
      setLoadingSupervisors(true);

      // Fetch Woredas if Field Officer
      if (role === 'field_officer') {
        let loadedWoredas = false;
        try {
          if (navigator.onLine) {
            const wRes = await fetch(`${API_BASE}/locations/zones/${zoneId}/woredas`);
            if (wRes.ok) {
              const wData = await wRes.json();
              if (isMounted && wData.success && Array.isArray(wData.data) && wData.data.length > 0) {
                setWoredas(wData.data);
                loadedWoredas = true;
                offlineDb.woredas.bulkPut(wData.data).catch(() => {});
              }
            }
          }
        } catch (_err) {}

        if (!loadedWoredas) {
          try {
            const offWor = await offlineDb.woredas.where('zoneId').equals(zoneId).toArray();
            if (isMounted && offWor.length > 0) {
              setWoredas(offWor);
              loadedWoredas = true;
            }
          } catch (_e) {}
        }

        if (!loadedWoredas && isMounted) {
          setWoredas(DEFAULT_ETHIOPIA_WOREDAS[zoneId] || [
            { id: `${zoneId}-wor-01`, name: 'Woreda 01' },
            { id: `${zoneId}-wor-02`, name: 'Woreda 02' },
            { id: `${zoneId}-wor-03`, name: 'Woreda 03' },
          ]);
        }
        setLoadingWoredas(false);
      }

      // Fetch Supervisors stationed in this zone
      let loadedSups = false;
      try {
        if (navigator.onLine) {
          const sRes = await fetch(`${API_BASE}/locations/zones/${zoneId}/supervisors`);
          if (sRes.ok) {
            const sData = await sRes.json();
            if (isMounted && sData.success && Array.isArray(sData.data)) {
              setSupervisors(sData.data);
              loadedSups = true;
            }
          }
        }
      } catch (_err) {}

      if (!loadedSups) {
        try {
          const allLocalUsers = await db.users.toArray();
          const localSups = allLocalUsers.filter(
            u => (u.role === 'supervisor' || u.role === 'SUPERVISOR') &&
                 (u.status === 'active' || u.isActive !== false) &&
                 (u.zoneId === zoneId || u.zone === zoneId)
          );
          if (isMounted) {
            setSupervisors(localSups);
          }
        } catch (_e) {}
      }
      setLoadingSupervisors(false);
    };

    fetchWoredasAndSupervisors();
    return () => { isMounted = false; };
  }, [zoneId, role]);

  // Auto-assign single supervisor if only 1 active supervisor in zone
  useEffect(() => {
    if (role === 'field_officer' && zoneId && supervisors.length === 1 && !supervisorId) {
      const regObj = regions.find(r => r.id === regionId);
      const zoneObj = zones.find(z => z.id === zoneId);
      const worObj = woredas.find(w => w.id === woredaId);
      onChange?.({
        regionId,
        region: regObj?.name || '',
        regionName: regObj?.name || '',
        zoneId,
        zone: zoneObj?.name || '',
        zoneName: zoneObj?.name || '',
        woredaId,
        woreda: worObj?.name || '',
        woredaName: worObj?.name || '',
        supervisorId: supervisors[0].id
      });
    }
  }, [supervisors, role, zoneId, supervisorId, regionId, woredaId, regions, zones, woredas]);

  const handleRegionChange = (e: any) => {
    const newRegId = e.target.value;
    const regObj = regions.find(r => r.id === newRegId);
    onChange?.({
      regionId: newRegId,
      region: regObj?.name || '',
      regionName: regObj?.name || '',
      zoneId: '',
      zone: '',
      zoneName: '',
      woredaId: '',
      woreda: '',
      woredaName: '',
      supervisorId: ''
    });
  };

  const handleZoneChange = (e: any) => {
    const newZoneId = e.target.value;
    const regObj = regions.find(r => r.id === regionId);
    const zoneObj = zones.find(z => z.id === newZoneId);
    onChange?.({
      regionId,
      region: regObj?.name || '',
      regionName: regObj?.name || '',
      zoneId: newZoneId,
      zone: zoneObj?.name || '',
      zoneName: zoneObj?.name || '',
      woredaId: '',
      woreda: '',
      woredaName: '',
      supervisorId: ''
    });
  };

  const handleWoredaChange = (e: any) => {
    const newWorId = e.target.value;
    const regObj = regions.find(r => r.id === regionId);
    const zoneObj = zones.find(z => z.id === zoneId);
    const worObj = woredas.find(w => w.id === newWorId);
    onChange?.({
      regionId,
      region: regObj?.name || '',
      regionName: regObj?.name || '',
      zoneId,
      zone: zoneObj?.name || '',
      zoneName: zoneObj?.name || '',
      woredaId: newWorId,
      woreda: worObj?.name || '',
      woredaName: worObj?.name || '',
      supervisorId
    });
  };

  const handleSupervisorChange = (e: any) => {
    const newSupId = e.target.value;
    const regObj = regions.find(r => r.id === regionId);
    const zoneObj = zones.find(z => z.id === zoneId);
    const worObj = woredas.find(w => w.id === woredaId);
    onChange?.({
      regionId,
      region: regObj?.name || '',
      regionName: regObj?.name || '',
      zoneId,
      zone: zoneObj?.name || '',
      zoneName: zoneObj?.name || '',
      woredaId,
      woreda: worObj?.name || '',
      woredaName: worObj?.name || '',
      supervisorId: newSupId
    });
  };

  if (role === 'manager') {
    return (
      <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 rounded-xl text-slate-700 dark:text-slate-300 text-xs">
        <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 mb-1">
          <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {userT('Organization-Wide Scope')}
        </div>
        <p className="text-slate-500 dark:text-slate-400">
          {userT('Managers hold system-wide administrative oversight. No Zone or Woreda assignment is required.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* 1. Region Dropdown */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            {userT('Region / Chartered City')} <span className="text-rose-500">*</span>
          </span>
          {loadingRegions && <Loader2 className="w-3 h-3 text-blue-600 dark:text-blue-400 animate-spin" />}
        </label>
        <Select
          value={regionId}
          onChange={handleRegionChange}
          disabled={disabled || loadingRegions}
          error={errors.regionId}
        >
          <option value="">{userT('Select Region / Chartered City')}</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {userT(r.name)} ({r.code})
            </option>
          ))}
        </Select>
      </div>

      {/* 2. Zone Dropdown (Supervisor & Field Officer) */}
      {(role === 'supervisor' || role === 'field_officer') && (
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              {userT('Zone / Sub-City')} <span className="text-rose-500">*</span>
            </span>
            {loadingZones && <Loader2 className="w-3 h-3 text-blue-600 dark:text-blue-400 animate-spin" />}
          </label>
          <Select
            value={zoneId}
            onChange={handleZoneChange}
            disabled={disabled || !regionId || loadingZones}
            error={errors.zoneId}
          >
            <option value="">{regionId ? userT('Zone / Sub-City') : userT('Select Region First')}</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {userT(z.name)}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* 3. Woreda Dropdown (Field Officer Only) */}
      {role === 'field_officer' && (
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              {userT('Woreda / Kebele')} <span className="text-rose-500">*</span>
            </span>
            {loadingWoredas && <Loader2 className="w-3 h-3 text-blue-600 dark:text-blue-400 animate-spin" />}
          </label>
          <Select
            value={woredaId}
            onChange={handleWoredaChange}
            disabled={disabled || !zoneId || loadingWoredas}
            error={errors.woredaId}
          >
            <option value="">{zoneId ? userT('Select Woreda') : userT('Select Zone First')}</option>
            {woredas.map((w) => (
              <option key={w.id} value={w.id}>
                {userT(w.name)}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* 4. Assigned Supervisor Dropdown (Field Officer Only) */}
      {role === 'field_officer' && (
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              {userT('Assigned Supervisor')} <span className="text-rose-500">*</span>
            </span>
            {loadingSupervisors && <Loader2 className="w-3 h-3 text-blue-600 dark:text-blue-400 animate-spin" />}
          </label>
          <Select
            value={supervisorId}
            onChange={handleSupervisorChange}
            disabled={disabled || !zoneId || loadingSupervisors || supervisors.length === 0}
            error={errors.supervisorId || (zoneId && !loadingSupervisors && supervisors.length === 0 ? userT('Zone requires at least one active Supervisor') : undefined)}
          >
            <option value="">
              {zoneId
                ? supervisors.length > 0
                  ? userT('Select Assigned Supervisor *')
                  : userT('No active supervisors in this zone')
                : userT('Select Zone First')}
            </option>
            {supervisors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || s.fullName} ({s.email})
              </option>
            ))}
          </Select>

          {/* Validation Alert: A Field Officer can only be registered/assigned/transferred if zone has at least one active supervisor */}
          {zoneId && !loadingSupervisors && supervisors.length === 0 && (
            <div className="mt-2.5 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-800 dark:text-rose-200">
                  {userT('No Active Supervisor Responsible for this Zone')}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-rose-600 dark:text-rose-300">
                  {userT('A Field Officer can only be registered, assigned, or transferred to a Woreda if that area has at least one active Supervisor responsible for that Zone. Please assign a Supervisor to this Zone first.')}
                </p>
              </div>
            </div>
          )}

          {supervisors.length > 1 && (
            <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
              {userT('Multiple supervisors detected for this zone. Please select the primary supervisor.')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
