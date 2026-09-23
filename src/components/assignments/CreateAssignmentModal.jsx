// src/components/assignments/CreateAssignmentModal.jsx
// Enterprise Modal for Supervisors and Managers to Provision Fieldwork Assignments

import React, { useState, useEffect } from 'react';
import { Briefcase, User, Calendar, MapPin, Target, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { offlineDb } from '../../db/offlineDb';
import { API_BASE } from '../../config/api';

import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';

export default function CreateAssignmentModal({
  isOpen,
  onClose,
  onAssignmentCreated,
  currentUser,
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetCount, setTargetCount] = useState('50');
  const [assignedOfficerId, setAssignedOfficerId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');

  // Location fields
  const [regionId, setRegionId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [woredaId, setWoredaId] = useState('');
  const [kebeleId, setKebeleId] = useState('');

  const [officers, setOfficers] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [woredas, setWoredas] = useState([]);
  const [kebeles, setKebeles] = useState([]);

  const [isLoading, setIsLoading] = useState(false);

  // 1. Fetch available officers and regions on open
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        // Load regions
        const regs = await offlineDb.regions.orderBy('name').toArray();
        setRegions(regs);

        // Load officers from server or Dexie
        const authToken = localStorage.getItem('fieldsync_token');
        if (navigator.onLine && authToken) {
          try {
            const res = await fetch(`${API_BASE}/users`, {
              headers: { Authorization: `Bearer ${authToken}` },
            });
            if (res.ok) {
              const resData = await res.json();
              const officerList = (resData.data || resData || []).filter(
                (u) => (u.role === 'field_officer' || u.role === 'FIELD_OFFICER') && (u.isActive ?? true)
              );
              setOfficers(officerList);
              if (officerList.length > 0 && !assignedOfficerId) {
                setAssignedOfficerId(officerList[0].id);
              }
              return;
            }
          } catch (e) {
            console.warn('Could not fetch officers from server:', e.message);
          }
        }

        // Fallback to Dexie
        const dexieOfficers = await offlineDb.users
          .where('role')
          .equals('field_officer')
          .toArray();
        setOfficers(dexieOfficers);
        if (dexieOfficers.length > 0 && !assignedOfficerId) {
          setAssignedOfficerId(dexieOfficers[0].id);
        }
      } catch (err) {
        console.error('Error loading assignment modal data:', err);
      }
    };

    loadData();
  }, [isOpen]);

  // 2. Cascading dropdowns
  useEffect(() => {
    const loadZones = async () => {
      if (!regionId) {
        setZones([]);
        setZoneId('');
        return;
      }
      const loaded = await offlineDb.zones.where('regionId').equals(regionId).sortBy('name');
      setZones(loaded);
      setZoneId('');
    };
    loadZones();
  }, [regionId]);

  useEffect(() => {
    const loadWoredas = async () => {
      if (!zoneId) {
        setWoredas([]);
        setWoredaId('');
        return;
      }
      const loaded = await offlineDb.woredas.where('zoneId').equals(zoneId).sortBy('name');
      setWoredas(loaded);
      setWoredaId('');
    };
    loadWoredas();
  }, [zoneId]);

  useEffect(() => {
    const loadKebeles = async () => {
      if (!woredaId) {
        setKebeles([]);
        setKebeleId('');
        return;
      }
      const loaded = await offlineDb.kebeles.where('woredaId').equals(woredaId).sortBy('name');
      setKebeles(loaded);
      setKebeleId('');
    };
    loadKebeles();
  }, [woredaId]);

  // 3. Handle Officer Selection auto-fill location
  const handleOfficerChange = (offId) => {
    setAssignedOfficerId(offId);
    const selected = officers.find((o) => o.id === offId);
    if (selected) {
      if (selected.regionId) setRegionId(selected.regionId);
      if (selected.zoneId) setZoneId(selected.zoneId);
      if (selected.woredaId) setWoredaId(selected.woredaId);
      if (selected.kebeleId) setKebeleId(selected.kebeleId);
    }
  };

  // 4. Submit Assignment
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Assignment title is required');
      return;
    }
    if (!assignedOfficerId) {
      toast.error('Please assign a field officer');
      return;
    }
    if (!targetCount || parseInt(targetCount, 10) < 1) {
      toast.error('Target citizen count must be at least 1');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        targetCount: parseInt(targetCount, 10),
        assignedOfficerId,
        woredaId: woredaId || null,
        kebeleId: kebeleId || null,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : null,
      };

      const authToken = localStorage.getItem('fieldsync_token');
      const res = await fetch(`${API_BASE}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to create assignment');
      }

      const created = resData.data;

      // Cache locally in Dexie
      await offlineDb.assignments.put({
        id: created.id,
        title: created.title,
        description: created.description,
        targetCount: created.targetCount,
        status: created.status,
        assignedOfficerId: created.assignedOfficerId,
        assignedSupervisorId: created.assignedSupervisorId,
        woredaId: created.woredaId,
        kebeleId: created.kebeleId,
        startDate: created.startDate,
        endDate: created.endDate,
      });

      toast.success('Assignment created & deployed to Field Officer!');
      if (onAssignmentCreated) {
        onAssignmentCreated(created);
      }
      onClose();
    } catch (err) {
      console.error('Error creating assignment:', err);
      toast.error(err.message || 'Failed to create assignment');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] text-white flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Create Fieldwork Assignment</h3>
              <p className="text-[11px] text-slate-500">Deploy registration target to Field Officer</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          <Input
            label="Assignment Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Bole Woreda 01 National ID Registration Drive"
            required
          />

          <Textarea
            label="Mission Description & Instructions (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide specific directives, priority target zones, or outreach instructions..."
            rows={2}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Assign To Field Officer <span className="text-rose-500">*</span>
              </label>
              <select
                value={assignedOfficerId}
                onChange={(e) => handleOfficerChange(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                required
              >
                <option value="">Select Field Officer</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.fullName || o.name || o.email} ({o.woreda || o.woredaName || 'Officer'})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Target Citizen Count"
              type="number"
              min="1"
              value={targetCount}
              onChange={(e) => setTargetCount(e.target.value)}
              placeholder="e.g. 100"
              required
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="Deadline (Target End Date)"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Location Scope */}
          <div className="p-3.5 bg-slate-50 rounded-xl space-y-3 border border-slate-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Fieldwork Location Scope (Optional Override)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Region</label>
                <select
                  value={regionId}
                  onChange={(e) => setRegionId(e.target.value)}
                  className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">Select Region</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Zone</label>
                <select
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  disabled={!regionId}
                  className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white disabled:bg-slate-100"
                >
                  <option value="">Select Zone</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Woreda</label>
                <select
                  value={woredaId}
                  onChange={(e) => setWoredaId(e.target.value)}
                  disabled={!zoneId}
                  className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white disabled:bg-slate-100"
                >
                  <option value="">Select Woreda</option>
                  {woredas.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Kebele</label>
                <select
                  value={kebeleId}
                  onChange={(e) => setKebeleId(e.target.value)}
                  disabled={!woredaId}
                  className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white disabled:bg-slate-100"
                >
                  <option value="">Select Kebele</option>
                  {kebeles.map((k) => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
            >
              <Check className="w-4 h-4 mr-1.5" />
              Create & Deploy Assignment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
