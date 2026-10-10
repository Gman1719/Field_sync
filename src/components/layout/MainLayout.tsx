// Main Application Layout: Sidebar, Header, and Tab Routing

import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import {
  X, RefreshCw, Menu, LayoutDashboard,
  UserCog, CalendarClock, UserPlus,
  FileText, FilePlus2, MessageSquare, Database
} from 'lucide-react';
import { useUserLanguage } from '../../context/UserLanguageContext';

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
import OfficerVerificationHistory from '../verification/OfficerVerificationHistory';
import SupervisorVerifications from '../verification/SupervisorVerifications';
import MyProfile from '../profile/MyProfile';
import NotificationCenter from '../notifications/NotificationCenter';
import ChatConsole from '../chat/ChatConsole';
import RequestsCenter from '../requests/RequestsCenter';
import SupervisorSendAlertPage from '../supervisor/SupervisorSendAlertPage';
import OfficerAlertModal, { type OfficerAlertNotification } from '../notifications/OfficerAlertModal';
import { offlineDb } from '../../db/offlineDb';
import { db } from '../../services/database';
import { getZonedTimeComponents } from '../../config/workingHours';
import { generateAlertId } from '../../utils/idGenerator';
import {
  fetchUnreadCount,
  fetchNotifications,
  markNotificationRead as apiMarkRead,
  createLocalNotification,
} from '../../services/notificationApi';

export default function MainLayout({
  user,
  onLogout,
  appData,
  screenTimeInfo
}) {
  const { userT } = useUserLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSyncLog, setShowSyncLog] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const isManager = user?.role === 'manager';
  const isSupervisor = user?.role === 'supervisor';
  const isOfficer = user?.role === 'field_officer' || user?.role === 'FIELD_OFFICER';

  // Live Supervisory Alert delivery for field officers
  const [activeSupervisorAlert, setActiveSupervisorAlert] = useState<OfficerAlertNotification | null>(null);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem('fieldsync_dismissed_alerts');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const checkIncomingAlerts = React.useCallback(async () => {
    if (!isOfficer || !user?.id) return;
    try {
      // 1. Fetch unread direct supervisor alerts
      const res = await fetchNotifications({ page: 1, limit: 10, status: 'unread' });
      if (res?.success && Array.isArray(res.notifications)) {
        const found = res.notifications.find(
          (n: any) =>
            (n.type === 'SUPERVISOR_ALERT' || n.type === 'ALERT') &&
            !n.isRead &&
            !dismissedAlertIds.has(n.id)
        );
        if (found) {
          setActiveSupervisorAlert(found);
          return;
        }
      }

      // 2. Automated Daily Report Alert:
      // Triggered when report submission time has arrived (official working hours end at 17:30)
      // and the officer has not submitted today's daily work report.
      const { totalMinutes, dateStr: todayDate } = getZonedTimeComponents();
      const isSubmissionTimeArrived = totalMinutes >= 1050; // 17:30 (official working hours end)

      if (isSubmissionTimeArrived) {
        let reportReminderId = sessionStorage.getItem(`fieldsync_report_alert_${todayDate}_${user.id}`);
        if (!reportReminderId) {
          reportReminderId = generateAlertId();
          try {
            sessionStorage.setItem(`fieldsync_report_alert_${todayDate}_${user.id}`, reportReminderId);
          } catch {}
        }

        if (!dismissedAlertIds.has(reportReminderId)) {
          let hasReportToday = false;
          if (offlineDb.dailyWorkReports) {
            const localRep = await offlineDb.dailyWorkReports
              .where('officerId')
              .equals(user.id)
              .filter((r) => r.reportDate === todayDate)
              .first();
            if (localRep) hasReportToday = true;
          }

          if (!hasReportToday && db.reports) {
            const legacyRep = await db.reports
              .where('employeeId')
              .equals(user.employeeId || user.id)
              .filter((r: any) => r.date === todayDate)
              .first();
            if (legacyRep) hasReportToday = true;
          }

          if (!hasReportToday) {
            // Resolve assigned supervisor
            const allUsers = appData?.users || [];
            const assignedSupervisor = allUsers.find(
              (u: any) =>
                (u.id && u.id === user?.supervisorId) ||
                (u.employeeId && u.employeeId === user?.supervisorId) ||
                (u.role === 'supervisor')
            );
            const supervisorName = assignedSupervisor?.fullName || assignedSupervisor?.name || 'Assigned Supervisor';
            const supervisorId = user?.supervisorId || assignedSupervisor?.id || 'supervisor';

            const reminderAlert: OfficerAlertNotification = {
              id: reportReminderId,
              recipientId: user.id,
              title: "Daily Work Report Required",
              message: `Hello ${user.fullName || user.name || 'Field Officer'}, official working hours have ended (17:30) and you have not submitted your daily work report for today (${todayDate}) to your assigned supervisor (${supervisorName}). Please submit your daily report now.`,
              type: 'SUPERVISOR_ALERT',
              priority: 'IMPORTANT',
              actionUrl: 'report_new',
              createdAt: new Date().toISOString(),
              metadata: {
                senderId: supervisorId,
                senderName: supervisorName,
                senderRole: 'supervisor',
                isDailyReportReminder: true,
              },
            };

            try {
              const existing = await offlineDb.notifications.get(reportReminderId);
              if (!existing) {
                await offlineDb.notifications.put(reminderAlert as any);
                createLocalNotification({
                  recipientId: user.id || user.employeeId || 'o1',
                  title: reminderAlert.title,
                  message: reminderAlert.message,
                  type: 'SUPERVISOR_ALERT',
                  priority: 'IMPORTANT',
                  actionUrl: 'report_new',
                }).catch(() => {});
              }
            } catch (_) {}

            setActiveSupervisorAlert(reminderAlert);
          }
        }
      }
    } catch (_e) {}
  }, [isOfficer, user?.id, user?.employeeId, user?.supervisorId, user?.fullName, user?.name, appData?.users, dismissedAlertIds]);

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
    checkIncomingAlerts();

    const handleUpdate = () => {
      updateCount();
      checkIncomingAlerts();
    };

    window.addEventListener('notifications-updated', handleUpdate);
    const interval = setInterval(handleUpdate, 10000);

    return () => {
      window.removeEventListener('notifications-updated', handleUpdate);
      clearInterval(interval);
    };
  }, [checkIncomingAlerts]);

  // Cross-tab broadcast listener (e.g. supervisor sending alert in another tab)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'fieldsync_alert_broadcast' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.recipientId === user?.id) {
            checkIncomingAlerts();
          }
        } catch (_e) {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user?.id, checkIncomingAlerts]);

  // Handle global tab navigation events (e.g. from buttons or alerts)
  useEffect(() => {
    const handleTabChange = (e: any) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
      }
    };
    window.addEventListener('fieldsync-tab-change', handleTabChange);
    return () => window.removeEventListener('fieldsync-tab-change', handleTabChange);
  }, []);

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await apiMarkRead(alertId);
      if (offlineDb.notifications) {
        await offlineDb.notifications.update(alertId, { isRead: true }).catch(() => {});
      }
      setDismissedAlertIds((prev) => {
        const next = new Set(prev).add(alertId);
        try {
          sessionStorage.setItem('fieldsync_dismissed_alerts', JSON.stringify(Array.from(next)));
        } catch {}
        return next;
      });
      setActiveSupervisorAlert(null);
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch (_e) {}
  };

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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 text-slate-900 dark:text-[#F8FAFC] font-sans antialiased flex flex-col transition-colors duration-200">
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

      {/* Officer In-App Alert Notification Form Modal */}
      {isOfficer && activeSupervisorAlert && (
        <OfficerAlertModal
          isOpen={Boolean(activeSupervisorAlert)}
          alert={activeSupervisorAlert}
          onAcknowledge={(alertId) => {
            const isReportReminder = activeSupervisorAlert?.metadata?.isDailyReportReminder;
            handleAcknowledgeAlert(alertId);
            if (isReportReminder) {
              setActiveTab('report_new');
            }
          }}
          onNavigateToNotifications={() => {
            const isReportReminder = activeSupervisorAlert?.metadata?.isDailyReportReminder;
            handleAcknowledgeAlert(activeSupervisorAlert.id);
            if (isReportReminder) {
              setActiveTab('report_new');
            } else {
              setActiveTab('notifications');
            }
          }}
          onClose={() => {
            setDismissedAlertIds((prev) => {
              const next = new Set(prev).add(activeSupervisorAlert.id);
              try {
                sessionStorage.setItem('fieldsync_dismissed_alerts', JSON.stringify(Array.from(next)));
              } catch {}
              return next;
            });
            setActiveSupervisorAlert(null);
          }}
        />
      )}

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

        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-28 sm:pb-24 lg:pb-8">
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

          {/* Sync Center - Manager only */}
          {activeTab === 'sync_center' && isManager && (
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


          {/* Requests & Leaves (Officer & Supervisor only, removed from Manager) */}
          {(activeTab === 'requests' || activeTab === 'leaves' || activeTab === 'permissions') && !isManager && (
            <RequestsCenter
              user={user}
              leaves={leaves}
              setLeaves={setLeaves}
              permissions={permissions}
              setPermissions={setPermissions}
              users={users}
              teamMembers={teamMembers}
              defaultType={activeTab === 'leaves' ? 'leave' : activeTab === 'permissions' ? 'permission' : 'all'}
            />
          )}

          {/* Send Alert - Supervisor Dedicated Alert Dispatch Page */}
          {activeTab === 'send_alert' && isSupervisor && (
            <SupervisorSendAlertPage user={user} users={users} />
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

          {/* Verification - Supervisor Monitor or Officer Verification History */}
          {activeTab === 'verification' && !isManager && (
            isSupervisor ? (
              <SupervisorVerifications user={user} users={users} />
            ) : (
              <OfficerVerificationHistory user={user} />
            )
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
              className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
              onClick={() => setShowSyncLog(false)}
            >
              <div
                className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200/90 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-base tracking-tight">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <span>Sync Activity Log</span>
                  </div>
                  <button
                    type="button"
                    aria-label="Close dialog"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white bg-slate-100/70 hover:bg-slate-200/80 dark:bg-slate-700/80 dark:hover:bg-slate-600 border border-transparent dark:border-slate-600 transition-all duration-150 cursor-pointer"
                    onClick={() => setShowSyncLog(false)}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-6 max-h-96 overflow-y-auto font-mono text-xs text-slate-700 dark:text-slate-200 space-y-2">
                  {syncLog.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-400 font-sans">No sync activity recorded yet</div>
                  ) : (
                    syncLog.map((log, i) => (
                      <div key={i} className="p-3 bg-slate-50/80 dark:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-slate-700 break-words">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ============================================================== */}
        {/* MOBILE BOTTOM NAVIGATION BAR (Visible on < lg screens)        */}
        {/* ============================================================== */}
        {/* MOBILE BOTTOM NAVIGATION BAR (Visible on < lg screens)        */}
        {/* ============================================================== */}
        <nav
          aria-label="Mobile Navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-8px_25px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_25px_rgba(0,0,0,0.35)] px-2 pt-1.5 pb-safe flex items-center justify-around"
        >
          {/* Tab 1: Dashboard / Home (All roles) */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl text-[10px] font-bold transition-all mobile-tap-active cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-blue-50/90 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs scale-[1.02]'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5 shrink-0" />
            <span className="truncate max-w-[64px]">{userT('Home')}</span>
          </button>

          {/* Tab 2: Role-Specific Primary Tab */}
          {isManager && (
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl text-[10px] font-bold transition-all mobile-tap-active cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-blue-50/90 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs scale-[1.02]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserCog className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="truncate max-w-[64px]">{userT('Users')}</span>
            </button>
          )}

          {isSupervisor && (
            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl text-[10px] font-bold transition-all mobile-tap-active cursor-pointer ${
                activeTab === 'attendance'
                  ? 'bg-blue-50/90 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs scale-[1.02]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarClock className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="truncate max-w-[64px]">{userT('Attendance')}</span>
            </button>
          )}

          {isOfficer && (
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl text-[10px] font-bold transition-all mobile-tap-active cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-blue-600 text-white font-extrabold shadow-md shadow-blue-500/25 scale-[1.02]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="truncate max-w-[64px]">{userT('Register')}</span>
            </button>
          )}

          {/* Tab 3: Secondary Role-Specific Tab */}
          {isManager && (
            <button
              type="button"
              onClick={() => setActiveTab('citizens')}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl text-[10px] font-bold transition-all mobile-tap-active cursor-pointer ${
                activeTab === 'citizens'
                  ? 'bg-blue-50/90 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs scale-[1.02]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Database className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="truncate max-w-[64px]">{userT('Citizens')}</span>
            </button>
          )}

          {isSupervisor && (
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl text-[10px] font-bold transition-all mobile-tap-active cursor-pointer ${
                activeTab === 'reports' || activeTab === 'all_reports'
                  ? 'bg-blue-50/90 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs scale-[1.02]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="truncate max-w-[64px]">{userT('Reports')}</span>
            </button>
          )}

          {isOfficer && (
            <button
              type="button"
              onClick={() => setActiveTab('daily_report')}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl text-[10px] font-bold transition-all mobile-tap-active cursor-pointer ${
                activeTab === 'daily_report' || activeTab === 'report_new'
                  ? 'bg-blue-50/90 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs scale-[1.02]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FilePlus2 className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="truncate max-w-[64px]">{userT('Report')}</span>
            </button>
          )}

          {/* Tab 4: Chat (Manager & Supervisor) or My Work (Officer) */}
          {(isManager || isSupervisor) ? (
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl text-[10px] font-bold transition-all mobile-tap-active cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-blue-50/90 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs scale-[1.02]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="truncate max-w-[64px]">{userT('Chat')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('my_reports')}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl text-[10px] font-bold transition-all mobile-tap-active cursor-pointer ${
                activeTab === 'my_reports'
                  ? 'bg-blue-50/90 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs scale-[1.02]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="truncate max-w-[64px]">{userT('My Work')}</span>
            </button>
          )}

          {/* Tab 5: Mobile Drawer Hamburger Trigger */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mobile-tap-active cursor-pointer transition-all"
            aria-label="Open Full Navigation Menu"
          >
            <div className="relative">
              <Menu className="w-5 h-5 mb-0.5 text-slate-700 dark:text-slate-300 shrink-0" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </div>
            <span className="truncate max-w-[64px]">{userT('Menu')}</span>
          </button>
        </nav>
      </div>

      <OfflineIndicator />
      <SyncStatus />
    </div>
  );
}
