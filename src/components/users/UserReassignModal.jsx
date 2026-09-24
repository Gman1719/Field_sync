// src/components/users/UserReassignModal.jsx
// Reassign Staff Workstation Location & Supervisor Assignment with Modern UI

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MapPin, ShieldAlert, CheckCircle2, History, ArrowRight, Building } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LocationDropdown from './LocationDropdown';
import { API_BASE } from '../../config/api';
import { db } from '../../services/database';

export default function UserReassignModal({ user, isOpen, onClose, onUserUpdated }) {
  const [assignment, setAssignment] = useState({
    regionId: '',
    zoneId: '',
    woredaId: '',
    supervisorId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setAssignment({
        regionId: user.regionId || '',
        zoneId: user.zoneId || '',
        woredaId: user.woredaId || '',
        supervisorId: user.supervisorId || ''
      });
      setErrors({});
    }
  }, [user]);

  if (!user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation based on role
    const newErrors = {};
    if (user.role === 'supervisor') {
      if (!assignment.regionId) newErrors.regionId = 'Region is required';
      if (!assignment.zoneId) newErrors.zoneId = 'Zone is required';
    } else if (user.role === 'field_officer') {
      if (!assignment.regionId) newErrors.regionId = 'Region is required';
      if (!assignment.zoneId) newErrors.zoneId = 'Zone is required';
      if (!assignment.woredaId) newErrors.woredaId = 'Woreda is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please complete all required location fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('fieldsync_token');
      const response = await fetch(`${API_BASE}/users/${user.id}/assignment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(assignment)
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to reassign user');
      }

      const updatedUser = resData.user || resData.data;

      // Update in Dexie local DB as well
      await db.users.update(user.id, updatedUser);

      toast.success(`Workstation location reassigned for ${user.name}`);
      if (onUserUpdated) onUserUpdated(updatedUser);
      onClose();
    } catch (err) {
      console.error('Reassignment error:', err);
      toast.error(err.message || 'Reassignment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reassign Operational Workstation"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User Identity Banner */}
        <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] block">{user.name}</span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-[#94A3B8]">{user.email}</span>
          </div>
          <Badge variant={user.role === 'supervisor' ? 'info' : 'neutral'} className="capitalize text-xs font-semibold">
            {user.role?.replace('_', ' ')}
          </Badge>
        </div>

        {/* Historical Integrity Guarantee Callout */}
        <div className="p-3 bg-blue-50/70 dark:bg-[#0F172A] border border-blue-200/80 dark:border-blue-900/50 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
          <History className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5 text-[#0F172A] dark:text-[#F8FAFC]">Historical Data Preserved</span>
            <p className="text-blue-800/90 dark:text-blue-300/90 leading-relaxed text-[11px]">
              Reassigning updates the active field operational boundary. All past citizen registrations and daily reports remain permanently tied to original locations in the national audit registry.
            </p>
          </div>
        </div>

        {/* Current Station vs New Station */}
        <div className="p-3 bg-slate-50 dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-xs space-y-1">
          <span className="text-slate-400 dark:text-[#94A3B8] font-bold uppercase tracking-wider block text-[10px]">Current Active Jurisdiction:</span>
          <p className="text-slate-800 dark:text-[#F8FAFC] font-semibold flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
            <span>
              {user.role === 'manager'
                ? 'Organization-wide (National)'
                : `${user.region || 'No Region'} / ${user.zone || 'No Zone'} ${user.woreda ? `/ ${user.woreda}` : ''}`}
            </span>
          </p>
        </div>

        {/* Cascading Location Hierarchy Dropdowns */}
        <div className="space-y-1.5 pt-1">
          <span className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1] uppercase tracking-wider block">
            Select New Ethiopian Hierarchy Assignment
          </span>
          <LocationDropdown
            role={user.role}
            regionId={assignment.regionId}
            zoneId={assignment.zoneId}
            woredaId={assignment.woredaId}
            supervisorId={assignment.supervisorId}
            onChange={(newValues) => {
              setAssignment(prev => ({ ...prev, ...newValues }));
              setErrors({});
            }}
            errors={errors}
          />
        </div>

        {/* Actions Footer */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E2E8F0] dark:border-[#334155]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="dark:bg-[#1E293B] dark:border-[#334155] dark:text-[#F8FAFC]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold"
          >
            <MapPin className="w-4 h-4 mr-1.5" />
            Apply Reassignment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
