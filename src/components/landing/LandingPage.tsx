import React, { useState, useEffect } from 'react';
import {
  Radio, ShieldCheck, Users, BarChart3, CheckCircle2,
  ArrowRight, MapPin, Building2,
  Lock, RefreshCw, Smartphone,
  Sun, Moon, Menu, X,
  Activity, Shield, Database, Globe,
  WifiOff, ArrowUp
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useUserLanguage } from '../../context/UserLanguageContext';
import { useAuth } from '../../context/AuthContext';
import { LanguageSelector } from '../common/LanguageSelector';
import { API_BASE } from '../../config/api';
import heroImage from '../../assets/field-officer-hero.jpg';

interface LandingPageProps {
  onGoToLogin: (role?: string) => void;
  isOnline?: boolean;
}

export default function LandingPage({ onGoToLogin }: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();
  const { userT } = useUserLanguage();
  const { user } = useAuth();

  // Dynamic telemetry with user fallback numbers
  const [telemetry, setTelemetry] = useState<{
    loading: boolean;
    healthy: boolean;
    counts: {
      regions: number | string;
      zones: number | string;
      woredas: number | string;
      citizens: number | string;
      users: number | string;
    };
  }>({
    loading: true,
    healthy: true,
    counts: {
      regions: 14,
      zones: 107,
      woredas: 929,
      citizens: 14,
      users: 19,
    },
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch real-time numbers from backend if available
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`);
        if (res.ok) {
          const data = await res.json();
          setTelemetry({
            loading: false,
            healthy: data.status === 'healthy',
            counts: {
              regions: data.database?.counts?.regions ?? 14,
              zones: data.database?.counts?.zones ?? 107,
              woredas: data.database?.counts?.woredas ?? 929,
              citizens: data.database?.counts?.citizens ?? 14,
              users: data.database?.counts?.users ?? 19,
            },
          });
        }
      } catch (err) {
        setTelemetry((prev) => ({ ...prev, loading: false }));
      }
    };
    fetchTelemetry();
  }, []);

  const navLinks = [
    { href: '#built-for-field', label: userT('Features') },
    { href: '#how-it-works', label: userT('How It Works') },
    { href: '#field-conditions', label: userT('Field Conditions') },
    { href: '#roles', label: userT('User Portals') },
    { href: '#operations', label: userT('Operations') },
    { href: '#security', label: userT('Security') },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 text-[#0F172A] dark:text-[#F8FAFC] font-sans antialiased selection:bg-[#2563EB] selection:text-white flex flex-col transition-colors duration-200">
      
      {/* ============================================================== */}
      {/* 1. TOP NAVIGATION BAR                                          */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors duration-200">
        <div className="max-w-[1440px] 2xl:max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-4">
          
          {/* Left: Brand Identity */}
          <a href="#" className="flex items-center gap-3 shrink-0 group focus:outline-none">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2563EB] to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform duration-200 ring-1 ring-blue-500/20">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black tracking-tight text-[#0F172A] dark:text-white block">
                FieldSync
              </span>
            </div>
          </a>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-all duration-150"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right: Actions (Language Selector, Theme Toggle, Divider & Login Button) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Language Selector Dropdown */}
            <LanguageSelector
              dropdownAlign="right"
              buttonClassName="p-2 sm:p-2.5 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            />

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className="p-2 sm:p-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              )}
            </button>

            {/* Subtle Divider */}
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700/80 hidden sm:block" />

            {/* Login CTA Button */}
            <button
              type="button"
              onClick={() => onGoToLogin()}
              className="px-5 sm:px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold shadow-sm hover:shadow-md hover:shadow-blue-600/25 transition-all duration-150 cursor-pointer flex items-center gap-2"
            >
              <span>{user ? userT('Go to Dashboard') : userT('Login')}</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl px-4 py-5 space-y-3 animate-in slide-in-from-top-2 duration-150 shadow-xl">
            <div className="grid grid-cols-2 gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-[#2563EB] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {userT('Language')}
              </span>
              <LanguageSelector
                dropdownAlign="left"
                buttonClassName="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onGoToLogin();
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-bold text-center shadow-md shadow-blue-600/20"
              >
                {user ? userT('Go to Dashboard') : userT('Access FieldSync Platform')}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ============================================================== */}
      {/* 2. HERO SECTION                                                */}
      {/* ============================================================== */}
      <section className="relative pt-10 pb-16 sm:pt-14 sm:pb-20 lg:pt-20 lg:pb-24 bg-[#F8FAFC] dark:bg-slate-900 border-b border-[#E2E8F0] dark:border-slate-800 overflow-hidden transition-colors duration-200">
        
        {/* Subtle Engineering Dot Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] dark:bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:24px_24px] opacity-40 dark:opacity-25 pointer-events-none" />

        {/* Ambient Gradient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[420px] bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-teal-500/10 dark:from-blue-500/15 dark:via-indigo-500/15 dark:to-teal-500/15 blur-3xl -z-10 pointer-events-none rounded-full" />

        <div className="max-w-[1440px] 2xl:max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-14 items-center">
            
            {/* Left Column (Desktop) / Top Column (Mobile/Tablet): Hero Headlines, Narrative and CTAs */}
            <div className="order-1 lg:col-span-6 xl:col-span-6 text-left space-y-5 sm:space-y-6 max-w-2xl">
              
              {/* Status / Scope Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800 text-xs font-bold text-blue-700 dark:text-blue-300 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{userT('Official Citizen Registration Platform')}</span>
              </div>

              {/* Main Headline */}
              <div className="space-y-2 animate-hero-headline">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[3.4rem] font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight leading-[1.1]">
                  {userT('Connecting Field Teams')} <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-[#2563EB] via-indigo-600 to-sky-500 dark:from-[#60A5FA] dark:via-indigo-300 dark:to-sky-300 bg-clip-text text-transparent">
                    {userT('to the National Registry')}
                  </span>
                </h1>
              </div>

              {/* Subtitle */}
              <div className="animate-hero-subtitle">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[#0F172A] dark:text-white tracking-tight leading-snug">
                  {userT('Register citizens securely from anywhere — even without internet.')}
                </p>
              </div>

              {/* Explanatory Narrative */}
              <div className="space-y-3 text-base sm:text-lg leading-relaxed">
                <p className="font-medium text-[#1E293B] dark:text-[#E2E8F0]">
                  {userT('FieldSync is an offline-first citizen registration platform built for field teams working in remote and low-connectivity areas.')}
                </p>
                <p className="text-[#334155] dark:text-slate-300 text-sm sm:text-base">
                  {userT('Field officers can register citizens, securely store records on their devices, and automatically synchronize data with the central system when connectivity is restored.')}
                </p>
              </div>

              {/* Primary & Secondary Hero Action Buttons (Crucial on Mobile!) */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => onGoToLogin()}
                  className="px-6 py-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all cursor-pointer"
                >
                  <span>{user ? userT('Go to Dashboard') : userT('Access Platform')}</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <a
                  href="#built-for-field"
                  className="px-6 py-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm sm:text-base flex items-center justify-center transition-all shadow-xs"
                >
                  {userT('Explore Capabilities')}
                </a>
              </div>

              {/* Quick Feature Badges Row */}
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center gap-y-2 gap-x-5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{userT('Offline SQLite / IndexedDB')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{userT('14 Ethiopian Regions')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{userT('SHA-256 Conflict Engine')}</span>
                </div>
              </div>

            </div>

            {/* Right Column (Desktop) / Second Column (Mobile/Tablet): Hero Image with Floating Badges */}
            <div className="order-2 lg:col-span-6 xl:col-span-6 relative group">
              {/* Ambient backlight glow */}
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-teal-500/20 rounded-3xl blur-2xl opacity-60 dark:opacity-40 pointer-events-none" />
              
              {/* Image Container with Badges */}
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-[#E2E8F0] dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all duration-300 bg-slate-900">
                <img
                  src={heroImage}
                  alt="FieldSync Officer performing offline citizen registration in remote Ethiopia"
                  className="w-full h-auto max-h-[500px] sm:max-h-[560px] lg:max-h-[640px] object-cover object-center transform group-hover:scale-[1.01] transition-transform duration-500 block"
                />

                {/* Floating Badge: Offline Resilience (Bottom Left) */}
                <div className="absolute bottom-3 left-3 sm:bottom-5 sm:left-5 bg-slate-900/90 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/15 p-3 sm:p-4 text-white shadow-xl flex items-center gap-3 max-w-[260px] sm:max-w-xs">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-500/25 text-blue-400 flex items-center justify-center shrink-0">
                    <WifiOff className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold leading-tight">
                      {userT('Offline Resilience')}
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-300 mt-0.5 leading-snug">
                      {userT('Records saved locally without internet')}
                    </p>
                  </div>
                </div>

                {/* Floating Badge: Live Sync Ready (Top Right) */}
                <div className="absolute top-3 right-3 sm:top-5 sm:right-5 bg-slate-900/90 backdrop-blur-md rounded-xl border border-emerald-500/30 px-3 py-1.5 sm:px-3.5 sm:py-2 text-emerald-300 text-xs font-bold shadow-xl flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>{userT('Auto-Sync Ready')}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. BUILT FOR THE FIELD (4 Key Pillars)                         */}
      {/* ============================================================== */}
      <section id="built-for-field" className="py-24 bg-white dark:bg-slate-900 border-b border-[#E2E8F0] dark:border-slate-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
              {userT('Built for the Field')}
            </h2>
            <p className="mt-4 text-[#334155] dark:text-slate-300 text-lg sm:text-xl font-medium leading-relaxed">
              {userT('Core system capabilities designed for frontline reliability in remote operations.')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Feature 1: Offline-First Mode */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-[#2563EB] dark:text-blue-400 flex items-center justify-center mb-5 shadow-xs">
                  <WifiOff className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2.5">
                  {userT('Offline-First Mode')}
                </h3>
                <p className="text-base text-[#334155] dark:text-slate-300 leading-relaxed">
                  {userT('Continue registering citizens even when there is no internet connection.')}
                </p>
              </div>
            </div>

            {/* Feature 2: Secure Local Storage */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center mb-5 shadow-xs">
                  <Database className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2.5">
                  {userT('Secure Local Storage')}
                </h3>
                <p className="text-base text-[#334155] dark:text-slate-300 leading-relaxed">
                  {userT('Records are safely stored on the device until synchronization becomes available.')}
                </p>
              </div>
            </div>

            {/* Feature 3: Duplicate Prevention */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5 shadow-xs">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2.5">
                  {userT('Duplicate Prevention')}
                </h3>
                <p className="text-base text-[#334155] dark:text-slate-300 leading-relaxed">
                  {userT('Built-in validation helps detect repeated or conflicting registrations before records are saved.')}
                </p>
              </div>
            </div>

            {/* Feature 4: Automatic Synchronization */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center mb-5 shadow-xs">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2.5">
                  {userT('Automatic Synchronization')}
                </h3>
                <p className="text-base text-[#334155] dark:text-slate-300 leading-relaxed">
                  {userT('When connectivity returns, pending records are securely synchronized with the central system.')}
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. HOW FIELDSYNC WORKS (Workflow Steps)                        */}
      {/* ============================================================== */}
      <section id="how-it-works" className="py-20 bg-[#F8FAFC] dark:bg-slate-900 border-b border-[#E2E8F0] dark:border-slate-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
              {userT('How FieldSync Works')}
            </h2>
            <p className="mt-4 text-[#334155] dark:text-slate-300 text-lg sm:text-xl font-medium leading-relaxed">
              {userT('A dependable workflow designed for remote field environments.')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            
            {/* Step 1: Register Offline */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40 mb-4 shadow-2xs">
                <WifiOff className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2.5 tracking-tight">
                {userT('01 — Register Offline')}
              </h3>
              <p className="text-base text-[#334155] dark:text-slate-300 leading-relaxed">
                {userT('Field officers can register citizens from remote locations without requiring a continuous internet connection.')}
              </p>
            </div>

            {/* Step 2: Store Securely */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40 mb-4 shadow-2xs">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2.5 tracking-tight">
                {userT('02 — Store Securely')}
              </h3>
              <p className="text-base text-[#334155] dark:text-slate-300 leading-relaxed">
                {userT('Registration data is securely stored on the field device while the officer continues working offline.')}
              </p>
            </div>

            {/* Step 3: Sync Automatically */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40 mb-4 shadow-2xs">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2.5 tracking-tight">
                {userT('03 — Sync Automatically')}
              </h3>
              <p className="text-base text-[#334155] dark:text-slate-300 leading-relaxed">
                {userT('When an internet connection becomes available, pending records are automatically synchronized with the central system.')}
              </p>
            </div>

            {/* Step 4: Verify & Monitor */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center border border-teal-100 dark:border-teal-900/40 mb-4 shadow-2xs">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2.5 tracking-tight">
                {userT('04 — Verify & Monitor')}
              </h3>
              <p className="text-base text-[#334155] dark:text-slate-300 leading-relaxed">
                {userT('Supervisors and managers can review registrations, monitor field activity, and track synchronization status.')}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. BUILT FOR REAL FIELD CONDITIONS                             */}
      {/* ============================================================== */}
      <section id="field-conditions" className="py-24 bg-white dark:bg-slate-900 border-b border-[#E2E8F0] dark:border-slate-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
              {userT('Built for Real Field Conditions')}
            </h2>
            <p className="mt-4 text-[#334155] dark:text-slate-300 text-lg sm:text-xl font-medium leading-relaxed">
              {userT('Technology designed around the challenges of field work.')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            
            {/* Condition 1 */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200 flex items-start gap-5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <WifiOff className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  {userT('No Internet? Keep Working.')}
                </h3>
                <p className="text-base text-[#334155] dark:text-slate-300 leading-relaxed">
                  {userT('Field officers can continue registering citizens in remote areas with limited or no connectivity.')}
                </p>
              </div>
            </div>

            {/* Condition 2 */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200 flex items-start gap-5">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  {userT('Prevent Duplicate Records')}
                </h3>
                <p className="text-base text-[#334155] dark:text-slate-300 leading-relaxed">
                  {userT('Validation and cross-checking help identify duplicate or conflicting citizen registrations.')}
                </p>
              </div>
            </div>

            {/* Condition 3 */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200 flex items-start gap-5">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  {userT('Never Lose Field Work')}
                </h3>
                <p className="text-base text-[#334155] dark:text-slate-300 leading-relaxed">
                  {userT('Offline records remain available on the device until they can be securely synchronized with the central system.')}
                </p>
              </div>
            </div>

            {/* Condition 4 */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200 flex items-start gap-5">
              <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-[#0F766E] dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  {userT('Know What Is Happening')}
                </h3>
                <p className="text-base text-[#334155] dark:text-slate-300 leading-relaxed">
                  {userT('Supervisors and managers can monitor registration progress, field activity, and synchronization status.')}
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 6. ONE PLATFORM. THREE ROLES.                                  */}
      {/* ============================================================== */}
      <section id="roles" className="py-20 bg-[#F8FAFC] dark:bg-slate-900 border-b border-[#E2E8F0] dark:border-slate-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
              {userT('One Platform. Three Roles.')}
            </h2>
            <p className="mt-4 text-[#334155] dark:text-slate-300 text-lg sm:text-xl font-medium leading-relaxed">
              {userT('Dedicated tools for every level of field operations.')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            
            {/* Role 1: Field Officer */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 p-5 sm:p-7 flex flex-col justify-between shadow-xs hover:shadow-lg transition-all duration-200">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-[#2563EB] dark:text-blue-400 flex items-center justify-center mb-4 shadow-xs">
                  <Smartphone className="w-6 h-6" />
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  {userT('Field Officer')}
                </h3>
                <p className="text-sm sm:text-base text-[#334155] dark:text-slate-300 leading-relaxed mt-2 mb-5">
                  {userT('Register citizens, capture required information, and continue working offline from the field.')}
                </p>

                {/* Work list with right check icons */}
                <ul className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm font-semibold text-[#1E293B] dark:text-[#E2E8F0] pt-4 sm:pt-5 border-t border-slate-100 dark:border-slate-800">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{userT('Demographic & vital records intake')}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{userT('Offline local storage with automatic sync')}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{userT('Daily field attendance & activity logs')}</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 sm:mt-7 pt-4 sm:pt-5 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => onGoToLogin('FIELD_OFFICER')}
                  className="w-full py-3 sm:py-3.5 px-4 sm:px-5 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  <span>{userT('Enter Field Officer Portal')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Role 2: Zonal Supervisor */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 p-5 sm:p-7 flex flex-col justify-between shadow-xs hover:shadow-lg transition-all duration-200">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-xs">
                  <Building2 className="w-6 h-6" />
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  {userT('Zonal Supervisor')}
                </h3>
                <p className="text-sm sm:text-base text-[#334155] dark:text-slate-300 leading-relaxed mt-2 mb-5">
                  {userT('Review registrations, monitor assigned field officers, verify records, and track activity across the zone.')}
                </p>

                {/* Work list with right check icons */}
                <ul className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm font-semibold text-[#1E293B] dark:text-[#E2E8F0] pt-4 sm:pt-5 border-t border-slate-100 dark:border-slate-800">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>{userT('Registration queue review & validation')}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>{userT('Duplicate detection & conflict resolution')}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>{userT('Field officer monitoring & assignments')}</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 sm:mt-7 pt-4 sm:pt-5 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => onGoToLogin('SUPERVISOR')}
                  className="w-full py-3 sm:py-3.5 px-4 sm:px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <span>{userT('Enter Supervisor Portal')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Role 3: National Manager */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 p-5 sm:p-7 flex flex-col justify-between shadow-xs hover:shadow-lg transition-all duration-200">
              <div>
                <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center mb-4 shadow-xs">
                  <BarChart3 className="w-6 h-6" />
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  {userT('National Manager')}
                </h3>
                <p className="text-sm sm:text-base text-[#334155] dark:text-slate-300 leading-relaxed mt-2 mb-5">
                  {userT('Monitor national operations, compare regions and zones, and oversee registration activity across the system.')}
                </p>

                {/* Work list with right check icons */}
                <ul className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm font-semibold text-[#1E293B] dark:text-[#E2E8F0] pt-4 sm:pt-5 border-t border-slate-100 dark:border-slate-800">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#0F766E] dark:text-[#2DD4BF] shrink-0" />
                    <span>{userT('National registration dashboards & KPI tracking')}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#0F766E] dark:text-[#2DD4BF] shrink-0" />
                    <span>{userT('Regional & zonal comparative metrics')}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#0F766E] dark:text-[#2DD4BF] shrink-0" />
                    <span>{userT('Staff provisioning & operational oversight')}</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 sm:mt-7 pt-4 sm:pt-5 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => onGoToLogin('MANAGER')}
                  className="w-full py-3 sm:py-3.5 px-4 sm:px-5 rounded-xl bg-[#0F766E] hover:bg-teal-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-teal-700/20 cursor-pointer"
                >
                  <span>{userT('Enter Manager Portal')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 7. FIELD OPERATIONS ACROSS ETHIOPIA                            */}
      {/* ============================================================== */}
      <section id="operations" className="py-16 sm:py-20 lg:py-24 bg-white dark:bg-slate-900 border-b border-[#E2E8F0] dark:border-slate-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
              {userT('Field Operations Across Ethiopia')}
            </h2>
            <p className="mt-3 sm:mt-4 text-[#334155] dark:text-slate-300 text-base sm:text-lg lg:text-xl font-medium leading-relaxed">
              {userT('A connected view of national field registration activity.')}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
            
            {/* Stat 1: 14 Regions */}
            <div className="p-4 sm:p-5 lg:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-[#2563EB] dark:text-blue-400 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-xs">
                <Globe className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] dark:text-white tracking-tight">
                {telemetry.counts.regions || 14}
              </div>
              <p className="mt-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-[#1E293B] dark:text-slate-300">
                {userT('Regions')}
              </p>
            </div>

            {/* Stat 2: 107 Zones */}
            <div className="p-4 sm:p-5 lg:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-xs">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] dark:text-white tracking-tight">
                {telemetry.counts.zones || 107}
              </div>
              <p className="mt-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-[#1E293B] dark:text-slate-300">
                {userT('Zones')}
              </p>
            </div>

            {/* Stat 3: 929 Districts */}
            <div className="p-4 sm:p-5 lg:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-xs">
                <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] dark:text-white tracking-tight">
                {telemetry.counts.woredas || 929}
              </div>
              <p className="mt-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-[#1E293B] dark:text-slate-300">
                {userT('Districts')}
              </p>
            </div>

            {/* Stat 4: 14 Registered Citizens */}
            <div className="p-4 sm:p-5 lg:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-cyan-50 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-xs">
                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] dark:text-white tracking-tight">
                {telemetry.counts.citizens || 14}
              </div>
              <p className="mt-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-[#1E293B] dark:text-slate-300">
                {userT('Registered Citizens')}
              </p>
            </div>

            {/* Stat 5: 19 Field Staff */}
            <div className="col-span-2 sm:col-span-1 p-4 sm:p-5 lg:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-xs">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] dark:text-white tracking-tight">
                {telemetry.counts.users || 19}
              </div>
              <p className="mt-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-[#1E293B] dark:text-slate-300">
                {userT('Field Staff')}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 8. SECURITY BUILT INTO EVERY REGISTRATION                      */}
      {/* ============================================================== */}
      <section id="security" className="py-20 sm:py-24 bg-[#F8FAFC] dark:bg-slate-900 border-b border-[#E2E8F0] dark:border-slate-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Left Column: Heading & 4 Restyled Security Modular Cards */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                  {userT('Security Built Into Every Registration')}
                </h2>
                <p className="text-[#334155] dark:text-slate-300 text-lg sm:text-xl font-medium leading-relaxed mt-3">
                  {userT('Protecting citizen information from the field device to the central system.')}
                </p>
              </div>

              {/* Responsive grid layout of security cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                
                {/* 1. Role-Based Access */}
                <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      {userT('Role-Based Access')}
                    </h4>
                    <p className="text-sm sm:text-base text-[#334155] dark:text-slate-300 mt-1.5 leading-relaxed">
                      {userT('Users only access the information and actions permitted by their assigned role.')}
                    </p>
                  </div>
                </div>

                {/* 2. Secure Local Storage */}
                <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center shrink-0 shadow-xs">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      {userT('Secure Local Storage')}
                    </h4>
                    <p className="text-sm sm:text-base text-[#334155] dark:text-slate-300 mt-1.5 leading-relaxed">
                      {userT('Offline records are protected while stored on field devices.')}
                    </p>
                  </div>
                </div>

                {/* 3. Activity History */}
                <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      {userT('Activity History')}
                    </h4>
                    <p className="text-sm sm:text-base text-[#334155] dark:text-slate-300 mt-1.5 leading-relaxed">
                      {userT('Registration and review activities are recorded to provide a clear operational history.')}
                    </p>
                  </div>
                </div>

                {/* 4. Protected Synchronization */}
                <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      {userT('Protected Synchronization')}
                    </h4>
                    <p className="text-sm sm:text-base text-[#334155] dark:text-slate-300 mt-1.5 leading-relaxed">
                      {userT('Records are securely transferred and validated when synchronized with the central system.')}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Right Column: Secure by Design Card */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-2xl p-7 sm:p-9 border border-[#E2E8F0] dark:border-slate-700 shadow-xs hover:shadow-lg transition-all duration-200 text-center space-y-6">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-[#2563EB] dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs">
                <Shield className="w-9 h-9 sm:w-10 sm:h-10" />
              </div>

              <div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white">
                  {userT('Secure by Design')}
                </h3>
                <p className="text-base sm:text-lg text-[#334155] dark:text-slate-300 mt-3 leading-relaxed">
                  {userT('FieldSync is designed with privacy, controlled access, secure data handling, and operational accountability at every stage of the registration process.')}
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 9. READY TO CONNECT YOUR FIELD OPERATIONS? (Bottom CTA)        */}
      {/* ============================================================== */}
      <section className="py-20 sm:py-24 bg-blue-50/50 dark:bg-slate-900 text-center border-t border-blue-100/80 dark:border-slate-800 transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight leading-tight">
            {userT('Ready to Connect Your Field Operations?')}
          </h2>

          <p className="mt-5 text-lg sm:text-xl text-[#334155] dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {userT('Give your field teams the tools to register citizens securely — online or offline.')}
          </p>

          <div className="mt-10 flex justify-center">
            <button
              onClick={() => onGoToLogin()}
              className="group inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-4 sm:py-4.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-base sm:text-lg shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/35 active:scale-[0.99] transition-all duration-200 cursor-pointer"
            >
              <span>{user ? userT('Go to Dashboard') : userT('Enter FieldSync')}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* 10. COMPREHENSIVE FOOTER WITH NAVIGATION LINKS                */}
      {/* ============================================================== */}
      <footer className="bg-slate-50/70 dark:bg-slate-900 text-[#475569] dark:text-[#94A3B8] pt-16 pb-12 text-sm border-t border-[#E2E8F0] dark:border-slate-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 lg:gap-12 pb-12 border-b border-[#E2E8F0] dark:border-slate-800">
            
            {/* Brand Column */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2.5 text-[#0F172A] dark:text-white font-extrabold text-xl tracking-tight">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shadow-xs">
                  <Radio className="w-4.5 h-4.5" />
                </div>
                <span>FieldSync</span>
              </div>
              <p className="font-bold text-base text-[#0F172A] dark:text-slate-100">
                {userT('Connecting Field Teams to the National Registry')}
              </p>
              <p className="text-sm text-[#475569] dark:text-[#94A3B8] leading-relaxed max-w-sm">
                {userT('An offline-first platform designed for secure citizen registration, local data protection, and operational visibility across remote field environments.')}
              </p>
            </div>

            {/* Column 1: Platform */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-white">
                {userT('Platform')}
              </h4>
              <ul className="space-y-3 text-sm font-medium">
                <li>
                  <a href="#how-it-works" className="hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors">
                    {userT('How It Works')}
                  </a>
                </li>
                <li>
                  <a href="#built-for-field" className="hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors">
                    {userT('Key Features')}
                  </a>
                </li>
                <li>
                  <a href="#roles" className="hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors">
                    {userT('User Roles')}
                  </a>
                </li>
                <li>
                  <a href="#operations" className="hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors">
                    {userT('Field Operations')}
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 2: Portals */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-white">
                {userT('Portals')}
              </h4>
              <ul className="space-y-3 text-sm font-medium">
                <li>
                  <button onClick={() => onGoToLogin('FIELD_OFFICER')} className="hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors cursor-pointer text-left">
                    {userT('Field Officer Portal')}
                  </button>
                </li>
                <li>
                  <button onClick={() => onGoToLogin('SUPERVISOR')} className="hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors cursor-pointer text-left">
                    {userT('Zonal Supervisor Portal')}
                  </button>
                </li>
                <li>
                  <button onClick={() => onGoToLogin('MANAGER')} className="hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors cursor-pointer text-left">
                    {userT('National Manager Portal')}
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Security & Data */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-white">
                {userT('Security & Data')}
              </h4>
              <ul className="space-y-3 text-sm font-medium">
                <li>
                  <a href="#security" className="hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors">
                    {userT('Role-Based Access')}
                  </a>
                </li>
                <li>
                  <a href="#security" className="hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors">
                    {userT('Secure Local Storage')}
                  </a>
                </li>
                <li>
                  <a href="#security" className="hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors">
                    {userT('Activity History')}
                  </a>
                </li>
                <li>
                  <a href="#security" className="hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors">
                    {userT('Protected Synchronization')}
                  </a>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom Copyright & Back to Top */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
            <p>{userT('© 2026 FieldSync. National Citizen Registration & Field Operations Platform.')}</p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 font-semibold text-xs text-[#475569] dark:text-slate-300 hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors cursor-pointer"
            >
              <span>{userT('Back to top')}</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </footer>

    </div>
  );
}
