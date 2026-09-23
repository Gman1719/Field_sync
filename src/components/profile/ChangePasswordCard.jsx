// src/components/profile/ChangePasswordCard.jsx
// Enterprise Password Change Component with Real-Time Strength Verification

import React, { useState } from 'react';
import {
  KeyRound, ShieldCheck, Check, AlertCircle, Eye, EyeOff, Lock, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE } from '../../config/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function ChangePasswordCard({ user, onPasswordChanged }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password Policy Checks
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const isPolicySatisfied = hasMinLength && hasUpper && hasLower && hasNumber && hasSymbol;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Please enter your current password');
      return;
    }

    if (!isPolicySatisfied) {
      setError('New password must satisfy all security requirements');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password cannot be identical to your current password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('fieldsync_token');
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: user?.id,
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to update password');
      }

      // If fresh JWT token returned, refresh in localStorage
      if (resData.data?.token) {
        localStorage.setItem('fieldsync_token', resData.data.token);
      }

      toast.success('Your password has been changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (onPasswordChanged) {
        onPasswordChanged();
      }
    } catch (err) {
      console.error('Password change error:', err);
      setError(err.message || 'Error updating password');
      toast.error(err.message || 'Failed to change password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border border-slate-200">
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#1E3A8A] flex items-center justify-center font-bold">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <CardTitle>Account Password & Security</CardTitle>
            <CardDescription>
              Update your account password. Ensure your new password is strong and unique.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setError(''); }}
                placeholder="Enter current password"
                required
                className="w-full h-10 px-3.5 pr-10 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                tabIndex={-1}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                placeholder="Create a strong password"
                required
                className="w-full h-10 px-3.5 pr-10 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Real-time Checklist */}
          {newPassword && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 animate-in fade-in duration-150">
              <span className="font-semibold text-slate-600 block text-[11px] mb-1">
                Password Security Criteria:
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                  <Check className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>8+ characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                  <Check className={`w-3.5 h-3.5 ${hasUpper ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>1 uppercase letter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                  <Check className={`w-3.5 h-3.5 ${hasLower ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>1 lowercase letter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                  <Check className={`w-3.5 h-3.5 ${hasNumber ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>1 number</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasSymbol ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                  <Check className={`w-3.5 h-3.5 ${hasSymbol ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>1 special symbol</span>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
              placeholder="Confirm your new password"
              required
              className="w-full h-10 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !currentPassword || !isPolicySatisfied || newPassword !== confirmPassword}
              icon={isSubmitting ? RefreshCw : Lock}
            >
              {isSubmitting ? 'Updating Password...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
