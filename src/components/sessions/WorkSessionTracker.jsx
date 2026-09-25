// src/components/sessions/WorkSessionTracker.jsx
// Complete Screen Time Tracking Engine for Field Officers — FieldSync

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, Square, Clock, Calendar, CheckCircle2,
  History, RefreshCw, Activity, Zap, Timer, BarChart3,
  CloudOff, Cloud, ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';

import { offlineDb } from '../../db/offlineDb';
import { API_BASE } from '../../config/api';

import { Card, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(totalSecs) {
  const s = Math.max(0, Math.floor(totalSecs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function fmtTimeShort(totalSecs) {
  const s = Math.max(0, Math.floor(totalSecs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

function fmtClock(isoStr) {
  if (!isoStr) return '--';
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SESSION_KEY = 'fieldsync_active_session_v2';
const INACTIVITY_MS = 5 * 60 * 1000; // 5 min

// ── Main Component ────────────────────────────────────────────────────────────
export default function WorkSessionTracker({ user }) {
  const [activeSession, setActiveSession] = useState(null);
  const [isPaused, setIsPaused]           = useState(false);
  const [elapsedSecs, setElapsedSecs]     = useState(0);
  const [sessions, setSessions]           = useState([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [isSyncing, setIsSyncing]         = useState(false);
  const [isOnline, setIsOnline]           = useState(navigator.onLine);
  const [showHistory, setShowHistory]     = useState(false);
  const [pauseReason, setPauseReason]     = useState('');

  const timerRef       = useRef(null);
  const inactivityRef  = useRef(null);
  const lastActiveRef  = useRef(Date.now());
  const visibilityPauseRef = useRef(false); // auto-paused by visibility

  const today = todayStr();
  const officerId = user?.id || user?.employeeId || 'unknown';

  // ── Online/offline monitor ─────────────────────────────────────────────────
  useEffect(() => {
    const go = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', go);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', go); window.removeEventListener('offline', off); };
  }, []);

  // ── Restore session on mount ───────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        // Restore active session from localStorage
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          // Only restore if it's from today
          if (parsed.reportDate === today) {
            setActiveSession(parsed);
            setIsPaused(!!parsed.isPaused);
            // Recalculate elapsed time from start + paused offset
            if (!parsed.isPaused) {
              const startMs = new Date(parsed.startedAt).getTime();
              const pausedMs = (parsed.pausedDurationSeconds || 0) * 1000;
              const elapsed = Math.max(0, Math.floor((Date.now() - startMs - pausedMs) / 1000));
              setElapsedSecs(elapsed);
            } else {
              setElapsedSecs(parsed.elapsedAtPause || 0);
            }
          } else {
            // Old session from different day — clear it
            localStorage.removeItem(SESSION_KEY);
          }
        }
        // Load completed sessions for today
        await loadTodaySessions();
      } catch (e) {
        console.error('Session init error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const loadTodaySessions = useCallback(async () => {
    try {
      const all = await offlineDb.workSessions
        .where('officerId').equals(officerId)
        .filter(s => s.reportDate === today && !!s.endedAt)
        .reverse()
        .sortBy('startedAt');
      setSessions(all.reverse());
    } catch (e) {
      console.error('Error loading sessions:', e);
    }
  }, [officerId, today]);

  // ── Ticker ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (activeSession && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedSecs(prev => prev + 1);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeSession, isPaused]);

  // ── Visibility API — auto-pause/resume ─────────────────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (!activeSession) return;
      if (document.visibilityState === 'hidden') {
        if (!isPaused) {
          visibilityPauseRef.current = true;
          applyPause('Tab hidden or minimized');
        }
      } else {
        if (visibilityPauseRef.current) {
          visibilityPauseRef.current = false;
          applyResume();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [activeSession, isPaused]);

  // ── Inactivity detection ───────────────────────────────────────────────────
  const resetInactivity = useCallback(() => {
    lastActiveRef.current = Date.now();
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
    if (activeSession && !isPaused) {
      inactivityRef.current = setTimeout(() => {
        if (!isPaused && activeSession) {
          visibilityPauseRef.current = true;
          applyPause('Inactivity timeout (5 min)');
          toast('Session auto-paused due to inactivity', { icon: '⏸️' });
        }
      }, INACTIVITY_MS);
    }
  }, [activeSession, isPaused]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetInactivity, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, resetInactivity));
  }, [resetInactivity]);

  // ── Persist active session to localStorage ─────────────────────────────────
  const persistSession = useCallback((sess, paused, elapsed) => {
    if (!sess) { localStorage.removeItem(SESSION_KEY); return; }
    const toSave = {
      ...sess,
      isPaused: paused,
      elapsedAtPause: paused ? elapsed : 0,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(toSave));
  }, []);

  // ── Internal pause/resume (no toast) ──────────────────────────────────────
  const applyPause = useCallback((reason = '') => {
    setIsPaused(true);
    setPauseReason(reason);
    setActiveSession(prev => {
      if (!prev) return prev;
      const updated = { ...prev, isPaused: true, lastPausedAt: new Date().toISOString() };
      persistSession(updated, true, elapsedSecs);
      return updated;
    });
  }, [elapsedSecs, persistSession]);

  const applyResume = useCallback(() => {
    setIsPaused(false);
    setPauseReason('');
    setActiveSession(prev => {
      if (!prev) return prev;
      const updated = { ...prev, isPaused: false };
      persistSession(updated, false, elapsedSecs);
      return updated;
    });
  }, [elapsedSecs, persistSession]);

  // ── Log activity event ─────────────────────────────────────────────────────
  const logEvent = useCallback(async (eventType, description, meta = {}) => {
    await offlineDb.activityLogs.put({
      id: crypto.randomUUID(),
      officerId,
      eventType,
      description,
      deviceTimestamp: new Date().toISOString(),
      syncStatus: 'PENDING',
      metadata: meta,
    });
  }, [officerId]);

  // ── Start Session ──────────────────────────────────────────────────────────
  const handleStart = async () => {
    try {
      const sessionId = crypto.randomUUID();
      const now = new Date().toISOString();
      const newSession = {
        id: sessionId,
        officerId,
        reportDate: today,
        startedAt: now,
        endedAt: null,
        durationSeconds: 0,
        deviceReported: true,
        syncStatus: 'PENDING',
        isPaused: false,
        pausedDurationSeconds: 0,
        elapsedAtPause: 0,
      };

      await offlineDb.workSessions.put(newSession);
      await logEvent('WORK_SESSION_STARTED', `Work session started at ${fmtClock(now)}`);

      persistSession(newSession, false, 0);
      setActiveSession(newSession);
      setIsPaused(false);
      setElapsedSecs(0);
      resetInactivity();

      toast.success('Work session started — tracking your time');
    } catch (err) {
      console.error('Start error:', err);
      toast.error('Failed to start session');
    }
  };

  // ── Pause Session ──────────────────────────────────────────────────────────
  const handlePause = async () => {
    if (!activeSession || isPaused) return;
    try {
      await logEvent('WORK_SESSION_PAUSED', `Session paused after ${fmtTimeShort(elapsedSecs)}`);
      applyPause('Manual pause');
      toast('Session paused', { icon: '⏸️' });
    } catch (err) {
      console.error('Pause error:', err);
    }
  };

  // ── Resume Session ─────────────────────────────────────────────────────────
  const handleResume = async () => {
    if (!activeSession || !isPaused) return;
    try {
      await logEvent('WORK_SESSION_RESUMED', `Session resumed`);
      applyResume();
      resetInactivity();
      toast.success('Session resumed');
    } catch (err) {
      console.error('Resume error:', err);
    }
  };

  // ── End Session ────────────────────────────────────────────────────────────
  const handleEnd = async () => {
    if (!activeSession) return;
    try {
      const endedAt = new Date().toISOString();
      const finalSession = {
        ...activeSession,
        endedAt,
        durationSeconds: elapsedSecs,
        syncStatus: 'PENDING',
      };

      await offlineDb.workSessions.put(finalSession);

      // Add to sync queue
      await offlineDb.syncQueue.put({
        id: crypto.randomUUID(),
        entityType: 'work_session',
        entityId: finalSession.id,
        payload: finalSession,
        queuedAt: endedAt,
        attempts: 0,
        maxRetries: 5,
        status: 'PENDING',
      });

      await logEvent('WORK_SESSION_ENDED', `Session ended — duration: ${fmtTime(elapsedSecs)}`);

      localStorage.removeItem(SESSION_KEY);
      setActiveSession(null);
      setIsPaused(false);
      setElapsedSecs(0);
      if (inactivityRef.current) clearTimeout(inactivityRef.current);

      await loadTodaySessions();
      toast.success(`Session saved — ${fmtTime(elapsedSecs)} recorded`);
    } catch (err) {
      console.error('End error:', err);
      toast.error('Failed to end session');
    }
  };

  // ── Sync to server ─────────────────────────────────────────────────────────
  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      const pending = await offlineDb.workSessions
        .where('officerId').equals(officerId)
        .filter(s => s.syncStatus === 'PENDING' && !!s.endedAt)
        .toArray();

      if (pending.length === 0) {
        toast('Nothing to sync', { icon: '✅' });
        setIsSyncing(false);
        return;
      }

      const token = localStorage.getItem('fieldsync_token');
      const res = await fetch(`${API_BASE}/work-sessions/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          officerId,
          sessions: pending.map(s => ({
            ...s,
            employeeName: user?.name || user?.fullName || '',
            region: user?.region || '',
          })),
        }),
      });

      if (res.ok) {
        // Mark synced
        for (const s of pending) {
          await offlineDb.workSessions.update(s.id, { syncStatus: 'SYNCED' });
        }
        await loadTodaySessions();
        toast.success(`${pending.length} session(s) synced to server`);
      } else {
        toast.error('Sync failed — will retry automatically');
      }
    } catch (e) {
      toast.error('Sync error — offline?');
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const completedDuration = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const totalDuration = completedDuration + (activeSession && !isPaused ? elapsedSecs : activeSession ? elapsedSecs : 0);
  const pendingSync = sessions.filter(s => s.syncStatus === 'PENDING').length;

  const sessionStatus = activeSession
    ? isPaused ? 'paused' : 'running'
    : 'idle';

  const statusConfig = {
    idle:    { label: 'No Active Session',  color: 'text-slate-500',  ring: 'ring-slate-200', bg: 'bg-slate-50 dark:bg-slate-800/50' },
    running: { label: 'Session Running',    color: 'text-emerald-600', ring: 'ring-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    paused:  { label: 'Session Paused',     color: 'text-amber-600',  ring: 'ring-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  }[sessionStatus];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading session…
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Timer className="w-5 h-5 text-[#1E3A8A]" />
            Work Sessions
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {fmtDate(today)} — Offline-first time tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={!isOnline || isSyncing || pendingSync === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSyncing
              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              : isOnline ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
            {isSyncing ? 'Syncing…' : pendingSync > 0 ? `Sync ${pendingSync} pending` : 'Synced'}
          </button>

          {/* Online badge */}
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
            isOnline ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                     : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* ── Main Session Control Card ────────────────────────────────────────── */}
      <div className={`rounded-2xl border-2 transition-all duration-300 ${
        sessionStatus === 'running' ? 'border-emerald-200 dark:border-emerald-800/60'
        : sessionStatus === 'paused' ? 'border-amber-200 dark:border-amber-800/60'
        : 'border-slate-200 dark:border-slate-700'
      } bg-white dark:bg-slate-800/70 shadow-sm overflow-hidden`}>
        
        {/* Status ribbon */}
        <div className={`px-5 py-2.5 flex items-center justify-between text-xs font-semibold border-b ${
          sessionStatus === 'running' ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400'
          : sessionStatus === 'paused' ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800/40 text-amber-700 dark:text-amber-400'
          : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400'
        }`}>
          <span className="flex items-center gap-2">
            {sessionStatus === 'running' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
            {sessionStatus === 'paused' && <span className="w-2 h-2 rounded-full bg-amber-500" />}
            {sessionStatus === 'idle' && <span className="w-2 h-2 rounded-full bg-slate-400" />}
            {statusConfig.label}
            {sessionStatus === 'paused' && pauseReason && (
              <span className="font-normal opacity-70">— {pauseReason}</span>
            )}
          </span>
          {activeSession && (
            <span className="opacity-70">
              Started {fmtClock(activeSession.startedAt)}
            </span>
          )}
        </div>

        {/* Timer display */}
        <div className="px-8 py-8 text-center">
          <div className="space-y-1 mb-6">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
              Active Session Time
            </span>
            <div className={`font-mono text-6xl sm:text-7xl font-black tracking-tight transition-colors ${
              sessionStatus === 'running' ? 'text-emerald-600 dark:text-emerald-400'
              : sessionStatus === 'paused' ? 'text-amber-500 dark:text-amber-400'
              : 'text-slate-300 dark:text-slate-600'
            }`}>
              {fmtTime(elapsedSecs)}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {sessionStatus === 'running' && 'Recording active field time…'}
              {sessionStatus === 'paused' && 'Timer paused — resume to continue'}
              {sessionStatus === 'idle' && 'Start a session to begin tracking'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-3 max-w-sm mx-auto">
            {sessionStatus === 'idle' && (
              <button
                onClick={handleStart}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1E3A8A] hover:bg-[#1e40af] text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                <Play className="w-4 h-4" fill="currentColor" />
                Start Work Session
              </button>
            )}
            {sessionStatus === 'running' && (
              <>
                <button
                  onClick={handlePause}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all active:scale-95"
                >
                  <Pause className="w-4 h-4" fill="currentColor" />
                  Pause
                </button>
                <button
                  onClick={handleEnd}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-rose-300 dark:border-rose-600 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 text-sm font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all active:scale-95"
                >
                  <Square className="w-4 h-4" fill="currentColor" />
                  End Session
                </button>
              </>
            )}
            {sessionStatus === 'paused' && (
              <>
                <button
                  onClick={handleResume}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md transition-all active:scale-95"
                >
                  <Play className="w-4 h-4" fill="currentColor" />
                  Resume
                </button>
                <button
                  onClick={handleEnd}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-rose-300 dark:border-rose-600 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 text-sm font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all active:scale-95"
                >
                  <Square className="w-4 h-4" fill="currentColor" />
                  End Session
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Today's Summary Strip ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Today's Total",    value: fmtTime(totalDuration), icon: Clock,        color: 'blue'   },
          { label: 'Sessions Today',   value: sessions.length,         icon: CheckCircle2, color: 'emerald' },
          { label: 'Pending Sync',     value: pendingSync,             icon: Activity,     color: pendingSync > 0 ? 'amber' : 'slate' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`rounded-xl px-4 py-3.5 border bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 flex flex-col gap-1`}>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{label}</span>
            <span className={`text-lg font-bold tracking-tight font-mono ${
              color === 'blue' ? 'text-[#1E3A8A] dark:text-blue-400'
              : color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400'
              : color === 'amber' ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
            }`}>{value}</span>
          </div>
        ))}
      </div>

      {/* ── Session History ───────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <button
          onClick={() => setShowHistory(h => !h)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Today's Session Log
            </span>
            {sessions.length > 0 && (
              <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold px-2 py-0.5 rounded-full">
                {sessions.length}
              </span>
            )}
          </div>
          {showHistory ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showHistory && (
          <div className="border-t border-slate-100 dark:border-slate-700">
            {sessions.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                No completed sessions yet today.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {/* Active session row */}
                {activeSession && (
                  <div className="px-5 py-3.5 flex items-center justify-between bg-emerald-50/60 dark:bg-emerald-900/10">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                        <Zap className="w-3 h-3 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Current — started {fmtClock(activeSession.startedAt)}
                        </p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{isPaused ? 'Paused' : 'In progress…'}</p>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {fmtTime(elapsedSecs)}
                    </span>
                  </div>
                )}
                {/* Completed sessions */}
                {sessions.map((sess, idx) => (
                  <div key={sess.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 text-[11px] font-bold text-slate-500 dark:text-slate-300">
                        {sessions.length - idx}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {fmtClock(sess.startedAt)} — {fmtClock(sess.endedAt)}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {sess.syncStatus === 'SYNCED'
                            ? '✓ Synced to server'
                            : '○ Pending sync'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg">
                        {fmtTime(sess.durationSeconds || 0)}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${sess.syncStatus === 'SYNCED' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── How it works info strip ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-900/10 px-4 py-3.5 text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed">
        <strong className="font-semibold">How screen time works:</strong> Timer tracks only your active field time. It auto-pauses when you minimize the browser or are idle for 5 minutes. All data is saved locally (offline-first) and synced when online.
      </div>
    </div>
  );
}
