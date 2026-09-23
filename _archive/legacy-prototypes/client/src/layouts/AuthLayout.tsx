import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

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

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white shadow-xs">
            FS
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900">FieldSync</span>
            <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium">
              Enterprise System
            </span>
          </div>
        </div>

        {isOnline ? (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
            <Wifi className="w-3 h-3 text-emerald-600" />
            <span>Online</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 border border-amber-200">
            <WifiOff className="w-3 h-3 text-amber-600" />
            <span>Offline Ready</span>
          </div>
        )}
      </div>

      {/* Main Content Container */}
      <div className="my-auto mx-auto w-full max-w-md">{children}</div>

      {/* Footer */}
      <div className="mx-auto text-center text-xs text-slate-400">
        FieldSync Offline-First Citizen Registration &bull; Enterprise Edition
      </div>
    </div>
  );
};

export default AuthLayout;
