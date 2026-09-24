// src/components/auth/Login.jsx – Enterprise Modern SaaS Split-Screen Login View
// Redesigned with modernized UI, seamless navigation to Landing Page, role quick-fill, and live status.

import React, { useState, useEffect } from 'react';
import {
  Radio, Mail, Lock, Eye, EyeOff, ShieldCheck,
  CheckCircle2, ArrowRight, ArrowLeft, Wifi, WifiOff,
  Database, Server, Sparkles, Building2, Users, FileText
} from 'lucide-react';
import Button from '../ui/Button';

export default function Login({
  onLogin,
  loginError,
  isOnline = true,
  onBackToHome,
  initialRole = null
}) {
  const [email, setEmail] = useState('meseret@fieldsync.com');
  const [password, setPassword] = useState('officer123');
  const [selectedRole, setSelectedRole] = useState('officer');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Configure initial role if directed from Landing Page
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
    <div className="min-h-screen bg-slate-900 flex flex-col lg:flex-row font-sans selection:bg-[#1E3A8A] selection:text-white">
      {/* LEFT PANEL: Enterprise System Showcase (Visible on Large Screens) */}
      <div className="lg:w-1/2 bg-gradient-to-br from-slate-950 via-[#0F172A] to-[#1E3A8A] border-b lg:border-b-0 lg:border-r border-slate-800 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        {/* Top Branding */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#1E3A8A] to-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">FieldSync</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/60">
                  Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400">Offline-First Field Operations Platform</p>
            </div>
          </div>
        </div>

        {/* Center Architectural Value Proposition */}
        <div className="my-12 relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/80 text-blue-300 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>National Administrative Registry Framework</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Resilient Frontline Intake & Enterprise Synchronization
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
            Designed for continuous field operations with zero connectivity. Register citizens, submit daily reports, and resolve zonal duplicates with automatic background sync upon network reconnection.
          </p>

          {/* Operational Guarantees */}
          <div className="mt-8 space-y-3.5">
            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span><strong>Offline-First Storage:</strong> Dexie.js IndexedDB local sandbox with zero data loss.</span>
            </div>

            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200">
              <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span><strong>Hierarchical Integrity:</strong> Region → Zone → Woreda → Kebele scoping.</span>
            </div>

            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span><strong>Cryptographic Audits:</strong> Tamper-evident, append-only event logging.</span>
            </div>
          </div>
        </div>

        {/* Bottom Cluster Status Footer */}
        <div className="relative z-10 pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" />
            <span>PostgreSQL 16 Cluster • Express REST API</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span>{isOnline ? 'Network Online' : 'Offline Mode'}</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Modernized Authentication Card */}
      <div className="lg:w-1/2 bg-slate-950 flex flex-col justify-between p-6 sm:p-12 lg:p-16">
        {/* Top Header / Back Action */}
        <div className="flex items-center justify-between">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview</span>
            </button>
          )}

          {/* Connection Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Offline Storage</span>
              </>
            )}
          </div>
        </div>

        {/* Main Authentication Card */}
        <div className="max-w-md w-full mx-auto my-8 space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Workstation Sign In
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
              Select a pre-configured role profile to test or enter your organizational credentials:
            </p>
          </div>

          {/* Seed Demo Account Quick-Fill Cards */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
              Quick Role Test Profiles
            </span>
            <div className="grid grid-cols-3 gap-2">
              {/* Field Officer */}
              <button
                type="button"
                onClick={() => handleQuickFill('meseret@fieldsync.com', 'officer123', 'officer')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedRole === 'officer'
                    ? 'bg-blue-950/80 border-blue-500 text-white shadow-sm ring-1 ring-blue-500'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Officer</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-1">Meseret Hailu</div>
              </button>

              {/* Supervisor */}
              <button
                type="button"
                onClick={() => handleQuickFill('birhan@fieldsync.com', 'super123', 'supervisor')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedRole === 'supervisor'
                    ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Supervisor</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-1">Birhan Wolde</div>
              </button>

              {/* Manager */}
              <button
                type="button"
                onClick={() => handleQuickFill('abebe@fieldsync.com', 'manager123', 'manager')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedRole === 'manager'
                    ? 'bg-emerald-950/80 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Manager</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-1">Abebe Kebede</div>
              </button>
            </div>
          </div>

          {/* Error Message Box */}
          {(loginError || error) && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 text-rose-300 rounded-xl text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{loginError || error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
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
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  required
                  autoComplete="current-password"
                  className="w-full h-11 pl-10 pr-11 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 w-4 h-4"
                />
                <span>Remember this workstation</span>
              </label>

              <span className="text-[11px] text-slate-500">
                Encrypted Session
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <>
                  <span>Sign In to Workstation</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security & Audit Footer Note */}
          <div className="pt-4 border-t border-slate-850 text-center">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Protected by FieldSync RBAC. All login attempts are immutably logged.</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-600">
          FieldSync Enterprise Field Operations Platform • 2026
        </div>
      </div>
    </div>
  );
}