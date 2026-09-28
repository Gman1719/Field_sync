// Modal for changing a staff member's operational role and workstation location

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, UserCheck, AlertCircle, Building2, User, Users, MapPin } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LocationDropdown from './LocationDropdown';
import { API_BASE } from '../../config/api';
import { db } from '../../services/database';
import { offlineDb } from '../../db/offlineDb';
import { ActivityLogger } from '../../services/activityLogger';

interface UserRoleModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated?: (user?: any) => void;
}

const ROLES = [
  {
    id: 'field_officer',
    title: 'Field Officer',
    badge: 'neutral',
    description: 'Frontline citizen intake, biometric capture, and daily activity reporting at the woreda level.',
    icon: User,
  },
  {
    id: 'supervisor',
    title: 'Supervisor',
    badge: 'info',
    description: 'Zonal operational oversight, officer coordination, and monitoring aggregate registrations.',
    icon: Users,
  },
  {
    id: 'manager',
    title: 'Manager',
    badge: 'primary',
    description: 'National command authority, full system administration, staff management, and analytics.',
    icon: Building2,
  },
];

export default function UserRoleModal({ user, isOpen, onClose, onUserUpdated }: UserRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState('field_officer');
  const [assignment, setAssignment] = useState({
    regionId: '',
    zoneId: '',
    woredaId: '',
    supervisorId: '',
  });
  const [locationErrors, setLocationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role?.toLowerCase() || 'field_officer');
      setAssignment({
        regionId: user.regionId || '',
        zoneId: user.zoneId || '',
        woredaId: user.woredaId || '',
        supervisorId: user.supervisorId || '',
      });
      setLocationErrors({});
    }
  }, [user, isOpen]);

  if (!user) return null;

  const currentRole = user.role?.toLowerCase() || 'field_officer';

  const handleLocationChange = (values: Record<string, string>) => {
    setAssignment(prev => ({
      ...prev,
      ...values,
    }));
    // Clear errors for fields that got values
    if (Object.keys(values).length > 0) {
      setLocationErrors(prev => {
        const next = { ...prev };
        Object.keys(values).forEach(k => delete next[k]);
        return next;
      });
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};

    if (selectedRole === 'supervisor') {
      if (!assignment.regionId) errs.regionId = 'Region is required for Supervisor';
      if (!assignment.zoneId) errs.zoneId = 'Zone is required for Supervisor';
    } else if (selectedRole === 'field_officer') {
      if (!assignment.regionId) errs.regionId = 'Region is required for Field Officer';
      if (!assignment.zoneId) errs.zoneId = 'Zone is required for Field Officer';
      if (!assignment.woredaId) errs.woredaId = 'Woreda is required for Field Officer';
    }

    setLocationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please complete all required location fields for this role.');
      return;
    }

    setIsSubmitting(true);

    const finalRegionId = selectedRole === 'manager' ? null : assignment.regionId || null;
    const finalZoneId = selectedRole === 'manager' ? null : assignment.zoneId || null;
    const finalWoredaId = selectedRole === 'field_officer' ? assignment.woredaId || null : null;
    const finalSupervisorId = selectedRole === 'field_officer' ? assignment.supervisorId || null : null;

    let updatedUser = {
      ...user,
      role: selectedRole,
      regionId: finalRegionId,
      zoneId: finalZoneId,
      woredaId: finalWoredaId,
      supervisorId: finalSupervisorId,
      updatedAt: new Date().toISOString(),
    };

    try {
      const token = localStorage.getItem('fieldsync_token');
      const authHeaders = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      if (navigator.onLine && token) {
        // 1. Update Role with location parameters
        try {
          const roleRes = await fetch(`${API_BASE}/users/${user.id}/role`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({
              role: selectedRole.toUpperCase(),
              regionId: finalRegionId,
              zoneId: finalZoneId,
              woredaId: finalWoredaId,
              supervisorId: finalSupervisorId,
            }),
          });

          if (roleRes.ok) {
            const roleData = await roleRes.json();
            if (roleData.success && (roleData.user || roleData.data)) {
              updatedUser = { ...updatedUser, ...(roleData.user || roleData.data) };
            }
          }
        } catch (netErr: any) {
          console.warn('Backend role update failed, will update assignment:', netErr.message);
        }

        // 2. Also ensure assignment endpoint is synced if not manager
        if (selectedRole !== 'manager') {
          try {
            const assignRes = await fetch(`${API_BASE}/users/${user.id}/assignment`, {
              method: 'PATCH',
              headers: authHeaders,
              body: JSON.stringify({
                regionId: finalRegionId,
                zoneId: finalZoneId,
                woredaId: finalWoredaId,
                supervisorId: finalSupervisorId,
              }),
            });
            if (assignRes.ok) {
              const assignData = await assignRes.json();
              if (assignData.success && (assignData.user || assignData.data)) {
                updatedUser = { ...updatedUser, ...(assignData.user || assignData.data) };
              }
            }
          } catch (_e) {}
        }
      }

      // Persist in local databases
      try {
        await db.users.put(updatedUser);
      } catch (_e) {
        try { await db.users.update(user.id, updatedUser); } catch (_inner) {}
      }
      try {
        await offlineDb.users.put(updatedUser);
      } catch (_e) {}

      // Log activity
      try {
        await ActivityLogger.log('ROLE_AND_LOCATION_CHANGE', `Updated role to ${selectedRole} and location for ${user.fullName || user.name}`, {
          officerId: 'manager',
          relatedRecordId: user.id,
          metadata: { newRole: selectedRole, regionId: finalRegionId, zoneId: finalZoneId, woredaId: finalWoredaId },
        });
      } catch (_logErr) {}

      toast.success(`Role & workstation updated to ${selectedRole.replace('_', ' ')}`);
      if (onUserUpdated) onUserUpdated(updatedUser);
      onClose();
    } catch (err: any) {
      console.error('Role update error:', err);
      toast.error(err.message || 'Failed to update role & location');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Operational Role & Workstation Location"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* User Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              {(user.firstName?.[0] || user.fullName?.[0] || user.name?.[0] || 'U').toUpperCase()}
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block">
                {user.fullName || user.name}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {user.email} • ID: {user.employeeId || user.id?.slice(0, 8)}
              </span>
            </div>
          </div>
          <Badge variant={user.role === 'manager' ? 'primary' : user.role === 'supervisor' ? 'info' : 'neutral'} className="capitalize text-xs font-semibold">
            Current: {user.role?.replace('_', ' ')}
          </Badge>
        </div>

        {/* Section 1: Role Options */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            1. Select New Operational Role
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ROLES.map((role) => {
              const isSelected = selectedRole === role.id;
              const Icon = role.icon;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected && (
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" /> Selected
                      </span>
                    )}
                  </div>
                  <div>
                    <span className={`text-sm font-bold block mb-1 ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      {role.title}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {role.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Workstation Location Assignment */}
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              2. Workstation Location Assignment
            </h4>
          </div>

          {selectedRole === 'manager' ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-3">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block">
                  Organization-wide Coverage (National)
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Managers operate at the federal level across the Federal Democratic Republic of Ethiopia. No specific regional, zonal, or woreda assignment is required.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedRole === 'supervisor'
                  ? 'Assign the Region and Zone for this Supervisor. Supervisors coordinate all woredas within their assigned Zone.'
                  : 'Assign the Region, Zone, Woreda/Station, and direct Supervisor for this Field Officer.'}
              </p>
              <LocationDropdown
                role={selectedRole}
                regionId={assignment.regionId}
                zoneId={assignment.zoneId}
                woredaId={assignment.woredaId}
                supervisorId={assignment.supervisorId}
                onChange={handleLocationChange}
                errors={locationErrors}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold px-6 shadow-xs"
          >
            Save Role & Location
          </Button>
        </div>
      </form>
    </Modal>
  );
}
