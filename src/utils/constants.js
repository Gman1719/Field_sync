// src/utils/constants.js

export const SAMPLE_USERS = [
  { id: 'u_mgr', employeeId: 'MGR000', name: 'System Manager', email: 'manager@fieldsync.com', password: 'Password123!', role: 'manager', region: 'All', status: 'active', phone: '+251-911-000000', shift: 'Day', department: 'Administration' },
  { id: 'u_sup', employeeId: 'SUP000', name: 'Regional Supervisor', email: 'supervisor@fieldsync.com', password: 'Password123!', role: 'supervisor', region: 'North', managerId: 'u_mgr', status: 'active', phone: '+251-911-000100', shift: 'Day' },
  { id: 'u_off', employeeId: 'FO000', name: 'Field Officer', email: 'officer@fieldsync.com', password: 'Password123!', role: 'field_officer', region: 'North', supervisorId: 'u_sup', assignedSites: ['Site A', 'Site B'], status: 'active', phone: '+251-911-000200', shift: 'Day' },
  { id: 'm1', employeeId: 'MGR001', name: 'አበበ በቀለ', email: 'abebe@fieldsync.com', password: 'manager123', role: 'manager', region: 'All', status: 'active', phone: '+251-911-000001', shift: 'Day', department: 'Administration' },
  { id: 's1', employeeId: 'SUP001', name: 'ብርሃን ገብረእግዚአብሔር', email: 'birhan@fieldsync.com', password: 'super123', role: 'supervisor', region: 'North', managerId: 'm1', status: 'active', phone: '+251-911-000101', shift: 'Day' },
  { id: 's2', employeeId: 'SUP002', name: 'ሣህለ ሙሉጌታ', email: 'sahle@fieldsync.com', password: 'super123', role: 'supervisor', region: 'South', managerId: 'm1', status: 'active', phone: '+251-911-000102', shift: 'Day' },
  { id: 's3', employeeId: 'SUP003', name: 'ኪዳን ጥላሁን', email: 'kidan@fieldsync.com', password: 'super123', role: 'supervisor', region: 'East', managerId: 'm1', status: 'active', phone: '+251-911-000103', shift: 'Night' },
  { id: 'o1', employeeId: 'FO001', name: 'መሠረት አለሙ', email: 'meseret@fieldsync.com', password: 'officer123', role: 'field_officer', region: 'North', supervisorId: 's1', assignedSites: ['Site A', 'Site B'], status: 'active', phone: '+251-911-000201', shift: 'Day' },
  { id: 'o2', employeeId: 'FO002', name: 'ቀዳማዊ ገብረእግዚአብሔር', email: 'kedamawi@fieldsync.com', password: 'officer123', role: 'field_officer', region: 'North', supervisorId: 's1', assignedSites: ['Site C', 'Site D'], status: 'active', phone: '+251-911-000202', shift: 'Day' },
  { id: 'o3', employeeId: 'FO003', name: 'ዘነበ አስፋው', email: 'zenebe@fieldsync.com', password: 'officer123', role: 'field_officer', region: 'North', supervisorId: 's1', assignedSites: ['Site E'], status: 'active', phone: '+251-911-000203', shift: 'Night' },
  { id: 'o4', employeeId: 'FO004', name: 'መለስ ዘነበ', email: 'meles@fieldsync.com', password: 'officer123', role: 'field_officer', region: 'South', supervisorId: 's2', assignedSites: ['Site F', 'Site G'], status: 'active', phone: '+251-911-000204', shift: 'Day' },
  { id: 'o5', employeeId: 'FO005', name: 'ተስፋዬ በቀለ', email: 'tesfaye@fieldsync.com', password: 'officer123', role: 'field_officer', region: 'South', supervisorId: 's2', assignedSites: ['Site H'], status: 'active', phone: '+251-911-000205', shift: 'Day' },
  { id: 'o6', employeeId: 'FO006', name: 'ኤልሳቤት አለሙ', email: 'elsabet@fieldsync.com', password: 'officer123', role: 'field_officer', region: 'South', supervisorId: 's2', assignedSites: ['Site I', 'Site J'], status: 'active', phone: '+251-911-000206', shift: 'Night' },
  { id: 'o7', employeeId: 'FO007', name: 'ፍቅሬ ገብረእግዚአብሔር', email: 'fikre@fieldsync.com', password: 'officer123', role: 'field_officer', region: 'East', supervisorId: 's3', assignedSites: ['Site K', 'Site L'], status: 'active', phone: '+251-911-000207', shift: 'Day' },
  { id: 'o8', employeeId: 'FO008', name: 'ሀና አረጋዊ', email: 'hana@fieldsync.com', password: 'officer123', role: 'field_officer', region: 'East', supervisorId: 's3', assignedSites: ['Site M'], status: 'active', phone: '+251-911-000208', shift: 'Night' },
  { id: 'o9', employeeId: 'FO009', name: 'ዮናስ አስፋው', email: 'yonas@fieldsync.com', password: 'officer123', role: 'field_officer', region: 'East', supervisorId: 's3', assignedSites: ['Site N', 'Site O'], status: 'active', phone: '+251-911-000209', shift: 'Day' },
  { id: 'o10', employeeId: 'FO010', name: 'ቤተልሔም አበበ', email: 'betelhem@fieldsync.com', password: 'officer123', role: 'field_officer', region: 'East', supervisorId: 's3', assignedSites: ['Site P', 'Site Q'], status: 'active', phone: '+251-911-000210', shift: 'Day' },
  { id: 'o11', employeeId: 'FO011', name: 'ዳዊት ገብረእግዚአብሔር', email: 'dawit@fieldsync.com', password: 'officer123', role: 'field_officer', region: 'South', supervisorId: 's2', assignedSites: ['Site R', 'Site S'], status: 'active', phone: '+251-911-000211', shift: 'Day' },
  { id: 'o12', employeeId: 'FO012', name: 'ረሃቤል ተሰማ', email: 'rehabel@fieldsync.com', password: 'officer123', role: 'field_officer', region: 'North', supervisorId: 's1', assignedSites: ['Site T', 'Site U'], status: 'active', phone: '+251-911-000212', shift: 'Day' }
];

// Login credentials summary
export const LOGIN_INFO = {
  manager: { email: 'abebe@fieldsync.com', password: 'manager123', name: 'አበበ በቀለ' },
  supervisor: { email: 'birhan@fieldsync.com', password: 'super123', name: 'ብርሃን ገብረእግዚአብሔር' },
  officer: { email: 'meseret@fieldsync.com', password: 'officer123', name: 'መሠረት አለሙ', pin: '1234' }
};

export const REGIONS = ['North', 'South', 'East', 'West', 'Central', 'All'];

export const ROLES = ['manager', 'supervisor', 'field_officer'];

export const SHIFTS = ['Day', 'Night', 'Flexible'];

export const ATTENDANCE_STATUSES = ['present', 'late', 'half_day', 'absent', 'pending'];

export const REPORT_STATUSES = ['Active', 'Inactive', 'Under Maintenance'];

export const TASK_PRIORITIES = ['low', 'medium', 'high'];

export const TASK_STATUSES = ['pending', 'in_progress', 'completed'];

export const LEAVE_TYPES = ['annual', 'sick', 'personal', 'other'];

export const LEAVE_STATUSES = ['pending', 'approved', 'rejected'];

export const PERMISSION_TYPES = ['Work Permission', 'Personal Permission', 'Medical Permission', 'Other'];

export const ALERT_PRIORITIES = ['low', 'medium', 'high', 'critical'];