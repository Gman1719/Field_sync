// Edit Staff Profile Modal with Enterprise UX/UI Design & Modern Aesthetics

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { User, Phone, Mail, CheckCircle2, Shield, Sparkles } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { validateEthiopianPhone } from '../../utils/phoneValidation';
import { API_BASE } from '../../config/api';
import { db } from '../../services/database';
import { offlineDb } from '../../db/offlineDb';
import { ActivityLogger } from '../../services/activityLogger';
import { useUserLanguage } from '../../context/UserLanguageContext';

interface UserEditModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated?: (user?: any) => void;
}

export default function UserEditModal({ user, isOpen, onClose, onUserUpdated }: UserEditModalProps) {
  const { userT } = useUserLanguage();
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
    if (!formData.firstName.trim()) errs.firstName = userT('First name is required');
    if (!formData.middleName.trim()) errs.middleName = userT('Father name is required');
    if (!formData.lastName.trim()) errs.lastName = userT('Grandfather name is required');

    if (formData.phone && formData.phone.trim()) {
      const phoneErr = validateEthiopianPhone(formData.phone.trim(), false, userT('Enter 10 digits (09/07...) or +251'));
      if (phoneErr) errs.phone = userT(phoneErr);
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error(userT('Please resolve errors in the form'));
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

      toast.success(userT('Staff profile updated successfully'));
      if (onUserUpdated) onUserUpdated(updatedUser);
      onClose();
    } catch (err: any) {
      console.error('Update user error:', err);
      toast.error(err.message ? userT(err.message) : userT('Failed to update user profile'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewFullName = [formData.firstName.trim(), formData.middleName.trim(), formData.lastName.trim()]
    .filter(Boolean)
    .join(' ');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={userT('Edit Staff Profile')}
      description={userT('Update official identification name records and direct contact information')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Hero User Identity Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-gradient-to-br from-slate-50 via-blue-50/25 to-indigo-50/20 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-slate-800/80 p-4 shadow-xs">
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-blue-500/10 dark:bg-blue-400/5 blur-2xl" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-600/25 ring-2 ring-white dark:ring-slate-800">
                  {(user.firstName?.[0] || user.fullName?.[0] || user.name?.[0] || 'U').toUpperCase()}
                </div>
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 flex items-center justify-center"
                  title={userT('Active Staff Record')}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight capitalize truncate">
                  {user.fullName || user.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </span>
                  <span>•</span>
                  <span className="font-mono text-[11px] bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300 font-bold shrink-0">
                    {user.employeeId || (user.id ? `ID: ${user.id.slice(0, 8)}` : 'ID: --')}
                  </span>
                </div>
              </div>
            </div>
            <Badge
              variant={user.role === 'manager' ? 'primary' : user.role === 'supervisor' ? 'info' : 'neutral'}
              className="capitalize text-xs font-bold px-3 py-1 self-start sm:self-center shadow-xs shrink-0"
            >
              {userT(user.role?.replace('_', ' ') || '')}
            </Badge>
          </div>
        </div>

        {/* Section 1: Full Legal Name */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-100/80 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <User className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {userT('Full Legal Name')}
              </h4>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
              {userT('Three-part Ethiopian convention')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Input
                label={userT('First Name (Given)')}
                value={formData.firstName}
                onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))}
                placeholder={userT('e.g. Aster')}
                required
                error={errors.firstName ? userT(errors.firstName) : undefined}
              />
            </div>
            <div className="space-y-1">
              <Input
                label={userT('Father Name (Middle)')}
                value={formData.middleName}
                onChange={(e) => setFormData(p => ({ ...p, middleName: e.target.value }))}
                placeholder={userT('e.g. Awoke')}
                required
                error={errors.middleName ? userT(errors.middleName) : undefined}
              />
            </div>
            <div className="space-y-1">
              <Input
                label={userT('Grandfather (Last)')}
                value={formData.lastName}
                onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))}
                placeholder={userT('e.g. Tesfu')}
                required
                error={errors.lastName ? userT(errors.lastName) : undefined}
              />
            </div>
          </div>

          {/* Live Official Name Preview Bar */}
          <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs transition-colors">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {userT('Official Display Sequence:')}
            </span>
            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 capitalize">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{previewFullName || userT('Enter names above')}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Contact Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {userT('Contact Details')}
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            <div>
              <Input
                label={userT('Direct Phone Number')}
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                placeholder={userT('+2519XXXXXXXX or 09XXXXXXXX')}
                helperText={userT('Ethiopian mobile format (09/07 + 8 digits) or +251')}
                error={errors.phone ? userT(errors.phone) : undefined}
                icon={Phone}
              />
            </div>

            {/* Read-only System Email Pill */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                {userT('System Sign-in Email')}
              </label>
              <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono text-slate-700 dark:text-slate-300 truncate">
                    {user.email}
                  </span>
                </div>
                <Badge variant="neutral" className="text-[10px] font-semibold text-slate-500 shrink-0">
                  {userT('Read-Only')}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {userT('Associated authentication credential')}
              </p>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-700/80">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="font-medium text-xs sm:text-sm px-4"
          >
            {userT('Cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm px-5 shadow-sm shadow-blue-500/20"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            {userT('Save Changes')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
