// src/components/users/TempPasswordModal.jsx – Enterprise Cryptographic Temp Password Dialog

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { KeyRound, Copy, Check, ShieldAlert, AlertTriangle } from 'lucide-react';
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
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E3A8A] flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-[#1E3A8A]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Credentials Provisioned</h3>
            <p className="text-xs text-slate-500">
              Temporary password for <span className="font-semibold text-slate-700">{userName}</span>
              {userEmail ? ` (${userEmail})` : ''}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Security Alert */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Strict One-Time Display</span>
              <p className="text-amber-800/90 leading-relaxed">
                For security reasons, this temporary password is never stored in plain text and will <strong>not be displayed again</strong> after you close this modal.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600">
            Securely convey this temporary password to the staff member. They will be required to create a permanent password on their first login.
          </p>

          {/* Password Card */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="font-mono text-base font-bold tracking-wider text-slate-900 select-all">
              {tempPassword}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 text-xs shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? 'Copied!' : 'Copy Password'}
            </Button>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-2.5 pt-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 mt-0.5 text-[#1E3A8A] rounded border-slate-300 focus:ring-[#1E3A8A]"
            />
            <span>
              I have copied or securely recorded this password and understand it cannot be retrieved.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <Button
            variant="primary"
            disabled={!confirmed}
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            I Have Saved It — Continue
          </Button>
        </div>
      </div>
    </div>
  );
}