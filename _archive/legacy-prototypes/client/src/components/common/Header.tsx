import React from 'react';
import { Wifi, WifiOff, RefreshCw, Menu, LogOut, ChevronDown } from 'lucide-react';
import { User } from '../../types/index.ts';

export interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onMenuToggle: () => void;
  pendingSyncCount?: number;
  onSyncClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onMenuToggle,
  pendingSyncCount = 0,
  onSyncClick,
}) => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'FIELD_OFFICER':
        return 'Field Officer';
      case 'SUPERVISOR':
        return 'Supervisor';
      case 'MANAGER':
        return 'Manager';
      default:
        return 'Staff';
    }
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'MANAGER':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SUPERVISOR':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-xs">
            FS
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-none">FieldSync</h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">
              Offline-First Registration
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Network Reachability Pill */}
        {isOnline ? (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Wifi className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Online</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 border border-amber-200 shadow-2xs">
            <WifiOff className="w-3.5 h-3.5 text-amber-600" />
            <span>Offline Ready</span>
          </div>
        )}

        {/* Sync Queue Badge Button */}
        {pendingSyncCount > 0 && (
          <button
            onClick={onSyncClick}
            className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors shadow-2xs"
            title="Records pending sync in local storage"
          >
            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
            <span>{pendingSyncCount} Pending</span>
          </button>
        )}

        {/* User Profile Pill */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 rounded-xl p-1.5 text-left hover:bg-slate-100 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-xs font-semibold text-slate-900 leading-tight">{user.fullName}</p>
                <span
                  className={`inline-block text-[10px] font-medium px-1.5 py-0.2 rounded border ${getRoleBadgeStyle(
                    user.role
                  )}`}
                >
                  {getRoleLabel(user.role)}
                </span>
              </div>
              <ChevronDown className="hidden w-3.5 h-3.5 text-slate-400 md:block" />
            </button>

            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-2.5">
                    <p className="text-xs font-semibold text-slate-900">{user.fullName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <p className="text-[10px] font-medium text-emerald-600 mt-0.5">
                      Role: {getRoleLabel(user.role)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
