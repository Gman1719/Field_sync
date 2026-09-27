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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/65 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-gradient-to-b dark:from-[#1C1410] dark:to-[#140E0B] rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18),0_0_1px_1px_rgba(15,23,42,0.06)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)] border border-rose-200/90 dark:border-rose-900/60 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-rose-50/80 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900/40 flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-rose-950 dark:text-rose-200 tracking-tight">
              Duplicate Citizen Detected — Registration Blocked
            </h3>
            <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5 leading-normal">
              This citizen is already registered in the database. Duplicate records are strictly prohibited and cannot be saved.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Policy Guidance Alert */}
          <div className="p-4 bg-slate-50/80 dark:bg-[#17100D] border border-slate-200/80 dark:border-[#2F211A] rounded-2xl text-xs space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-slate-800 dark:text-white">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              National Identity Anti-Duplication Rule:
            </span>
            <p className="text-slate-600 dark:text-[#D4C3B7] leading-relaxed">
              To prevent fraudulent identity cards and protect national registry integrity, the system validates all demographic and biometric attributes prior to persistence. Saving this duplicate record has been blocked.
            </p>
          </div>

          {/* Match Reasons */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-[#E8DDD7] uppercase tracking-wider">
              Duplicate Detection Triggers:
            </span>
            <ul className="space-y-1.5">
              {matchReasons.map((reason, idx) => (
                <li
                  key={idx}
                  className="text-xs font-semibold text-rose-900 dark:text-rose-300 bg-rose-50/60 dark:bg-rose-950/40 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-center gap-2"
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
            <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider text-[11px]">
                  Rejected Entry
                </span>
                <Badge variant="error">Duplicate Blocked</Badge>
              </div>

              <div className="space-y-1.5 text-slate-700 dark:text-[#E8DDD7]">
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {[candidate.firstName, candidate.middleName, candidate.lastName].filter(Boolean).join(' ')}
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400 dark:text-[#A8988B]" />
                  <span>{candidate.gender} • {candidate.age ? `${candidate.age} yrs` : (candidate.dateOfBirth || 'Age unrecorded')}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-[#A8988B]" />
                  <span>{formatEthiopianPhone(candidate.phoneNumber)}</span>
                </div>
                <div className="flex items-start gap-1.5 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-[#A8988B] shrink-0 mt-0.5" />
                  <span>
                    {[candidate.regionName, candidate.zoneName, candidate.woredaName, candidate.kebeleName, candidate.village].filter(Boolean).join(' > ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Existing Matching Record in Database */}
            {primaryMatch && (
              <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-[#2F211A] bg-slate-50/80 dark:bg-[#17100D] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600 dark:text-[#BFA89B] uppercase tracking-wider text-[11px]">
                    Already In Database
                  </span>
                  <Badge variant="primary">Canonical Record</Badge>
                </div>

                <div className="space-y-1.5 text-slate-700 dark:text-[#E8DDD7]">
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {[primaryMatch.firstName, primaryMatch.middleName, primaryMatch.lastName].filter(Boolean).join(' ')}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 dark:text-[#A8988B]" />
                    <span>{primaryMatch.gender} • {primaryMatch.age ? `${primaryMatch.age} yrs` : (primaryMatch.dateOfBirth || 'Age unrecorded')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-[#A8988B]" />
                    <span>{formatEthiopianPhone(primaryMatch.phoneNumber)}</span>
                  </div>
                  <div className="flex items-start gap-1.5 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-[#A8988B] shrink-0 mt-0.5" />
                    <span>
                      {[primaryMatch.regionName || primaryMatch.region, primaryMatch.zoneName || primaryMatch.zone, primaryMatch.woredaName || primaryMatch.woreda, primaryMatch.kebeleName || primaryMatch.kebele, primaryMatch.village].filter(Boolean).join(' > ') || 'Address recorded'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-[#A8988B] font-mono pt-1 truncate">
                    ID: {primaryMatch.clientRecordId || primaryMatch.id}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50/90 dark:bg-[#120C0A]/95 backdrop-blur-sm border-t border-slate-100 dark:border-[#2C1D16] flex justify-end rounded-b-2xl sm:rounded-b-3xl">
          <Button
            type="button"
            variant="primary"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Return & Correct Registration Form
          </Button>
        </div>
      </div>
    </div>
  );
}
