// src/components/sessions/ForceSessionModal.tsx
// Blocking overlay shown to field officers during working hours if session not yet started.
// Cannot be dismissed — officer MUST start the session before accessing the app.

import React, { useState, useEffect } from 'react';
import {
  Clock, ShieldCheck, Wifi, WifiOff, Sparkles, AlertTriangle
} from 'lucide-react';
import { getZonedTimeComponents } from '../../config/workingHours';
import { useUserLanguage } from '../../context/UserLanguageContext';

interface ForceSessionModalProps {
  user: any;
  onSessionStarted: () => void;
  startWorkSession: () => Promise<void>;
  isOnline?: boolean;
}

export default function ForceSessionModal({
  user,
  onSessionStarted,
  startWorkSession,
  isOnline = true,
}: ForceSessionModalProps) {
  const { userT } = useUserLanguage();
  const [isStarting, setIsStarting] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const tick = () => {
      const { timeStr } = getZonedTimeComponents();
      setCurrentTime(timeStr.slice(0, 5));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setError('');
    setIsStarting(true);
    try {
      await startWorkSession();
      onSessionStarted();
    } catch (e) {
      setError(userT('Failed to start work session. Please try again.'));
    } finally {
      setIsStarting(false);
    }
  };

  const officerName = user?.firstName || user?.name?.split(' ')[0] || userT('Officer');

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] px-6 py-5 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider">FieldSync — {userT('Field Officer Workstation')}</p>
              <h1 className="text-lg font-bold leading-tight mt-0.5">{userT('Start Work Session')}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Clock className="w-4 h-4 text-blue-300 shrink-0" />
            <span className="font-mono text-2xl font-bold tracking-widest text-white">{currentTime}</span>
            <span className="text-xs text-blue-200 ml-1">(EAT)</span>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{userT('Good morning')}, {officerName}! 👋</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{userT('You are within official working hours. You must start your daily work session before accessing the system.')}</p>
          </div>
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 space-y-2">
            <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" />{userT('Official Work Hours')}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-700 dark:text-blue-300">
              <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />{userT('Morning')}: 08:30 – 12:30</div>
              <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />{userT('Afternoon')}: 13:30 – 17:30</div>
              <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />{userT('Lunch Break')}: 12:30 – 13:30</div>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
            <p className="font-semibold text-slate-800 dark:text-white text-sm mb-2">{userT('What happens after starting:')}</p>
            <div className="flex items-start gap-2"><span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">✓</span><span>{userT('Screen time tracking begins automatically')}</span></div>
            <div className="flex items-start gap-2"><span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">✓</span><span>{userT('Random verification checks will be activated')}</span></div>
            <div className="flex items-start gap-2"><span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">✓</span><span>{userT('Your session is saved locally and syncs automatically when online')}</span></div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {isOnline ? <Wifi className="w-3.5 h-3.5 shrink-0 text-emerald-500" /> : <WifiOff className="w-3.5 h-3.5 shrink-0 text-amber-500" />}
            <span>{isOnline ? userT('Online — Session will sync to server immediately') : userT('Offline — Session saved locally, will sync when connected')}</span>
          </div>
          {error && (<div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs"><AlertTriangle className="w-4 h-4 shrink-0" /><span>{error}</span></div>)}
          <button type="button" onClick={handleStart} disabled={isStarting} className="w-full py-4 rounded-2xl bg-[#2563EB] hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 text-white font-bold text-base shadow-lg shadow-blue-600/30 flex items-center justify-center gap-3 transition-all cursor-pointer">
            {isStarting ? (<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>{userT('Starting Session...')}</span></>) : (<><ShieldCheck className="w-5 h-5" /><span>{userT('Start Work Session')}</span></>)}
          </button>
          <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">{userT('This session is mandatory. You cannot access the system without starting your work session during working hours.')}</p>
        </div>
      </div>
    </div>
  );
}
