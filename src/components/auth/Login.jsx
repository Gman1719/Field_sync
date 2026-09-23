// src/components/auth/Login.jsx – Enterprise Modern SaaS Login View

import React, { useState } from 'react';
import {
  Radio, Mail, Lock, Eye, EyeOff, ShieldCheck,
  CheckCircle2, ArrowRight, Wifi, Database, FileText
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function Login({ onLogin, loginError, isOnline = true }) {
  const [email, setEmail] = useState('meseret@fieldsync.com');
  const [password, setPassword] = useState('officer123');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleQuickFill = (fillEmail, fillPassword) => {
    setEmail(fillEmail);
    setPassword(fillPassword);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(email, password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1E3A8A] text-white shadow-lg mb-4">
          <Radio className="w-8 h-8 text-white animate-pulse" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          FieldSync Enterprise
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Offline-First Field Registration & Reporting Platform
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-card rounded-2xl border border-slate-200/90 space-y-6">
          {/* Quick-fill seed demo accounts */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
              Quick Sign-in (Seed Accounts)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('meseret@fieldsync.com', 'officer123')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center truncate ${
                  email === 'meseret@fieldsync.com'
                    ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                Officer
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('birhan@fieldsync.com', 'super123')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center truncate ${
                  email === 'birhan@fieldsync.com'
                    ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                Supervisor
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('abebe@fieldsync.com', 'manager123')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center truncate ${
                  email === 'abebe@fieldsync.com'
                    ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                Manager
              </button>
            </div>
          </div>

          {(loginError || error) && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium animate-in fade-in">
              {loginError || error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Work Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@fieldsync.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  required
                  autoComplete="current-password"
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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full justify-center mt-6"
            >
              Sign In to Workstation
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {/* System Guarantees */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center gap-1 text-[11px] text-slate-500">
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span>Offline Ready</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-[11px] text-slate-500">
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>PostgreSQL Sync</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Role Protected</span>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          FieldSync Enterprise Field Operations Platform • 2026
        </p>
      </div>
    </div>
  );
}