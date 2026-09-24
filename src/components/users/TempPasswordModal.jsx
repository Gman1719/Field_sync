// src/components/users/TempPasswordModal.jsx – Enterprise Cryptographic Temp Password Dialog

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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl max-w-md w-full shadow-2xl border border-[#E2E8F0] dark:border-[#334155] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[#E2E8F0] dark:border-[#334155] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">One-Time Access Password</h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Credentials for <span className="font-semibold text-slate-800 dark:text-slate-200">{userName}</span>
              {userEmail ? ` (${userEmail})` : ''}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Security Alert */}
          <div className="p-3 bg-amber-50 dark:bg-[#0F172A] border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5 text-[#0F172A] dark:text-[#F8FAFC]">Strict One-Time Display</span>
              <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed text-[11px]">
                For security reasons, this temporary password is never saved in readable form and <strong>cannot be viewed again</strong> once this dialog is closed.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
            Securely deliver this temporary code to the staff member. They will be immediately required to choose a new permanent password upon sign-in.
          </p>

          {/* Cryptographic Password Card */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-[#E2E8F0] dark:border-[#334155]">
            <span className="font-mono text-base font-black tracking-wider text-[#0F172A] dark:text-[#F8FAFC] select-all">
              {tempPassword}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 text-xs shrink-0 dark:text-[#F8FAFC] dark:border-[#334155] dark:hover:bg-[#1E293B]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-2.5 pt-1 text-xs text-slate-700 dark:text-[#CBD5E1] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 mt-0.5 text-[#2563EB] rounded border-[#E2E8F0] dark:border-[#334155] focus:ring-[#2563EB]"
            />
            <span className="text-[11px] leading-relaxed">
              I have securely shared or copied this password and acknowledge that it cannot be retrieved again.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="p-4 px-5 bg-slate-50 dark:bg-[#182234]/80 border-t border-[#E2E8F0] dark:border-[#334155] flex justify-end">
          <Button
            variant="primary"
            disabled={!confirmed}
            onClick={onClose}
            className="w-full sm:w-auto bg-[#2563EB] hover:bg-blue-700 text-white font-bold"
          >
            <ShieldCheck className="w-4 h-4 mr-1.5" />
            I Have Saved It — Continue
          </Button>
        </div>
      </div>
    </div>
  );
}