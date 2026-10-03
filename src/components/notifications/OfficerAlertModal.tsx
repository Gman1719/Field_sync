// src/components/notifications/OfficerAlertModal.tsx
// Interactive In-App Notification Form Modal delivered directly to field officers when a supervisor sends an alert.

import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  User,
  CheckCircle2,
  ExternalLink,
  X,
  BellRing,
} from 'lucide-react';
import { useUserLanguage } from '../../context/UserLanguageContext';
import { translateText } from '../../services/translationEngine';

export interface OfficerAlertNotification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  type?: string;
  priority?: string;
  isRead?: boolean;
  actionUrl?: string;
  createdAt?: string;
  timestamp?: string;
  metadata?: {
    senderId?: string;
    senderName?: string;
    senderEmail?: string;
    senderRole?: string;
    [key: string]: any;
  } | null;
}

interface OfficerAlertModalProps {
  alert: OfficerAlertNotification | null;
  isOpen: boolean;
  onAcknowledge: (alertId: string) => void;
  onNavigateToNotifications?: () => void;
  onClose: () => void;
}

export default function OfficerAlertModal({
  alert,
  isOpen,
  onAcknowledge,
  onNavigateToNotifications,
  onClose,
}: OfficerAlertModalProps) {
  const { language, userT } = useUserLanguage();

  if (!isOpen || !alert) return null;

  const senderName =
    alert.metadata?.senderName ||
    alert.metadata?.senderEmail ||
    userT('Supervisor Command');
  const senderEmail = alert.metadata?.senderEmail || '';
  const isUrgent = alert.priority === 'URGENT';
  const timeFormatted = alert.createdAt
    ? new Date(alert.createdAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : userT('Just now');

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-lg overflow-hidden bg-white dark:bg-slate-900 rounded-3xl border border-amber-200 dark:border-amber-900/60 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Strip */}
        <div
          className={`h-2.5 w-full ${
            isUrgent
              ? 'bg-gradient-to-r from-rose-500 via-red-500 to-rose-600'
              : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600'
          }`}
        />

        {/* Header Block */}
        <div className="p-6 pb-4 flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                isUrgent
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
              }`}
            >
              <BellRing className="w-6 h-6 animate-bounce" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${
                    isUrgent
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200'
                  }`}
                >
                  {isUrgent ? userT('Urgent Directive') : userT('Supervisor Alert')}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timeFormatted}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {userT('Official Operational Alert')}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={userT('Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sender Info Bar */}
        <div className="px-6 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-slate-400 dark:text-slate-500">{userT('From')}:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{senderName}</span>
            {senderEmail && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                ({senderEmail})
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
            {userT('Assigned Supervisor')}
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Alert Title (Only shown if supervisor filled the title field) */}
          {Boolean(alert.title && alert.title.trim()) && (
            <div>
              <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
                {userT('Subject')}
              </label>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {translateText(alert.title, language)}
              </h3>
            </div>
          )}

          {/* Message Content Form Container */}
          <div>
            <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
              {userT('Instructions / Directive')}
            </label>
            <div className="mt-1 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {translateText(alert.message, language)}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
            {userT(
              'Please review this directive and acknowledge receipt. You can refer back to it anytime in your Notification Center.'
            )}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          {onNavigateToNotifications ? (
            <button
              type="button"
              onClick={() => {
                onAcknowledge(alert.id);
                onNavigateToNotifications();
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{userT('View All Notifications')}</span>
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={() => onAcknowledge(alert.id)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{userT('I Acknowledge / Got it')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
