import React from 'react';
import Header from '../components/common/Header.tsx';
import Sidebar from '../components/common/Sidebar.tsx';
import { User } from '../types/index.ts';

export interface AppLayoutProps {
  user: User | null;
  onLogout: () => void;
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
  pendingSyncCount?: number;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  user,
  onLogout,
  currentPath,
  onNavigate,
  children,
  pendingSyncCount = 0,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar for Desktop & Mobile Drawer */}
      <Sidebar
        currentRole={user?.role || 'FIELD_OFFICER'}
        currentPath={currentPath}
        onNavigate={onNavigate}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        pendingSyncCount={pendingSyncCount}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={user}
          onLogout={onLogout}
          onMenuToggle={() => setIsSidebarOpen(true)}
          pendingSyncCount={pendingSyncCount}
          onSyncClick={() => onNavigate('/sync')}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
