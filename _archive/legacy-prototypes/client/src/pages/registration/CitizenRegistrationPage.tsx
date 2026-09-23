import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  Trash2, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  Wifi, 
  WifiOff, 
  FileText,
  Phone,
  Home
} from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Input from '../../components/ui/Input.tsx';
import Badge from '../../components/ui/Badge.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Gender, Region, Zone, Woreda } from '../../types/index.ts';
import CitizenLocalService, { LocalDuplicateMatch } from '../../services/citizenLocalService.ts';
import OfflineGeographyService from '../../services/offlineGeographyService.ts';
import { citizenSchema } from '../../validators/citizen.ts';

export interface CitizenRegistrationPageProps {
  onBack?: () => void;
  onViewCitizens?: () => void;
}

export const CitizenRegistrationPage: React.FC<CitizenRegistrationPageProps> = ({
  onBack,
  onViewCitizens,
}) => {
  const { user } = useAuth();

  // Wizard Step: 1 = Demographics, 2 = Contact & ID, 3 = Geography, 4 = Review & Commit, 5 = Success
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Online / Offline Status Detection
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

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

  // Form Field State
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender>('MALE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // 4-Tier Cascading Geography State
  const [regions, setRegions] = useState<Region[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [woredas, setWoredas] = useState<Woreda[]>([]);

  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [selectedWoredaId, setSelectedWoredaId] = useState<string>('');
  const [kebeleName, setKebeleName] = useState<string>('');

  // Duplicate Check & Validation State
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [localDuplicates, setLocalDuplicates] = useState<LocalDuplicateMatch[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredClientRecordId, setRegisteredClientRecordId] = useState<string | null>(null);

  // 1. Initial Geographic Load & Auto-Prefill from Field Officer Profile
  useEffect(() => {
    // Pre-cache officer jurisdiction immediately
    if (user?.regionId || user?.zoneId || user?.woredaId) {
      OfflineGeographyService.precacheOfficerJurisdiction(
        user.regionId,
        user.zoneId,
        user.woredaId
      );
    }

    OfflineGeographyService.getRegions()
      .then((loadedRegions) => {
        setRegions(loadedRegions);
        if (user?.regionId) {
          setSelectedRegionId(user.regionId);
        }
        if (user?.kebele?.name) {
          setKebeleName(user.kebele.name);
        } else if (user?.kebeleId) {
          setKebeleName('Kebele 01');
        }
      })
      .catch((err) => console.error('Error loading regions:', err));
  }, [user]);

  // 2. Cascade Zones on Region Change
  useEffect(() => {
    if (!selectedRegionId) {
      setZones([]);
      setSelectedZoneId('');
      return;
    }

    OfflineGeographyService.getZonesByRegion(selectedRegionId)
      .then((loadedZones) => {
        setZones(loadedZones);
        if (user?.zoneId && loadedZones.some((z) => z.id === user.zoneId)) {
          setSelectedZoneId(user.zoneId);
        }
      })
      .catch((err) => console.error('Error loading zones:', err));
  }, [selectedRegionId, user]);

  // 3. Cascade Woredas on Zone Change
  useEffect(() => {
    if (!selectedZoneId) {
      setWoredas([]);
      setSelectedWoredaId('');
      return;
    }

    OfflineGeographyService.getWoredasByZone(selectedZoneId)
      .then((loadedWoredas) => {
        setWoredas(loadedWoredas);
        if (user?.woredaId && loadedWoredas.some((w) => w.id === user.woredaId)) {
          setSelectedWoredaId(user.woredaId);
        }
      })
      .catch((err) => console.error('Error loading woredas:', err));
  }, [selectedZoneId, user]);

  // Calculate Age Dynamically
  const calculatedAge = useMemo(() => {
    if (!dateOfBirth) return null;
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }, [dateOfBirth]);

  // Names of selected geography for review
  const selectedNames = useMemo(() => {
    const rName = regions.find((r) => r.id === selectedRegionId)?.name || 'Not selected';
    const zName = zones.find((z) => z.id === selectedZoneId)?.name || 'Not selected';
    const wName = woredas.find((w) => w.id === selectedWoredaId)?.name || 'Not selected';
    const kName = kebeleName.trim() || 'Not specified';
    return { rName, zName, wName, kName };
  }, [regions, zones, woredas, selectedRegionId, selectedZoneId, selectedWoredaId, kebeleName]);

  // Photo / Document Upload Handler (Converted to Base64 data URL)
  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Photo size exceeds 2MB limit. Please select a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Step Validation Helper
  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!fullName.trim() || fullName.trim().length < 3) {
        errors.fullName = 'Full name must be at least 3 characters.';
      } else if (fullName.trim().split(/\s+/).length < 2) {
        errors.fullName = 'Please enter at least First and Father name (e.g. Abebe Kebede).';
      }

      if (!dateOfBirth) {
        errors.dateOfBirth = 'Date of birth is required.';
      } else {
        const d = new Date(dateOfBirth);
        if (isNaN(d.getTime()) || d > new Date() || d < new Date('1900-01-01')) {
          errors.dateOfBirth = 'Please select a valid date of birth.';
        }
      }
    }

    if (step === 2) {
      if (phoneNumber.trim()) {
        const regex = /^(\+251|0)?[97][0-9]{8}$/;
        const cleaned = phoneNumber.replace(/[\s-]/g, '');
        if (!regex.test(cleaned)) {
          errors.phoneNumber = 'Invalid Ethiopian phone format (e.g., +251912345678 or 0912345678).';
        }
      }

      if (!address.trim() || address.trim().length < 3) {
        errors.address = 'Residential address / house number is required.';
      }
    }

    if (step === 3) {
      if (!selectedRegionId) errors.regionId = 'Please select a Region.';
      if (!selectedZoneId) errors.zoneId = 'Please select a Zone.';
      if (!selectedWoredaId) errors.woredaId = 'Please select a Woreda.';
      if (!kebeleName.trim()) errors.kebeleId = 'Please enter Kebele / Village name.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Move to Next Step with Duplicate Detection on Step 3 -> 4 transition
  const handleNextStep = async () => {
    if (!validateStep(currentStep)) return;

    if (currentStep === 3) {
      // Run local duplicate detection before entering Review step
      const duplicates = await CitizenLocalService.checkLocalDuplicates(
        fullName,
        dateOfBirth,
        phoneNumber
      );
      setLocalDuplicates(duplicates);
    }

    setCurrentStep((prev) => prev + 1);
  };

  // Final Submit Handler (Offline Commit to Dexie IndexedDB)
  const handleCommitRegistration = async () => {
    const rawData = {
      fullName,
      dateOfBirth,
      gender,
      phoneNumber: phoneNumber.trim() || null,
      address,
      regionId: selectedRegionId,
      zoneId: selectedZoneId,
      woredaId: selectedWoredaId,
      kebeleId: kebeleName.trim(),
      photoUrl,
    };

    const validation = citizenSchema.safeParse(rawData);
    if (!validation.success) {
      const errMap: Record<string, string> = {};
      validation.error.errors.forEach((e) => {
        if (e.path[0]) errMap[e.path[0].toString()] = e.message;
      });
      setFieldErrors(errMap);
      setCurrentStep(1);
      return;
    }

    try {
      setIsSubmitting(true);

      const record = await CitizenLocalService.createCitizen({
        ...rawData,
        regionName: selectedNames.rName,
        zoneName: selectedNames.zName,
        woredaName: selectedNames.wName,
        kebeleName: selectedNames.kName,
        registeredById: user?.id || 'offline-officer',
        registeredByName: user?.fullName || 'Field Officer',
      });

      setRegisteredClientRecordId(record.clientRecordId);
      setCurrentStep(5); // Success step
    } catch (err: any) {
      console.error('Failed to save citizen record locally:', err);
      alert('Error saving record to offline database: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form to register another citizen (retaining station)
  const handleResetForAnother = () => {
    setFullName('');
    setDateOfBirth('');
    setGender('MALE');
    setPhoneNumber('');
    setAddress('');
    setPhotoUrl(null);
    setFieldErrors({});
    setLocalDuplicates([]);
    setRegisteredClientRecordId(null);
    setCurrentStep(1);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Connectivity Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Back
            </Button>
          )}
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Citizen Registration Portal
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span>Online Mode</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full animate-pulse">
              <WifiOff className="w-3.5 h-3.5 text-amber-600" />
              <span>Offline Mode (IndexedDB Active)</span>
            </span>
          )}
        </div>
      </div>

      {/* Progress Wizard Indicator (Only for steps 1-4) */}
      {currentStep <= 4 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-medium">
            <div
              className={`p-2 rounded-lg transition-colors ${
                currentStep === 1
                  ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                  : currentStep > 1
                  ? 'text-slate-600 bg-slate-50'
                  : 'text-slate-400'
              }`}
            >
              1. Demographics
            </div>
            <div
              className={`p-2 rounded-lg transition-colors ${
                currentStep === 2
                  ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                  : currentStep > 2
                  ? 'text-slate-600 bg-slate-50'
                  : 'text-slate-400'
              }`}
            >
              2. Contact &amp; ID
            </div>
            <div
              className={`p-2 rounded-lg transition-colors ${
                currentStep === 3
                  ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                  : currentStep > 3
                  ? 'text-slate-600 bg-slate-50'
                  : 'text-slate-400'
              }`}
            >
              3. Jurisdiction
            </div>
            <div
              className={`p-2 rounded-lg transition-colors ${
                currentStep === 4
                  ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                  : 'text-slate-400'
              }`}
            >
              4. Review &amp; Save
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: Personal Demographics */}
      {currentStep === 1 && (
        <Card className="p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900">Step 1: Personal Demographics</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter official demographic identity matching citizen's legal credentials.
            </p>
          </div>

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <Input
                label="Full Legal Name"
                placeholder="e.g. Abebe Kebede Tessema"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: '' }));
                }}
                error={fieldErrors.fullName}
                helperText="Ethiopian standard: First Name, Father's Name, Grandfather's Name"
                required
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Date of Birth <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dateOfBirth}
                  max={new Date().toISOString().split('T')[0]}
                  min="1900-01-01"
                  onChange={(e) => {
                    setDateOfBirth(e.target.value);
                    if (fieldErrors.dateOfBirth) setFieldErrors((prev) => ({ ...prev, dateOfBirth: '' }));
                  }}
                  className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 ${
                    fieldErrors.dateOfBirth
                      ? 'border-rose-300 focus:ring-rose-500/20'
                      : 'border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                  }`}
                  required
                />
              </div>
              {calculatedAge !== null && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Calculated Age: <strong className="font-semibold">{calculatedAge} years old</strong></span>
                </div>
              )}
              {fieldErrors.dateOfBirth && (
                <p className="text-xs text-rose-600 mt-1">{fieldErrors.dateOfBirth}</p>
              )}
            </div>

            {/* Gender Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Gender <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['MALE', 'FEMALE', 'OTHER'] as Gender[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                      gender === g
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-500 ring-2 ring-emerald-500/20 font-semibold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {g === 'MALE' ? 'Male' : g === 'FEMALE' ? 'Female' : 'Other'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button
              variant="primary"
              size="md"
              onClick={handleNextStep}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Contact Details
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: Contact & Identification */}
      {currentStep === 2 && (
        <Card className="p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900">Step 2: Contact &amp; Identification</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Provide contact number, residential address, and optional portrait capture.
            </p>
          </div>

          <div className="space-y-4">
            {/* Phone Number */}
            <Input
              label="Phone Number (Optional)"
              placeholder="+251 91 123 4567 or 0911234567"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                if (fieldErrors.phoneNumber) setFieldErrors((prev) => ({ ...prev, phoneNumber: '' }));
              }}
              error={fieldErrors.phoneNumber}
              helperText="Accepts Ethiopian standard formats: +251..., 09..., 07..."
              leftIcon={<Phone className="w-4 h-4" />}
            />

            {/* Address */}
            <Input
              label="Residential Address / House Number"
              placeholder="e.g. House No. 412, Sefer/Village 03"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (fieldErrors.address) setFieldErrors((prev) => ({ ...prev, address: '' }));
              }}
              error={fieldErrors.address}
              helperText="Detailed residential location within the Kebele"
              leftIcon={<Home className="w-4 h-4" />}
              required
            />

            {/* Photo / ID Attachment (Offline Base64) */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-slate-700">
                Citizen Photo / Identification Card (Optional)
              </label>

              {photoUrl ? (
                <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <img
                    src={photoUrl}
                    alt="Citizen ID Preview"
                    className="w-16 h-16 object-cover rounded-lg border border-slate-300"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-800">Photo Attached</p>
                    <p className="text-[11px] text-slate-500">Stored locally in IndexedDB data store</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotoUrl(null)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-5 hover:border-emerald-500 transition-colors cursor-pointer bg-slate-50/50">
                  <Camera className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-700">Capture or Upload Photo</span>
                  <span className="text-[11px] text-slate-400">JPEG, PNG up to 2MB (Saved directly to device storage)</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setCurrentStep(1)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleNextStep}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Jurisdiction
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: Administrative Stationing (Ethiopian 4-Tier) */}
      {currentStep === 3 && (
        <Card className="p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Step 3: Administrative Station</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Authentic 4-Tier Jurisdiction (Region &rarr; Zone &rarr; Woreda &rarr; Kebele).
              </p>
            </div>
            {user?.role === 'FIELD_OFFICER' && (
              <Badge variant="purple" size="sm">
                Station Auto-Prefilled
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Region */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                1. Region <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedRegionId}
                onChange={(e) => {
                  setSelectedRegionId(e.target.value);
                  setSelectedZoneId('');
                  setSelectedWoredaId('');
                  setKebeleName('');
                  setWoredas([]);
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">Select Region</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              {fieldErrors.regionId && <p className="text-xs text-rose-600">{fieldErrors.regionId}</p>}
            </div>

            {/* Zone */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                2. Zone / Sub-City <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedZoneId}
                onChange={(e) => {
                  setSelectedZoneId(e.target.value);
                  setSelectedWoredaId('');
                  setKebeleName('');
                }}
                disabled={!selectedRegionId || zones.length === 0}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">
                  {!selectedRegionId ? 'Select Region 1st' : zones.length === 0 ? 'No Zones Available' : 'Select Zone'}
                </option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
              {fieldErrors.zoneId && <p className="text-xs text-rose-600">{fieldErrors.zoneId}</p>}
            </div>

            {/* Woreda */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                3. Woreda (District) <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedWoredaId}
                onChange={(e) => {
                  setSelectedWoredaId(e.target.value);
                  setKebeleName('');
                }}
                disabled={!selectedZoneId || woredas.length === 0}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">
                  {!selectedZoneId ? 'Select Zone 1st' : woredas.length === 0 ? 'No Woredas Available' : 'Select Woreda'}
                </option>
                {woredas.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              {fieldErrors.woredaId && <p className="text-xs text-rose-600">{fieldErrors.woredaId}</p>}
            </div>

            {/* Kebele Input Field */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                4. Kebele (Village) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={kebeleName}
                onChange={(e) => setKebeleName(e.target.value)}
                disabled={!selectedWoredaId}
                placeholder={!selectedWoredaId ? 'Select Woreda 1st' : 'Enter Kebele / Village name (e.g. Kebele 01, Genda Kore)'}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-400"
              />
              {fieldErrors.kebeleId && <p className="text-xs text-rose-600">{fieldErrors.kebeleId}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setCurrentStep(2)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleNextStep}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Review &amp; Verify
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: Review, Local Duplicate Detection & Commit */}
      {currentStep === 4 && (
        <Card className="p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900">Step 4: Review &amp; Offline Commit</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify demographic accuracy before committing record to device IndexedDB.
            </p>
          </div>

          {/* Local Duplicate Warning Alert (if triggered) */}
          {localDuplicates.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Suspected Duplicate Record Detected Locally ({localDuplicates.length} match)</span>
              </div>
              <p className="text-xs text-amber-700">
                A citizen with matching identity was found in your device's local database. Please double-check credentials before submitting.
              </p>
              <div className="space-y-1.5 pt-1">
                {localDuplicates.map((dup, idx) => (
                  <div key={idx} className="bg-white/80 p-2.5 rounded-lg border border-amber-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900">{dup.citizen.fullName}</span>
                      <span className="text-slate-500 ml-2">&bull; DOB: {dup.citizen.dateOfBirth}</span>
                      <span className="text-slate-500 ml-2">&bull; {dup.citizen.kebeleName || 'Kebele'}</span>
                    </div>
                    <Badge status={dup.citizen.syncStatus} size="sm">
                      {dup.citizen.syncStatus}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Demographic Summary Grid */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Full Legal Name:</span>
                <span className="font-semibold text-slate-900 text-sm">{fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Date of Birth &amp; Gender:</span>
                <span className="font-semibold text-slate-900">
                  {dateOfBirth} ({calculatedAge} years old) &bull; {gender}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Phone Contact:</span>
                <span className="font-semibold text-slate-900">{phoneNumber || 'None provided'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Residential Address:</span>
                <span className="font-semibold text-slate-900">{address}</span>
              </div>
            </div>

            <div className="border-t border-slate-200/60 pt-3">
              <span className="text-slate-400 block text-xs mb-1">Administrative Placement:</span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-800">
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md">
                  Region: {selectedNames.rName}
                </span>
                <span>&rarr;</span>
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md">
                  Zone: {selectedNames.zName}
                </span>
                <span>&rarr;</span>
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md">
                  Woreda: {selectedNames.wName}
                </span>
                <span>&rarr;</span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-semibold">
                  Kebele: {selectedNames.kName}
                </span>
              </div>
            </div>

            {photoUrl && (
              <div className="border-t border-slate-200/60 pt-3 flex items-center gap-3">
                <img src={photoUrl} alt="Attached ID" className="w-12 h-12 rounded object-cover border" />
                <span className="text-xs text-slate-600">Identification photo attached</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setCurrentStep(3)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Edit Details
            </Button>
            <Button
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              onClick={handleCommitRegistration}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirm &amp; Commit Record (Offline)
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 5: Success & Next Action Celebration Screen */}
      {currentStep === 5 && (
        <Card className="p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900">Registration Stored Successfully!</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              The citizen record has been committed to your device's offline database and queued for automatic server synchronization.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 max-w-md mx-auto border border-slate-200 text-xs space-y-2 text-left">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Citizen:</span>
              <span className="font-bold text-slate-900">{fullName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Device Record ID:</span>
              <span className="font-mono text-[11px] text-slate-600">{registeredClientRecordId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Jurisdiction:</span>
              <span className="font-medium text-slate-800">{selectedNames.wName} &bull; {selectedNames.kName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Sync Status:</span>
              <Badge status="PENDING">Pending Sync</Badge>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleResetForAnother}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Register Another Citizen
            </Button>
            {onViewCitizens && (
              <Button
                variant="outline"
                size="md"
                onClick={onViewCitizens}
                leftIcon={<FileText className="w-4 h-4" />}
              >
                View Citizen Directory
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default CitizenRegistrationPage;
