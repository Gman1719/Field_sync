// src/components/citizens/DuplicateWarningModal.jsx
// Enterprise Warning & Confirmation Modal for Suspected Duplicate Citizen Registrations

import React from 'react';
import { AlertTriangle, UserCheck, Edit3, ShieldAlert, Phone, MapPin, Calendar, User } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatEthiopianPhone } from '../../utils/phoneUtils';

export default function DuplicateWarningModal({
  isOpen,
  onClose,
  onConfirmProceed,
  candidate,
  matchReasons = [],
  duplicates = [],
  isSubmitting = false,
}) {
  if (!isOpen) return null;

  const primaryMatch = duplicates[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-amber-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 bg-amber-50 border-b border-amber-100 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Potential Duplicate Citizen Detected
            </h3>
            <p className="text-xs text-amber-800 mt-0.5">
              The system found existing citizen records that closely match the information entered.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Policy Guidance Alert */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
            <span className="font-semibold block flex items-center gap-1.5 text-blue-800">
              <ShieldAlert className="w-4 h-4 text-blue-600" />
              Field Registration Guidance:
            </span>
            <p className="text-blue-700">
              In Ethiopia, family members frequently share a single mobile device. Do not turn away a citizen solely due to a shared phone number. If this is a different family member, confirm to proceed.
            </p>
          </div>

          {/* Match Reasons */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Detection Triggers:
            </span>
            <ul className="space-y-1">
              {matchReasons.map((reason, idx) => (
                <li
                  key={idx}
                  className="text-xs font-medium text-amber-900 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          {/* Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* New Candidate */}
            <div className="p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-900 uppercase tracking-wider text-[11px]">
                  New Registration
                </span>
                <Badge variant="blue">Current Entry</Badge>
              </div>

              <div className="space-y-1 text-slate-700">
                <div className="font-semibold text-sm text-slate-900">
                  {[candidate.firstName, candidate.middleName, candidate.lastName].filter(Boolean).join(' ')}
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <User className="w-3.5 h-3.5" />
                  <span>{candidate.gender} • {candidate.age ? `${candidate.age} yrs` : candidate.dateOfBirth}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{formatEthiopianPhone(candidate.phoneNumber)}</span>
                </div>
                <div className="flex items-start gap-1.5 text-slate-600 pt-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    {[candidate.regionName, candidate.zoneName, candidate.woredaName, candidate.kebeleName, candidate.village].filter(Boolean).join(' > ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Existing Matching Record */}
            {primaryMatch && (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                    Existing Record in System
                  </span>
                  <Badge variant="warning">Potential Match</Badge>
                </div>

                <div className="space-y-1 text-slate-700">
                  <div className="font-semibold text-sm text-slate-900">
                    {[primaryMatch.firstName, primaryMatch.middleName, primaryMatch.lastName].filter(Boolean).join(' ')}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <User className="w-3.5 h-3.5" />
                    <span>{primaryMatch.gender} • {primaryMatch.age ? `${primaryMatch.age} yrs` : (primaryMatch.dateOfBirth || 'Age unrecorded')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{formatEthiopianPhone(primaryMatch.phoneNumber)}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-slate-600 pt-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      {[primaryMatch.regionName || primaryMatch.region, primaryMatch.zoneName || primaryMatch.zone, primaryMatch.woredaName || primaryMatch.woreda, primaryMatch.kebeleName || primaryMatch.kebele, primaryMatch.village].filter(Boolean).join(' > ') || 'Address recorded'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1">
                    ID: {primaryMatch.clientRecordId?.slice(0, 16)}...
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Review & Edit Form
          </Button>

          <Button
            type="button"
            variant="warning"
            onClick={onConfirmProceed}
            loading={isSubmitting}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white"
          >
            <UserCheck className="w-4 h-4 mr-2" />
            Confirm as Different Citizen & Save
          </Button>
        </div>
      </div>
    </div>
  );
}
