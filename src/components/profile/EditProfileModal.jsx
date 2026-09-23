// src/components/profile/EditProfileModal.jsx
// Enterprise Profile Editing Modal with Ethiopian Phone Validation & Security Guards

import React, { useState } from 'react';
import {
  User, Mail, Phone, Image, Lock, ShieldCheck,
  AlertCircle, CheckCircle2, X, Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE } from '../../config/api';
import { validateEthiopianPhone } from '../../utils/phoneValidation';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';

export default function EditProfileModal({ isOpen, onClose, user, onProfileUpdated }) {
  if (!user) return null;

  const [form, setForm] = useState({
    firstName: user.firstName || user.name?.split(' ')[0] || '',
    middleName: user.middleName || '',
    lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
    email: user.email || '',
    phone: user.phoneNumber || user.phone || '',
    profilePhotoUrl: user.profilePhotoUrl || '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) {
      errs.firstName = 'First name is required';
    }
    if (!form.lastName.trim()) {
      errs.lastName = 'Last name is required';
    }
    if (!form.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    if (form.phone.trim()) {
      const phoneValidation = validateEthiopianPhone(form.phone.trim());
      if (!phoneValidation.isValid) {
        errs.phone = phoneValidation.message || 'Invalid Ethiopian phone number (e.g., 0911223344 or +251911223344)';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('fieldsync_token');
      const res = await fetch(`${API_BASE}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          middleName: form.middleName.trim() || null,
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          phoneNumber: form.phone.trim() || null,
          profilePhotoUrl: form.profilePhotoUrl.trim() || null,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to update profile');
      }

      toast.success('Profile details updated successfully');
      if (onProfileUpdated) {
        onProfileUpdated(resData.data);
      }
      onClose();
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error(err.message || 'Error updating profile');
      setErrors((prev) => ({ ...prev, submit: err.message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Personal Information"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errors.submit}</span>
          </div>
        )}

        {/* Permitted Personal Fields */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Personal Details (Editable)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
              <Input
                value={form.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="First Name"
                error={errors.firstName}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Middle Name
              </label>
              <Input
                value={form.middleName}
                onChange={(e) => handleChange('middleName', e.target.value)}
                placeholder="Father's Name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <Input
                value={form.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Grandfather's Name"
                error={errors.lastName}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="email@fieldsync.com"
                error={errors.email}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number
              </label>
              <Input
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="09... or +2519..."
                error={errors.phone}
              />
              <p className="text-[10px] text-slate-400 mt-1">Ethiopian mobile format (09/07 or +251)</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Profile Photo URL
            </label>
            <Input
              value={form.profilePhotoUrl}
              onChange={(e) => handleChange('profilePhotoUrl', e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>
        </div>

        {/* Read-Only Protected Administrative Fields */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Protected Administrative Information (Read-Only)
            </h4>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">User ID</span>
              <span className="font-mono font-medium text-slate-700 truncate block">{user.id}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">System Role</span>
              <Badge variant="primary" className="capitalize mt-0.5">
                {user.role?.replace('_', ' ')}
              </Badge>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Account Status</span>
              <Badge variant="success" dot className="mt-0.5">
                ACTIVE
              </Badge>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Assigned Region</span>
              <span className="font-semibold text-slate-800">{user.region || 'Unassigned'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Assigned Zone</span>
              <span className="font-semibold text-slate-800">{user.zone || 'Unassigned'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Assigned Woreda</span>
              <span className="font-semibold text-slate-800">{user.woreda || 'Unassigned'}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 italic">
            Note: Role and administrative location assignments can only be updated by your central Organization Manager.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            icon={Save}
          >
            {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
