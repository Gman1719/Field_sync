import React, { useState } from 'react';
import { 
  User as UserIcon, 
  Key, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Input from '../../components/ui/Input.tsx';
import Badge from '../../components/ui/Badge.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import ProfileService from '../../services/profileService.ts';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  // Profile Edit State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Update State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingProfile(true);
      setProfileFeedback(null);
      await ProfileService.updateProfile({ fullName, phoneNumber });
      setProfileFeedback({ type: 'success', text: 'Profile information updated successfully.' });
      setTimeout(() => setProfileFeedback(null), 4000);
    } catch (err: any) {
      setProfileFeedback({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update profile.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    try {
      setIsSavingPassword(true);
      setPasswordFeedback(null);
      await ProfileService.updatePassword({ currentPassword, newPassword });
      setPasswordFeedback({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordFeedback(null), 4000);
    } catch (err: any) {
      setPasswordFeedback({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update password.',
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const roleLabel =
    user?.role === 'MANAGER'
      ? 'System Administrator Manager'
      : user?.role === 'SUPERVISOR'
      ? 'Woreda Field Supervisor'
      : 'Kebele Field Officer';

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Personnel Profile</h1>
          <Badge variant={user?.role === 'MANAGER' ? 'purple' : user?.role === 'SUPERVISOR' ? 'info' : 'success'} size="sm">
            {user?.role}
          </Badge>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Review your stationing credentials, contact details, and account security
        </p>
      </div>

      {/* Profile Overview Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xl flex items-center justify-center shrink-0">
            {user?.fullName?.charAt(0) || 'U'}
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">{user?.fullName}</h2>
            <p className="text-xs text-slate-500">{roleLabel}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {user?.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {user?.phoneNumber || 'No phone set'}
              </span>
            </div>
          </div>
        </div>

        {/* Administrative Stationing */}
        <div className="mt-5 pt-4 border-t border-slate-100 bg-slate-50 rounded-lg p-3.5 space-y-1 text-xs">
          <span className="text-slate-400 block font-semibold text-[11px] uppercase tracking-wider">
            Assigned Ethiopian Jurisdiction:
          </span>
          <div className="flex items-center gap-2 text-slate-800 font-medium">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {user?.region?.name || 'Central Region'} &bull; {user?.role === 'MANAGER' ? 'Headquarters' : 'Woreda Station'}
            </span>
          </div>
        </div>
      </Card>

      {/* Edit Details & Change Password Forms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Edit */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <UserIcon className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Personal Information</h3>
          </div>

          {profileFeedback && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                profileFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {profileFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{profileFeedback.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-3">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="Phone Number"
              value={phoneNumber}
              placeholder="+251 91 123 4567"
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <div className="pt-2">
              <Button type="submit" size="sm" isLoading={isSavingProfile}>
                Save Profile Changes
              </Button>
            </div>
          </form>
        </Card>

        {/* Password Change */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Key className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">Change Password</h3>
          </div>

          {passwordFeedback && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                passwordFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {passwordFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{passwordFeedback.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="New Password (min 6 characters)"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <div className="pt-2">
              <Button type="submit" size="sm" variant="outline" isLoading={isSavingPassword}>
                Update Password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
