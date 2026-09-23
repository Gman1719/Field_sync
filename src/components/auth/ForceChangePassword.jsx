// src/components/auth/ForceChangePassword.jsx – Enterprise Mandatory Password Change

import React, { useState } from 'react';
import { KeyRound, ShieldCheck, Check, AlertCircle, Eye, EyeOff, Lock } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function ForceChangePassword({ onSetPassword, userName, userEmail }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  const isFormValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSymbol;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Please enter your current temporary password');
      return;
    }

    if (!isFormValid) {
      setError('Password does not meet all required security criteria');
      return;
    }

    if (password === currentPassword) {
      setError('New password cannot be identical to the temporary password');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSetPassword(password, currentPassword);
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-card rounded-2xl border border-slate-200/90 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1E3A8A] flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Mandatory Password Update
              </h2>
              <p className="text-xs text-slate-500">
                Welcome, {userName || userEmail || 'Colleague'}. You must create a permanent password to access your workstation.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Current Temporary Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setError(''); }}
                  placeholder="Enter the temporary password given by manager"
                  required
                  className="w-full h-11 px-3.5 pr-11 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Input
                label="New Permanent Password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Create new secure password"
                required
              />
            </div>

            <div>
              <Input
                label="Confirm New Password"
                type="password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                placeholder="Re-enter your new password"
                required
              />
            </div>

            {/* Password Criteria Checklist */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
              <span className="font-semibold text-slate-700 block mb-1">Password Requirements:</span>
              <div className={`flex items-center gap-2 ${hasMinLength ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                <Check className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span>At least 8 characters long</span>
              </div>
              <div className={`flex items-center gap-2 ${hasUpper && hasLower ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                <Check className={`w-3.5 h-3.5 ${hasUpper && hasLower ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span>Contains uppercase & lowercase letters (A-Z, a-z)</span>
              </div>
              <div className={`flex items-center gap-2 ${hasNumber ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                <Check className={`w-3.5 h-3.5 ${hasNumber ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span>Contains numbers (0-9)</span>
              </div>
              <div className={`flex items-center gap-2 ${hasSymbol ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                <Check className={`w-3.5 h-3.5 ${hasSymbol ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span>Contains special symbols (!@#$%^&*...)</span>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              disabled={!isFormValid || !currentPassword}
              className="w-full justify-center mt-4"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Activate Account with New Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
