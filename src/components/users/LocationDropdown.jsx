// src/components/users/LocationDropdown.jsx
// Cascading Ethiopian Administrative Location Dropdowns (Region -> Zone -> Woreda -> Supervisor)

import React, { useState, useEffect } from 'react';
import { MapPin, Building, Home, UserCheck, Loader2 } from 'lucide-react';
import Select from '../ui/Select';
import { API_BASE } from '../../config/api';

export default function LocationDropdown({
  role = 'field_officer',
  regionId = '',
  zoneId = '',
  woredaId = '',
  supervisorId = '',
  onChange,
  disabled = false,
  errors = {}
}) {
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [woredas, setWoredas] = useState([]);
  const [supervisors, setSupervisors] = useState([]);

  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);
  const [loadingWoredas, setLoadingWoredas] = useState(false);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);

  // 1. Fetch Regions on mount
  useEffect(() => {
    let isMounted = true;
    const fetchRegions = async () => {
      setLoadingRegions(true);
      try {
        const res = await fetch(`${API_BASE}/locations/regions`);
        const data = await res.json();
        if (isMounted && data.success) {
          setRegions(data.data);
        }
      } catch (err) {
        console.warn('Could not fetch regions from API, using fallback:', err.message);
      } finally {
        if (isMounted) setLoadingRegions(false);
      }
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
        const res = await fetch(`${API_BASE}/locations/regions/${regionId}/zones`);
        const data = await res.json();
        if (isMounted && data.success) {
          setZones(data.data);
        }
      } catch (err) {
        console.warn('Could not fetch zones:', err.message);
      } finally {
        if (isMounted) setLoadingZones(false);
      }
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

      try {
        // Fetch Woredas if Field Officer
        if (role === 'field_officer') {
          const wRes = await fetch(`${API_BASE}/locations/zones/${zoneId}/woredas`);
          const wData = await wRes.json();
          if (isMounted && wData.success) {
            setWoredas(wData.data);
          }
        }

        // Fetch Supervisors stationed in this zone
        const sRes = await fetch(`${API_BASE}/locations/zones/${zoneId}/supervisors`);
        const sData = await sRes.json();
        if (isMounted && sData.success) {
          setSupervisors(sData.data);

          // Auto-select supervisor if only 1 active supervisor exists and none is chosen yet
          if (sData.data.length === 1 && !supervisorId && role === 'field_officer') {
            onChange({
              regionId,
              zoneId,
              woredaId,
              supervisorId: sData.data[0].id
            });
          }
        }
      } catch (err) {
        console.warn('Could not fetch woredas/supervisors:', err.message);
      } finally {
        if (isMounted) {
          setLoadingWoredas(false);
          setLoadingSupervisors(false);
        }
      }
    };

    fetchWoredasAndSupervisors();
    return () => { isMounted = false; };
  }, [zoneId, role]);

  const handleRegionChange = (e) => {
    const newRegId = e.target.value;
    onChange({
      regionId: newRegId,
      zoneId: '',
      woredaId: '',
      supervisorId: ''
    });
  };

  const handleZoneChange = (e) => {
    const newZoneId = e.target.value;
    onChange({
      regionId,
      zoneId: newZoneId,
      woredaId: '',
      supervisorId: ''
    });
  };

  const handleWoredaChange = (e) => {
    const newWorId = e.target.value;
    onChange({
      regionId,
      zoneId,
      woredaId: newWorId,
      supervisorId
    });
  };

  const handleSupervisorChange = (e) => {
    const newSupId = e.target.value;
    onChange({
      regionId,
      zoneId,
      woredaId,
      supervisorId: newSupId
    });
  };

  if (role === 'manager') {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs">
        <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1">
          <Building className="w-4 h-4 text-[#1E3A8A]" />
          Organization-Wide Scope
        </div>
        <p className="text-slate-500">
          Managers hold system-wide administrative oversight. No Zone or Woreda assignment is required.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Region Dropdown */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#1E3A8A]" />
            Region / Chartered City <span className="text-rose-500">*</span>
          </span>
          {loadingRegions && <Loader2 className="w-3 h-3 text-[#1E3A8A] animate-spin" />}
        </label>
        <Select
          value={regionId}
          onChange={handleRegionChange}
          disabled={disabled || loadingRegions}
          error={errors.regionId}
        >
          <option value="">Select Region / Chartered City</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.code})
            </option>
          ))}
        </Select>
      </div>

      {/* 2. Zone Dropdown (Supervisor & Field Officer) */}
      {(role === 'supervisor' || role === 'field_officer') && (
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[#1E3A8A]" />
              Zone / Sub-City <span className="text-rose-500">*</span>
            </span>
            {loadingZones && <Loader2 className="w-3 h-3 text-[#1E3A8A] animate-spin" />}
          </label>
          <Select
            value={zoneId}
            onChange={handleZoneChange}
            disabled={disabled || !regionId || loadingZones}
            error={errors.zoneId}
          >
            <option value="">{regionId ? 'Select Zone / Sub-City' : 'Select Region First'}</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* 3. Woreda Dropdown (Field Officer Only) */}
      {role === 'field_officer' && (
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-[#1E3A8A]" />
              Woreda / Kebele <span className="text-rose-500">*</span>
            </span>
            {loadingWoredas && <Loader2 className="w-3 h-3 text-[#1E3A8A] animate-spin" />}
          </label>
          <Select
            value={woredaId}
            onChange={handleWoredaChange}
            disabled={disabled || !zoneId || loadingWoredas}
            error={errors.woredaId}
          >
            <option value="">{zoneId ? 'Select Woreda' : 'Select Zone First'}</option>
            {woredas.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* 4. Assigned Supervisor Dropdown (Field Officer Only) */}
      {role === 'field_officer' && (
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#1E3A8A]" />
              Assigned Supervisor
            </span>
            {loadingSupervisors && <Loader2 className="w-3 h-3 text-[#1E3A8A] animate-spin" />}
          </label>
          <Select
            value={supervisorId}
            onChange={handleSupervisorChange}
            disabled={disabled || !zoneId || loadingSupervisors}
          >
            <option value="">
              {zoneId
                ? supervisors.length > 0
                  ? 'Select Supervisor (or leave unassigned)'
                  : 'No active supervisors in this zone'
                : 'Select Zone First'}
            </option>
            {supervisors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.email})
              </option>
            ))}
          </Select>
          {supervisors.length > 1 && (
            <p className="mt-1 text-[11px] text-amber-600">
              Multiple supervisors detected for this zone. Please select the primary supervisor.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
