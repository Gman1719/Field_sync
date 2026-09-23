import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import AuthLayout from './layouts/AuthLayout.tsx';
import AppLayout from './layouts/AppLayout.tsx';
import LoginPage from './pages/auth/LoginPage.tsx';
import DashboardPage from './pages/dashboard/DashboardPage.tsx';
import CitizenRegistrationPage from './pages/registration/CitizenRegistrationPage.tsx';
import CitizenListPage from './pages/registration/CitizenListPage.tsx';
import SyncCenterPage from './pages/sync/SyncCenterPage.tsx';
import NotFoundPage from './pages/error/NotFoundPage.tsx';
import UnauthorizedPage from './pages/error/UnauthorizedPage.tsx';
import UserManagementPage from './pages/manager/UserManagementPage.tsx';
import OfficersMonitoringPage from './pages/supervisor/OfficersMonitoringPage.tsx';
import DuplicateReviewPage from './pages/supervisor/DuplicateReviewPage.tsx';
import RegionManagementPage from './pages/manager/RegionManagementPage.tsx';
import AuditLogsPage from './pages/manager/AuditLogsPage.tsx';
import SettingsPage from './pages/settings/SettingsPage.tsx';
import ReportsPage from './pages/reports/ReportsPage.tsx';
import ProfilePage from './pages/profile/ProfilePage.tsx';
import NotificationsPage from './pages/notifications/NotificationsPage.tsx';
import DailyReportPage from './pages/reports/DailyReportPage.tsx';
import ActivityLogsPage from './pages/activity/ActivityLogsPage.tsx';
import AssignmentsPage from './pages/assignments/AssignmentsPage.tsx';
import SupervisorDailyReportsPage from './pages/supervisor/SupervisorDailyReportsPage.tsx';
import SupervisorActivityTimelinePage from './pages/supervisor/SupervisorActivityTimelinePage.tsx';
import SyncService from './services/syncService.ts';
import ScreenTimeTracker from './services/screenTimeTracker.ts';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, logout, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = React.useState<string>('/dashboard');
  const [pendingSyncCount] = React.useState<number>(1);

  React.useEffect(() => {
    SyncService.initAutoSync();
  }, []);

  React.useEffect(() => {
    if (user?.id) {
      ScreenTimeTracker.init(user.id, currentPath);
    }
  }, [user?.id, currentPath]);

  // Initial Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white font-bold text-lg mb-4 shadow-sm">
          FS
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Verifying FieldSync Session...</span>
        </div>
      </div>
    );
  }

  // Auth Screen
  if (!user) {
    return (
      <AuthLayout>
        <LoginPage />
      </AuthLayout>
    );
  }

  // Role-Based Route Guard Helper
  const checkRoleAccess = (allowedRoles: string[]) => {
    return allowedRoles.includes(user.role);
  };

  // Render Role-Guarded Content
  const renderContent = () => {
    switch (currentPath) {
      case '/dashboard':
        return (
          <DashboardPage
            user={user}
            onNavigate={setCurrentPath}
            pendingSyncCount={pendingSyncCount}
          />
        );

      case '/register':
        if (!checkRoleAccess(['FIELD_OFFICER'])) {
          return <UnauthorizedPage onBack={() => setCurrentPath('/dashboard')} />;
        }
        return (
          <CitizenRegistrationPage
            onBack={() => setCurrentPath('/dashboard')}
            onViewCitizens={() => setCurrentPath('/citizens')}
          />
        );

      case '/citizens':
        return <CitizenListPage onRegisterClick={() => setCurrentPath('/register')} />;

      case '/sync':
      case '/sync-monitoring':
        return <SyncCenterPage />;

      case '/daily-report':
        return <DailyReportPage onNavigate={setCurrentPath} />;

      case '/activity-logs':
        return <ActivityLogsPage />;

      case '/assignments':
        return <AssignmentsPage />;

      case '/supervisor/daily-reports':
        if (!checkRoleAccess(['SUPERVISOR', 'MANAGER'])) {
          return <UnauthorizedPage onBack={() => setCurrentPath('/dashboard')} />;
        }
        return <SupervisorDailyReportsPage />;

      case '/supervisor/activity-timeline':
        if (!checkRoleAccess(['SUPERVISOR', 'MANAGER'])) {
          return <UnauthorizedPage onBack={() => setCurrentPath('/dashboard')} />;
        }
        return <SupervisorActivityTimelinePage />;

      // Supervisor Restricted Routes
      case '/officers':
        if (!checkRoleAccess(['SUPERVISOR', 'MANAGER'])) {
          return <UnauthorizedPage onBack={() => setCurrentPath('/dashboard')} />;
        }
        return <OfficersMonitoringPage />;

      case '/duplicates':
        if (!checkRoleAccess(['SUPERVISOR', 'MANAGER'])) {
          return <UnauthorizedPage onBack={() => setCurrentPath('/dashboard')} />;
        }
        return <DuplicateReviewPage />;

      // Manager Restricted Routes
      case '/users':
        if (!checkRoleAccess(['MANAGER'])) {
          return <UnauthorizedPage onBack={() => setCurrentPath('/dashboard')} />;
        }
        return <UserManagementPage />;

      case '/regions':
        if (!checkRoleAccess(['MANAGER'])) {
          return <UnauthorizedPage onBack={() => setCurrentPath('/dashboard')} />;
        }
        return <RegionManagementPage />;

      case '/audit-logs':
        if (!checkRoleAccess(['MANAGER'])) {
          return <UnauthorizedPage onBack={() => setCurrentPath('/dashboard')} />;
        }
        return <AuditLogsPage />;

      case '/settings':
        return <SettingsPage />;

      case '/reports':
        if (!checkRoleAccess(['SUPERVISOR', 'MANAGER'])) {
          return <UnauthorizedPage onBack={() => setCurrentPath('/dashboard')} />;
        }
        return <ReportsPage />;

      case '/notifications':
        return <NotificationsPage />;

      case '/profile':
        return <ProfilePage />;

      default:
        return <NotFoundPage onBack={() => setCurrentPath('/dashboard')} />;
    }
  };

  return (
    <AppLayout
      user={user}
      onLogout={logout}
      currentPath={currentPath}
      onNavigate={setCurrentPath}
      pendingSyncCount={pendingSyncCount}
    >
      {renderContent()}
    </AppLayout>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
