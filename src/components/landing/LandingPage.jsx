// src/components/landing/LandingPage.jsx – Professional Modernized Landing & Home Page
// Dynamic data-driven presentation of FieldSync without hardcoded operational statistics.

import React, { useState, useEffect } from 'react';
import {
  Radio, ShieldCheck, Wifi, WifiOff, Database, Users,
  BarChart3, CheckCircle2, ArrowRight, ChevronRight, MapPin,
  Building2, Server, Clock, Lock, RefreshCw, AlertTriangle,
  FileCheck, GitBranch, Cpu, Globe, KeyRound, Sparkles
} from 'lucide-react';
import { API_BASE } from '../../config/api';

export default function LandingPage({ onGoToLogin, isOnline = true }) {
  const [telemetry, setTelemetry] = useState({
    loading: true,
    healthy: false,
    version: '1.0.0',
    provider: 'PostgreSQL',
    orm: 'Prisma',
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
  const [activeTab, setActiveTab] = useState('officer');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch real-time health and administrative hierarchy data from backend
  const fetchLiveTelemetry = async () => {
    setRefreshing(true);
    const startTime = performance.now();
    try {
      // 1. Fetch live system health
      const healthRes = await fetch(`${API_BASE}/health`);
      const latency = Math.round(performance.now() - startTime);

      if (healthRes.ok) {
        const data = await healthRes.json();
        setTelemetry({
          loading: false,
          healthy: data.status === 'healthy',
          version: data.version || '1.0.0',
          provider: data.database?.provider || 'PostgreSQL',
          orm: data.database?.orm || 'Prisma',
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

      // 2. Fetch live active administrative regions
      const regionsRes = await fetch(`${API_BASE}/locations/regions`);
      if (regionsRes.ok) {
        const regData = await regionsRes.json();
        if (regData.success && Array.isArray(regData.data)) {
          setRegionsList(regData.data);
        }
      }
    } catch (err) {
      console.warn('Telemetry fetch notice: Running in offline/disconnected preview mode', err);
      setTelemetry((prev) => ({
        ...prev,
        loading: false,
        healthy: false,
        latencyMs: null,
      }));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveTelemetry();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-[#1E3A8A] selection:text-white">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 bg-slate-900/85 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1E3A8A] to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">FieldSync</span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/80">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Offline-First National Registry & Field Intelligence
              </p>
            </div>
          </div>

          {/* Center Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300 font-medium">
            <a href="#overview" className="hover:text-white transition-colors">Overview</a>
            <a href="#roles" className="hover:text-white transition-colors">Role Matrix</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#coverage" className="hover:text-white transition-colors">National Coverage</a>
            <a href="#security" className="hover:text-white transition-colors">Security & Audit</a>
          </nav>

          {/* Live Cluster Status & CTA */}
          <div className="flex items-center gap-3">
            {/* Live Health Badge */}
            <div
              onClick={fetchLiveTelemetry}
              title="Click to refresh cluster telemetry"
              className="cursor-pointer hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-800/80 border-slate-700 hover:border-slate-600 transition-all text-slate-300"
            >
              <span className={`w-2 h-2 rounded-full ${telemetry.healthy ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
              <span>
                {telemetry.loading
                  ? 'Connecting...'
                  : telemetry.healthy
                  ? `Cluster Online ${telemetry.latencyMs ? `(${telemetry.latencyMs}ms)` : ''}`
                  : 'Offline Mode'}
              </span>
              <RefreshCw className={`w-3 h-3 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
            </div>

            {/* Launch Login Button */}
            <button
              onClick={() => onGoToLogin()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-600/30 transition-all transform hover:-translate-y-0.5"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section id="overview" className="relative pt-16 pb-20 overflow-hidden border-b border-slate-800/80">
        {/* Subtle Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-r from-blue-600/15 via-indigo-600/10 to-teal-500/10 blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-blue-400 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Field Operations Framework for Ethiopia</span>
            <span className="w-1 h-1 rounded-full bg-slate-500" />
            <span className="text-slate-300">Offline-First Architecture</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight sm:leading-none max-w-4xl mx-auto">
            Offline-First Citizen Registration & Operational Intelligence
          </h1>

          {/* Brief System Explanation (No hardcoded claims, strictly explanatory) */}
          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            FieldSync equips frontline teams to collect verified citizen records and field reports in remote kebeles with <strong className="text-white">zero network connectivity</strong>. When network access is restored, transactions sync seamlessly to central PostgreSQL clusters with tamper-evident audit trails.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => onGoToLogin()}
              className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm sm:text-base shadow-xl shadow-blue-600/25 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <span>Access Workstation</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#architecture"
              className="px-6 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-sm sm:text-base flex items-center gap-2 transition-all"
            >
              <span>Explore Architecture</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </a>
          </div>

          {/* Quick Demo Role Jumpers */}
          <div className="mt-10 pt-8 border-t border-slate-800/60 max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">
              Explore Live Role Workspaces
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={() => onGoToLogin('FIELD_OFFICER')}
                className="group p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/50 text-left transition-all"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200 group-hover:text-blue-400">
                  <span>Field Officer</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">Offline Registration & GPS</div>
              </button>

              <button
                onClick={() => onGoToLogin('SUPERVISOR')}
                className="group p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/50 text-left transition-all"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200 group-hover:text-blue-400">
                  <span>Supervisor</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">Zonal Review & QA</div>
              </button>

              <button
                onClick={() => onGoToLogin('MANAGER')}
                className="group p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/50 text-left transition-all"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200 group-hover:text-blue-400">
                  <span>Manager</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">Analytics & Audit Trails</div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. DYNAMIC LIVE CLUSTER TELEMETRY (NO HARDCODED METRICS) */}
      <section className="bg-slate-950 py-10 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Live PostgreSQL Cluster Telemetry
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time metrics queried directly from the connected database backend
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Last verified:{' '}
                {telemetry.timestamp ? new Date(telemetry.timestamp).toLocaleTimeString() : 'Awaiting heartbeat'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Regions count */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span>Regions & Cities</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-white tracking-tight">
                {telemetry.loading ? (
                  <span className="animate-pulse text-slate-600">--</span>
                ) : (
                  telemetry.counts.regions ?? 0
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">National coverage units</div>
            </div>

            {/* Zones count */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Operational Zones</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-white tracking-tight">
                {telemetry.loading ? (
                  <span className="animate-pulse text-slate-600">--</span>
                ) : (
                  telemetry.counts.zones ?? 0
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Sub-cities & zones</div>
            </div>

            {/* Woredas count */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Woredas</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-white tracking-tight">
                {telemetry.loading ? (
                  <span className="animate-pulse text-slate-600">--</span>
                ) : (
                  telemetry.counts.woredas ?? 0
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Districts & frontline hubs</div>
            </div>

            {/* Registered Citizens */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>Citizen Records</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-white tracking-tight">
                {telemetry.loading ? (
                  <span className="animate-pulse text-slate-600">--</span>
                ) : (
                  telemetry.counts.citizens ?? 0
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Stored in central registry</div>
            </div>

            {/* System Status / Engine */}
            <div className="col-span-2 md:col-span-1 p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>Core Engine</span>
              </div>
              <div className="mt-2 text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{telemetry.provider}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {telemetry.orm} • Offline Dexie.js
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THREE CORE OPERATIONAL ROLES */}
      <section id="roles" className="py-20 bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">
              Role-Based Governance Matrix
            </h2>
            <h3 className="text-2xl sm:text-4xl font-extrabold text-white">
              Purpose-Built for Every Operational Tier
            </h3>
            <p className="mt-4 text-sm sm:text-base text-slate-300">
              FieldSync enforces separation of duties across field data collection, zonal verification, and executive national analytics.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 1. Field Officer */}
            <div className="flex flex-col bg-slate-800/70 border border-slate-700/80 rounded-2xl p-6 sm:p-8 hover:border-blue-500/50 transition-all shadow-lg hover:shadow-blue-500/5">
              <div className="w-12 h-12 rounded-xl bg-blue-900/60 border border-blue-700/60 flex items-center justify-center text-blue-300 mb-5">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <h4 className="text-xl font-bold text-white">Field Officer</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                  Frontline Tier
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Stationed at Woredas and Kebeles for direct citizen intake.
              </p>

              <ul className="mt-6 space-y-3 text-xs sm:text-sm text-slate-300 flex-1">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span><strong>Offline Citizen Intake:</strong> Register citizen demographics, contact, and biometrics with zero connectivity.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span><strong>GPS Geo-Tagging:</strong> Automatically capture verified geographic coordinates during registration.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span><strong>IndexedDB Local Storage:</strong> Drafts saved safely to browser sandbox with auto-sync retry on reconnect.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span><strong>Daily Activity Reports:</strong> Submit end-of-day operations logs and attendance verification.</span>
                </li>
              </ul>

              <div className="mt-8 pt-5 border-t border-slate-700/80">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span>Demo Account:</span>
                  <code className="text-slate-200 bg-slate-900 px-2 py-0.5 rounded">meseret@fieldsync.com</code>
                </div>
                <button
                  onClick={() => onGoToLogin('FIELD_OFFICER')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-700/80 hover:bg-blue-600 text-white font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
                >
                  <span>Launch Officer Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. Supervisor */}
            <div className="flex flex-col bg-slate-800/70 border border-slate-700/80 rounded-2xl p-6 sm:p-8 hover:border-indigo-500/50 transition-all shadow-lg hover:shadow-indigo-500/5">
              <div className="w-12 h-12 rounded-xl bg-indigo-900/60 border border-indigo-700/60 flex items-center justify-center text-indigo-300 mb-5">
                <FileCheck className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <h4 className="text-xl font-bold text-white">Supervisor</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-semibold">
                  Zonal Tier
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Assigned to specific Administrative Zones or Sub-Cities.
              </p>

              <ul className="mt-6 space-y-3 text-xs sm:text-sm text-slate-300 flex-1">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>Zonal Queue Oversight:</strong> Monitor field officer registrations restricted to the assigned zone.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>Duplicate Resolution:</strong> Inspect system-flagged phone, ID, and name conflicts and resolve matches.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>Daily Report Review:</strong> Grade, approve, or request revisions on officer field submissions.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>Field Team Tracking:</strong> Supervise officer presence, check-in logs, and daily targets.</span>
                </li>
              </ul>

              <div className="mt-8 pt-5 border-t border-slate-700/80">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span>Demo Account:</span>
                  <code className="text-slate-200 bg-slate-900 px-2 py-0.5 rounded">birhan@fieldsync.com</code>
                </div>
                <button
                  onClick={() => onGoToLogin('SUPERVISOR')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-700/80 hover:bg-indigo-600 text-white font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
                >
                  <span>Launch Supervisor Hub</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 3. Manager */}
            <div className="flex flex-col bg-slate-800/70 border border-slate-700/80 rounded-2xl p-6 sm:p-8 hover:border-emerald-500/50 transition-all shadow-lg hover:shadow-emerald-500/5">
              <div className="w-12 h-12 rounded-xl bg-emerald-900/60 border border-emerald-700/60 flex items-center justify-center text-emerald-300 mb-5">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <h4 className="text-xl font-bold text-white">Manager</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                  Executive Tier
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                National organization-wide authority and compliance oversight.
              </p>

              <ul className="mt-6 space-y-3 text-xs sm:text-sm text-slate-300 flex-1">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Organization Analytics:</strong> Real-time charts covering registrations by Region, Zone, and Woreda.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Immutable Audit Trails:</strong> Cryptographic append-only activity log with before/after state diffs.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Data Quality & Inactivity:</strong> Automatically flag officers with zero attendance or zero registrations.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>User Provisioning:</strong> Invite, assign, and manage lifecycle credentials across all administrative tiers.</span>
                </li>
              </ul>

              <div className="mt-8 pt-5 border-t border-slate-700/80">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span>Demo Account:</span>
                  <code className="text-slate-200 bg-slate-900 px-2 py-0.5 rounded">abebe@fieldsync.com</code>
                </div>
                <button
                  onClick={() => onGoToLogin('MANAGER')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-700/80 hover:bg-emerald-600 text-white font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
                >
                  <span>Launch Manager Command</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SYSTEM ARCHITECTURE & RESILIENCE */}
      <section id="architecture" className="py-20 bg-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">
              Engineering Deep-Dive
            </h2>
            <h3 className="text-2xl sm:text-4xl font-extrabold text-white">
              Resilient Offline-First Synchronization Architecture
            </h3>
            <p className="mt-4 text-sm sm:text-base text-slate-300">
              How FieldSync maintains strict relational consistency and zero data loss under intermittent and disconnected network conditions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Layer 1 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                <WifiOff className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">1. Offline Client Sandbox</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                IndexedDB powered by Dexie.js caches the full administrative tree, user profiles, and active registrations directly on the field device. Field officers perform unrestricted registrations offline.
              </p>
            </div>

            {/* Layer 2 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                <GitBranch className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">2. Bi-Directional Queue</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Mutations are enqueued with local timestamps and client UUIDs. The background sync engine uses exponential backoff and network event listeners to replay batches with full idempotency.
              </p>
            </div>

            {/* Layer 3 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">3. Conflict & Deduplication</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Central Express & Prisma API evaluates registrations for duplicate national IDs, phone numbers, and names, automatically triaging conflicts to the supervisor's resolution dashboard.
              </p>
            </div>

            {/* Layer 4 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">4. PostgreSQL Enterprise Core</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                PostgreSQL guarantees ACID durability, relational hierarchy constraints (Region → Zone → Woreda → Kebele), and append-only cryptographic audit trail tables.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. ETHIOPIAN ADMINISTRATIVE COVERAGE (DYNAMIC) */}
      <section id="coverage" className="py-20 bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">
                Geographic Coverage Hierarchy
              </h2>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                All Ethiopian Administrative Divisions
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                Mapped natively to the national administrative structure: Region → Zone → Woreda → Kebele.
              </p>
            </div>

            <div className="text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <span>Dynamic Active Regions Loaded: </span>
              <strong className="text-white">{regionsList.length || (telemetry.counts.regions ?? '...')}</strong>
            </div>
          </div>

          {/* Region Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {regionsList.length > 0 ? (
              regionsList.map((region) => (
                <div
                  key={region.id}
                  className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-blue-500 transition-all text-center group"
                >
                  <div className="text-[10px] font-bold text-blue-400 tracking-wider uppercase mb-1">
                    {region.code || 'REG'}
                  </div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                    {region.name}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-slate-500 text-xs">
                Loading administrative division hierarchy...
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 7. ENTERPRISE SECURITY & AUDIT TRAILS */}
      <section id="security" className="py-20 bg-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950 text-blue-300 border border-blue-800 text-xs font-semibold mb-4">
                <ShieldCheck className="w-4 h-4" />
                <span>Enterprise Security Architecture</span>
              </div>
              <h3 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
                Cryptographic Audit Trails & Strict Role Isolation
              </h3>
              <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
                FieldSync enforces strict enterprise-grade security at both client and server boundaries. Every administrative mutation, review decision, and credential modification is committed to an immutable append-only audit trail.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-800 text-blue-400 mt-1">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white">Sanitized Credential Storage</h5>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Bcrypt salt hashing (10 rounds). Passwords and session secrets are automatically scrubbed prior to audit logging.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-800 text-indigo-400 mt-1">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white">Full State Diffs on Audit Logs</h5>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Inspect before-and-after values for user status changes, duplicate citizen reconciliations, and role promotions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-800 text-emerald-400 mt-1">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white">Zero-Trust Administrative Scoping</h5>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Supervisors cannot query or alter data outside their assigned administrative zone. Managers govern national cross-regional operations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Audit Log Preview Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-mono text-slate-300">AUDIT_LOG_STREAM: SECURE</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">APPEND_ONLY</span>
              </div>

              <div className="mt-4 space-y-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-850">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                    <span className="text-emerald-400 font-semibold">CITIZEN_REGISTERED</span>
                    <span>Just now</span>
                  </div>
                  <div className="text-slate-300">Actor: meseret@fieldsync.com (Field Officer)</div>
                  <div className="text-slate-500 text-[11px] mt-1">
                    Target: Woreda 01, Kebele 01 • Method: OFFLINE_SYNC
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-850">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                    <span className="text-indigo-400 font-semibold">DUPLICATE_RESOLVED</span>
                    <span>12m ago</span>
                  </div>
                  <div className="text-slate-300">Actor: birhan@fieldsync.com (Supervisor)</div>
                  <div className="text-slate-500 text-[11px] mt-1">
                    Resolution: MERGED • Zone: Bole Sub-City
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-850">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                    <span className="text-amber-400 font-semibold">USER_PASSWORD_CHANGE</span>
                    <span>1h ago</span>
                  </div>
                  <div className="text-slate-300">Actor: abebe@fieldsync.com (Manager)</div>
                  <div className="text-slate-500 text-[11px] mt-1">
                    Status: FORCE_CHANGE_EXPIRED • Secret: [REDACTED]
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-400">
                <span>Tamper-evident record hash verification</span>
                <span className="text-emerald-400 font-semibold">VERIFIED ✓</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CALL TO ACTION & FOOTER */}
      <section className="py-16 bg-gradient-to-b from-slate-900 to-slate-950 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            Ready to Access FieldSync Workstation?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300">
            Sign in with your role-assigned credentials to begin offline field registration, supervisor verification, or executive analytics.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => onGoToLogin()}
              className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-xl shadow-blue-600/30 flex items-center gap-3 transition-all transform hover:-translate-y-0.5"
            >
              <span>Sign In to Workstation Portal</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-slate-950 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-slate-300">FieldSync Enterprise Platform</span>
            <span>• v{telemetry.version}</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-400 cursor-pointer" onClick={() => onGoToLogin('FIELD_OFFICER')}>
              Officer
            </span>
            <span className="hover:text-slate-400 cursor-pointer" onClick={() => onGoToLogin('SUPERVISOR')}>
              Supervisor
            </span>
            <span className="hover:text-slate-400 cursor-pointer" onClick={() => onGoToLogin('MANAGER')}>
              Manager
            </span>
          </div>
          <div>
            Authorized for official field operations & citizen registry administration
          </div>
        </div>
      </footer>
    </div>
  );
}
