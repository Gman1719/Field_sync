// src/components/landing/LandingPage.jsx – Professional Enterprise-Grade Landing Page
// Complete Light/Dark theme fidelity (NO black blocks in light theme),
// zero hardcoded personal names, and clear real-world problem-solving presentation.

import React, { useState, useEffect } from 'react';
import {
  Radio, ShieldCheck, Users, BarChart3, CheckCircle2,
  ArrowRight, ChevronRight, MapPin, Building2, Server,
  Clock, Lock, RefreshCw, FileText, Check, Smartphone,
  Layers, Search, AlertCircle, Sparkles, Globe, Eye,
  Sun, Moon, Menu, X, Fingerprint, Award, CheckCheck,
  FileCheck2, Database, ShieldAlert, WifiOff
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { API_BASE } from '../../config/api';

export default function LandingPage({ onGoToLogin, isOnline = true }) {
  const { theme, toggleTheme } = useTheme();

  // Live cluster metrics fetched dynamically from backend
  const [telemetry, setTelemetry] = useState({
    loading: true,
    healthy: false,
    version: '1.0.0',
    counts: {
      regions: null,
      zones: null,
      woredas: null,
      citizens: null,
      users: null,
    },
    latencyMs: null,
    timestamp: null,
  });

  const [regionsList, setRegionsList] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch real-time operational data from backend
  const fetchTelemetry = async () => {
    setRefreshing(true);
    const start = performance.now();
    try {
      // 1. Health check & real-time counts
      const res = await fetch(`${API_BASE}/health`);
      const latency = Math.round(performance.now() - start);

      if (res.ok) {
        const data = await res.json();
        setTelemetry({
          loading: false,
          healthy: data.status === 'healthy',
          version: data.version || '1.0.0',
          counts: {
            regions: data.database?.counts?.regions ?? 0,
            zones: data.database?.counts?.zones ?? 0,
            woredas: data.database?.counts?.woredas ?? 0,
            citizens: data.database?.counts?.citizens ?? 0,
            users: data.database?.counts?.users ?? 0,
          },
          latencyMs: latency,
          timestamp: data.timestamp || new Date().toISOString(),
        });
      }

      // 2. Administrative regions
      const regRes = await fetch(`${API_BASE}/locations/regions`);
      if (regRes.ok) {
        const regData = await regRes.json();
        if (regData.success && Array.isArray(regData.data)) {
          setRegionsList(regData.data);
          if (regData.data.length > 0 && !selectedRegion) {
            setSelectedRegion(regData.data[0]);
          }
        }
      }
    } catch (err) {
      console.warn('Network notice: Portal running in offline preview mode', err);
      setTelemetry((prev) => ({
        ...prev,
        loading: false,
        healthy: false,
      }));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] font-sans antialiased selection:bg-[#2563EB] selection:text-white flex flex-col transition-colors duration-200">
      {/* MAIN NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#334155] shadow-xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-md shadow-blue-600/25">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
                  FieldSync
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-[#2563EB] dark:text-[#60A5FA] border border-blue-200 dark:border-blue-800">
                  National
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium hidden sm:block">
                Civil Registration & Field Command
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#64748B] dark:text-[#94A3B8]">
            <a href="#problem-solution" className="hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors">
              Impact & Solutions
            </a>
            <a href="#key-pillars" className="hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors">
              Core Pillars
            </a>
            <a href="#roles" className="hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors">
              Role Portals
            </a>
            <a href="#coverage" className="hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors">
              National Hierarchy
            </a>
            <a href="#security" className="hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors">
              Security & Trust
            </a>
          </nav>

          {/* Actions: Theme Toggle & Sign In */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className="p-2.5 rounded-xl text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] transition-all"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Workstation Sign In */}
            <button
              onClick={() => onGoToLogin()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold shadow-sm shadow-blue-600/20 transition-all transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <span>Workstation Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] px-4 py-4 space-y-3">
            <a
              href="#problem-solution"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] py-1.5"
            >
              Impact & Solutions
            </a>
            <a
              href="#key-pillars"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] py-1.5"
            >
              Core Pillars
            </a>
            <a
              href="#roles"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] py-1.5"
            >
              Role Portals
            </a>
            <a
              href="#coverage"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] py-1.5"
            >
              National Hierarchy
            </a>
            <a
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] py-1.5"
            >
              Security & Trust
            </a>
          </div>
        )}
      </header>

      {/* 3. HERO SECTION & CORE OPERATIONAL PILLARS (NO MOCKUP/IMAGE PARTS) */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-28 bg-[#F8FAFC] dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#334155] overflow-hidden transition-colors duration-200">
        {/* Subtle Ambient Depth */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-teal-500/10 dark:from-blue-500/15 dark:via-indigo-500/15 dark:to-teal-500/15 blur-3xl -z-10 pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight leading-[1.12] max-w-4xl mx-auto mb-6">
            Bridging Remote Field Teams <br className="hidden sm:inline" />
            <span className="text-[#2563EB] dark:text-[#60A5FA]">&amp; The National Registry</span>
          </h1>

          {/* Problem & Solution Narrative */}
          <p className="text-base sm:text-lg lg:text-xl text-[#475569] dark:text-[#94A3B8] leading-relaxed max-w-3xl mx-auto mb-14 font-normal">
            In remote woredas and rural kebeles where cellular coverage is absent, paper records cause lost documents, identity fraud, and delays. FieldSync enables field teams to register citizens completely offline on digital devices, automatically synchronizing verified records to the national database upon network reconnection.
          </p>

          {/* 3 Core Pillars Showcase Grid */}
          <div id="key-pillars" className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto">
            {/* Pillar 1: 100% Offline Intake */}
            <div className="group relative p-7 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] hover:border-blue-500/60 dark:hover:border-blue-500/60 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-[#2563EB] dark:text-[#60A5FA] border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <WifiOff className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA] block mb-1">
                Frontline Intake
              </span>
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                100% Offline Intake
              </h3>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                Field officers enroll citizens door-to-door without cellular network. Biometrics, demographic data, and household coordinates are saved in local encrypted storage.
              </p>
              <div className="mt-5 pt-4 border-t border-[#F1F5F9] dark:border-slate-800/80 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Auto-syncs on network reconnection</span>
              </div>
            </div>

            {/* Pillar 2: Cross-Kebele Deduplication */}
            <div className="group relative p-7 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] hover:border-emerald-500/60 dark:hover:border-emerald-500/60 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-[#16A34A] dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#16A34A] dark:text-emerald-400 block mb-1">
                Identity Verification
              </span>
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Cross-Kebele Deduplication
              </h3>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                Algorithmic identity cross-checks across woredas and zones flag duplicate enrollments, preventing ghost records and multiple claims across administrative boundaries.
              </p>
              <div className="mt-5 pt-4 border-t border-[#F1F5F9] dark:border-slate-800/80 flex items-center gap-2 text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>National registry cross-referencing</span>
              </div>
            </div>

            {/* Pillar 3: Zonal Scoping & Audit Trails */}
            <div className="group relative p-7 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] hover:border-indigo-500/60 dark:hover:border-indigo-500/60 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                Operational Governance
              </span>
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                Zonal Scoping & Audit Trails
              </h3>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                Strict geographic role boundaries enforce woreda and zonal boundaries, while immutable cryptographically timestamped audit logs record every officer intake and supervisor review.
              </p>
              <div className="mt-5 pt-4 border-t border-[#F1F5F9] dark:border-slate-800/80 flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>100% Traceable accountability</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. REAL-TIME NATIONAL TELEMETRY RIBBON (LIGHT in light mode, DARK in dark mode) */}
      <section className="bg-white dark:bg-[#0F172A] py-16 text-[#0F172A] dark:text-white border-b border-[#E2E8F0] dark:border-[#334155] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-[#2563EB] dark:text-[#60A5FA] block mb-1">
                Real-Time National Telemetry
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white">
                Current Operational Deployment Across Ethiopia
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                Directly synchronized with the centralized PostgreSQL national registry
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {/* Card 1: Regions */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8] text-xs font-semibold">Administrative Regions</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                {telemetry.loading ? '--' : (telemetry.counts.regions ?? 0)}
              </div>
              <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">12 States & 2 Chartered Cities</p>
            </div>

            {/* Card 2: Zones */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8] text-xs font-semibold">Operational Zones</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                {telemetry.loading ? '--' : (telemetry.counts.zones ?? 0)}
              </div>
              <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">Sub-cities & zonal councils</p>
            </div>

            {/* Card 3: Woredas */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8] text-xs font-semibold">Woredas / Districts</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                {telemetry.loading ? '--' : (telemetry.counts.woredas ?? 0)}
              </div>
              <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">Frontline operational units</p>
            </div>

            {/* Card 4: Registered Citizens */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] hover:border-cyan-500/50 dark:hover:border-cyan-500/50 transition-all shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8] text-xs font-semibold">Citizen Records</span>
                <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                {telemetry.loading ? '--' : (telemetry.counts.citizens ?? 0)}
              </div>
              <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">Enrolled in central registry</p>
            </div>

            {/* Card 5: Staff */}
            <div className="col-span-2 md:col-span-1 p-6 rounded-2xl bg-[#F8FAFC] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] hover:border-amber-500/50 dark:hover:border-amber-500/50 transition-all shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8] text-xs font-semibold">Active Field Personnel</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                {telemetry.loading ? '--' : (telemetry.counts.users ?? 0)}
              </div>
              <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">Officers, supervisors & mgrs</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HOW FIELDSYNC SOLVES REAL-WORLD CHALLENGES (PROBLEM & SOLUTION) */}
      <section id="problem-solution" className="py-20 bg-[#F8FAFC] dark:bg-[#111827] border-b border-[#E2E8F0] dark:border-[#334155] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
              Solving Critical Public Administration Challenges
            </h2>
            <p className="mt-4 text-[#64748B] dark:text-[#94A3B8] text-base leading-relaxed">
              Paper registers and fragile internet connections have historically prevented governments from maintaining accurate citizen registries. FieldSync resolves these challenges on the ground.
            </p>
          </div>

          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Solution 1 */}
            <div className="bg-white dark:bg-[#1E293B] p-7 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold mb-5">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Uninterrupted Rural Civil Intake
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  Field officers can conduct door-to-door registrations in remote villages with zero connectivity. Intake forms, photos, and household GPS records are preserved locally on the device.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E2E8F0] dark:border-[#334155] flex items-center gap-2 text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA]">
                <Check className="w-3.5 h-3.5" />
                <span>Zero Data Loss in Remote Areas</span>
              </div>
            </div>

            {/* Solution 2 */}
            <div className="bg-white dark:bg-[#1E293B] p-7 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center font-bold mb-5">
                  <Database className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Automatic Reconnect Synchronization
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  Eliminates weeks of manual paper transport. As soon as a field device connects to Wi-Fi, 3G/4G, or a woreda office hub, records automatically sync to central database clusters.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E2E8F0] dark:border-[#334155] flex items-center gap-2 text-xs font-semibold text-[#16A34A] dark:text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span>Instant Data Transmission</span>
              </div>
            </div>

            {/* Solution 3 */}
            <div className="bg-white dark:bg-[#1E293B] p-7 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold mb-5">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Fraud & Duplicate Prevention
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  Automated duplicate detection flags multiple registrations across kebele boundaries, matching phone records and citizen identifiers for supervisor verification before approval.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E2E8F0] dark:border-[#334155] flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <Check className="w-3.5 h-3.5" />
                <span>Single Identity Verification</span>
              </div>
            </div>

            {/* Solution 4 */}
            <div className="bg-white dark:bg-[#1E293B] p-7 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center font-bold mb-5">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  National Demographic Intelligence
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  Provides regional and federal authorities with live population coverage dashboards by Region, Zone, and Woreda, enabling fair public service distribution and policy planning.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E2E8F0] dark:border-[#334155] flex items-center gap-2 text-xs font-semibold text-[#0F766E] dark:text-[#2DD4BF]">
                <Check className="w-3.5 h-3.5" />
                <span>Evidence-Based Governance</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. AUTHORIZED OPERATIONAL ROLE SECTION (NO HARDCODED PERSONAL NAMES) */}
      <section id="roles" className="py-20 bg-white dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#334155] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
              Select Your Authorized Operational Role
            </h2>
            <p className="mt-4 text-[#64748B] dark:text-[#94A3B8] text-base leading-relaxed">
              Each portal provides dedicated views and permissions tailored to frontline field officers, zonal supervisors, and national managers.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 1. Field Officer Workstation (Blue Accent) */}
            <div className="bg-[#F8FAFC] dark:bg-[#111827] rounded-2xl border border-blue-200 dark:border-[#334155] p-8 flex flex-col justify-between hover:border-[#2563EB] dark:hover:border-blue-500 transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA] bg-blue-50 dark:bg-blue-950/80 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800">
                    Frontline Tier
                  </span>
                  <Smartphone className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
                </div>

                <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Field Officer Workstation</h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">Direct Citizen Registration & Kebele Intake</p>

                <ul className="mt-6 space-y-3 text-xs text-[#0F172A] dark:text-[#CBD5E1]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                    <span>Citizen demographic and vital intake</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                    <span>GPS geo-location capture for households</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                    <span>Guaranteed offline operation in remote areas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                    <span>Daily attendance check-in & work logs</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-[#E2E8F0] dark:border-[#334155]">
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mb-2 font-medium">
                  Operational Scope: Frontline Kebele Registration
                </div>
                <button
                  onClick={() => onGoToLogin('FIELD_OFFICER')}
                  className="w-full py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
                >
                  <span>Enter Officer Workstation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 2. Zonal Supervisor Portal (Indigo Accent) */}
            <div className="bg-[#F8FAFC] dark:bg-[#111827] rounded-2xl border border-indigo-200 dark:border-[#334155] p-8 flex flex-col justify-between hover:border-indigo-500 dark:hover:border-indigo-400 transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
                    Zonal Tier
                  </span>
                  <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>

                <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Zonal Supervisor Portal</h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">Verification, Deduplication & Quality Assurance</p>

                <ul className="mt-6 space-y-3 text-xs text-[#0F172A] dark:text-[#CBD5E1]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Zonal citizen registration queue review</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Duplicate detection & resolution console</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Daily officer report evaluations & ratings</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Team assignment dispatching and oversight</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-[#E2E8F0] dark:border-[#334155]">
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mb-2 font-medium">
                  Operational Scope: Zonal Audit & Deduplication
                </div>
                <button
                  onClick={() => onGoToLogin('SUPERVISOR')}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                >
                  <span>Enter Supervisor Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 3. National Executive Command (Teal Accent) */}
            <div className="bg-[#F8FAFC] dark:bg-[#111827] rounded-2xl border border-teal-200 dark:border-[#334155] p-8 flex flex-col justify-between hover:border-teal-500 dark:hover:border-teal-400 transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] dark:text-[#2DD4BF] bg-teal-50 dark:bg-teal-950/80 px-2.5 py-1 rounded-md border border-teal-200 dark:border-teal-800">
                    Executive Tier
                  </span>
                  <BarChart3 className="w-5 h-5 text-[#0F766E] dark:text-[#2DD4BF]" />
                </div>

                <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">National Executive Command</h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">Cross-Regional Analytics & Audit Governance</p>

                <ul className="mt-6 space-y-3 text-xs text-[#0F172A] dark:text-[#CBD5E1]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>Organization-wide registration analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>National coverage breakdown by Region & Zone</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>Immutable audit log inspection with state diffs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>Zero-activity detection & staff provisioning</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-[#E2E8F0] dark:border-[#334155]">
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mb-2 font-medium">
                  Operational Scope: National Cross-Regional Authority
                </div>
                <button
                  onClick={() => onGoToLogin('MANAGER')}
                  className="w-full py-3 px-4 rounded-xl bg-[#0F766E] hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-500/40 cursor-pointer"
                >
                  <span>Enter Executive Command</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. ETHIOPIAN ADMINISTRATIVE DIVISIONS SECTION */}
      <section id="coverage" className="py-20 bg-[#F8FAFC] dark:bg-[#111827] border-b border-[#E2E8F0] dark:border-[#334155] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-[#2563EB] dark:text-[#60A5FA] block mb-1">
                National Geographic Hierarchy
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                All Ethiopian Administrative Divisions
              </h2>
              <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8]">
                FieldSync maps directly to Ethiopia's 4-tier structure: Region → Zone → Woreda → Kebele.
              </p>
            </div>

            <div className="text-xs text-[#64748B] dark:text-[#94A3B8] bg-white dark:bg-[#1E293B] px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-xs">
              <span>Dynamic Active Regions Loaded: </span>
              <strong className="text-[#2563EB] dark:text-[#60A5FA] font-bold">
                {regionsList.length || (telemetry.counts.regions ?? '...')}
              </strong>
            </div>
          </div>

          {/* Region Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {regionsList.length > 0 ? (
              regionsList.map((region) => (
                <div
                  key={region.id}
                  onClick={() => setSelectedRegion(region)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all text-center ${
                    selectedRegion?.id === region.id
                      ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-sm ring-1 ring-[#2563EB]'
                      : 'bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] border-[#E2E8F0] dark:border-[#334155] hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className={`text-[10px] font-bold tracking-wider uppercase block mb-0.5 ${
                    selectedRegion?.id === region.id ? 'text-blue-100' : 'text-[#2563EB] dark:text-[#60A5FA]'
                  }`}>
                    {region.code || 'REG'}
                  </span>
                  <span className="text-xs font-bold truncate block">
                    {region.name}
                  </span>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-[#64748B] dark:text-[#94A3B8] text-xs">
                Loading national administrative divisions...
              </div>
            )}
          </div>

          {/* Selected Region Status Card */}
          {selectedRegion && (
            <div className="mt-6 p-5 bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{selectedRegion.name}</h4>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Administrative Division Code: <strong className="text-[#0F172A] dark:text-[#F8FAFC]">{selectedRegion.code}</strong> • Status: Operational
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-[#16A34A] dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                  Ready for Zonal Intake
                </span>
                <button
                  onClick={() => onGoToLogin()}
                  className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
                >
                  Access Division
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 8. DATA SOVEREIGNTY, PRIVACY, AND TRACEABLE ACCOUNTABILITY (NO BLACK BLOCKS IN LIGHT THEME) */}
      <section id="security" className="py-20 bg-white dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#334155] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column */}
            <div className="lg:col-span-6 space-y-6">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight leading-tight">
                Data Sovereignty, Privacy, & Traceable Accountability
              </h2>

              <p className="text-[#64748B] dark:text-[#94A3B8] text-base leading-relaxed">
                FieldSync protects citizen records with strict role-based access control, cryptographic verification, and tamper-evident event streaming.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Zonal Administrative Scoping</h4>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                      Supervisors and officers are strictly partitioned to their assigned geographical zones to ensure data confidentiality.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Append-Only Audit Stream</h4>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                      Every registration, modification, review decision, and authentication attempt is immutably logged with actor attribution.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Citizen Data Privacy</h4>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                      Sensitive credentials are sanitized, biometric data is stored with cryptographic verification, and all data in transit is encrypted.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Security Panel (LIGHT in light mode, DARK in dark mode) */}
            <div className="lg:col-span-6 bg-[#F8FAFC] dark:bg-[#111827] text-[#0F172A] dark:text-white rounded-2xl p-8 border border-[#E2E8F0] dark:border-[#334155] shadow-md space-y-6 transition-colors duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#334155]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-sm">Security & Compliance Profile</span>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 font-semibold border border-emerald-300 dark:border-emerald-800">
                  ACTIVE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] shadow-xs">
                  <span className="text-[#64748B] dark:text-[#94A3B8] block text-[11px] mb-1">Access Model</span>
                  <span className="font-bold text-[#0F172A] dark:text-white">Strict Role-Based (RBAC)</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] shadow-xs">
                  <span className="text-[#64748B] dark:text-[#94A3B8] block text-[11px] mb-1">Audit Trail</span>
                  <span className="font-bold text-[#0F172A] dark:text-white">Immutable & Append-Only</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] shadow-xs">
                  <span className="text-[#64748B] dark:text-[#94A3B8] block text-[11px] mb-1">Offline Security</span>
                  <span className="font-bold text-[#0F172A] dark:text-white">Encrypted Local Store</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] shadow-xs">
                  <span className="text-[#64748B] dark:text-[#94A3B8] block text-[11px] mb-1">Authentication</span>
                  <span className="font-bold text-[#0F172A] dark:text-white">Session Guard & Token Auth</span>
                </div>
              </div>

              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed pt-2">
                Designed to comply with civil registration standards, national administrative frameworks, and data protection mandates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. READY TO BEGIN FIELD OPERATIONS CTA SECTION (LIGHT in light mode, DARK in dark mode) */}
      <section className="py-16 bg-blue-50/70 dark:bg-[#0F172A] text-[#0F172A] dark:text-white text-center border-t border-blue-100 dark:border-[#334155] transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Begin Field Operations?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#64748B] dark:text-[#CBD5E1] max-w-xl mx-auto leading-relaxed">
            Sign in to the FieldSync workstation with your assigned government credentials to begin field registration or supervisory reviews.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => onGoToLogin()}
              className="px-8 py-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-base shadow-lg shadow-blue-500/20 flex items-center gap-3 transition-all transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
            >
              <span>Access FieldSync Portal</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* 10. ENTERPRISE FOOTER (LIGHT in light mode, DARK in dark mode) */}
      <footer className="bg-white dark:bg-[#0F172A] text-[#64748B] dark:text-[#94A3B8] py-12 text-xs border-t border-[#E2E8F0] dark:border-[#334155] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 text-[#0F172A] dark:text-white font-bold text-base mb-3">
              <Radio className="w-4 h-4 text-[#2563EB]" />
              <span>FieldSync National</span>
            </div>
            <p className="text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              Official Civil Registration & Frontline Field Operations Platform for Ethiopia.
            </p>
          </div>

          <div>
            <h4 className="text-[#0F172A] dark:text-white font-bold mb-3 uppercase tracking-wider text-[11px]">Access Portals</h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onGoToLogin('FIELD_OFFICER')} className="hover:text-[#2563EB] dark:hover:text-white transition-colors cursor-pointer">
                  Field Officer Workstation
                </button>
              </li>
              <li>
                <button onClick={() => onGoToLogin('SUPERVISOR')} className="hover:text-[#2563EB] dark:hover:text-white transition-colors cursor-pointer">
                  Zonal Supervisor Portal
                </button>
              </li>
              <li>
                <button onClick={() => onGoToLogin('MANAGER')} className="hover:text-[#2563EB] dark:hover:text-white transition-colors cursor-pointer">
                  National Executive Command
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[#0F172A] dark:text-white font-bold mb-3 uppercase tracking-wider text-[11px]">System Services</h4>
            <ul className="space-y-2">
              <li><span>Citizen Vital Registration</span></li>
              <li><span>Zonal Duplicate Resolution</span></li>
              <li><span>Frontline Attendance & Tracking</span></li>
              <li><span>Administrative Hierarchy Mapping</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[#0F172A] dark:text-white font-bold mb-3 uppercase tracking-wider text-[11px]">Platform Status</h4>
            <p className="mb-2">Version {telemetry.version} • National Release</p>
            <div className="flex items-center gap-2 text-[#16A34A] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
              <span>{telemetry.healthy ? 'All Systems Operational' : 'Operating in Standby Mode'}</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 border-t border-[#E2E8F0] dark:border-[#334155] flex flex-col sm:flex-row items-center justify-between gap-4 text-[#64748B] dark:text-[#94A3B8]">
          <p>© 2026 FieldSync National Platform. Authorized official government use only.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-[#0F172A] dark:hover:text-white cursor-pointer">Data Protection</span>
            <span className="hover:text-[#0F172A] dark:hover:text-white cursor-pointer">Security Standards</span>
            <span className="hover:text-[#0F172A] dark:hover:text-white cursor-pointer">Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
