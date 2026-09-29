// src/components/verification/VerificationPopup.tsx
// Mandatory 15-Second Random Active-Work Verification Modal
// Strict compliance: Real-timestamp countdown, "I'm Here" button, keyboard accessible,
// non-dismissible, dark/light theme fidelity, offline-state awareness.

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import type { PendingVerificationData } from '../../hooks/useVerification';

interface VerificationPopupProps {
  pendingVerification?: PendingVerificationData | null;
  onConfirm: () => void;
  onTimeout: () => void;
}

export default function VerificationPopup({
  pendingVerification,
  onConfirm,
  onTimeout,
}: VerificationPopupProps) {
  const deadlineMs = pendingVerification?.deadlineAt
    ? new Date(pendingVerification.deadlineAt).getTime()
    : Date.now() + 15000;

  const [remainingSeconds, setRemainingSeconds] = useState(15);
  const [hasResponded, setHasResponded] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isOnline = navigator.onLine && !pendingVerification?.isOffline;

  // Auto-focus the "I'm Here" button on mount for quick keyboard access (space/enter)
  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  // Trap keyboard events to prevent escape or outside navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleButtonClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [hasResponded]);

  // Real-timestamp based countdown (immune to tab throttling/freezing)
  useEffect(() => {
    const tick = () => {
      if (hasResponded) return;
      const now = Date.now();
      const diffSecs = Math.max(0, Math.ceil((deadlineMs - now) / 1000));
      setRemainingSeconds(diffSecs);

      if (diffSecs <= 0) {
        setHasResponded(true);
        onTimeout();
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [deadlineMs, hasResponded, onTimeout]);

  const handleButtonClick = () => {
    if (hasResponded) return;
    setHasResponded(true);
    onConfirm();
  };

  // Circular progress calculation
  const totalDuration = 15;
  const progressRatio = Math.max(0, Math.min(1, remainingSeconds / totalDuration));
  const strokeDashoffset = 283 - 283 * progressRatio; // 2 * PI * 45 ≈ 283

  // Color dynamic based on urgency
  const isUrgent = remainingSeconds <= 5;
  const ringColor = isUrgent ? '#F87171' : remainingSeconds <= 9 ? '#FBBF24' : '#3B82F6';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-dialog-title"
      aria-describedby="verification-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/65 backdrop-blur-md select-none animate-in fade-in duration-200"
      onClick={(e) => {
        // Prevent dismissal on backdrop click
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div
        className="w-full max-w-md p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(15,23,42,0.22),0_0_1px_1px_rgba(15,23,42,0.06)] dark:shadow-2xl transition-all border
          bg-white text-slate-900 border-slate-200/90
          dark:bg-slate-800 dark:text-white dark:border-slate-700 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 mb-3 rounded-2xl flex items-center justify-center bg-blue-50 dark:bg-blue-900/40 text-[#2563EB] dark:text-blue-400 border border-blue-100 dark:border-blue-700/60 shadow-xs">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <h2
            id="verification-dialog-title"
            className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white"
          >
            Work Verification
          </h2>

          <p
            id="verification-dialog-desc"
            className="mt-2 text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300"
          >
            Are you still working in FieldSync?
          </p>
        </div>

        {/* Real-time Countdown Timer Ring */}
        <div className="my-6 flex flex-col items-center justify-center">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                className="stroke-slate-200 dark:stroke-slate-700"
                strokeWidth="6"
                fill="none"
              />
              {/* Animated countdown ring */}
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke={ringColor}
                strokeWidth="6"
                strokeDasharray="283"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.3s ease' }}
              />
            </svg>

            {/* Numeric Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-4xl font-extrabold font-mono tracking-tighter ${
                  isUrgent
                    ? 'text-red-600 dark:text-[#F87171] animate-pulse'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {remainingSeconds}
              </span>
              <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500">
                seconds
              </span>
            </div>
          </div>
        </div>

        {/* Mandatory Action Button */}
        <div className="flex flex-col gap-3">
          <button
            ref={buttonRef}
            type="button"
            onClick={handleButtonClick}
            disabled={hasResponded || remainingSeconds <= 0}
            className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 dark:bg-[#3B82F6] dark:hover:bg-blue-500 transition-all duration-150 shadow-lg shadow-blue-500/25 focus:outline-none focus:ring-4 focus:ring-blue-500/40 cursor-pointer disabled:opacity-50 text-base"
          >
            I'm Here
          </button>
        </div>

        {/* Policy Notice & Offline Alert */}
        <div className="mt-5 space-y-2 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            This verification cannot be skipped or dismissed.
          </p>

          {!isOnline && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 py-1.5 px-3 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span>This response will be saved offline and synchronized when internet returns.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}