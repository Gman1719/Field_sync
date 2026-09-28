// Edit Staff Profile Modal with Enterprise UX/UI Design

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { User, Phone, Mail, CheckCircle2, Shield } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { validateEthiopianPhone } from '../../utils/phoneValidation';
import { API_BASE } from '../../config/api';
import { db } from '../../services/database';
import { offlineDb } from '../../db/offlineDb';
import { ActivityLogger } from '../../services/activityLogger';

interface UserEditModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated?: (user?: any) => void;
}

export default function UserEditModal({ user, isOpen, onClose, onUserUpdated }: UserEditModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      const parts = (user.fullName || user.name || '').trim().split(/\s+/);
      setFormData({
        firstName: user.firstName || parts[0] || '',
        middleName: user.middleName || (parts.length > 2 ? parts[1] : ''),
        lastName: user.lastName || (parts.length > 2 ? parts.slice(2).join(' ') : parts[1] || ''),
        phone: user.phone || user.phoneNumber || '',
      });
      setErrors({});
    }
  }, [user]);

  if (!user) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.firstName.trim()) errs.firstName = 'First name is required';
    if (!formData.middleName.trim()) errs.middleName = 'Father name is required';
    if (!formData.lastName.trim()) errs.lastName = 'Grandfather name is required';

    if (formData.phone && formData.phone.trim()) {
      const phoneErr = validateEthiopianPhone(formData.phone.trim(), false, 'Enter 10 digits (09/07...) or +251');
      if (phoneErr) errs.phone = phoneErr;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please resolve errors in the form');
      return;
    }

    setIsSubmitting(true);
    const fullName = [formData.firstName.trim(), formData.middleName.trim(), formData.lastName.trim()].filter(Boolean).join(' ');

    let updatedUser = {
      ...user,
      firstName: formData.firstName.trim(),
      middleName: formData.middleName.trim(),
      lastName: formData.lastName.trim(),
      fullName,
      name: fullName,
      phone: formData.phone?.trim() || null,
      phoneNumber: formData.phone?.trim() || null,
      updatedAt: new Date().toISOString(),
    };

    try {
      const token = localStorage.getItem('fieldsync_token');
      if (navigator.onLine && token) {
        try {
          const putRes = await fetch(`${API_BASE}/users/${user.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              firstName: formData.firstName.trim(),
              middleName: formData.middleName.trim(),
              lastName: formData.lastName.trim(),
              phoneNumber: formData.phone?.trim() || null,
              phone: formData.phone?.trim() || null,
            }),
          });

          if (putRes.ok) {
            const putData = await putRes.json();
            if (putData.success && (putData.user || putData.data)) {
              updatedUser = { ...updatedUser, ...(putData.user || putData.data) };
            }
          }
        } catch (netErr: any) {
          console.warn('Backend API update failed, persisting locally:', netErr.message);
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
        await ActivityLogger.log('USER_PROFILE_UPDATED', `Updated profile details for ${fullName}`, {
          officerId: 'manager',
          relatedRecordId: user.id,
        });
      } catch (_e) {}

      toast.success('Staff profile updated successfully');
      if (onUserUpdated) onUserUpdated(updatedUser);
      onClose();
    } catch (err: any) {
      console.error('Update user error:', err);
      toast.error(err.message || 'Failed to update user profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Staff Profile"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* User Summary Card */}
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
                {user.email} • {user.employeeId || 'ID: ' + user.id?.slice(0, 8)}
              </span>
            </div>
          </div>
          <Badge
            variant={user.role === 'manager' ? 'primary' : user.role === 'supervisor' ? 'info' : 'neutral'}
            className="capitalize text-xs font-semibold"
          >
            {user.role?.replace('_', ' ')}
          </Badge>
        </div>

        {/* Section 1: Full Name */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200 dark:border-slate-700">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Full Legal Name
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="First Name *"
              value={formData.firstName}
              onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))}
              placeholder="e.g. Abebe"
              required
              error={errors.firstName}
            />
            <Input
              label="Middle (Father) *"
              value={formData.middleName}
              onChange={(e) => setFormData(p => ({ ...p, middleName: e.target.value }))}
              placeholder="e.g. Bikila"
              required
              error={errors.middleName}
            />
            <Input
              label="Last (Grandfather) *"
              value={formData.lastName}
              onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))}
              placeholder="e.g. Demisse"
              required
              error={errors.lastName}
            />
          </div>
        </div>

        {/* Section 2: Contact Information */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200 dark:border-slate-700">
            <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Contact Details
            </h4>
          </div>
          <div>
            <Input
              label="Phone Number"
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
              placeholder="09XXXXXXXX or +2519XXXXXXXX"
              helperText="Ethiopian mobile format (09/07 + 8 digits) or +251"
              error={errors.phone}
            />
          </div>
        </div>

        {/* Footer Actions */}
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
            className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold px-6 shadow-xs"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
