import React, { useState, useRef } from 'react';
import {
  Upload, Camera, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE } from '../../config/api';
import { db } from '../../services/database';
import { ActivityLogger } from '../../services/activityLogger';
import { useUserLanguage } from '../../context/UserLanguageContext';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onProfileUpdated?: (user?: any) => void;
}

export default function EditProfileModal({ isOpen, onClose, user, onProfileUpdated }: EditProfileModalProps) {
  if (!user) return null;

  const { userT } = useUserLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Strictly user-scoped photo: NEVER fall back to other users' photos!
  const persistentSavedPhoto =
    user.profilePhotoUrl ||
    (user.id ? localStorage.getItem(`fieldsync_avatar_${user.id}`) : null) ||
    '';

  const [profilePhotoUrl, setProfilePhotoUrl] = useState(persistentSavedPhoto);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ') || user.fullName || user.name || user.email || 'User';

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(userT('Please select a valid image file (PNG, JPG, WebP, etc.)'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(userT('Image size must be less than 10MB'));
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
          setProfilePhotoUrl(compressed);
        } else {
          setProfilePhotoUrl(dataUrl);
        }
      };
      img.onerror = () => {
        setProfilePhotoUrl(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    setIsSubmitting(true);
    const photoUrl = profilePhotoUrl ? profilePhotoUrl.trim() : '';

    // Persist photo permanently in localStorage - across all user aliases
    const photoKeyIds = new Set<string>();
    if (user?.id) {
      photoKeyIds.add(String(user.id));
      photoKeyIds.add(String(user.id).toLowerCase());
    }
    if (user?.email) {
      photoKeyIds.add(String(user.email).toLowerCase());
    }
    if (user?.role === 'manager' || (user?.email || '').toLowerCase() === 'manager@fieldsync.com') {
      photoKeyIds.add('u_mgr');
      photoKeyIds.add('manager@fieldsync.com');
    }
    if (user?.role === 'supervisor' || (user?.email || '').toLowerCase() === 'supervisor@fieldsync.com') {
      photoKeyIds.add('u_sup');
    }

    photoKeyIds.forEach((k) => {
      if (photoUrl) {
        localStorage.setItem(`fieldsync_avatar_${k}`, photoUrl);
      } else {
        localStorage.removeItem(`fieldsync_avatar_${k}`);
      }
    });

    try {
      localStorage.removeItem('fieldsync_user_avatar');
    } catch (_e) {}

    let updatedUser: any = {
      ...user,
      profilePhotoUrl: photoUrl || null,
    };

    try {
      localStorage.setItem('fieldsync_user', JSON.stringify(updatedUser));
    } catch (_e) {}

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
            profilePhotoUrl: photoUrl || null,
          }),
        });

        const resData = await res.json();
        if (res.ok && resData.success && resData.data) {
          updatedUser = {
            ...updatedUser,
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
    } catch (_e) {}

    // Record activity log for this user
    try {
      if (user?.id) {
        await ActivityLogger.log('PROFILE_UPDATED', 'Updated profile picture', {
          officerId: user.id,
          metadata: {
            hasPhoto: Boolean(photoUrl),
          },
        });
      }
    } catch (_e) {}

    // Dispatch global event for instant reactive update across app components
    window.dispatchEvent(new CustomEvent('fieldsync-profile-updated', { detail: { user: updatedUser } }));
    window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: updatedUser }));
    try {
      window.dispatchEvent(new StorageEvent('storage', { key: `fieldsync_avatar_${user?.id}` }));
    } catch (_e) {}

    toast.success(userT('Profile picture updated successfully'));
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
      title={userT('Update Profile Picture')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        {/* Central Avatar Presentation */}
        <div className="flex flex-col items-center text-center pt-2 pb-1">
          <div className="relative group">
            <div className="relative w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 shadow-lg shadow-blue-500/20">
              <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center">
                {profilePhotoUrl ? (
                  <img
                    src={profilePhotoUrl}
                    alt={displayName}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center text-4xl font-extrabold tracking-tight">
                    {(displayName[0] || 'U').toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Camera Action Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 p-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md border-2 border-white dark:border-slate-900 transition-transform active:scale-95 cursor-pointer"
              title={userT('Upload Photo')}
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
            {displayName}
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {userT('Personalize your workspace avatar and identity')}
          </p>
        </div>

        {/* Action Controls for Avatar */}
        <div className="flex items-center justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={Upload}
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer font-semibold shadow-2xs text-xs px-4 py-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {userT('Upload Photo')}
          </Button>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700/60 cursor-pointer font-semibold"
          >
            {userT('Cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            onClick={handleSubmit}
            icon={Sparkles}
            className="cursor-pointer font-semibold shadow-sm"
          >
            {isSubmitting ? userT('Saving...') : userT('Save Changes')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
