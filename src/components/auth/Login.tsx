import React, { useState, useEffect } from 'react';
import {
  Mail, Lock, Eye, EyeOff,
  ArrowRight, Sun, Moon
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
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

  const [email, setEmail] = useState('meseret@fieldsync.com');
  const [password, setPassword] = useState('officer123');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Initialize credentials if directed from Landing Page role portal
  useEffect(() => {
    if (initialRole === 'MANAGER') {
      setEmail('abebe@fieldsync.com');
      setPassword('manager123');
    } else if (initialRole === 'SUPERVISOR') {
      setEmail('birhan@fieldsync.com');
      setPassword('super123');
    } else if (initialRole === 'FIELD_OFFICER') {
      setEmail('meseret@fieldsync.com');
      setPassword('officer123');
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0E1A] flex flex-col lg:flex-row font-sans selection:bg-[#2563EB] selection:text-white transition-colors duration-200">
      
      {/* ============================================================== */}
      {/* LEFT PANEL: Field Officer Hero Image Display (With Outer Margin) */}
      {/* ============================================================== */}
      <div className="lg:w-1/2 p-4 sm:p-6 lg:p-7 flex flex-col justify-end">
        <div className="relative w-full mt-[10mm] h-[calc(400px-10mm)] sm:h-[calc(500px-10mm)] lg:h-[calc(100%-10mm)] min-h-[calc(380px-10mm)] lg:min-h-[calc(100vh-3.5rem-10mm)] rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-xl dark:shadow-2xl bg-slate-900">
          <img
            src={heroImage}
            alt="FieldSync Officer performing offline citizen registration"
            className="w-full h-full object-cover object-center block"
          />
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT PANEL: Refined Authentication Workspace                  */}
      {/* ============================================================== */}
      <div className="lg:w-1/2 bg-slate-50 dark:bg-[#0A0E1A] flex flex-col justify-between p-4 sm:p-6 lg:p-8 xl:p-10 transition-colors duration-200 relative overflow-hidden">
        
        {/* Subtle Ambient Depth Glow (gives depth in dark mode) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-0" />

        {/* Top Header: "Back to Home" & Theme Toggle */}
        <div className="relative z-10 flex items-center justify-between w-full max-w-2xl mx-auto pt-2">
          {onBackToHome ? (
            <button
              type="button"
              onClick={onBackToHome}
              className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3.5 py-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-850/80 transition-colors cursor-pointer"
            >
              Back to Home
            </button>
          ) : (
            <div />
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="p-2.5 rounded-xl text-slate-600 dark:text-amber-400 hover:text-slate-900 dark:hover:text-amber-300 bg-white dark:bg-[#131A2A] border border-slate-200 dark:border-slate-700/80 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>

        {/* Center Main Card - Enlarged with Greater Height & Reduced White Space */}
        <div className="relative z-10 w-full max-w-2xl mx-auto my-auto py-4 sm:py-6">
          <div className="bg-white dark:bg-[#131A2A] rounded-3xl border border-slate-200/90 dark:border-slate-700/60 p-8 sm:p-14 lg:p-16 min-h-[580px] lg:min-h-[640px] flex flex-col justify-center shadow-xl shadow-slate-200/60 dark:shadow-2xl dark:shadow-black/60 space-y-8">
            
            {/* Title & Guidance */}
            <div className="space-y-2.5">
              <h2 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                Sign In
              </h2>
              <p className="text-base sm:text-lg text-slate-500 dark:text-slate-300 font-normal">
                Enter your credentials to access your FieldSync account.
              </p>
            </div>

            {/* Error Message Box */}
            {(loginError || error) && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/80 text-[#DC2626] dark:text-rose-300 rounded-xl text-sm font-medium flex items-center gap-3 animate-in fade-in duration-150">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] shrink-0" />
                <span>{loginError || error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-7">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2.5">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 pointer-events-none text-slate-400 dark:text-slate-400 flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@fieldsync.com"
                    required
                    autoComplete="email"
                    className="w-full h-14 pl-14 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white text-base sm:text-lg placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:focus:ring-blue-400/20 focus:border-[#2563EB] dark:focus:border-blue-400 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2.5">
                  Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 pointer-events-none text-slate-400 dark:text-slate-400 flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="w-full h-14 pl-14 pr-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white text-base sm:text-lg placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:focus:ring-blue-400/20 focus:border-[#2563EB] dark:focus:border-blue-400 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm sm:text-base text-slate-600 dark:text-slate-300 pt-1">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-[#2563EB] focus:ring-blue-500 dark:focus:ring-blue-400 w-5 h-5 cursor-pointer"
                  />
                  <span>Remember this device</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 mt-4 rounded-xl bg-[#2563EB] hover:bg-blue-600 active:scale-[0.99] disabled:opacity-60 text-white font-bold text-base sm:text-lg shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 flex items-center justify-center gap-3 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing In...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Minimalist Footer */}
        <div className="relative z-10 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto w-full pb-2">
          FieldSync Platform • 2026
        </div>
      </div>
    </div>
  );
}