export interface SampleUser {
  id: string;
  employeeId: string;
  name: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email: string;
  password?: string;
  role: 'manager' | 'supervisor' | 'field_officer' | string;
  region: string;
  regionId?: string | null;
  zone?: string;
  zoneId?: string | null;
  woreda?: string;
  woredaId?: string | null;
  kebele?: string;
  kebeleId?: string | null;
  status: string;
  phone?: string;
  shift?: string;
  department?: string;
  managerId?: string;
  supervisorId?: string | null;
  supervisorName?: string | null;
  assignedSites?: string[];
  pin?: string;
  mustChangePassword?: boolean;
  lastLogin?: string | null;
  gpsEnabled?: boolean;
  [key: string]: any;
}

export const SAMPLE_USERS: SampleUser[] = [
  {
    id: 'u_mgr',
    employeeId: 'MGR000',
    name: 'System Manager',
    email: 'manager@fieldsync.com',
    password: 'Password123!',
    role: 'manager',
    region: 'Addis Ababa',
    regionId: 'reg-addis-ababa',
    status: 'active',
    phone: '+251-911-000000',
    shift: 'Day',
    department: 'Administration'
  },
  {
    id: 'u_sup',
    employeeId: 'SUP000',
    name: 'alemu kebede ayele',
    email: 'supervisor@fieldsync.com',
    password: 'Password123!',
    role: 'supervisor',
    region: 'Addis Ababa',
    regionId: 'reg-addis-ababa',
    zone: 'Bole Sub-City',
    zoneId: 'zone-aa-bole',
    managerId: 'u_mgr',
    status: 'active',
    phone: '+251-911-000100',
    shift: 'Day'
  },
  {
    id: 'u_off',
    employeeId: 'FO000',
    name: 'Meseret Hailu Tadesse',
    email: 'officer@fieldsync.com',
    password: 'Password123!',
    role: 'field_officer',
    region: 'Addis Ababa',
    regionId: 'reg-addis-ababa',
    zone: 'Bole Sub-City',
    zoneId: 'zone-aa-bole',
    woreda: 'Bole Woreda 01',
    woredaId: 'wor-aa-bol-01',
    supervisorId: 'u_sup',
    assignedSites: ['Site A', 'Site B'],
    status: 'active',
    phone: '+251-911-000200',
    shift: 'Day'
  },
  {
    id: 'cb0ba983-e234-4596-9cea-34a157af283e',
    employeeId: 'SUP004',
    name: 'Getiye Demis Kassa',
    email: 'getiyedemis@gmail.com',
    password: 'Password123!',
    role: 'supervisor',
    region: 'Amhara',
    regionId: 'reg-amhara',
    zone: 'North Shewa Zone',
    zoneId: 'zone-am-north-shewa',
    status: 'active',
    phone: '+251-911-000104',
    shift: 'Day'
  },
  {
    id: '21731752-6b65-4726-ad25-c96b57b33aba',
    employeeId: 'FO013',
    name: 'Ebra kassew Tgegenew',
    email: 'ebra@gmail.com',
    password: 'Password123!',
    role: 'field_officer',
    region: 'Amhara',
    regionId: 'reg-amhara',
    zone: 'North Shewa Zone',
    zoneId: 'zone-am-north-shewa',
    woreda: 'Angolela Tera',
    woredaId: 'wor-am-angolela-t',
    supervisorId: 'cb0ba983-e234-4596-9cea-34a157af283e',
    status: 'active',
    phone: '+251-911-000213',
    shift: 'Day'
  },
  {
    id: 'b682323b-0eee-4fb0-90cc-c43f55cca73c',
    employeeId: 'FO014',
    name: 'almaz derese atnafu',
    email: 'almaz@gmail.com',
    password: 'Password123!',
    role: 'field_officer',
    region: 'Amhara',
    regionId: 'reg-amhara',
    zone: 'North Shewa Zone',
    zoneId: 'zone-am-north-shewa',
    woreda: 'Hagere Mariam Kesem',
    woredaId: 'wor-am-hagere-m',
    supervisorId: 'cb0ba983-e234-4596-9cea-34a157af283e',
    status: 'active',
    phone: '+251-911-000214',
    shift: 'Day'
  },
  {
    id: '53ebe5f5-0e57-4cca-bb0b-2ac6e1d80222',
    employeeId: 'SUP005',
    name: 'alemitu kebede welde',
    email: 'alemitu@gmail.com',
    password: 'Password123!',
    role: 'supervisor',
    region: 'Amhara',
    regionId: 'reg-amhara',
    zone: 'North Wollo Zone',
    zoneId: 'zone-am-north-wollo',
    status: 'active',
    phone: '+251-911-000105',
    shift: 'Day'
  },
  {
    id: 'b9bd86d0-3e5d-4b77-8a9b-17a0ba755480',
    employeeId: 'FO015',
    name: 'Abebe Kebede Tessema',
    email: 'officer.test6291@fieldsync.com',
    password: 'Password123!',
    role: 'field_officer',
    region: 'Amhara',
    regionId: 'reg-amhara',
    zone: 'North Wollo Zone',
    zoneId: 'zone-am-north-wollo',
    woreda: 'Bugna Woreda',
    woredaId: 'wor-am-bugna',
    supervisorId: '53ebe5f5-0e57-4cca-bb0b-2ac6e1d80222',
    status: 'active',
    phone: '+251-911-000215',
    shift: 'Day'
  }
];

export const LOGIN_INFO = {
  manager: { email: 'manager@fieldsync.com', password: 'Password123!', name: 'System Manager' },
  supervisor: { email: 'supervisor@fieldsync.com', password: 'Password123!', name: 'alemu kebede ayele' },
  officer: { email: 'officer@fieldsync.com', password: 'Password123!', name: 'Meseret Hailu Tadesse', pin: '1234' }
};

export const REGIONS = [
  'Addis Ababa',
  'Amhara',
  'Oromia',
  'Tigray',
  'Sidama',
  'Somali',
  'Afar',
  'Dire Dawa',
  'Central Ethiopia',
  'South Ethiopia',
  'South West Ethiopia Peoples',
  'Benishangul-Gumuz',
  'Gambela',
  'Harari',
  'All'
] as const;
export const ROLES = ['manager', 'supervisor', 'field_officer'] as const;
export const SHIFTS = ['Day', 'Night', 'Flexible'] as const;
export const ATTENDANCE_STATUSES = ['present', 'late', 'half_day', 'absent', 'pending'] as const;
export const REPORT_STATUSES = ['Active', 'Inactive', 'Under Maintenance'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export const TASK_STATUSES = ['pending', 'in_progress', 'completed'] as const;
export const LEAVE_TYPES = ['annual', 'sick', 'personal', 'other'] as const;
export const LEAVE_STATUSES = ['pending', 'approved', 'rejected'] as const;
export const PERMISSION_TYPES = ['Work Permission', 'Personal Permission', 'Medical Permission', 'Other'] as const;
export const ALERT_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
