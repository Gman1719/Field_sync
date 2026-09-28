// Modal for changing a staff member's operational role with audit safety

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, UserCheck, AlertCircle, Building2, User, Users } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role?.toLowerCase() || 'field_officer');
    }
  }, [user]);

  if (!user) return null;

  const currentRole = user.role?.toLowerCase() || 'field_officer';
  const hasChanged = selectedRole !== currentRole;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanged) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    let updatedUser = {
      ...user,
      role: selectedRole,
      updatedAt: new Date().toISOString(),
    };

    try {
      const token = localStorage.getItem('fieldsync_token');
      if (navigator.onLine && token) {
        try {
          const res = await fetch(`${API_BASE}/users/${user.id}/role`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ role: selectedRole.toUpperCase() }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && (data.user || data.data)) {
              updatedUser = { ...updatedUser, ...(data.user || data.data) };
            }
          }
        } catch (netErr: any) {
          console.warn('Backend API role update failed, saving locally:', netErr.message);
        }
      }

      // Persist in local databases
      try {
        await db.users.put(updatedUser);
        await offlineDb.users.put(updatedUser);
      } catch (_e) {
        try {
          await db.users.update(user.id, updatedUser);
        } catch (_inner) {}
      }

      // Audit log
      try {
        await ActivityLogger.log('ROLE_CHANGE', `Changed role of ${user.fullName || user.name} to ${selectedRole}`, {
          officerId: 'manager',
          relatedRecordId: user.id,
          metadata: { previousRole: currentRole, newRole: selectedRole },
        });
      } catch (_logErr) {}

      toast.success(`Role updated to ${selectedRole.replace('_', ' ')}`);
      if (onUserUpdated) onUserUpdated(updatedUser);
      onClose();
    } catch (err: any) {
      console.error('Role update error:', err);
      toast.error(err.message || 'Failed to update role');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Operational Role"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User Card */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 block">
              {user.fullName || user.name}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {user.email} • {user.employeeId || 'ID: ' + user.id?.slice(0, 8)}
            </span>
          </div>
          <Badge variant={user.role === 'manager' ? 'primary' : user.role === 'supervisor' ? 'info' : 'neutral'} className="capitalize text-xs font-semibold">
            {user.role?.replace('_', ' ')}
          </Badge>
        </div>

        {/* Role Options */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
            Select New System Role
          </label>
          <div className="space-y-2">
            {ROLES.map((role) => {
              const isSelected = selectedRole === role.id;
              const Icon = role.icon;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500/70 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-800 dark:text-slate-100'}`}>
                        {role.title}
                      </span>
                      {isSelected && (
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5" /> Selected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {role.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Change Notice */}
        {hasChanged && (
          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-xl text-xs flex items-start gap-2.5 text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Jurisdiction notice</span>
              <span>
                Role changes take effect immediately. If the officer's jurisdiction requires a new workstation assignment, use <strong>Change Location</strong> afterwards.
              </span>
            </div>
          </div>
        )}

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
            disabled={!hasChanged || isSubmitting}
            className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold"
          >
            Confirm Role Change
          </Button>
        </div>
      </form>
    </Modal>
  );
}
