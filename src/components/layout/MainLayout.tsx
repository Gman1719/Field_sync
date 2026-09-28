// Main Application Layout: Sidebar, Header, and Tab Routing

import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { X, RefreshCw } from 'lucide-react';

// Common Components
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';
import OfflineIndicator from '../common/OfflineIndicator';
import SyncStatus from '../common/SyncStatus';

// Tab View Components
import Dashboard from '../dashboard/Dashboard';
import CitizenRegistration from '../citizens/CitizenRegistration';
import AttendanceManagement from '../attendance/AttendanceManagement';
import ManagerAttendance from '../attendance/ManagerAttendance';
import ScreenTimeManagement from '../screentime/ScreenTimeManagement';
import ActivityTimeline from '../activity/ActivityTimeline';
import WorkSessionTracker from '../sessions/WorkSessionTracker';
import DailyWorkReportView from '../reports/DailyWorkReportView';
import MyReportsView from '../reports/MyReportsView';
import SyncCenterView from '../sync/SyncCenterView';
import SupervisorReports from '../supervisor/SupervisorReports';
import TeamManagement from '../team/TeamManagement';
import UserManagement from '../users/UserManagement';
import Analytics from '../analytics/Analytics';
import CitizensDatabase from '../citizens/CitizensDatabase';
import DuplicateReviewConsole from '../duplicates/DuplicateReviewConsole';
import AuditLog from '../audit/AuditLog';
import AllReports from '../reports/AllReports';
import AlertManagement from '../alerts/AlertManagement';
import VerificationPage from '../verification/VerificationPage';
import MyProfile from '../profile/MyProfile';
import NotificationCenter from '../notifications/NotificationCenter';
import ChatConsole from '../chat/ChatConsole';
import { fetchUnreadCount } from '../../services/notificationApi';

export default function MainLayout({
  user,
  onLogout,
  appData,
  screenTimeInfo
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSyncLog, setShowSyncLog] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      try {
        const count = await fetchUnreadCount();
        if (typeof count === 'number') {
          setUnreadNotifCount(count);
        }
      } catch (_err) {
        // Ignore unread count fetch error
      }
    };
    updateCount();
    window.addEventListener('notifications-updated', updateCount);
    const interval = setInterval(updateCount, 20000);
    return () => {
      window.removeEventListener('notifications-updated', updateCount);
      clearInterval(interval);
    };
  }, []);

  const isManager = user?.role === 'manager';
  const isSupervisor = user?.role === 'supervisor';
  const isOfficer = user?.role === 'field_officer';

  const {
    reports,
    users, setUsers,
    attendance, setAttendance,
    citizens, setCitizens,
    auditLog, setAuditLog,
    supervisorReports, setSupervisorReports,
    screenTime, setScreenTime,
    tasks, setTasks,
    leaves, setLeaves,
    alerts, setAlerts,
    liveStatus,
    appNotifications, setAppNotifications,
    permissions, setPermissions,
    isOnline, syncing, syncLog, pendingSync,
    addNotification, markNotificationRead, markAllNotificationsRead,
    teamMembers, filteredReports, filteredAttendance, filteredScreenTime,
    filteredTasks, filteredLeaves, filteredPermissions,
    employeePerformance, totalReports, totalRegistrations,
    regionStats, attendanceSummary, topPerformers, teamPerformance,
    pendingPermissions, pendingLeaves,
    getSupervisorReports, getSupervisorLeaves, getSupervisorPermissions,
    getSupervisorAttendance, getSupervisorTasks
  } = appData;

  const {
    screenTimeDisplay = '00:00:00',
    isScreenTimeRunning = false
  } = screenTimeInfo || {};

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-900 dark:text-[#F8FAFC] font-sans antialiased flex flex-col transition-colors duration-200">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0F172A',
            color: '#F8FAFC',
            fontSize: '13px',
            fontWeight: '500',
            borderRadius: '10px',
            padding: '12px 16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
          },
          success: {
            iconTheme: {
              primary: '#16A34A',
              secondary: '#FFFFFF'
            }
          },
          error: {
            iconTheme: {
              primary: '#DC2626',
              secondary: '#FFFFFF'
            }
          }
        }}
      />

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        pendingSync={pendingSync}
        liveStatus={liveStatus}
        users={users}
        reports={reports}
        citizens={citizens}
        attendance={attendance}
        notificationsCount={unreadNotifCount}
        onLogout={onLogout}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header
          user={user}
          isOnline={isOnline}
          syncing={syncing}
          pendingSync={pendingSync}
          screenTimeDisplay={screenTimeDisplay}
          isScreenTimeRunning={isScreenTimeRunning}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          notifications={appNotifications}
          setNotifications={setAppNotifications}
          markNotificationRead={markNotificationRead}
          markAllNotificationsRead={markAllNotificationsRead}
          setIsMobileOpen={setIsMobileOpen}
          onLogout={onLogout}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Dashboard - All Roles */}
          {activeTab === 'dashboard' && (
            <Dashboard
              isManager={isManager}
              isSupervisor={isSupervisor}
              isOfficer={isOfficer}
              user={user}
              reports={reports}
              users={users}
              attendance={attendance}
              screenTime={screenTime}
              leaves={leaves}
              permissions={permissions}
              citizens={citizens}
              totalReports={totalReports}
              totalRegistrations={totalRegistrations}
              attendanceSummary={attendanceSummary}
              teamMembers={teamMembers}
              pendingLeaves={pendingLeaves}
              pendingPermissions={pendingPermissions}
              topPerformers={topPerformers}
              teamPerformance={teamPerformance}
              employeePerformance={employeePerformance}
              liveStatus={liveStatus}
              setActiveTab={setActiveTab}
            />
          )}

          {/* Register - Field Officer only */}
          {activeTab === 'register' && isOfficer && (
            <CitizenRegistration
              user={user}
              citizens={citizens}
              setCitizens={setCitizens}
              addNotification={addNotification}
              setActiveTab={setActiveTab}
            />
          )}

          {/* Daily Work Reports - All Roles (Officer, Supervisor, Manager) */}
          {(activeTab === 'daily_report' || activeTab === 'reports' || activeTab === 'report_new' || activeTab === 'all_reports') && (
            <DailyWorkReportView
              user={user}
              addNotification={addNotification}
              setActiveTab={setActiveTab}
              screenTimeInfo={screenTimeInfo}
            />
          )}

          {/* My Report - Dedicated Officer Historical Reports View */}
          {activeTab === 'my_reports' && (
            <MyReportsView
              user={user}
              setActiveTab={setActiveTab}
            />
          )}

          {/* Attendance - Supervisor or Officer */}
          {activeTab === 'attendance' && (isSupervisor || isOfficer) && (
            <AttendanceManagement
              filteredAttendance={isSupervisor ? getSupervisorAttendance() : filteredAttendance}
              attendance={attendance}
              setAttendance={setAttendance}
              users={users}
              user={user}
              isSupervisor={isSupervisor}
              isOfficer={isOfficer}
              teamMembers={teamMembers}
              attendanceSummary={attendanceSummary}
              addNotification={addNotification}
            />
          )}

          {/* Manager Attendance - Manager only */}
          {activeTab === 'manager_attendance' && isManager && (
            <ManagerAttendance
              attendance={attendance}
              users={users}
              setAttendance={setAttendance}
              addNotification={addNotification}
            />
          )}

          {/* Activity Logs - All roles */}
          {activeTab === 'activity_logs' && (
            <ActivityTimeline user={user} />
          )}

          {/* Sync Center - Supervisors, Managers, and Admins only */}
          {activeTab === 'sync_center' && !isOfficer && (
            <SyncCenterView user={user} />
          )}

          {/* Screen Time & Work Sessions (Officers & Supervisors only, not Manager) */}
          {activeTab === 'screentime' && !isManager && (
            isOfficer ? (
              <WorkSessionTracker user={user} screenTimeInfo={screenTimeInfo} />
            ) : (
              <ScreenTimeManagement
                user={user}
                isManager={isManager}
                isSupervisor={isSupervisor}
              />
            )
          )}

          {/* Supervisor Reports - Supervisor only */}
          {activeTab === 'supervisor_reports' && isSupervisor && (
            <SupervisorReports
              supervisorReports={supervisorReports}
              users={users}
              user={user}
              teamMembers={teamMembers}
              setSupervisorReports={setSupervisorReports}
            />
          )}

          {/* Team - Manager or Supervisor */}
          {activeTab === 'team' && (isManager || isSupervisor) && (
            <TeamManagement
              users={users}
              user={user}
              isManager={isManager}
              isSupervisor={isSupervisor}
              teamMembers={teamMembers}
              reports={reports}
              attendance={attendance}
              screenTime={screenTime}
              liveStatus={liveStatus}
              employeePerformance={employeePerformance}
              citizens={citizens}
            />
          )}

          {/* Users - Manager only */}
          {activeTab === 'users' && isManager && (
            <UserManagement
              users={users}
              setUsers={setUsers}
              addNotification={addNotification}
            />
          )}

          {/* Operational Chat - Manager and Supervisor only */}
          {activeTab === 'chat' && (isManager || isSupervisor) && (
            <ChatConsole
              user={user}
              users={users}
              setActiveTab={setActiveTab}
            />
          )}

          {/* Analytics - Manager & Supervisor */}
          {activeTab === 'analytics' && (isManager || isSupervisor) && (
            <Analytics
              user={user}
              setActiveTab={setActiveTab}
              reports={reports}
              users={users}
              attendance={attendance}
              screenTime={screenTime}
              liveStatus={liveStatus}
              citizens={citizens}
              totalReports={totalReports}
              totalRegistrations={totalRegistrations}
              regionStats={regionStats}
              employeePerformance={employeePerformance}
            />
          )}

          {/* Citizens - All Roles (Officer, Supervisor, Manager) */}
          {activeTab === 'citizens' && (
            <CitizensDatabase
              user={user}
              users={users}
              setActiveTab={setActiveTab}
            />
          )}

          {/* Audit - Manager & Supervisor (Zone-scoped) */}
          {activeTab === 'audit' && (isManager || isSupervisor) && (
            <AuditLog
              user={user}
              auditLog={auditLog}
              setAuditLog={setAuditLog}
            />
          )}


          {/* Alerts - Manager only */}
          {activeTab === 'alerts' && isManager && (
            <AlertManagement
              alerts={alerts}
              setAlerts={setAlerts}
              users={users}
              user={user}
              addNotification={addNotification}
            />
          )}

          {/* Verification - All Roles */}
          {activeTab === 'verification' && (
            <VerificationPage
              users={users}
              liveStatus={liveStatus}
              reports={reports}
              citizens={citizens}
              attendance={attendance}
            />
          )}

          {/* User Profile - All Roles */}
          {activeTab === 'profile' && (
            <MyProfile user={user} defaultTab="personal" />
          )}

          {/* User Profile Security / Password Change - All Roles */}
          {activeTab === 'profile_security' && (
            <MyProfile user={user} defaultTab="security" />
          )}

          {/* Notification Center - All Roles */}
          {activeTab === 'notifications' && (
            <NotificationCenter user={user} setActiveTab={setActiveTab} />
          )}

          {/* Sync Log Modal */}
          {showSyncLog && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 bg-slate-950/65 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
              onClick={() => setShowSyncLog(false)}
            >
              <div
                className="bg-white dark:bg-gradient-to-b dark:from-[#1C1410] dark:to-[#140E0B] rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18),0_0_1px_1px_rgba(15,23,42,0.06)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)] border border-slate-200/90 dark:border-[#38261E] overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-5 border-b border-slate-100 dark:border-[#2C1D16] flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-base tracking-tight">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <span>Sync Activity Log</span>
                  </div>
                  <button
                    type="button"
                    aria-label="Close dialog"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-[#A8988B] dark:hover:text-white bg-slate-100/70 hover:bg-slate-200/80 dark:bg-[#251A14] dark:hover:bg-[#34241C] border border-transparent dark:border-[#38261E] transition-all duration-150"
                    onClick={() => setShowSyncLog(false)}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-6 max-h-96 overflow-y-auto font-mono text-xs text-slate-700 dark:text-[#E8DDD7] space-y-2">
                  {syncLog.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 dark:text-[#A8988B] font-sans">No sync activity recorded yet</div>
                  ) : (
                    syncLog.map((log, i) => (
                      <div key={i} className="p-3 bg-slate-50/80 dark:bg-[#17100D] rounded-xl border border-slate-200/80 dark:border-[#2F211A] break-words">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <OfflineIndicator />
      <SyncStatus />
    </div>
  );
}
