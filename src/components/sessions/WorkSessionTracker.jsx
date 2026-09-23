// src/components/sessions/WorkSessionTracker.jsx
// Work Sessions & Screen-Time Tracking Engine for Field Officers (Phase 6)

import React, { useState, useEffect } from 'react';
import {
  Smartphone, Play, Pause, Square, Clock, Calendar,
  ShieldCheck, AlertTriangle, CheckCircle2, History, RefreshCw, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

import { offlineDb } from '../../db/offlineDb';
import { API_BASE } from '../../config/api';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import StatCard from '../ui/StatCard';

export default function WorkSessionTracker({ user }) {
  const [activeSession, setActiveSession] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Restore ongoing session from localStorage or Dexie
  useEffect(() => {
    const initSession = async () => {
      setIsLoading(true);
      try {
        const savedSessionStr = localStorage.getItem('fieldsync_active_session');
        if (savedSessionStr) {
          const parsed = JSON.parse(savedSessionStr);
          setActiveSession(parsed);
          setIsPaused(!!parsed.isPaused);

          // Calculate elapsed seconds
          const startTime = new Date(parsed.startedAt).getTime();
          const now = Date.now();
          const running = Math.floor((now - startTime) / 1000) - (parsed.pausedDurationSeconds || 0);
          setElapsedSeconds(Math.max(0, running));
        }

        // Load today's completed sessions
        const todaySessions = await offlineDb.workSessions
          .where('reportDate')
          .equals(todayStr)
          .reverse()
          .toArray();
        setSessions(todaySessions);
      } catch (e) {
        console.error('Error initializing work session:', e);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, [todayStr]);

  // 2. Timer ticker
  useEffect(() => {
    let interval = null;
    if (activeSession && !isPaused) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession, isPaused]);

  // Format seconds helper
  const formatTime = (totalSecs) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 3. Start Session
  const handleStartSession = async () => {
    try {
      const sessionId = crypto.randomUUID();
      const newSession = {
        id: sessionId,
        officerId: user?.id || 'officer',
        reportDate: todayStr,
        startedAt: new Date().toISOString(),
        endedAt: null,
        durationSeconds: 0,
        deviceReported: true,
        syncStatus: 'PENDING',
        isPaused: false,
        pausedDurationSeconds: 0,
      };

      // Save to Dexie
      await offlineDb.workSessions.put(newSession);

      // Record activity log
      await offlineDb.activityLogs.put({
        id: crypto.randomUUID(),
        officerId: user?.id || 'officer',
        eventType: 'WORK_SESSION_STARTED',
        description: `Work session started for citizen registrations on ${todayStr}`,
        deviceTimestamp: new Date().toISOString(),
        syncStatus: 'PENDING',
      });

      localStorage.setItem('fieldsync_active_session', JSON.stringify(newSession));
      setActiveSession(newSession);
      setIsPaused(false);
      setElapsedSeconds(0);

      toast.success('Work session started — recording screen time');
    } catch (err) {
      console.error('Error starting session:', err);
      toast.error('Failed to start session');
    }
  };

  // 4. Pause Session
  const handlePauseSession = async () => {
    if (!activeSession) return;
    try {
      const updated = {
        ...activeSession,
        isPaused: true,
        lastPausedAt: new Date().toISOString(),
      };

      // Record activity log
      await offlineDb.activityLogs.put({
        id: crypto.randomUUID(),
        officerId: user?.id || 'officer',
        eventType: 'WORK_SESSION_PAUSED',
        description: `Work session paused (Screen time: ${formatTime(elapsedSeconds)})`,
        deviceTimestamp: new Date().toISOString(),
        syncStatus: 'PENDING',
      });

      localStorage.setItem('fieldsync_active_session', JSON.stringify(updated));
      setIsPaused(true);
      toast('Work session paused', { icon: '⏸' });
    } catch (err) {
      console.error('Error pausing session:', err);
    }
  };

  // 5. Resume Session
  const handleResumeSession = async () => {
    if (!activeSession) return;
    try {
      const updated = {
        ...activeSession,
        isPaused: false,
      };

      // Record activity log
      await offlineDb.activityLogs.put({
        id: crypto.randomUUID(),
        officerId: user?.id || 'officer',
        eventType: 'WORK_SESSION_RESUMED',
        description: `Work session resumed`,
        deviceTimestamp: new Date().toISOString(),
        syncStatus: 'PENDING',
      });

      localStorage.setItem('fieldsync_active_session', JSON.stringify(updated));
      setIsPaused(false);
      toast.success('Work session resumed');
    } catch (err) {
      console.error('Error resuming session:', err);
    }
  };

  // 6. Stop / End Session
  const handleEndSession = async () => {
    if (!activeSession) return;
    try {
      const endedAt = new Date().toISOString();
      const finalSession = {
        id: activeSession.id,
        officerId: activeSession.officerId,
        reportDate: todayStr,
        startedAt: activeSession.startedAt,
        endedAt,
        durationSeconds: elapsedSeconds,
        deviceReported: true,
        syncStatus: 'PENDING',
      };

      // Save to Dexie
      await offlineDb.workSessions.put(finalSession);

      // Record activity log
      await offlineDb.activityLogs.put({
        id: crypto.randomUUID(),
        officerId: user?.id || 'officer',
        eventType: 'WORK_SESSION_ENDED',
        description: `Work session ended. Total duration: ${formatTime(elapsedSeconds)}`,
        deviceTimestamp: endedAt,
        syncStatus: 'PENDING',
      });

      // Clear active state
      localStorage.removeItem('fieldsync_active_session');
      setActiveSession(null);
      setIsPaused(false);
      setElapsedSeconds(0);

      // Refresh completed list
      const todaySessions = await offlineDb.workSessions
        .where('reportDate')
        .equals(todayStr)
        .reverse()
        .toArray();
      setSessions(todaySessions);

      toast.success(`Work session finalized: ${formatTime(finalSession.durationSeconds)}`);
    } catch (err) {
      console.error('Error ending session:', err);
      toast.error('Failed to end session');
    }
  };

  const totalTodayDuration = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0) + (activeSession && !isPaused ? elapsedSeconds : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-card">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Work Sessions & Screen-Time Telemetry
              </h1>
              <p className="text-xs text-slate-500">
                Offline work session timer and device interaction tracking
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={activeSession ? (isPaused ? 'warning' : 'success') : 'default'} className="py-1 px-3">
            {activeSession ? (isPaused ? 'Session Paused' : 'Session In Progress') : 'No Active Session'}
          </Badge>
        </div>
      </div>

      {/* Telemetry Clarification Notice */}
      <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block">System Telemetry Notice:</span>
          <span>
            Screen-time metrics represent active device interaction during citizen registration sessions. These values are recorded by the client device and are classified as device usage telemetry.
          </span>
        </div>
      </div>

      {/* Active Work Session Control Card */}
      <Card className="border-2 border-indigo-100 shadow-card">
        <CardContent className="p-8 text-center space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">
              Active Session Screen-Time
            </span>
            <div className="font-mono text-5xl sm:text-6xl font-extrabold text-[#1E3A8A] tracking-tight">
              {formatTime(elapsedSeconds)}
            </div>
            <p className="text-xs text-slate-500">
              {activeSession ? (isPaused ? 'Timer paused. Click resume to continue.' : 'Recording active field registration time...') : 'Start a work session when commencing field operations.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
            {!activeSession ? (
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleStartSession}
                className="w-full justify-center text-sm"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Work Session
              </Button>
            ) : (
              <>
                {!isPaused ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handlePauseSession}
                    className="flex-1 justify-center text-sm"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={handleResumeSession}
                    className="flex-1 justify-center text-sm"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </Button>
                )}

                <Button
                  type="button"
                  variant="destructive"
                  size="lg"
                  onClick={handleEndSession}
                  className="flex-1 justify-center text-sm bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <Square className="w-4 h-4 mr-2" />
                  End Session
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cumulative Today Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Today's Screen Time"
          value={formatTime(totalTodayDuration)}
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Sessions Completed Today"
          value={sessions.length}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Telemetry Status"
          value={activeSession ? 'Running' : 'Standby'}
          icon={Smartphone}
          color="indigo"
        />
      </div>

      {/* Today's Completed Sessions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#1E3A8A]" />
            <CardTitle className="text-base">Today's Session Telemetry Log</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Chronological breakdown of recorded work sessions for {todayStr}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No sessions finalized yet today.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sessions.map((sess, idx) => (
                <div key={sess.id} className="p-4 flex items-center justify-between hover:bg-slate-50 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1E3A8A] flex items-center justify-center font-bold text-[11px]">
                      #{sessions.length - idx}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        Session: {new Date(sess.startedAt).toLocaleTimeString()} - {sess.endedAt ? new Date(sess.endedAt).toLocaleTimeString() : 'Active'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        ID: {sess.id?.slice(0, 16)}...
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                      {formatTime(sess.durationSeconds || 0)}
                    </span>
                    <Badge variant={sess.syncStatus === 'SYNCED' ? 'success' : 'warning'}>
                      {sess.syncStatus === 'SYNCED' ? 'Synced' : 'Pending Sync'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
