import React from 'react';
import './App.css';

// Context Providers
import { UserLanguageProvider } from './context/UserLanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Custom Hooks
import { useAppData } from './hooks/useAppData';
import { useScreenTime } from './hooks/useScreenTime';
import { useVerification } from './hooks/useVerification';
import { evaluateWorkingHours, getZonedTimeComponents } from './config/workingHours';

// UI Components
import LandingPage from './components/landing/LandingPage';
import Login from './components/auth/Login';
import LoadingScreen from './components/common/LoadingScreen';
import ForceChangePassword from './components/auth/ForceChangePassword';
import VerificationPopup from './components/verification/VerificationPopup';
import ForceSessionModal from './components/sessions/ForceSessionModal';
import MainLayout from './components/layout/MainLayout';
import syncEngine from './services/unifiedSyncEngine';

function AppContent() {
  const [authView, setAuthView] = React.useState('landing'); // 'landing' | 'login'
  const [selectedDemoRole, setSelectedDemoRole] = React.useState(null);

  // Allow navigating to Home / Landing page even when authenticated via #home, #landing, or ?view=landing
  const [viewLandingExplicit, setViewLandingExplicit] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const h = window.location.hash.toLowerCase();
      const s = window.location.search.toLowerCase();
      return h === '#landing' || h === '#home' || s.includes('view=landing') || s.includes('view=home');
    }
    return false;
  });

  React.useEffect(() => {
    const handleHash = () => {
      const h = window.location.hash.toLowerCase();
      const s = window.location.search.toLowerCase();
      if (h === '#landing' || h === '#home' || s.includes('view=landing') || s.includes('view=home')) {
        setViewLandingExplicit(true);
      } else if (h === '#dashboard' || h === '#app' || h === '#') {
        setViewLandingExplicit(false);
      }
    };
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('popstate', handleHash);
    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('popstate', handleHash);
    };
  }, []);

  const {
    user,
    isLoading,
    mustChangePassword,
    loginError,
    login,
    logout,
    handleSetNewPassword
  } = useAuth();

  // Auto-sync pending records when user is logged in and online
  React.useEffect(() => {
    if (user && typeof navigator !== 'undefined' && navigator.onLine) {
      syncEngine.syncAll(true).catch(() => {});
    }
  }, [user]);

  const appData = useAppData(user);
  const screenTimeInfo = useScreenTime(user);

  // Verification popup for field officers
  const isOfficer = Boolean(user?.role && (user.role.toLowerCase().replace('-', '_') === 'field_officer'));
  const {
    showPopup,
    pendingVerification,
    handleConfirm,
    handleTimeout,
  } = useVerification(isOfficer ? user?.id : null, isOfficer ? (user?.fullName || user?.name) : null);

  // Check whether it is official working hours (08:30 - 17:30 EAT)
  // In development, testing, localhost, or LAN network addresses, allow session enforcement testing at any time.
  const isWithinWorkingHoursPeriod = React.useCallback(() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalOrDev =
      import.meta.env.DEV ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.');
    if (isLocalOrDev) return true;

    if (localStorage.getItem('fieldsync_test_working_hours') === 'true') {
      return true;
    }

    const wh = evaluateWorkingHours();
    if (wh.isWorkingHours || wh.isLunch) return true;
    const { totalMinutes } = getZonedTimeComponents();
    // 08:30 (510 min) to 17:30 (1050 min) EAT
    return totalMinutes >= 510 && totalMinutes < 1050;
  }, []);

  // Mandatory Work Session enforcement for Field Officers during working hours:
  // When an officer logs in and their session is not started yet today,
  // the system forces them to start their session before accessing the app.
  const shouldForceSession =
    Boolean(user) &&
    isOfficer &&
    Boolean(screenTimeInfo?.isInitialized) &&
    isWithinWorkingHoursPeriod() &&
    !screenTimeInfo?.isSessionActive &&
    screenTimeInfo?.trackingStatus !== 'FINALIZED' &&
    !screenTimeInfo?.isOnApprovedLeave;

  // Login handler with audit log
  const handleLogin = async (email, password) => {
    const loggedInUser = await login(email, password, appData.users);
    if (loggedInUser) {
      appData.addAuditLog('User Login', { email, role: loggedInUser.role });
      return true;
    }
    return false;
  };

  // Logout handler with audit log
  const handleLogout = async () => {
    if (user) {
      appData.addAuditLog('User Logout', { email: user.email });
      if (screenTimeInfo?.pauseAndSaveOnLogout) {
        await screenTimeInfo.pauseAndSaveOnLogout();
      }
    }
    setAuthView('landing');
    setSelectedDemoRole(null);
    await logout();
  };

  // Explicit Landing Page view (accessible even when authenticated via #home, #landing, or navigation)
  if (viewLandingExplicit) {
    return (
      <LandingPage
        onGoToLogin={(role) => {
          if (user) {
            setViewLandingExplicit(false);
            window.location.hash = '';
          } else {
            setSelectedDemoRole(role || null);
            setAuthView('login');
            setViewLandingExplicit(false);
          }
        }}
        isOnline={appData.isOnline}
      />
    );
  }

  // Unauthenticated view
  if (!user) {
    if (isLoading) {
      return <LoadingScreen />;
    }
    if (authView === 'login') {
      return (
        <Login
          onLogin={handleLogin}
          loginError={loginError}
          isOnline={appData.isOnline}
          onBackToHome={() => {
            setAuthView('landing');
            setViewLandingExplicit(true);
          }}
          initialRole={selectedDemoRole}
        />
      );
    }
    return (
      <LandingPage
        onGoToLogin={(role) => {
          setSelectedDemoRole(role || null);
          setAuthView('login');
        }}
        isOnline={appData.isOnline}
      />
    );
  }

  // First-time password change view
  if (mustChangePassword) {
    return (
      <ForceChangePassword
        onSetPassword={handleSetNewPassword}
        userName={user.name}
      />
    );
  }

  // Authenticated application view
  return (
    <>
      {isOfficer && showPopup && (
        <VerificationPopup
          pendingVerification={pendingVerification}
          onConfirm={handleConfirm}
          onTimeout={handleTimeout}
        />
      )}

      {shouldForceSession && (
        <ForceSessionModal
          user={user}
          onSessionStarted={() => {}}
          startWorkSession={screenTimeInfo.startWorkSession}
          isOnline={appData.isOnline}
        />
      )}

      <MainLayout
        user={user}
        onLogout={handleLogout}
        appData={appData}
        screenTimeInfo={screenTimeInfo}
      />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <UserLanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </UserLanguageProvider>
    </ThemeProvider>
  );
}