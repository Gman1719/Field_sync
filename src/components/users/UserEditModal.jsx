// src/components/users/UserEditModal.jsx
// Edit Staff Details and System Role with Enterprise Polish

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { User, Phone, ShieldCheck, AlertCircle, Mail, CheckCircle2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Badge from '../ui/Badge';
import { validateEthiopianPhone } from '../../utils/phoneValidation';
import { API_BASE } from '../../config/api';
import { db } from '../../services/database';

export default function UserEditModal({ user, isOpen, onClose, onUserUpdated }) {
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    role: 'field_officer',
    shift: 'Day',
    department: 'Field Operations'
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      const parts = (user.name || '').trim().split(' ');
      setFormData({
        firstName: user.firstName || parts[0] || '',
        middleName: user.middleName || (parts.length > 2 ? parts[1] : ''),
        lastName: user.lastName || (parts.length > 2 ? parts.slice(2).join(' ') : parts[1] || ''),
        phone: user.phone || user.phoneNumber || '',
        role: user.role || 'field_officer',
        shift: user.shift || 'Day',
        department: user.department || 'Field Operations'
      });
      setErrors({});
    }
  }, [user]);

  if (!user) return null;

  const validate = () => {
    const errs = {};
    if (!formData.firstName.trim()) errs.firstName = 'First name is required';
    if (!formData.middleName.trim()) errs.middleName = 'Middle name (Father) is required';
    if (!formData.lastName.trim()) errs.lastName = 'Last name (Grandfather) is required';

    if (formData.phone) {
      const phoneErr = validateEthiopianPhone(formData.phone, false, 'Enter 10 digits (09/07 + 8 digits) or +251');
      if (phoneErr) errs.phone = phoneErr;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please resolve errors in the form');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('fieldsync_token');
      const authHeaders = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      // 1. Update personal details
      const putRes = await fetch(`${API_BASE}/users/${user.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          middleName: formData.middleName.trim(),
          lastName: formData.lastName.trim(),
          phoneNumber: formData.phone ? formData.phone.trim() : null,
          phone: formData.phone ? formData.phone.trim() : null,
          role: formData.role.toUpperCase(),
        })
      });
      const putData = await putRes.json();
      if (!putRes.ok || !putData.success) {
        throw new Error(putData.error || 'Failed to update user');
      }
      let updatedUser = putData.user || putData.data;

      // 2. If role changed, update role endpoint
      if (formData.role !== user.role) {
        const patchRoleRes = await fetch(`${API_BASE}/users/${user.id}/role`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ role: formData.role.toUpperCase() })
        });
        const roleData = await patchRoleRes.json();
        if (roleData.success) {
          updatedUser = roleData.user || roleData.data;
        }
      }

      await db.users.update(user.id, updatedUser);
      toast.success('Staff profile updated successfully');
      if (onUserUpdated) onUserUpdated(updatedUser);
      onClose();
    } catch (err) {
      console.error('Update user error:', err);
      toast.error(err.message || 'Failed to update user');
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
        {/* User Info Micro-Card */}
        <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] block">{user.name}</span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-[#94A3B8]">{user.email}</span>
          </div>
          <Badge variant={user.role === 'manager' ? 'primary' : user.role === 'supervisor' ? 'info' : 'neutral'} className="capitalize text-xs font-semibold">
            {user.role?.replace('_', ' ')}
          </Badge>
        </div>

        {/* Section 1: Ethiopian 3-Part Legal Name */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 pb-1 border-b border-[#E2E8F0] dark:border-[#334155]">
            <User className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
            <h4 className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1] uppercase tracking-wider">
              1. Ethiopian Legal Naming
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))}
              required
              error={errors.firstName}
            />
            <Input
              label="Middle (Father)"
              value={formData.middleName}
              onChange={(e) => setFormData(p => ({ ...p, middleName: e.target.value }))}
              required
              error={errors.middleName}
            />
            <Input
              label="Last (Grandfather)"
              value={formData.lastName}
              onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))}
              required
              error={errors.lastName}
            />
          </div>
        </div>

        {/* Section 2: Contact & System Role */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 pb-1 border-b border-[#E2E8F0] dark:border-[#334155]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
            <h4 className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1] uppercase tracking-wider">
              2. Contact & System Role
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              type="number"
              value={formData.phone}
              onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
              placeholder="09XXXXXXXX"
              helperText="10 digits (09/07 + 8 digits) or +251"
              error={errors.phone}
            />

            <Select
              label="Operational Role"
              value={formData.role}
              onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))}
              required
            >
              <option value="field_officer">Field Officer (Frontline Intake)</option>
              <option value="supervisor">Supervisor (Zonal Oversight)</option>
              <option value="manager">Manager (National Command)</option>
            </Select>
          </div>
        </div>

        {/* Warning If Role Changed */}
        {formData.role !== user.role && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Role Change Alert</span>
              <span>
                Changing system role modifies workstation hierarchy requirements. You may need to use &quot;Reassign Workstation&quot; afterwards to match their new jurisdiction.
              </span>
            </div>
          </div>
        )}

        {/* Footer Actions */}
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
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
