import React, { useState, useRef } from 'react';
import {
  User, Mail, Phone, Image, Lock, ShieldCheck,
  AlertCircle, CheckCircle2, X, Save, Upload, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE } from '../../config/api';
import { db } from '../../services/database';
import { ActivityLogger } from '../../services/activityLogger';
import { validateEthiopianPhone } from '../../utils/phoneValidation';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onProfileUpdated?: (user?: any) => void;
}

export default function EditProfileModal({ isOpen, onClose, user, onProfileUpdated }: EditProfileModalProps) {
  if (!user) return null;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Strictly user-scoped photo: NEVER fall back to other users' photos!
  const persistentSavedPhoto =
    user.profilePhotoUrl ||
    (user.id ? localStorage.getItem(`fieldsync_avatar_${user.id}`) : null) ||
    '';

  const [form, setForm] = useState({
    firstName: user.firstName || user.name?.split(' ')[0] || '',
    middleName: user.middleName || '',
    lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
    email: user.email || '',
    phone: user.phoneNumber || user.phone || '',
    profilePhotoUrl: persistentSavedPhoto,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WebP, etc.)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.88);
          setForm((prev) => ({ ...prev, profilePhotoUrl: compressed }));
        } else {
          setForm((prev) => ({ ...prev, profilePhotoUrl: dataUrl }));
        }
      };
      img.onerror = () => {
        setForm((prev) => ({ ...prev, profilePhotoUrl: dataUrl }));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setForm((prev) => ({ ...prev, profilePhotoUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
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
      const phoneValidation = validateEthiopianPhone(form.phone.trim(), false);
      if (!phoneValidation.isValid) {
        errs.phone = phoneValidation.message || 'Invalid Ethiopian phone number (e.g., 0911223344 or +251911223344)';
      }
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error(Object.values(errs)[0]);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (!validate()) return;

    setIsSubmitting(true);
    const photoUrl = form.profilePhotoUrl ? form.profilePhotoUrl.trim() : '';

    // Persist photo permanently in localStorage - STRICTLY per-user ID!
    if (user?.id) {
      if (photoUrl) {
        localStorage.setItem(`fieldsync_avatar_${user.id}`, photoUrl);
      } else {
        localStorage.removeItem(`fieldsync_avatar_${user.id}`);
      }
    }
    // Clean up any stale shared key
    try {
      localStorage.removeItem('fieldsync_user_avatar');
    } catch (_e) {}

    let updatedUser: any = {
      ...user,
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim() || null,
      lastName: form.lastName.trim(),
      fullName: [form.firstName.trim(), form.middleName.trim(), form.lastName.trim()].filter(Boolean).join(' '),
      name: [form.firstName.trim(), form.middleName.trim(), form.lastName.trim()].filter(Boolean).join(' '),
      email: form.email.trim().toLowerCase(),
      phoneNumber: form.phone.trim() || null,
      phone: form.phone.trim() || null,
      profilePhotoUrl: photoUrl || null,
    };

    try {
      const token = localStorage.getItem('fieldsync_token');
      if (navigator.onLine) {
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
            profilePhotoUrl: photoUrl || null,
          }),
        });

        const resData = await res.json();
        if (res.ok && resData.success && resData.data) {
          updatedUser = {
            ...updatedUser,
            ...resData.data,
            profilePhotoUrl: resData.data.profilePhotoUrl || photoUrl || null,
          };
        }
      }
    } catch (err: any) {
      console.warn('Backend update failed, saving locally:', err.message);
    }

    // Update offline Dexie database cache
    try {
      await db.users.put(updatedUser);
    } catch (_e) {
      // dexie write fallback
    }

    // Record activity log for this user
    try {
      if (user?.id) {
        await ActivityLogger.log('PROFILE_UPDATED', 'Updated personal profile details', {
          officerId: user.id,
          metadata: {
            fullName: updatedUser.fullName,
            email: updatedUser.email,
            phone: updatedUser.phoneNumber,
            hasPhoto: Boolean(photoUrl),
          },
        });
      }
    } catch (_e) {}

    toast.success('Profile details updated successfully');
    if (onProfileUpdated) {
      onProfileUpdated(updatedUser);
    }
    setIsSubmitting(false);
    onClose();
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
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errors.submit}</span>
          </div>
        )}

        {/* Permitted Personal Fields */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Personal Details (Editable)
          </h4>

          {/* Avatar / Photo Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Profile Photo / Avatar
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200/80 dark:border-[#334155]">
              <div className="relative group shrink-0">
                {form.profilePhotoUrl ? (
                  <img
                    src={form.profilePhotoUrl}
                    alt="Preview"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-[#2563EB] shadow-xs"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center text-2xl font-bold tracking-tight shadow-xs">
                    {(form.firstName?.[0] || user?.name?.[0] || 'U').toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={Upload}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload Photo
                  </Button>
                  {form.profilePhotoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={handleRemovePhoto}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Select a photo from your computer (PNG, JPG, WebP). It will be saved to your profile and displayed across your header, sidebar, and workstation.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Middle Name
              </label>
              <Input
                value={form.middleName}
                onChange={(e) => handleChange('middleName', e.target.value)}
                placeholder="Father's Name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <Input
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="09... or +2519..."
                error={errors.phone}
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Ethiopian mobile format (09/07 or +251)</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="dark:text-slate-300 dark:border-slate-700 dark:hover:bg-[#0F172A]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            onClick={handleSubmit}
            icon={Save}
          >
            {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
