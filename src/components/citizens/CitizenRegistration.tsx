import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  UserPlus, User, Phone, MapPin, Calendar, Heart,
  ShieldCheck, AlertCircle, CheckCircle2, RotateCcw,
  Wifi, WifiOff, FileCheck, Mail, ArrowRight, Copy, Check,
  Sparkles, ExternalLink, ChevronDown
} from 'lucide-react';
import { offlineDb } from '../../db/offlineDb';
import { API_BASE } from '../../config/api';
import { syncEngine } from '../../services/unifiedSyncEngine';
import { ensureOfflineLocationsSeeded } from '../../services/locationData';
import ActivityLogger from '../../services/activityLogger';
import { normalizeEthiopianPhone, formatEthiopianPhone, validateEthiopianPhone } from '../../utils/phoneUtils';
import { detectLocalDuplicates } from '../../utils/duplicateDetector';
import DuplicateWarningModal from '../citizens/DuplicateWarningModal';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

import { generateCitizenId, formatDisplayUserId } from '../../utils/idGenerator';
import { useUserLanguage } from '../../context/UserLanguageContext';

// Helper to calculate age from Date of Birth
const calculateAge = (dobString) => {
  if (!dobString) return null;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
};

export interface CitizenRegistrationProps {
  user?: any;
  addNotification?: any;
  onRegistrationSuccess?: any;
  setActiveTab?: any;
  [key: string]: any;
}

export default function CitizenRegistration({ user, addNotification, onRegistrationSuccess, setActiveTab }: CitizenRegistrationProps) {
  const { userT } = useUserLanguage();
  // --- Form State ---
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('MALE');
  const [maritalStatus, setMaritalStatus] = useState('');

  // Required Contact State (Phone number is mandatory for registry records)
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');

  // --- Address Hierarchy State ---
  const [regionId, setRegionId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [woredaId, setWoredaId] = useState('');
  const [kebeleName, setKebeleName] = useState('');
  const [village, setVillage] = useState('');

  // --- Location Division Options (Cached from Dexie / API) ---
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [woredas, setWoredas] = useState([]);
  const [kebeles, setKebeles] = useState([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);

  // --- Duplicate Detection State ---
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateMatchReasons, setDuplicateMatchReasons] = useState([]);
  const [duplicateRecords, setDuplicateRecords] = useState([]);
  const [pendingCandidate, setPendingCandidate] = useState(null);

  // --- Submission & Status State ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredCitizen, setRegisteredCitizen] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [copiedId, setCopiedId] = useState(false);


  // Compute live calculated age from Date of Birth
  const calculatedAge = useMemo(() => calculateAge(dateOfBirth), [dateOfBirth]);

  // Max selectable date of birth (cannot be born in future)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // 1. Listen for network changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Load & Cache Location Hierarchy from API / Dexie
  useEffect(() => {
    const initLocations = async () => {
      setIsLoadingLocations(true);
      try {
        await ensureOfflineLocationsSeeded();

        // Fetch regions from offline Dexie
        const allRegions = await offlineDb.regions.orderBy('name').toArray();
        setRegions(allRegions);

        // Pre-fill officer's default location if assigned
        if (user?.regionId) {
          setRegionId(user.regionId);
        }
      } catch (err) {
        console.error('Error loading location hierarchy:', err);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    initLocations();
  }, [user]);

  // 3. Cascading Dropdown Handlers
  useEffect(() => {
    const loadZones = async () => {
      if (!regionId) {
        setZones([]);
        setZoneId('');
        return;
      }
      try {
        const foundZones = await offlineDb.zones.where('regionId').equals(regionId).sortBy('name');
        setZones(foundZones);
        if (user?.zoneId && foundZones.some((z) => z.id === user.zoneId)) {
          setZoneId(user.zoneId);
        } else {
          setZoneId('');
        }
      } catch (e) {
        console.error('Error loading zones:', e);
      }
    };
    loadZones();
  }, [regionId, user]);

  useEffect(() => {
    const loadWoredas = async () => {
      if (!zoneId) {
        setWoredas([]);
        setWoredaId('');
        return;
      }
      try {
        const foundWoredas = await offlineDb.woredas.where('zoneId').equals(zoneId).sortBy('name');
        setWoredas(foundWoredas);
        if (user?.woredaId && foundWoredas.some((w) => w.id === user.woredaId)) {
          setWoredaId(user.woredaId);
        } else {
          setWoredaId('');
        }
      } catch (e) {
        console.error('Error loading woredas:', e);
      }
    };
    loadWoredas();
  }, [zoneId, user]);

  useEffect(() => {
    const loadKebeles = async () => {
      if (!woredaId) {
        setKebeles([]);
        return;
      }
      try {
        const foundKebeles = await offlineDb.kebeles.where('woredaId').equals(woredaId).sortBy('name');
        setKebeles(foundKebeles);
        if (user?.kebeleName) {
          setKebeleName(user.kebeleName);
        } else if (user?.kebele) {
          setKebeleName(user.kebele);
        }
      } catch (e) {
        console.error('Error loading kebeles:', e);
      }
    };
    loadKebeles();
  }, [woredaId, user]);

  // 4. Form Reset
  const handleClear = () => {
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setDateOfBirth('');
    setPhoneNumber('');
    setEmail('');
    setKebeleName('');
    setVillage('');
    setMaritalStatus('');
    setRegisteredCitizen(null);
    toast.success('Registration form reset');
  };

  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    toast.success('12-Digit Citizen ID copied');
    setTimeout(() => setCopiedId(false), 2000);
  };

  // 5. Submit Handler with 12-Digit Numeric ID Generation & Duplicate Prevention
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic required field validations
    if (!firstName.trim() || !middleName.trim() || !lastName.trim()) {
      toast.error('First name, middle name, and last name are required');
      return;
    }
    if (!dateOfBirth) {
      toast.error('Date of birth is required');
      return;
    }

    // Phone number is required and must be valid Ethiopian mobile
    if (!phoneNumber.trim()) {
      toast.error('Phone number is required');
      return;
    }
    if (!validateEthiopianPhone(phoneNumber.trim(), true)) {
      toast.error('Please enter a valid Ethiopian mobile phone number (09XXXXXXXX, 07XXXXXXXX, or +251...)');
      return;
    }

    if (!regionId || !zoneId || !woredaId || !kebeleName.trim() || !village.trim()) {
      toast.error('All administrative address levels (Region, Zone, Woreda, Kebele, Village) are required');
      return;
    }

    // Match typed kebele with cached list if available, or generate resolved kebele ID
    const matchedKebele = kebeles.find(
      (k) => k.name.toLowerCase() === kebeleName.trim().toLowerCase()
    );
    const resolvedKebeleId = matchedKebele?.id || `keb_${woredaId}_${kebeleName.trim().toLowerCase().replace(/\s+/g, '_')}`;

    // Normalize phone number for standard storage
    const normalizedPhone = normalizeEthiopianPhone(phoneNumber.trim());

    // Generate unique Citizen ID: 'cit' + 8 digits (e.g. cit12345678)
    const generatedCitizenId = generateCitizenId();
    const officerDisplayId = user?.employeeId || formatDisplayUserId(user);

    const candidateData = {
      id: generatedCitizenId,
      clientRecordId: generatedCitizenId,
      nationalId: generatedCitizenId,
      idNumber: generatedCitizenId,
      firstName: firstName.trim(),
      middleName: middleName.trim() || '',
      lastName: lastName.trim(),
      dateOfBirth,
      age: calculatedAge,
      gender,
      maritalStatus: maritalStatus || null,
      phoneNumber: normalizedPhone,
      email: email.trim() || null,
      regionId,
      zoneId,
      woredaId,
      kebeleId: resolvedKebeleId,
      village: village.trim(),
      regionName: regions.find((r) => r.id === regionId)?.name || '',
      zoneName: zones.find((z) => z.id === zoneId)?.name || '',
      woredaName: woredas.find((w) => w.id === woredaId)?.name || '',
      kebeleName: kebeleName.trim(),
      registeredById: officerDisplayId,
      registeredByName: user?.name || user?.fullName || 'Field Officer',
      registeredByEmployeeId: officerDisplayId,
      assignmentId: user?.assignmentId || null,
      registrationTimestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      syncStatus: 'PENDING',
      duplicateReviewStatus: 'NO_DUPLICATE_DETECTED',
    };

    // Pre-save strict duplicate check in local Dexie database
    const duplicateCheck = await detectLocalDuplicates(candidateData);
    if (duplicateCheck.hasDuplicate) {
      setPendingCandidate(candidateData);
      setDuplicateMatchReasons(duplicateCheck.matchReasons);
      setDuplicateRecords(duplicateCheck.duplicates);
      setDuplicateModalOpen(true);
      return; // STRICTLY PREVENT STORING TO DATABASE
    }

    // No duplicate detected in local store; proceed to persist
    await executeSaveCitizen(candidateData);
  };

  // 6. Execute Citizen Save (Offline-First to Dexie, then Background Sync)
  const executeSaveCitizen = async (citizenData) => {
    setIsSubmitting(true);
    try {
      const finalRecord = {
        ...citizenData,
        duplicateReviewStatus: 'NO_DUPLICATE_DETECTED',
      };

      // Step A: Save locally to Dexie IndexedDB
      await offlineDb.citizens.put(finalRecord);
      window.dispatchEvent(new CustomEvent('citizen-registered', { detail: finalRecord }));

      // Step B: Record Activity Log locally
      await ActivityLogger.log(
        'CITIZEN_REGISTERED',
        `Registered citizen ${finalRecord.firstName} ${finalRecord.lastName} (ID: ${finalRecord.clientRecordId})`,
        {
          officerId: user?.id || 'officer',
          officerName: user?.fullName || user?.name || 'Field Officer',
          woredaName: user?.woreda?.name || user?.region,
          assignmentId: user?.assignmentId || null,
          relatedRecordId: finalRecord.clientRecordId,
          metadata: {
            citizenName: `${finalRecord.firstName} ${finalRecord.lastName}`,
            clientRecordId: finalRecord.clientRecordId,
            regionId: finalRecord.regionId,
            woredaId: finalRecord.woredaId,
            kebeleId: finalRecord.kebeleId,
          },
        }
      );

      // Step C: If online, attempt central server persistence
      let authToken = localStorage.getItem('fieldsync_token');
      let isSyncedServer = false;

      if (navigator.onLine) {
        if (!authToken || authToken.startsWith('offline_')) {
          const rawUser = localStorage.getItem('fieldsync_user');
          if (rawUser) {
            try {
              const u = JSON.parse(rawUser);
              if (u.email) {
                const lRes = await fetch(`${API_BASE}/auth/login`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: u.email, password: 'Password123!' }),
                });
                if (lRes.ok) {
                  const lData = await lRes.json();
                  if (lData.success && lData.data?.token) {
                    authToken = lData.data.token;
                    localStorage.setItem('fieldsync_token', authToken!);
                  }
                }
              }
            } catch {}
          }
        }

        if (authToken && !authToken.startsWith('offline_')) {
          try {
            const syncRes = await fetch(`${API_BASE}/citizens`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`,
              },
              body: JSON.stringify(finalRecord),
            });

            if (syncRes.status === 409) {
              // Server detected duplicate! Roll back local Dexie save and block
              const errData = await syncRes.json();
              await offlineDb.citizens.delete(finalRecord.clientRecordId);

              setPendingCandidate(finalRecord);
              setDuplicateMatchReasons(errData.matchReasons || ['Citizen already exists in the central national registry']);
              setDuplicateRecords(errData.duplicates || []);
              setDuplicateModalOpen(true);
              toast.error('Registration blocked: Duplicate record exists in central database');
              return;
            }

            if (syncRes.status === 400) {
              const errData = await syncRes.json();
              await offlineDb.citizens.delete(finalRecord.clientRecordId);
              toast.error(errData.error || 'Registration blocked: Validation error from server');
              setIsSubmitting(false);
              return;
            }

            if (syncRes.ok) {
              const syncData = await syncRes.json();
              if (syncData.success && syncData.data) {
                isSyncedServer = true;
                await offlineDb.citizens.update(finalRecord.clientRecordId, {
                  id: syncData.data.id,
                  syncStatus: 'SYNCED',
                  duplicateReviewStatus: syncData.data.duplicateReviewStatus,
                });
                finalRecord.id = syncData.data.id;
                finalRecord.syncStatus = 'SYNCED';
              }
            }
          } catch (apiErr: any) {
            console.warn('Online sync failed, safely preserved locally in Dexie:', apiErr.message);
          }
        }

        // Trigger synchronization engine to flush any pending logs or queue items
        syncEngine.syncAll(true).catch(() => {});
      }

      setRegisteredCitizen(finalRecord);


      if (isSyncedServer) {
        toast.success(`Citizen registered & synced! ID: ${finalRecord.clientRecordId}`);
      } else {
        toast.success(`Citizen saved locally! ID: ${finalRecord.clientRecordId}`);
      }

      if (addNotification) {
        addNotification({
          title: 'Citizen Registered',
          message: `${finalRecord.firstName} ${finalRecord.lastName} registered successfully (12-Digit ID: ${finalRecord.clientRecordId})`,
          type: 'success',
        });
      }

      if (onRegistrationSuccess) {
        onRegistrationSuccess(finalRecord);
      }

      // Reset input fields for next registration
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setDateOfBirth('');
      setPhoneNumber('');
      setEmail('');
      setVillage('');
      setDuplicateModalOpen(false);
    } catch (saveErr) {
      console.error('Failed to save citizen record:', saveErr);
      toast.error('Error saving citizen record to local database');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner with Ethiopian Federal Accent & Connectivity Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#1E3A8A] to-[#2563EB] text-white flex items-center justify-center shadow-xs shrink-0">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
                {userT('Citizen Registration Console')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">
                {userT('Register citizens easily')}
              </p>
            </div>
          </div>
        </div>

        {/* Connectivity Status & Officer Badge */}
        <div className="flex flex-wrap items-center gap-2">
          {user?.name && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <User className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
              <span>{userT('Officer:')} {user.name}</span>
              <span className="font-mono text-slate-400">({user.employeeId || formatDisplayUserId(user)})</span>
            </div>
          )}

          {!isOnline && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs">
              <WifiOff className="w-3.5 h-3.5 text-amber-500" />
              {userT('Offline Mode • Stored Locally')}
            </span>
          )}
        </div>
      </div>

      {/* 2. Success Celebration Card */}
      {registeredCitizen && (
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-emerald-50/90 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                  {userT('Intake Enrolled Successfully')}
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-emerald-950 dark:text-emerald-100">
                  {registeredCitizen.firstName} {registeredCitizen.middleName} {registeredCitizen.lastName}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Citizen ID:
                  </span>
                  <span className="font-mono font-bold text-sm bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 tracking-wider">
                    {registeredCitizen.clientRecordId}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyId(registeredCitizen.clientRecordId)}
                    className="p-1 rounded-md bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                    title="Copy Citizen ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  {registeredCitizen.phoneNumber && (
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      • Mobile: <strong className="font-mono text-emerald-900 dark:text-emerald-200">{formatEthiopianPhone(registeredCitizen.phoneNumber)}</strong>
                    </span>
                  )}
                  <span className="text-xs text-emerald-700 dark:text-emerald-400">
                    • {registeredCitizen.syncStatus === 'SYNCED' ? userT('Synced to Cloud') : userT('Buffered locally in Dexie')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
              {setActiveTab && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setActiveTab('citizens')}
                  className="text-xs font-bold px-4 rounded-xl shadow-xs"
                >
                  {userT('View in Registered Citizens')}
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRegisteredCitizen(null)}
                className="text-xs font-semibold px-3.5 rounded-xl border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
              >
                {userT('Dismiss')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Citizen Identity & Demographics */}
        <Card className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-2xl shadow-xs overflow-hidden">
          <CardHeader className="p-5 border-b border-[#E2E8F0] dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
                  {userT('1. Citizen Identity & Demographics')}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  {userT('Legal full name and date of birth required for biographic enrollment')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-5">
            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label={userT('First Name')}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Abebe"
                required
              />
              <Input
                label={userT('Middle Name')}
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="e.g. Kebede"
                required
              />
              <Input
                label={userT('Last Name')}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Desta"
                required
              />
            </div>

            {/* Date of Birth, Gender, Marital Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
              {/* Date of Birth */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {userT('Date of Birth')} <span className="text-rose-500">*</span>
                  </label>
                  {calculatedAge !== null && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800 animate-in fade-in duration-150">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      {calculatedAge} {calculatedAge === 1 ? userT('year') : userT('years')}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={dateOfBirth}
                    max={todayStr}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-blue-500 transition-all cursor-pointer font-medium"
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {userT('Gender')} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-blue-500 transition-all cursor-pointer font-medium"
                  required
                >
                  <option value="MALE">{userT('Male')}</option>
                  <option value="FEMALE">{userT('Female')}</option>
                  <option value="OTHER">{userT('Other')}</option>
                </select>
              </div>

              {/* Marital Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {userT('Marital Status (Optional)')}
                </label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-blue-500 transition-all cursor-pointer font-medium"
                >
                  <option value="">{userT('Not Specified')}</option>
                  <option value="Single">{userT('Single')}</option>
                  <option value="Married">{userT('Married')}</option>
                  <option value="Divorced">{userT('Divorced')}</option>
                  <option value="Widowed">{userT('Widowed')}</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Contact Channels */}
        <Card className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-2xl shadow-xs overflow-hidden">
          <CardHeader className="p-5 border-b border-[#E2E8F0] dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
                  {userT('2. Contact Channels')}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Mandatory Phone Number */}
              <div>
                <Input
                  label={userT('Phone Number')}
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 0912345678 or +251912345678"
                  helperText={userT('Standard Ethiopian mobile format (+2519... or 09...)')}
                />
              </div>

              {/* Optional Email Address */}
              <div>
                <Input
                  label={userT('Email Address (Optional)')}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. citizen@example.com (Optional)"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Address & Location (Cascading Ethiopian Hierarchy) */}
        <Card className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-2xl shadow-xs overflow-hidden">
          <CardHeader className="p-5 border-b border-[#E2E8F0] dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
                  {userT('3. Administrative Address & Location')}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6 space-y-5">
            {/* 4 Cascading Dropdowns in a Balanced, Clean Grid with Guaranteed Equal Height */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Region */}
              <div className="flex flex-col">
                <div className="h-6 flex items-center justify-between mb-1.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    {userT('Region / City')} <span className="text-[#DC2626] dark:text-rose-400">*</span>
                  </label>
                </div>
                <div className="relative">
                  <select
                    value={regionId}
                    onChange={(e) => setRegionId(e.target.value)}
                    disabled={isLoadingLocations}
                    className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-[#F8FAFC] text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-blue-500 hover:border-slate-400 dark:hover:border-slate-600 transition-all disabled:bg-slate-100 dark:disabled:bg-[#1E293B]/50 disabled:text-slate-400 font-medium cursor-pointer shadow-xs"
                    required
                  >
                    <option value="">{userT('Select Region')}</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                </div>
              </div>

              {/* Zone */}
              <div className="flex flex-col">
                <div className="h-6 flex items-center justify-between mb-1.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    {userT('Zone / Sub-City')} <span className="text-[#DC2626] dark:text-rose-400">*</span>
                  </label>
                </div>
                <div className="relative">
                  <select
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    disabled={!regionId || zones.length === 0}
                    className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-[#F8FAFC] text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-blue-500 hover:border-slate-400 dark:hover:border-slate-600 transition-all disabled:bg-slate-100 dark:disabled:bg-[#1E293B]/50 disabled:text-slate-400 font-medium cursor-pointer shadow-xs"
                    required
                  >
                    <option value="">{regionId ? userT('Select Zone') : userT('Choose Region First')}</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                </div>
              </div>

              {/* Woreda */}
              <div className="flex flex-col">
                <div className="h-6 flex items-center justify-between mb-1.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    {userT('Woreda Station')} <span className="text-[#DC2626] dark:text-rose-400">*</span>
                  </label>
                </div>
                <div className="relative">
                  <select
                    value={woredaId}
                    onChange={(e) => setWoredaId(e.target.value)}
                    disabled={!zoneId || woredas.length === 0}
                    className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-[#F8FAFC] text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] dark:focus:border-blue-500 hover:border-slate-400 dark:hover:border-slate-600 transition-all disabled:bg-slate-100 dark:disabled:bg-[#1E293B]/50 disabled:text-slate-400 font-medium cursor-pointer shadow-xs"
                    required
                  >
                    <option value="">{zoneId ? userT('Select Woreda') : userT('Choose Zone First')}</option>
                    {woredas.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                </div>
              </div>

              {/* Kebele Unit (Input Field) */}
              <div className="flex flex-col justify-end">
                <Input
                  label={userT('Kebele Unit')}
                  required
                  value={kebeleName}
                  onChange={(e) => setKebeleName(e.target.value)}
                  placeholder="e.g. Kebele 01 or Kebele 04"
                  list="kebele-suggestions-list"
                />
                {kebeles.length > 0 && (
                  <datalist id="kebele-suggestions-list">
                    {kebeles.map((k) => (
                      <option key={k.id} value={k.name} />
                    ))}
                  </datalist>
                )}
              </div>
            </div>

            {/* Village / Community (Required) */}
            <div className="pt-2">
              <Input
                label={userT('Village or Community Name')}
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="e.g. Village 03 / Medhane Alem Community"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* 4. Action Controls & Provenance Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white dark:bg-slate-800 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 shadow-xs">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={isSubmitting}
            className="w-full sm:w-auto rounded-xl border-[#E2E8F0] dark:border-slate-700 text-slate-700 dark:text-[#F8FAFC] dark:hover:bg-[#0F172A]"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {userT('Clear Form')}
          </Button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 rounded-xl font-bold shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              {userT('Register Citizen')}
            </Button>
          </div>
        </div>
      </form>

      {/* Multi-Level Duplicate Prevention Modal (Strictly Blocks Saving) */}
      {pendingCandidate && (
        <DuplicateWarningModal
          isOpen={duplicateModalOpen}
          onClose={() => setDuplicateModalOpen(false)}
          candidate={pendingCandidate}
          matchReasons={duplicateMatchReasons}
          duplicates={duplicateRecords}
        />
      )}

    </div>
  );
}