import {
  LayoutDashboard,
  UserPlus,
  Users,
  History,
  RefreshCw,
  Bell,
  UserCheck,
  FileText,
  ShieldAlert,
  Settings,
  MapPin,
  FileSpreadsheet,
  X,
  Briefcase,
  Activity,
  FileCheck,
} from 'lucide-react';
import { Role } from '../../types/index.ts';

export interface SidebarProps {
  currentRole: Role;
  currentPath: string;
  onNavigate: (path: string) => void;
  isOpen: boolean;
  onClose: () => void;
  pendingSyncCount?: number;
}

interface NavItemConfig {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  roles: Role[];
}

const navItems: NavItemConfig[] = [
  // Common Dashboard
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['FIELD_OFFICER', 'SUPERVISOR', 'MANAGER'],
  },

  // Field Officer Operations
  {
    title: 'Daily Work Report',
    path: '/daily-report',
    icon: FileText,
    roles: ['FIELD_OFFICER'],
  },
  {
    title: 'Register Citizen',
    path: '/register',
    icon: UserPlus,
    roles: ['FIELD_OFFICER'],
  },
  {
    title: 'Citizen History',
    path: '/citizens',
    icon: History,
    roles: ['FIELD_OFFICER'],
  },
  {
    title: 'Field Tasks',
    path: '/assignments',
    icon: Briefcase,
    roles: ['FIELD_OFFICER', 'SUPERVISOR', 'MANAGER'],
  },
  {
    title: 'Activity Logs',
    path: '/activity-logs',
    icon: Activity,
    roles: ['FIELD_OFFICER'],
  },
  {
    title: 'Sync Center',
    path: '/sync',
    icon: RefreshCw,
    roles: ['FIELD_OFFICER'],
  },

  // Supervisor Items
  {
    title: 'Daily Reports Review',
    path: '/supervisor/daily-reports',
    icon: FileCheck,
    roles: ['SUPERVISOR', 'MANAGER'],
  },
  {
    title: 'Activity Timeline',
    path: '/supervisor/activity-timeline',
    icon: Activity,
    roles: ['SUPERVISOR', 'MANAGER'],
  },
  {
    title: 'Field Officers',
    path: '/officers',
    icon: Users,
    roles: ['SUPERVISOR', 'MANAGER'],
  },
  {
    title: 'Citizen Directory',
    path: '/citizens',
    icon: UserCheck,
    roles: ['SUPERVISOR', 'MANAGER'],
  },
  {
    title: 'Duplicate Review',
    path: '/duplicates',
    icon: ShieldAlert,
    roles: ['SUPERVISOR'],
  },
  {
    title: 'Sync Monitoring',
    path: '/sync-monitoring',
    icon: RefreshCw,
    roles: ['SUPERVISOR', 'MANAGER'],
  },

  // Manager Items
  {
    title: 'User Management',
    path: '/users',
    icon: Users,
    roles: ['MANAGER'],
  },
  {
    title: 'Region Management',
    path: '/regions',
    icon: MapPin,
    roles: ['MANAGER'],
  },
  {
    title: 'Audit Logs',
    path: '/audit-logs',
    icon: FileText,
    roles: ['MANAGER'],
  },
  {
    title: 'Reports & Export',
    path: '/reports',
    icon: FileSpreadsheet,
    roles: ['SUPERVISOR', 'MANAGER'],
  },
  {
    title: 'System Settings',
    path: '/settings',
    icon: Settings,
    roles: ['MANAGER'],
  },

  // Common Items
  {
    title: 'Notifications',
    path: '/notifications',
    icon: Bell,
    roles: ['FIELD_OFFICER', 'SUPERVISOR', 'MANAGER'],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  currentPath,
  onNavigate,
  isOpen,
  onClose,
  pendingSyncCount = 0,
}) => {
  const filteredNav = navItems.filter((item) => item.roles.includes(currentRole));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header with Close Button */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-6 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 font-bold text-white text-xs">
              FS
            </div>
            <span className="font-bold text-slate-900 text-sm">FieldSync</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </div>
          <nav className="space-y-1">
            {filteredNav.map((item) => {
              const isActive = currentPath === item.path;
              const Icon = item.icon;
              const isSyncItem = item.path === '/sync' && pendingSyncCount > 0;

              return (
                <button
                  key={item.path + item.title}
                  onClick={() => {
                    onNavigate(item.path);
                    onClose();
                  }}
                  className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span>{item.title}</span>
                  </div>

                  {isSyncItem && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                      {pendingSyncCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-100 p-4">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1">
              <span>Client Mode</span>
              <span className="font-semibold text-emerald-600">Offline-First</span>
            </div>
            <p className="text-[10px] text-slate-400">
              IndexedDB local queue enabled for seamless offline persistence.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
