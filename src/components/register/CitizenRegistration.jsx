// src/components/register/CitizenRegistration.jsx
// Enterprise Offline-First Citizen Registration Form with Ethiopian Address Hierarchy & Duplicate Detection

import React, { useState, useEffect, useId } from 'react';
import toast from 'react-hot-toast';
import {
  UserPlus, User, Phone, MapPin, Calendar, Heart,
  ShieldCheck, AlertCircle, CheckCircle2, RotateCcw,
  Wifi, WifiOff, FileCheck
} from 'lucide-react';
import { offlineDb } from '../../db/offlineDb';
import { API_BASE } from '../../config/api';
import { validateEthiopianPhone, normalizeEthiopianPhone, formatEthiopianPhone } from '../../utils/phoneUtils';
import { detectLocalDuplicates } from '../../utils/duplicateDetector';
import DuplicateWarningModal from '../citizens/DuplicateWarningModal';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function CitizenRegistration({ user, addNotification, onRegistrationSuccess }) {
  // --- Form State ---
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [ageMode, setAgeMode] = useState('age'); // 'age' | 'dob'
  const [age, setAge] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('MALE');
  const [maritalStatus, setMaritalStatus] = useState('');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [alternativePhone, setAlternativePhone] = useState('');

  // --- Address Hierarchy State ---
  const [regionId, setRegionId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [woredaId, setWoredaId] = useState('');
  const [kebeleId, setKebeleId] = useState('');
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
  const [phoneValidationError, setPhoneValidationError] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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
        let regionCount = await offlineDb.regions.count();

        // If local database lacks locations and we are online, download full bundle
        if (regionCount === 0 && navigator.onLine) {
          try {
            const res = await fetch(`${API_BASE}/locations/bundle`);
            if (res.ok) {
              const resData = await res.json();
              if (resData.success && resData.data) {
                await Promise.all([
                  offlineDb.regions.bulkPut(resData.data.regions),
                  offlineDb.zones.bulkPut(resData.data.zones),
                  offlineDb.woredas.bulkPut(resData.data.woredas),
                  offlineDb.kebeles.bulkPut(resData.data.kebeles),
                ]);
              }
            }
          } catch (e) {
            console.warn('Could not fetch locations bundle:', e.message);
          }
        }

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
      const loadedZones = await offlineDb.zones.where('regionId').equals(regionId).sortBy('name');
      setZones(loadedZones);

      if (user?.zoneId && loadedZones.some(z => z.id === user.zoneId)) {
        setZoneId(user.zoneId);
      } else {
        setZoneId('');
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
      const loadedWoredas = await offlineDb.woredas.where('zoneId').equals(zoneId).sortBy('name');
      setWoredas(loadedWoredas);

      if (user?.woredaId && loadedWoredas.some(w => w.id === user.woredaId)) {
        setWoredaId(user.woredaId);
      } else {
        setWoredaId('');
      }
    };
    loadWoredas();
  }, [zoneId, user]);

  useEffect(() => {
    const loadKebeles = async () => {
      if (!woredaId) {
        setKebeles([]);
        setKebeleId('');
        return;
      }
      const loadedKebeles = await offlineDb.kebeles.where('woredaId').equals(woredaId).sortBy('name');
      setKebeles(loadedKebeles);

      if (user?.kebeleId && loadedKebeles.some(k => k.id === user.kebeleId)) {
        setKebeleId(user.kebeleId);
      } else {
        setKebeleId('');
      }
    };
    loadKebeles();
  }, [woredaId, user]);

  // 4. Validate Phone Real-time
  const handlePhoneChange = (val) => {
    setPhoneNumber(val);
    if (!val || val.trim() === '') {
      setPhoneValidationError('');
    } else if (!validateEthiopianPhone(val)) {
      setPhoneValidationError('Enter a valid Ethiopian phone number (e.g. 0912345678 or +251912345678)');
    } else {
      setPhoneValidationError('');
    }
  };

  // 5. Clear Form
  const handleClear = () => {
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setAge('');
    setDateOfBirth('');
    setGender('MALE');
    setMaritalStatus('');
    setPhoneNumber('');
    setAlternativePhone('');
    setVillage('');
    setPhoneValidationError('');
    setRegisteredCitizen(null);
  };

  // 6. Form Submission Workflow
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Required Field Validations
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }

    if (ageMode === 'age' && (!age || parseInt(age, 10) < 0)) {
      toast.error('Please enter a valid age');
      return;
    }

    if (ageMode === 'dob' && !dateOfBirth) {
      toast.error('Please enter a valid date of birth');
      return;
    }

    if (phoneNumber && !validateEthiopianPhone(phoneNumber)) {
      toast.error('Invalid Ethiopian phone number');
      return;
    }

    if (!regionId || !zoneId || !woredaId || !kebeleId) {
      toast.error('Please select the complete address hierarchy: Region, Zone, Woreda, and Kebele');
      return;
    }

    if (!village.trim()) {
      toast.error('Village or Community is required');
      return;
    }

    const clientRecordId = crypto.randomUUID();
    const normalizedPhone = normalizeEthiopianPhone(phoneNumber);
    const normalizedAltPhone = normalizeEthiopianPhone(alternativePhone);

    const candidateData = {
      clientRecordId,
      firstName: firstName.trim(),
      middleName: middleName.trim() || '',
      lastName: lastName.trim(),
      dateOfBirth: ageMode === 'dob' ? dateOfBirth : null,
      age: ageMode === 'age' ? parseInt(age, 10) : null,
      gender,
      maritalStatus: maritalStatus || null,
      phoneNumber: normalizedPhone,
      alternativePhone: normalizedAltPhone,
      regionId,
      zoneId,
      woredaId,
      kebeleId,
      village: village.trim(),
      regionName: regions.find((r) => r.id === regionId)?.name || '',
      zoneName: zones.find((z) => z.id === zoneId)?.name || '',
      woredaName: woredas.find((w) => w.id === woredaId)?.name || '',
      kebeleName: kebeles.find((k) => k.id === kebeleId)?.name || '',
      registeredById: user?.id || 'offline_officer',
      assignmentId: user?.assignmentId || null,
      registrationTimestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      syncStatus: 'PENDING',
      duplicateReviewStatus: 'NO_DUPLICATE_DETECTED',
    };

    // Pre-save local duplicate check in Dexie
    const duplicateCheck = await detectLocalDuplicates(candidateData);
    if (duplicateCheck.hasDuplicate) {
      setPendingCandidate(candidateData);
      setDuplicateMatchReasons(duplicateCheck.matchReasons);
      setDuplicateRecords(duplicateCheck.duplicates);
      setDuplicateModalOpen(true);
      return;
    }

    // No duplicate detected; proceed to save directly
    await executeSaveCitizen(candidateData, false);
  };

  // 7. Execute Citizen Save (Offline-First to Dexie, then Background Sync)
  const executeSaveCitizen = async (citizenData, isConfirmedDuplicate = false) => {
    setIsSubmitting(true);
    try {
      const finalRecord = {
        ...citizenData,
        duplicateReviewStatus: isConfirmedDuplicate ? 'NEEDS_REVIEW' : 'NO_DUPLICATE_DETECTED',
      };

      // Step A: Save locally to Dexie IndexedDB
      await offlineDb.citizens.put(finalRecord);

      // Step B: Record Activity Log locally
      await offlineDb.activityLogs.put({
        id: crypto.randomUUID(),
        officerId: user?.id || 'officer',
        assignmentId: user?.assignmentId || null,
        eventType: 'CITIZEN_REGISTERED',
        description: `Registered citizen ${finalRecord.firstName} ${finalRecord.lastName} (${finalRecord.village})`,
        deviceTimestamp: new Date().toISOString(),
        relatedRecordId: finalRecord.clientRecordId,
        metadata: {
          clientRecordId: finalRecord.clientRecordId,
          regionId: finalRecord.regionId,
          woredaId: finalRecord.woredaId,
          kebeleId: finalRecord.kebeleId,
        },
        syncStatus: 'PENDING',
      });

      // Step C: If online, attempt background sync with backend REST API
      const authToken = localStorage.getItem('fieldsync_token');
      let isSyncedServer = false;

      if (navigator.onLine && authToken) {
        try {
          const syncRes = await fetch(`${API_BASE}/citizens`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(finalRecord),
          });

          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (syncData.success && syncData.data) {
              isSyncedServer = true;
              // Mark as SYNCED in local Dexie
              await offlineDb.citizens.update(finalRecord.clientRecordId, {
                id: syncData.data.id,
                syncStatus: 'SYNCED',
                duplicateReviewStatus: syncData.data.duplicateReviewStatus,
              });
              finalRecord.id = syncData.data.id;
              finalRecord.syncStatus = 'SYNCED';
            }
          }
        } catch (apiErr) {
          console.warn('Online sync failed, preserved locally in Dexie:', apiErr.message);
        }
      }

      setRegisteredCitizen(finalRecord);

      if (isSyncedServer) {
        toast.success('Citizen registered & synchronized with central database!');
      } else {
        toast.success('Saved Locally — Pending Sync');
      }

      if (addNotification) {
        addNotification({
          title: 'Citizen Registered',
          message: `${finalRecord.firstName} ${finalRecord.lastName} saved successfully (${finalRecord.syncStatus})`,
          type: 'success',
        });
      }

      if (onRegistrationSuccess) {
        onRegistrationSuccess(finalRecord);
      }

      // Reset input fields
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setAge('');
      setDateOfBirth('');
      setPhoneNumber('');
      setAlternativePhone('');
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
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-card">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Citizen Registration
              </h1>
              <p className="text-xs text-slate-500">
                Register citizens in Ethiopian administrative jurisdictions (Region &gt; Zone &gt; Woreda &gt; Kebele)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOnline ? (
            <Badge variant="success" className="gap-1.5 py-1 px-3">
              <Wifi className="w-3.5 h-3.5" />
              <span>Online Mode</span>
            </Badge>
          ) : (
            <Badge variant="warning" className="gap-1.5 py-1 px-3">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline Mode Active</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Success Confirmation Card */}
      {registeredCitizen && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-emerald-900 text-sm block">
                Citizen Successfully Registered!
              </span>
              <p className="text-emerald-800">
                Beneficiary: <strong className="font-semibold">{registeredCitizen.firstName} {registeredCitizen.lastName}</strong>
                {' • '}Location: <span className="font-medium">{registeredCitizen.woredaName}, {registeredCitizen.kebeleName} ({registeredCitizen.village})</span>
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="font-mono text-[11px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                  UUID: {registeredCitizen.clientRecordId}
                </span>
                <Badge variant={registeredCitizen.syncStatus === 'SYNCED' ? 'success' : 'warning'}>
                  {registeredCitizen.syncStatus === 'SYNCED' ? 'Synced with Central DB' : 'Saved Locally — Pending Sync'}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRegisteredCitizen(null)}
            className="text-xs"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Section 1: Personal Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#1E3A8A]" />
              <CardTitle className="text-base">1. Personal Information</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Primary identification details of the beneficiary citizen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Abebe"
                required
              />
              <Input
                label="Middle Name"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="e.g. Kebede (Optional)"
              />
              <Input
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Desta"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              {/* DOB / Age Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Age Specification <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAgeMode('age')}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                      ageMode === 'age'
                        ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Exact Age
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgeMode('dob')}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                      ageMode === 'dob'
                        ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Date of Birth
                  </button>
                </div>
              </div>

              {ageMode === 'age' ? (
                <Input
                  label="Age (in years)"
                  type="number"
                  min="0"
                  max="125"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 32"
                  required
                />
              ) : (
                <Input
                  label="Date of Birth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                />
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] transition-all"
                  required
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Marital Status (Optional)
                </label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] transition-all"
                >
                  <option value="">Not Specified</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Contact Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#1E3A8A]" />
              <CardTitle className="text-base">2. Contact Information</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Ethiopian phone number validation (Optional — citizen can register without a phone)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Primary Phone Number (Optional)"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="09XXXXXXXX or +2519XXXXXXXX"
                  error={phoneValidationError}
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Accepted formats: <code>09...</code>, <code>07...</code>, <code>+2519...</code>, <code>+2517...</code>
                </span>
              </div>

              <div>
                <Input
                  label="Alternative Phone (Optional)"
                  type="tel"
                  value={alternativePhone}
                  onChange={(e) => setAlternativePhone(e.target.value)}
                  placeholder="e.g. Household contact number"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Address & Location (Cascading Hierarchy) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#1E3A8A]" />
              <CardTitle className="text-base">3. Full Administrative Address & Location</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Region &rarr; Zone &rarr; Woreda &rarr; Kebele cascading division hierarchy (Cached for offline availability)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Region */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Region / City <span className="text-rose-500">*</span>
                </label>
                <select
                  value={regionId}
                  onChange={(e) => setRegionId(e.target.value)}
                  disabled={isLoadingLocations}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] transition-all disabled:bg-slate-100"
                  required
                >
                  <option value="">Select Region</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Zone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Administrative Zone <span className="text-rose-500">*</span>
                </label>
                <select
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  disabled={!regionId || zones.length === 0}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] transition-all disabled:bg-slate-100"
                  required
                >
                  <option value="">{regionId ? 'Select Zone' : 'Choose Region First'}</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Woreda */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Woreda / District <span className="text-rose-500">*</span>
                </label>
                <select
                  value={woredaId}
                  onChange={(e) => setWoredaId(e.target.value)}
                  disabled={!zoneId || woredas.length === 0}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] transition-all disabled:bg-slate-100"
                  required
                >
                  <option value="">{zoneId ? 'Select Woreda' : 'Choose Zone First'}</option>
                  {woredas.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kebele */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kebele <span className="text-rose-500">*</span>
                </label>
                <select
                  value={kebeleId}
                  onChange={(e) => setKebeleId(e.target.value)}
                  disabled={!woredaId || kebeles.length === 0}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] transition-all disabled:bg-slate-100"
                  required
                >
                  <option value="">{woredaId ? 'Select Kebele' : 'Choose Woreda First'}</option>
                  {kebeles.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Village / Community (Required) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Village or Community Name"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="e.g. Village 03 / Medhane Alem Community"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Clear Form
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isSubmitting}
            className="w-full sm:w-auto"
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            Submit Citizen Registration
          </Button>
        </div>
      </form>

      {/* Multi-Level Duplicate Warning Modal */}
      {pendingCandidate && (
        <DuplicateWarningModal
          isOpen={duplicateModalOpen}
          onClose={() => setDuplicateModalOpen(false)}
          onConfirmProceed={() => executeSaveCitizen(pendingCandidate, true)}
          candidate={pendingCandidate}
          matchReasons={duplicateMatchReasons}
          duplicates={duplicateRecords}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}