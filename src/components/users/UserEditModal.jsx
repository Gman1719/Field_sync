// src/components/users/UserEditModal.jsx
// Edit Staff Details and System Role

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { User, Phone, ShieldCheck, AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
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
      // Split existing name if firstName/middleName/lastName not already distinct
      const parts = (user.name || '').trim().split(' ');
      setFormData({
        firstName: user.firstName || parts[0] || '',
        middleName: user.middleName || (parts.length > 2 ? parts[1] : ''),
        lastName: user.lastName || (parts.length > 2 ? parts.slice(2).join(' ') : parts[1] || ''),
        phone: user.phone || '',
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
      const phoneErr = validateEthiopianPhone(formData.phone, false, 'Phone format: +2519... or 09...');
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
      toast.success('Staff details updated successfully');
      if (onUserUpdated) onUserUpdated(updatedUser);
      onClose();
    } catch (err) {
      console.error('Update user error:', err);
      toast.error('Failed to update user: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Profile — ${user.name}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Fields (Ethiopian Naming Convention) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="First Name"
            value={formData.firstName}
            onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))}
            required
            error={errors.firstName}
          />
          <Input
            label="Middle Name (Father)"
            value={formData.middleName}
            onChange={(e) => setFormData(p => ({ ...p, middleName: e.target.value }))}
            required
            error={errors.middleName}
          />
          <Input
            label="Last Name (Grandfather)"
            value={formData.lastName}
            onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))}
            required
            error={errors.lastName}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
            placeholder="+2519XXXXXXXX"
            error={errors.phone}
          />

          <Select
            label="System Role"
            value={formData.role}
            onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))}
            required
          >
            <option value="field_officer">Field Officer</option>
            <option value="supervisor">Supervisor</option>
            <option value="manager">Manager</option>
          </Select>
        </div>

        {formData.role !== user.role && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              Changing role will adjust required location hierarchy levels. You may need to reassign their workstation afterwards.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Work Shift"
            value={formData.shift}
            onChange={(e) => setFormData(p => ({ ...p, shift: e.target.value }))}
          >
            <option value="Day">Day</option>
            <option value="Evening">Evening</option>
            <option value="Night">Night</option>
          </Select>

          <Input
            label="Department"
            value={formData.department}
            onChange={(e) => setFormData(p => ({ ...p, department: e.target.value }))}
            placeholder="Field Operations"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
