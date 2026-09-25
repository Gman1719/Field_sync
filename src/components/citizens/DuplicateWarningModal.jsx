// src/components/citizens/DuplicateWarningModal.jsx
// Enterprise Duplicate Prevention Modal: Blocks Saving of Duplicate Citizen Records

import React from 'react';
import { AlertTriangle, Edit3, ShieldAlert, Phone, MapPin, User, XCircle, AlertOctagon } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatEthiopianPhone } from '../../utils/phoneUtils';

export default function DuplicateWarningModal({
  isOpen,
  onClose,
  candidate,
  matchReasons = [],
  duplicates = [],
}) {
  if (!isOpen || !candidate) return null;

  const primaryMatch = duplicates[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl max-w-2xl w-full shadow-2xl border border-rose-200 dark:border-rose-900/60 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-100 dark:border-rose-900/50 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-rose-950 dark:text-rose-200">
              Duplicate Citizen Detected — Registration Blocked
            </h3>
            <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">
              This citizen is already registered in the database. Duplicate records are strictly prohibited and cannot be saved.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Policy Guidance Alert */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-xs space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-slate-800 dark:text-[#F8FAFC]">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              National Identity Anti-Duplication Rule:
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              To prevent fraudulent identity cards and protect national registry integrity, the system validates all demographic and biometric attributes prior to persistence. Saving this duplicate record has been blocked.
            </p>
          </div>

          {/* Match Reasons */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1] uppercase tracking-wider">
              Duplicate Detection Triggers:
            </span>
            <ul className="space-y-1">
              {matchReasons.map((reason, idx) => (
                <li
                  key={idx}
                  className="text-xs font-semibold text-rose-900 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Side-by-Side Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* New Rejected Entry */}
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider text-[11px]">
                  Rejected Entry
                </span>
                <Badge variant="error">Duplicate Blocked</Badge>
              </div>

              <div className="space-y-1 text-slate-700 dark:text-slate-300">
                <div className="font-bold text-sm text-slate-900 dark:text-[#F8FAFC]">
                  {[candidate.firstName, candidate.middleName, candidate.lastName].filter(Boolean).join(' ')}
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{candidate.gender} • {candidate.age ? `${candidate.age} yrs` : (candidate.dateOfBirth || 'Age unrecorded')}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatEthiopianPhone(candidate.phoneNumber)}</span>
                </div>
                <div className="flex items-start gap-1.5 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    {[candidate.regionName, candidate.zoneName, candidate.woredaName, candidate.kebeleName, candidate.village].filter(Boolean).join(' > ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Existing Matching Record in Database */}
            {primaryMatch && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#0F172A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wider text-[11px]">
                    Already In Database
                  </span>
                  <Badge variant="primary">Canonical Record</Badge>
                </div>

                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <div className="font-bold text-sm text-slate-900 dark:text-[#F8FAFC]">
                    {[primaryMatch.firstName, primaryMatch.middleName, primaryMatch.lastName].filter(Boolean).join(' ')}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{primaryMatch.gender} • {primaryMatch.age ? `${primaryMatch.age} yrs` : (primaryMatch.dateOfBirth || 'Age unrecorded')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatEthiopianPhone(primaryMatch.phoneNumber)}</span>
                  </div>
                  <div className="flex items-start gap-1.5 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      {[primaryMatch.regionName || primaryMatch.region, primaryMatch.zoneName || primaryMatch.zone, primaryMatch.woredaName || primaryMatch.woreda, primaryMatch.kebeleName || primaryMatch.kebele, primaryMatch.village].filter(Boolean).join(' > ') || 'Address recorded'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono pt-1 truncate">
                    ID: {primaryMatch.clientRecordId || primaryMatch.id}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#0F172A] border-t border-[#E2E8F0] dark:border-[#334155] flex justify-end">
          <Button
            type="button"
            variant="primary"
            onClick={onClose}
            className="w-full sm:w-auto bg-[#2563EB] hover:bg-blue-700 text-white font-bold"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Return & Correct Registration Form
          </Button>
        </div>
      </div>
    </div>
  );
}
