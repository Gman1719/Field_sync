import React, { useState, useEffect } from 'react';
import {
  Mail, Lock, Eye, EyeOff,
  ArrowRight, Sun, Moon, Radio, ShieldCheck
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useUserLanguage } from '../../context/UserLanguageContext';
import { LanguageSelector } from '../common/LanguageSelector';
import heroImage from '../../assets/field-officer-hero.jpg';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<boolean | void> | void;
  loginError?: string | null;
  isOnline?: boolean;
  onBackToHome?: () => void;
  initialRole?: string | null;
}

export default function Login({
  onLogin,
  loginError,
  isOnline = true,
  onBackToHome,
  initialRole = null
}: LoginProps) {
  const { theme, toggleTheme } = useTheme();
  const { userT } = useUserLanguage();

  const [email, setEmail] = useState('officer@fieldsync.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Initialize credentials if directed from Landing Page role portal
  useEffect(() => {
    if (initialRole === 'MANAGER') {
      setEmail('manager@fieldsync.com');
      setPassword('Password123!');
    } else if (initialRole === 'SUPERVISOR') {
      setEmail('supervisor@fieldsync.com');
      setPassword('Password123!');
    } else if (initialRole === 'FIELD_OFFICER') {
      setEmail('officer@fieldsync.com');
      setPassword('Password123!');
    }
  }, [initialRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col lg:flex-row font-sans selection:bg-[#2563EB] selection:text-white transition-colors duration-200">
      
      {/* ============================================================== */}
      {/* DESKTOP HERO PANEL: Full-height Hero Image (Hidden on Mobile/Tablet) */}
      {/* ============================================================== */}
      <div className="hidden lg:flex lg:w-1/2 p-6 xl:p-8 flex-col justify-between relative">
        <div className="relative w-full h-full min-h-[calc(100vh-3rem)] rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-2xl bg-slate-950 flex flex-col justify-between p-8 xl:p-10 group">
          {/* Background Image */}
          <img
            src={heroImage}
            alt="FieldSync Officer performing offline citizen registration"
            className="absolute inset-0 w-full h-full object-cover object-center transform group-hover:scale-[1.02] transition-transform duration-700"
          />

          {/* Vignette Overlay Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/20 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/50 to-transparent pointer-events-none" />

          {/* Desktop Top Brand Badge */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 ring-2 ring-white/20">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white block">
                FieldSync
              </span>
              <span className="text-xs font-semibold text-blue-200/90 tracking-wide uppercase">
                {userT('National Citizen Registry')}
              </span>
            </div>
          </div>

          {/* Desktop Bottom Caption Card */}
          <div className="relative z-10 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 p-5 xl:p-6 shadow-xl max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>{userT('Offline-First Architecture')}</span>
            </div>
            <h3 className="text-lg xl:text-xl font-bold text-white leading-snug">
              {userT('Register citizens securely from anywhere — even without internet.')}
            </h3>
            <p className="mt-2 text-xs xl:text-sm text-slate-300 leading-relaxed">
              {userT('Frontline data intake with instant local storage and cryptographic synchronization across Ethiopia.')}
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FORM WORKSPACE PANEL: Fully Optimized for Mobile, Tablet & Desktop */}
      {/* ============================================================== */}
      <div className="w-full lg:w-1/2 min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-between p-4 sm:p-8 lg:p-10 xl:p-12 transition-colors duration-200 relative overflow-x-hidden">
        
        {/* Subtle Ambient Depth Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[500px] h-[340px] sm:h-[500px] bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-0" />

        {/* Top Header: "Back to Home", Language Selector & Theme Toggle */}
        <header className="relative z-20 flex items-center justify-between w-full max-w-xl mx-auto pt-2 pb-4">
          {onBackToHome ? (
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 sm:px-3.5 py-2 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ← {userT('Back to Home')}
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {/* Language Selector Dropdown */}
            <LanguageSelector
              dropdownAlign="right"
              className="relative z-50"
              buttonClassName="p-2 sm:p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            />

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className="p-2 sm:p-2.5 rounded-xl text-slate-600 dark:text-amber-400 hover:text-slate-900 dark:hover:text-amber-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        </header>

        {/* Center Main Card - Elegant & Fully Responsive */}
        <main className="relative z-10 w-full max-w-xl mx-auto my-auto py-4 sm:py-6">
          <div className="bg-white dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-slate-700 p-6 sm:p-10 lg:p-12 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-black/60 space-y-6 sm:space-y-8">
            
            {/* Mobile & Tablet Brand Header (Visible on < lg screens) */}
            <div className="lg:hidden flex items-center gap-3.5 pb-2 border-b border-slate-100 dark:border-slate-700/60">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-600/25 shrink-0 ring-1 ring-blue-500/20">
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white block">
                  FieldSync
                </span>
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                  {userT('National Citizen Registry')}
                </span>
              </div>
            </div>

            {/* Title & Guidance */}
            <div className="space-y-1.5 sm:space-y-2">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                {userT('Sign In')}
              </h2>
              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-300 font-normal">
                {userT('Enter your credentials to access your FieldSync account.')}
              </p>
            </div>

            {/* Error Message Box */}
            {(loginError || error) && (
              <div className="p-3.5 sm:p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/80 text-[#DC2626] dark:text-rose-300 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-3 animate-in fade-in duration-150">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] shrink-0" />
                <span className="flex-1">{loginError || error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">
                  {userT('Email Address')}
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 sm:left-4 pointer-events-none text-slate-400 dark:text-slate-400 flex items-center justify-center">
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@fieldsync.com"
                    required
                    autoComplete="email"
                    className="w-full h-12 sm:h-14 pl-11 sm:pl-13 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm sm:text-base placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:focus:ring-blue-400/20 focus:border-[#2563EB] dark:focus:border-blue-400 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">
                  {userT('Password')}
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 sm:left-4 pointer-events-none text-slate-400 dark:text-slate-400 flex items-center justify-center">
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={userT('Enter your password')}
                    required
                    autoComplete="current-password"
                    className="w-full h-12 sm:h-14 pl-11 sm:pl-13 pr-12 sm:pr-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm sm:text-base placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:focus:ring-blue-400/20 focus:border-[#2563EB] dark:focus:border-blue-400 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 sm:right-3.5 text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-0.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#2563EB] focus:ring-blue-500 dark:focus:ring-blue-400 w-4 h-4 sm:w-5 sm:h-5 cursor-pointer"
                  />
                  <span>{userT('Keep me signed in')}</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 sm:h-14 mt-3 rounded-xl bg-[#2563EB] hover:bg-blue-600 active:scale-[0.99] disabled:opacity-60 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 flex items-center justify-center gap-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{userT('Signing In...')}</span>
                  </div>
                ) : (
                  <>
                    <span>{userT('Sign In')}</span>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </main>

        {/* Minimalist Footer */}
        <footer className="relative z-10 text-center text-xs text-slate-500 dark:text-slate-400 max-w-xl mx-auto w-full pt-2 pb-2">
          {userT('FieldSync Platform • 2026')}
        </footer>
      </div>
    </div>
  );
}