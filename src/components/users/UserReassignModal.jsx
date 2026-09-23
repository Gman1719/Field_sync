// src/components/users/UserReassignModal.jsx
// Reassign Staff Workstation Location & Supervisor Assignment

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MapPin, ShieldAlert, CheckCircle2, History } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
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

      toast.success(`Location updated for ${user.name}`);
      if (onUserUpdated) onUserUpdated(updatedUser);
      onClose();
    } catch (err) {
      console.error('Reassignment error:', err);
      toast.error('Reassignment error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reassign Workstation — ${user.name}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Historical Integrity Guarantee */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-3 text-xs text-blue-900">
          <History className="w-4 h-4 text-[#1E3A8A] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Historical Data Preserved</span>
            <p className="text-blue-800/90 leading-relaxed">
              Reassigning this staff member updates their active operational zone. All past citizen registrations, field reports, and attendance logs remain archived and unchanged.
            </p>
          </div>
        </div>

        {/* Current Assignment Summary */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
          <span className="text-slate-400 font-semibold uppercase tracking-wider block">Current Station:</span>
          <p className="text-slate-800 font-medium">
            {user.role === 'manager'
              ? 'Organization-wide'
              : `${user.region || 'No Region'} / ${user.zone || 'No Zone'} ${user.woreda ? `/ ${user.woreda}` : ''}`}
          </p>
        </div>

        {/* Cascading Location Hierarchy Dropdowns */}
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

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            <MapPin className="w-4 h-4 mr-1.5" />
            Apply Reassignment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
