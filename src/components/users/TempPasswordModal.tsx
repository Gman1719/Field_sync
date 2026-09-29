import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { KeyRound, Copy, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import Button from '../ui/Button';

export default function TempPasswordModal({ userName, userEmail, tempPassword, onClose }) {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      toast.success('Temporary password copied to clipboard');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Copy failed:', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/65 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-xl border border-slate-200/90 dark:border-slate-700/80 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shrink-0 shadow-xs">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">One-Time Access Password</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Credentials for <span className="font-semibold text-slate-800 dark:text-slate-300">{userName}</span>
              {userEmail ? ` (${userEmail})` : ''}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Security Alert */}
          <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5 text-slate-900 dark:text-slate-100">Strict One-Time Display</span>
              <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed text-[11px]">
                For security reasons, this temporary password is never saved in readable form and <strong>cannot be viewed again</strong> once this dialog is closed.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Securely deliver this temporary code to the staff member. They will be immediately required to choose a new permanent password upon sign-in.
          </p>

          {/* Cryptographic Password Card */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/70">
            <span className="font-mono text-base font-black tracking-wider text-slate-900 dark:text-slate-100 select-all">
              {tempPassword}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 text-xs shrink-0 font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-2.5 pt-1 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500 accent-blue-600"
            />
            <span className="text-[11px] leading-relaxed">
              I have securely shared or copied this password and acknowledge that it cannot be retrieved again.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/90 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-100 dark:border-slate-800 flex justify-end rounded-b-2xl sm:rounded-b-3xl">
          <Button
            variant="primary"
            disabled={!confirmed}
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            <ShieldCheck className="w-4 h-4 mr-1.5" />
            I Have Saved It — Continue
          </Button>
        </div>
      </div>
    </div>
  );
}