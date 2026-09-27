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
      <div className="bg-white dark:bg-gradient-to-b dark:from-[#1C1410] dark:to-[#140E0B] rounded-2xl sm:rounded-3xl max-w-md w-full shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18),0_0_1px_1px_rgba(15,23,42,0.06)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)] border border-slate-200/90 dark:border-[#38261E] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-[#2C1D16] flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA] border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shrink-0 shadow-xs">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">One-Time Access Password</h3>
            <p className="text-xs text-slate-500 dark:text-[#BFA89B] mt-0.5 truncate">
              Credentials for <span className="font-semibold text-slate-800 dark:text-[#E8DDD7]">{userName}</span>
              {userEmail ? ` (${userEmail})` : ''}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Security Alert */}
          <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5 text-slate-900 dark:text-white">Strict One-Time Display</span>
              <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed text-[11px]">
                For security reasons, this temporary password is never saved in readable form and <strong>cannot be viewed again</strong> once this dialog is closed.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-[#BFA89B] leading-relaxed">
            Securely deliver this temporary code to the staff member. They will be immediately required to choose a new permanent password upon sign-in.
          </p>

          {/* Cryptographic Password Card */}
          <div className="flex items-center justify-between p-4 bg-slate-50/80 dark:bg-[#17100D] rounded-2xl border border-slate-200/80 dark:border-[#2F211A]">
            <span className="font-mono text-base font-black tracking-wider text-slate-900 dark:text-white select-all">
              {tempPassword}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 text-xs shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-2.5 pt-1 text-xs text-slate-700 dark:text-[#E8DDD7] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 mt-0.5 text-[#2563EB] rounded border-slate-300 dark:border-[#3E2B20] focus:ring-[#2563EB] accent-[#2563EB]"
            />
            <span className="text-[11px] leading-relaxed">
              I have securely shared or copied this password and acknowledge that it cannot be retrieved again.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/90 dark:bg-[#120C0A]/95 backdrop-blur-sm border-t border-slate-100 dark:border-[#2C1D16] flex justify-end rounded-b-2xl sm:rounded-b-3xl">
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