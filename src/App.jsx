// src/App.jsx – FieldSync Root Application Orchestrator

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

// UI Components
import Login from './components/auth/Login';
import LoadingScreen from './components/common/LoadingScreen';
import ForceChangePassword from './components/auth/ForceChangePassword';
import VerificationPopup from './components/verification/VerificationPopup';
import MainLayout from './components/layout/MainLayout';

function AppContent() {
  const {
    user,
    isLoading,
    mustChangePassword,
    loginError,
    login,
    logout,
    handleSetNewPassword
  } = useAuth();

  const appData = useAppData(user);
  const screenTimeInfo = useScreenTime(user);

  // Verification popup for field officers
  const isOfficer = user?.role === 'field_officer';
  const {
    showPopup,
    handleAnswer,
    handleClose
  } = useVerification(isOfficer ? user?.id : null, isOfficer ? user?.name : null);

  // Login handler with audit log
  const handleLogin = async (email, password) => {
    const loggedInUser = await login(email, password, appData.users);
    if (loggedInUser) {
      appData.addAuditLog('User Login', { email, role: loggedInUser.role });
      return true;
    }
    return false;
  };

  // Logout handler with audit log & screen time stop
  const handleLogout = async () => {
    if (user) {
      if (screenTimeInfo.stopScreenTime) {
        screenTimeInfo.stopScreenTime();
      }
      appData.addAuditLog('User Logout', { email: user.email });
    }
    await logout();
  };

  // Unauthenticated view
  if (!user) {
    if (isLoading) {
      return <LoadingScreen />;
    }
    return (
      <Login
        onLogin={handleLogin}
        loginError={loginError}
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
          officerId={user?.id}
          officerName={user?.name}
          onAnswer={handleAnswer}
          onClose={handleClose}
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