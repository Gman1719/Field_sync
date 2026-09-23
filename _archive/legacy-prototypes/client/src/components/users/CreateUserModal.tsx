import React from 'react';
import Modal from '../ui/Modal.tsx';
import Input from '../ui/Input.tsx';
import Button from '../ui/Button.tsx';
import Select from '../ui/Select.tsx';
import { Role, Region, Zone, Woreda, Kebele } from '../../types/index.ts';
import GeographicService, { SupervisorOption } from '../../services/geographicService.ts';
import UserService from '../../services/userService.ts';
import { ShieldCheck, MapPin, UserCheck, AlertCircle, Loader2 } from 'lucide-react';

export interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onUserCreated,
}) => {
  // Form State
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('Password123!');
  const [confirmPassword, setConfirmPassword] = React.useState('Password123!');
  const [role, setRole] = React.useState<Role>('FIELD_OFFICER');
  const [phoneNumber, setPhoneNumber] = React.useState('');

  // Geographic Cascading State
  const [regions, setRegions] = React.useState<Region[]>([]);
  const [zones, setZones] = React.useState<Zone[]>([]);
  const [woredas, setWoredas] = React.useState<Woreda[]>([]);
  const [kebeles, setKebeles] = React.useState<Kebele[]>([]);
  const [supervisors, setSupervisors] = React.useState<SupervisorOption[]>([]);

  // Selected IDs
  const [selectedRegionId, setSelectedRegionId] = React.useState('');
  const [selectedZoneId, setSelectedZoneId] = React.useState('');
  const [selectedWoredaId, setSelectedWoredaId] = React.useState('');
  const [selectedKebeleId, setSelectedKebeleId] = React.useState('');
  const [selectedSupervisorId, setSelectedSupervisorId] = React.useState('');

  // Loading & Error States
  const [isLoadingGeog, setIsLoadingGeog] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // 1. Fetch Regions on Modal Open
  React.useEffect(() => {
    if (isOpen) {
      GeographicService.getRegions()
        .then((data) => setRegions(data))
        .catch((err) => console.error('Failed to load regions:', err));
    } else {
      // Reset form on close
      setFullName('');
      setEmail('');
      setSelectedRegionId('');
      setSelectedZoneId('');
      setSelectedWoredaId('');
      setSelectedKebeleId('');
      setSelectedSupervisorId('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  // 2. Cascade: When Region changes -> Fetch Zones
  const handleRegionChange = async (regionId: string) => {
    setSelectedRegionId(regionId);
    setSelectedZoneId('');
    setSelectedWoredaId('');
    setSelectedKebeleId('');
    setSelectedSupervisorId('');
    setZones([]);
    setWoredas([]);
    setKebeles([]);
    setSupervisors([]);

    if (!regionId) return;

    setIsLoadingGeog(true);
    try {
      const data = await GeographicService.getZonesByRegion(regionId);
      setZones(data);
    } catch (err) {
      console.error('Failed to load zones:', err);
    } finally {
      setIsLoadingGeog(false);
    }
  };

  // 3. Cascade: When Zone changes -> Fetch Woredas
  const handleZoneChange = async (zoneId: string) => {
    setSelectedZoneId(zoneId);
    setSelectedWoredaId('');
    setSelectedKebeleId('');
    setSelectedSupervisorId('');
    setWoredas([]);
    setKebeles([]);
    setSupervisors([]);

    if (!zoneId) return;

    setIsLoadingGeog(true);
    try {
      const data = await GeographicService.getWoredasByZone(zoneId);
      setWoredas(data);
    } catch (err) {
      console.error('Failed to load woredas:', err);
    } finally {
      setIsLoadingGeog(false);
    }
  };

  // 4. Cascade: When Woreda changes -> Fetch Kebeles & Woreda Supervisors
  const handleWoredaChange = async (woredaId: string) => {
    setSelectedWoredaId(woredaId);
    setSelectedKebeleId('');
    setSelectedSupervisorId('');
    setKebeles([]);
    setSupervisors([]);

    if (!woredaId) return;

    setIsLoadingGeog(true);
    try {
      const [kebelesData, supervisorsData] = await Promise.all([
        GeographicService.getKebelesByWoreda(woredaId),
        GeographicService.getSupervisorsByWoreda(woredaId),
      ]);
      setKebeles(kebelesData);
      setSupervisors(supervisorsData);
    } catch (err) {
      console.error('Failed to load woreda details:', err);
    } finally {
      setIsLoadingGeog(false);
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (role === 'SUPERVISOR' && (!selectedRegionId || !selectedZoneId || !selectedWoredaId)) {
      setErrorMessage('Supervisors must be assigned to a Region, Zone, and Woreda.');
      return;
    }

    if (
      role === 'FIELD_OFFICER' &&
      (!selectedRegionId ||
        !selectedZoneId ||
        !selectedWoredaId ||
        !selectedKebeleId ||
        !selectedSupervisorId)
    ) {
      setErrorMessage(
        'Field Officers must be assigned to a Kebele and report to an active Woreda Supervisor.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await UserService.createUser({
        fullName,
        email,
        password,
        role,
        phoneNumber: phoneNumber || null,
        regionId: selectedRegionId || null,
        zoneId: selectedZoneId || null,
        woredaId: selectedWoredaId || null,
        kebeleId: selectedKebeleId || null,
        supervisorId: selectedSupervisorId || null,
        isActive: true,
      });

      onUserCreated();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to create user.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register New System User"
      description="Create accounts with 4-tier geographic placement (Region → Zone → Woreda → Kebele)"
      maxWidth="lg"
    >
      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role Selection Tabs */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">User System Role</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setRole('FIELD_OFFICER')}
              className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition-all ${
                role === 'FIELD_OFFICER'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Field Officer (Kebele)
            </button>
            <button
              type="button"
              onClick={() => setRole('SUPERVISOR')}
              className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition-all ${
                role === 'SUPERVISOR'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Supervisor (Woreda)
            </button>
            <button
              type="button"
              onClick={() => setRole('MANAGER')}
              className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition-all ${
                role === 'MANAGER'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              System Manager
            </button>
          </div>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Full Name"
            placeholder="e.g. Dawit Bekele"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. dawit@fieldsync.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Input
            label="Phone Number"
            placeholder="+251 91 234 5678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>

        {/* Geographic Hierarchy Section */}
        {role !== 'MANAGER' && (
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                Geographic Placement (Ethiopia Dataset)
              </span>
              {isLoadingGeog && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading hierarchy...
                </span>
              )}
            </div>

            {/* Level 1: Region */}
            <Select
              label="1. Region"
              value={selectedRegionId}
              onChange={(e) => handleRegionChange(e.target.value)}
              required
              options={[
                { value: '', label: '-- Select Region --' },
                ...regions.map((r) => ({ value: r.id, label: r.name })),
              ]}
            />

            {/* Level 2: Zone (Appears after Region) */}
            {selectedRegionId && (
              <Select
                label="2. Zone"
                value={selectedZoneId}
                onChange={(e) => handleZoneChange(e.target.value)}
                required
                options={[
                  { value: '', label: '-- Select Zone --' },
                  ...zones.map((z) => ({ value: z.id, label: z.name })),
                ]}
              />
            )}

            {/* Level 3: Woreda (Appears after Zone) */}
            {selectedZoneId && (
              <Select
                label="3. Woreda (District)"
                value={selectedWoredaId}
                onChange={(e) => handleWoredaChange(e.target.value)}
                required
                options={[
                  { value: '', label: '-- Select Woreda --' },
                  ...woredas.map((w) => ({ value: w.id, label: w.name })),
                ]}
              />
            )}

            {/* If Supervisor: Stationed at Woreda! */}
            {role === 'SUPERVISOR' && selectedWoredaId && (
              <div className="rounded-lg bg-blue-50 p-2.5 text-xs text-blue-800 border border-blue-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Supervisor will be stationed at and oversee this <strong>Woreda</strong>.
                </span>
              </div>
            )}

            {/* Level 4: Kebele & Woreda Supervisor (Only for Field Officer) */}
            {role === 'FIELD_OFFICER' && selectedWoredaId && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-200">
                <Select
                  label="4. Kebele (Officer Ground Post)"
                  value={selectedKebeleId}
                  onChange={(e) => setSelectedKebeleId(e.target.value)}
                  required
                  options={[
                    { value: '', label: '-- Select Kebele --' },
                    ...kebeles.map((k) => ({ value: k.id, label: k.name })),
                  ]}
                />

                <Select
                  label="5. Assigned Woreda Supervisor"
                  value={selectedSupervisorId}
                  onChange={(e) => setSelectedSupervisorId(e.target.value)}
                  required
                  options={[
                    { value: '', label: '-- Select Supervisor --' },
                    ...supervisors.map((s) => ({
                      value: s.id,
                      label: `${s.fullName} (${s.email})`,
                    })),
                  ]}
                />
              </div>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={isSubmitting}
            leftIcon={<UserCheck className="w-4 h-4" />}
          >
            Create User Account
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateUserModal;
