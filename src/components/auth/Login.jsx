// src/components/auth/Login.jsx – Enterprise Modern SaaS Split-Screen Login View
// Fully styled with Light/Dark theme support, role selection without hardcoded names, and accessibility.

import React, { useState, useEffect } from 'react';
import {
  Radio, Mail, Lock, Eye, EyeOff, ShieldCheck,
  CheckCircle2, ArrowRight, ArrowLeft, Wifi, WifiOff,
  Building2, Sun, Moon
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function Login({
  onLogin,
  loginError,
  isOnline = true,
  onBackToHome,
  initialRole = null
}) {
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('meseret@fieldsync.com');
  const [password, setPassword] = useState('officer123');
  const [selectedRole, setSelectedRole] = useState('officer');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Initialize selected role if directed from Landing Page
  useEffect(() => {
    if (initialRole === 'MANAGER') {
      handleQuickFill('abebe@fieldsync.com', 'manager123', 'manager');
    } else if (initialRole === 'SUPERVISOR') {
      handleQuickFill('birhan@fieldsync.com', 'super123', 'supervisor');
    } else if (initialRole === 'FIELD_OFFICER') {
      handleQuickFill('meseret@fieldsync.com', 'officer123', 'officer');
    }
  }, [initialRole]);

  const handleQuickFill = (fillEmail, fillPassword, roleKey) => {
    setEmail(fillEmail);
    setPassword(fillPassword);
    setSelectedRole(roleKey);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] flex flex-col lg:flex-row font-sans selection:bg-[#2563EB] selection:text-white transition-colors duration-200">
      {/* LEFT PANEL: Enterprise Government Showcase (Blue in Light Mode, Dark Navy in Dark Mode) */}
      <div className="lg:w-5/12 bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-[#1D4ED8] dark:from-[#0F172A] dark:via-[#1E293B] dark:to-[#111827] dark:border-r dark:border-[#334155] p-8 sm:p-12 lg:p-16 flex flex-col justify-between text-white relative overflow-hidden transition-colors duration-200">
        {/* Subtle Background Glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-900/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg">
              <Radio className="w-6 h-6 animate-pulse text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">FieldSync</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  National
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium">Civil Registration & Field Command</p>
            </div>
          </div>
        </div>

        {/* Center Mission & Guarantees */}
        <div className="my-10 relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Official Government Operations Gateway</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Secure Access for Authorized Personnel
          </h1>

          <p className="text-sm text-blue-100 leading-relaxed">
            Welcome to the national field registry portal. FieldSync provides synchronized civil registration, biometric verification, and administrative reporting across all 14 Ethiopian regions and chartered cities.
          </p>

          <div className="space-y-3.5 pt-4 text-xs sm:text-sm text-blue-50">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-white/15 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              </div>
              <span><strong>Frontline Mobility:</strong> Register citizens offline with zero data loss.</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-white/15 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-blue-200" />
              </div>
              <span><strong>Zonal Scoping:</strong> Strict geographic boundaries and de-duplication.</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-white/15 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-indigo-200" />
              </div>
              <span><strong>Audit Compliance:</strong> Tamper-evident logging of all official actions.</span>
            </div>
          </div>
        </div>

        {/* Bottom Platform Status */}
        <div className="relative z-10 pt-6 border-t border-white/20 flex items-center justify-between text-xs text-blue-100">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-white" />
            <span>National Civil Registration Authority</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-300' : 'bg-amber-300'}`} />
            <span className="text-white">{isOnline ? 'Online Gateway' : 'Offline Storage'}</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Modernized Clean Authentication Form */}
      <div className="lg:w-7/12 bg-white dark:bg-[#111827] flex flex-col justify-between p-6 sm:p-12 lg:p-16 transition-colors duration-200">
        {/* Top Bar with Back Link, Theme Toggle, and Connection Status */}
        <div className="flex items-center justify-between">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Portal Home</span>
            </button>
          )}

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className="p-1.5 rounded-xl text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] transition-all"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Connection Status Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F1F5F9] dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#334155]">
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Offline Mode</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Sign-In Card Container */}
        <div className="max-w-md w-full mx-auto my-8 p-8 sm:p-10 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] shadow-sm dark:shadow-xl space-y-6 transition-colors duration-200">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-[#2563EB] dark:text-[#60A5FA] block mb-1">
              Workstation Access
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
              Sign In to Your Account
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
              Enter your credentials to access your authorized operational workstation:
            </p>
          </div>

          {/* Error Message Box */}
          {(loginError || error) && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-[#DC2626] dark:text-rose-300 rounded-xl text-xs font-medium flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#DC2626] shrink-0" />
              <span>{loginError || error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B] dark:text-[#94A3B8]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSelectedRole(null);
                  }}
                  placeholder="staff@fieldsync.com"
                  required
                  autoComplete="email"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] text-sm placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B] dark:text-[#94A3B8]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full h-11 pl-10 pr-11 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] text-sm placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8] pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#E2E8F0] dark:border-[#334155] text-[#2563EB] focus:ring-[#2563EB] w-4 h-4"
                />
                <span>Remember this workstation</span>
              </label>

              <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                Encrypted Session
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-bold text-sm shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
          FieldSync National Civil Registration Platform • 2026
        </div>
      </div>
    </div>
  );
}