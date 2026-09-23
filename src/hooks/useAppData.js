// src/hooks/useAppData.js
// Centralized Data, State, Background Sync & Filter Orchestration

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  db,
  initializeAllData,
  syncQueue,
  processSyncQueue,
  isDevToolsOffline,
  checkRealInternet,
  clearStuckSyncItems,
  pullScreenTimeFromServer,
  pullAuditLogsFromServer,
  pullAlertsFromServer,
  pullVerificationFromServer,
  pullSupervisorReportsFromServer
} from '../services/database';
import { getToday, uid } from '../utils/helpers';
import { API_BASE } from '../config/api';

export function useAppData(user) {
  // ===== CORE ENTITY STATES =====
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [citizens, setCitizens] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [supervisorReports, setSupervisorReports] = useState([]);
  const [screenTime, setScreenTime] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [liveStatus, setLiveStatus] = useState([]);
  const [appNotifications, setAppNotifications] = useState([]);
  const [permissions, setPermissions] = useState([]);

  // ===== NETWORK & SYNC STATES =====
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Role shortcuts
  const isManager = user?.role === 'manager';
  const isSupervisor = user?.role === 'supervisor';
  const isOfficer = user?.role === 'field_officer';

  // ============================================================
  // AUDIT LOG HELPER
  // ============================================================
  const addAuditLog = useCallback(async (action, details) => {
    const log = {
      id: uid(),
      userId: user?.employeeId || 'system',
      userName: user?.name || 'System',
      action,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
      timestamp: new Date().toISOString(),
      ip: '127.0.0.1',
      synced: false
    };

    await db.audit.add(log);
    setAuditLog(prev => [log, ...prev]);

    const online = await checkRealInternet();
    if (online) {
      try {
        await fetch(`${API_BASE}/audit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(log)
        });
        await db.audit.update(log.id, { synced: true });
        setAuditLog(prev => prev.map(l => l.id === log.id ? { ...l, synced: true } : l));
      } catch (error) {
        console.error('Failed to sync audit log:', error);
        syncQueue.add({ type: 'audit', id: log.id, data: log });
      }
    } else {
      syncQueue.add({ type: 'audit', id: log.id, data: log });
    }
  }, [user]);

  // ============================================================
  // NOTIFICATION HELPERS
  // ============================================================
  const addNotification = useCallback(async (userId, title, message, type = 'info', link = '') => {
    if (!userId) return;
    const newNotification = {
      id: uid(),
      userId,
      title,
      message,
      type,
      read: false,
      timestamp: new Date().toISOString(),
      link: link || '/dashboard'
    };
    setAppNotifications(prev => {
      const updated = [newNotification, ...prev];
      db.notifications.bulkPut(updated);
      return updated;
    });
  }, []);

  const markNotificationRead = useCallback(async (notificationId) => {
    setAppNotifications(prev => {
      const updated = prev.map(n => n.id === notificationId ? { ...n, read: true } : n);
      db.notifications.bulkPut(updated);
      return updated;
    });
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    setAppNotifications(prev => {
      const updated = prev.map(n => n.userId === user?.id ? { ...n, read: true } : n);
      db.notifications.bulkPut(updated);
      return updated;
    });
  }, [user]);

  // ============================================================
  // BACKGROUND SYNC ENGINE
  // ============================================================
  const runSync = useCallback(async () => {
    if (isDevToolsOffline()) return;
    const online = await checkRealInternet();
    if (!online || syncing) return;

    setSyncing(true);
    try {
      await processSyncQueue(true);

      const [
        updatedReports, updatedCitizens, updatedAttendance,
        updatedTasks, updatedLeaves, updatedPermissions,
        updatedSupervisorReports
      ] = await Promise.all([
        db.reports.toArray(),
        db.citizens.toArray(),
        db.attendance.toArray(),
        db.tasks.toArray(),
        db.leaves.toArray(),
        db.permissions.toArray(),
        db.supervisor_reports.toArray()
      ]);

      setReports(updatedReports);
      setCitizens(updatedCitizens);
      setAttendance(updatedAttendance);
      setTasks(updatedTasks);
      setLeaves(updatedLeaves);
      setPermissions(updatedPermissions);
      setSupervisorReports(updatedSupervisorReports);
    } catch (error) {
      console.error('❌ Sync error:', error);
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  // ============================================================
  // INITIAL DATA LOADING
  // ============================================================
  useEffect(() => {
    const loadAllData = async () => {
      try {
        await initializeAllData();
        window.db = db;

        const [
          usersData, reportsData, attendanceData, citizensData, auditData,
          supervisorReportsData, screenTimeData, tasksData, leavesData,
          alertsData, liveStatusData, notificationsData, permissionsData
        ] = await Promise.all([
          db.users.toArray(),
          db.reports.toArray(),
          db.attendance.toArray(),
          db.citizens.toArray(),
          db.audit.toArray(),
          db.supervisor_reports.toArray(),
          db.screen_time.toArray(),
          db.tasks.toArray(),
          db.leaves.toArray(),
          db.alerts.toArray(),
          db.status.toArray(),
          db.notifications.toArray(),
          db.permissions.toArray()
        ]);

        // FETCH USERS FROM API AND MERGE
        let finalUsers = usersData;
        try {
          const response = await fetch(`${API_BASE}/users`);
          if (response.ok) {
            const serverUsers = await response.json();
            if (serverUsers && serverUsers.length > 0) {
              const mergedUsers = [...usersData];
              for (const serverUser of serverUsers) {
                const existingIndex = mergedUsers.findIndex(
                  u => u.id === serverUser.id || u.employeeId === serverUser.employee_id
                );
                if (existingIndex >= 0) {
                  mergedUsers[existingIndex] = {
                    ...mergedUsers[existingIndex],
                    name: serverUser.name,
                    firstName: serverUser.firstName || serverUser.first_name,
                    middleName: serverUser.middleName || serverUser.middle_name,
                    lastName: serverUser.lastName || serverUser.last_name,
                    email: serverUser.email,
                    role: serverUser.role,
                    regionId: serverUser.regionId || serverUser.region_id,
                    zoneId: serverUser.zoneId || serverUser.zone_id,
                    woredaId: serverUser.woredaId || serverUser.woreda_id,
                    region: serverUser.region || serverUser.region_name,
                    zone: serverUser.zone || serverUser.zone_name,
                    woreda: serverUser.woreda || serverUser.woreda_name,
                    supervisorId: serverUser.supervisorId || serverUser.supervisor_id,
                    supervisorName: serverUser.supervisorName || serverUser.supervisor_name,
                    status: serverUser.status,
                    mustChangePassword: serverUser.mustChangePassword !== undefined ? serverUser.mustChangePassword : Boolean(serverUser.must_change_password),
                    lastLogin: serverUser.lastLogin || serverUser.last_login,
                    password: mergedUsers[existingIndex].password,
                  };
                } else {
                  const defaultPassword =
                    serverUser.role === 'manager' ? 'manager123' :
                    serverUser.role === 'supervisor' ? 'super123' : 'officer123';
                  mergedUsers.push({
                    id: serverUser.id,
                    employeeId: serverUser.employeeId || serverUser.employee_id,
                    name: serverUser.name,
                    firstName: serverUser.firstName || serverUser.first_name,
                    middleName: serverUser.middleName || serverUser.middle_name,
                    lastName: serverUser.lastName || serverUser.last_name,
                    email: serverUser.email,
                    password: serverUser.password_hash || defaultPassword,
                    role: serverUser.role,
                    regionId: serverUser.regionId || serverUser.region_id,
                    zoneId: serverUser.zoneId || serverUser.zone_id,
                    woredaId: serverUser.woredaId || serverUser.woreda_id,
                    region: serverUser.region || serverUser.region_name,
                    zone: serverUser.zone || serverUser.zone_name,
                    woreda: serverUser.woreda || serverUser.woreda_name,
                    supervisorId: serverUser.supervisorId || serverUser.supervisor_id,
                    supervisorName: serverUser.supervisorName || serverUser.supervisor_name,
                    status: serverUser.status,
                    mustChangePassword: serverUser.mustChangePassword !== undefined ? serverUser.mustChangePassword : Boolean(serverUser.must_change_password),
                    lastLogin: serverUser.lastLogin || serverUser.last_login,
                    phone: serverUser.phone || '',
                    shift: serverUser.shift || 'Day',
                    department: serverUser.department || '',
                    assignedSites: [],
                    managerId: 'm1',
                    gpsEnabled: true,
                    pin: serverUser.role === 'field_officer' ? '1234' : null
                  });
                }
              }
              finalUsers = mergedUsers;
              await db.users.clear();
              await db.users.bulkAdd(finalUsers);
            }
          }
        } catch (err) {
          console.log('📡 Using local users data (API offline or unreachable)');
        }

        setUsers(finalUsers);
        setReports(reportsData);
        setAttendance(attendanceData);
        setCitizens(citizensData);
        setAuditLog(auditData);
        setSupervisorReports(supervisorReportsData);
        setScreenTime(screenTimeData);
        setTasks(tasksData);
        setLeaves(leavesData);
        setAlerts(alertsData);
        setLiveStatus(liveStatusData);
        setAppNotifications(notificationsData);
        setPermissions(permissionsData);

        await clearStuckSyncItems();

        const queueItems = syncQueue.getAll();
        if (queueItems.length > 0) {
          setTimeout(() => runSync(), 2000);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsDataLoaded(true);
      }
    };

    loadAllData();
  }, [runSync]);

  // ============================================================
  // SERVER POLLING FOR SUPERVISORS / MANAGERS
  // ============================================================
  useEffect(() => {
    if (!user || (!isManager && !isSupervisor)) return;

    const pullData = async () => {
      try {
        await Promise.all([
          pullScreenTimeFromServer(),
          pullSupervisorReportsFromServer()
        ]);
        const updatedReports = await db.supervisor_reports.toArray();
        setSupervisorReports(updatedReports);

        if (isManager) {
          await Promise.all([
            pullAuditLogsFromServer(),
            pullAlertsFromServer(),
            pullVerificationFromServer()
          ]);
          const [updatedAudit, updatedAlerts] = await Promise.all([
            db.audit.toArray(),
            db.alerts.toArray()
          ]);
          setAuditLog(updatedAudit);
          setAlerts(updatedAlerts);
          window.dispatchEvent(new Event('verification-update'));
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    if (isOnline) pullData();

    const handleOnline = () => { if (navigator.onLine) pullData(); };
    const handleForceSync = () => { if (navigator.onLine) pullData(); };

    window.addEventListener('online', handleOnline);
    window.addEventListener('force-sync', handleForceSync);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('force-sync', handleForceSync);
    };
  }, [user, isOnline, isManager, isSupervisor]);

  // ============================================================
  // NETWORK STATUS MONITORING
  // ============================================================
  useEffect(() => {
    const checkNetwork = async () => {
      if (isDevToolsOffline()) {
        if (isOnline !== false) setIsOnline(false);
        return;
      }

      const online = await checkRealInternet();
      if (online !== isOnline) {
        setIsOnline(online);
        if (online) {
          setTimeout(() => runSync(), 1000);
        }
      }
    };

    checkNetwork();
    const interval = setInterval(checkNetwork, 2000);

    const handleForceSync = () => {
      if (isDevToolsOffline()) {
        alert('🔌 DevTools says you are offline! Please disable offline mode in DevTools.');
        return;
      }
      if (navigator.onLine) {
        runSync();
      } else {
        alert('📡 You are offline. Please connect to the internet.');
      }
    };
    window.addEventListener('force-sync', handleForceSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('force-sync', handleForceSync);
    };
  }, [isOnline, runSync]);

  // ============================================================
  // COMPUTED VALUES & FILTERS
  // ============================================================
  const teamMembers = useMemo(() => {
    if (isSupervisor && user) {
      return users.filter(u => u.supervisorId === user.id);
    }
    return [];
  }, [users, user, isSupervisor]);

  const filteredReports = useMemo(() => {
    if (isOfficer && user) {
      return reports.filter(r => r.employeeId === user.employeeId);
    }
    if (isSupervisor && user) {
      const teamIds = teamMembers.map(m => m.employeeId);
      return reports.filter(r => teamIds.includes(r.employeeId) || r.employeeId === user.employeeId);
    }
    return reports;
  }, [reports, isOfficer, isSupervisor, user, teamMembers]);

  const filteredAttendance = useMemo(() => {
    if (isOfficer && user) {
      return attendance.filter(a => a.employeeId === user.employeeId);
    }
    if (isSupervisor && user) {
      const teamIds = teamMembers.map(m => m.employeeId);
      return attendance.filter(a => teamIds.includes(a.employeeId));
    }
    return attendance;
  }, [attendance, isOfficer, isSupervisor, user, teamMembers]);

  const filteredScreenTime = useMemo(() => {
    if (isOfficer && user) {
      return screenTime.filter(s => s.employeeId === user.employeeId);
    }
    if (isSupervisor && user) {
      const teamIds = teamMembers.map(m => m.employeeId);
      return screenTime.filter(s => teamIds.includes(s.employeeId));
    }
    return screenTime;
  }, [screenTime, isOfficer, isSupervisor, user, teamMembers]);

  const filteredTasks = useMemo(() => {
    if (isOfficer && user) {
      return tasks.filter(t => t.employeeId === user.employeeId);
    }
    if (isSupervisor && user) {
      const teamIds = teamMembers.map(m => m.employeeId);
      return tasks.filter(t => teamIds.includes(t.employeeId));
    }
    return tasks;
  }, [tasks, isOfficer, isSupervisor, user, teamMembers]);

  const filteredLeaves = useMemo(() => {
    if (isOfficer && user) {
      return leaves.filter(l => l.employeeId === user.employeeId);
    }
    if (isSupervisor && user) {
      return leaves.filter(l => l.employeeId === user.employeeId);
    }
    return leaves;
  }, [leaves, isOfficer, isSupervisor, user]);

  const filteredPermissions = useMemo(() => {
    if (isOfficer && user) {
      return permissions.filter(p => p.employeeId === user.employeeId);
    }
    if (isSupervisor && user) {
      return permissions.filter(p => p.employeeId === user.employeeId);
    }
    return permissions;
  }, [permissions, isOfficer, isSupervisor, user]);

  const filteredAlerts = useMemo(() => {
    if (isOfficer && user) {
      return alerts.filter(a => a.targetAll || a.targetEmployeeId === user.employeeId);
    }
    if (isSupervisor && user) {
      const teamIds = teamMembers.map(m => m.employeeId);
      return alerts.filter(a => a.targetAll || a.targetEmployeeId === user.employeeId || teamIds.includes(a.targetEmployeeId));
    }
    return alerts;
  }, [alerts, isOfficer, isSupervisor, user, teamMembers]);

  const employeePerformance = useMemo(() => {
    const map = {};
    reports.forEach(r => {
      if (!map[r.employeeId]) {
        map[r.employeeId] = {
          employeeId: r.employeeId,
          employeeName: r.employeeName,
          region: r.region,
          totalReports: 0,
          totalRegistrations: citizens.filter(c => c.registeredBy === r.employeeId).length,
          avgEfficiency: 0,
          attendanceRate: 0,
          totalWorkHours: 0,
          lateDays: 0,
          absentDays: 0,
          trustScore: 0,
          productivityScore: 0,
          tasksCompleted: 0,
          tasksInProgress: 0
        };
      }
      map[r.employeeId].totalReports += 1;
    });

    attendance.forEach(a => {
      if (map[a.employeeId]) {
        const totalAtt = attendance.filter(att => att.employeeId === a.employeeId).length;
        const presentAtt = attendance.filter(att => att.employeeId === a.employeeId && att.status === 'present').length;
        map[a.employeeId].attendanceRate = totalAtt > 0 ? (presentAtt / totalAtt) * 100 : 0;
        map[a.employeeId].totalWorkHours += a.workHours || 0;
        if (a.status === 'late') map[a.employeeId].lateDays += 1;
        if (a.status === 'absent') map[a.employeeId].absentDays += 1;
      }
    });

    screenTime.forEach(s => {
      if (map[s.employeeId]) {
        map[s.employeeId].trustScore = (s.trustScore && !isNaN(s.trustScore)) ? s.trustScore : 0;
      }
    });

    liveStatus.forEach(l => {
      if (map[l.employeeId]) {
        map[l.employeeId].productivityScore = l.productivityScore || 0;
        map[l.employeeId].tasksCompleted = l.tasksCompleted || 0;
        map[l.employeeId].tasksInProgress = l.tasksInProgress || 0;
      }
    });

    Object.values(map).forEach(emp => {
      emp.avgEfficiency = emp.totalReports > 0 ? Math.round((emp.totalRegistrations / (emp.totalReports * 100)) * 100) : 0;
    });

    return Object.values(map);
  }, [reports, attendance, screenTime, liveStatus, citizens]);

  const totalReports = reports.length;
  const totalRegistrations = citizens.length;
  const totalCitizens = citizens.length;
  const pendingSync = reports.filter(r => !r.synced).length + syncQueue.count();

  const regionStats = useMemo(() => {
    const map = {};
    reports.forEach(r => {
      if (!map[r.region]) map[r.region] = { reports: 0, registrations: 0, employees: new Set() };
      map[r.region].reports += 1;
      map[r.region].registrations += citizens.filter(c => c.region === r.region).length;
      map[r.region].employees.add(r.employeeId);
    });
    return Object.entries(map).map(([region, data]) => ({
      region,
      ...data,
      employees: data.employees.size
    }));
  }, [reports, citizens]);

  const attendanceSummary = useMemo(() => {
    const today = getToday();
    const todayAttendance = attendance.filter(a => a.date === today);
    const total = todayAttendance.length;
    const present = todayAttendance.filter(a => a.status === 'present').length;
    const late = todayAttendance.filter(a => a.status === 'late').length;
    const absent = todayAttendance.filter(a => a.status === 'absent').length;
    const halfDay = todayAttendance.filter(a => a.status === 'half_day').length;
    const pending = todayAttendance.filter(a => a.status === 'pending').length;
    return { total, present, late, absent, halfDay, pending, rate: total > 0 ? Math.round((present / total) * 100) : 0 };
  }, [attendance]);

  const topPerformers = useMemo(() => {
    return [...employeePerformance].sort((a, b) => b.totalRegistrations - a.totalRegistrations).slice(0, 5);
  }, [employeePerformance]);

  const teamPerformance = useMemo(() => {
    if (!isSupervisor || !user) return [];
    const teamIds = teamMembers.map(m => m.employeeId);
    return employeePerformance.filter(p => teamIds.includes(p.employeeId));
  }, [employeePerformance, teamMembers, isSupervisor, user]);

  const pendingPermissions = useMemo(() => permissions.filter(p => p.status === 'pending').length, [permissions]);
  const pendingLeaves = useMemo(() => leaves.filter(l => l.status === 'pending').length, [leaves]);

  const getSupervisorReports = useCallback(() => {
    if (!isSupervisor || !user) return reports;
    const teamIds = teamMembers.map(m => m.employeeId);
    return reports.filter(r => teamIds.includes(r.employeeId) || r.employeeId === user.employeeId);
  }, [reports, isSupervisor, user, teamMembers]);

  const getSupervisorLeaves = useCallback(() => {
    if (!isSupervisor || !user) return leaves;
    return leaves.filter(l => l.employeeId === user.employeeId);
  }, [leaves, isSupervisor, user]);

  const getSupervisorPermissions = useCallback(() => {
    if (!isSupervisor || !user) return permissions;
    return permissions.filter(p => p.employeeId === user.employeeId);
  }, [permissions, isSupervisor, user]);

  const getSupervisorAttendance = useCallback(() => {
    if (!isSupervisor || !user) return attendance;
    const teamIds = teamMembers.map(m => m.employeeId);
    return attendance.filter(a => teamIds.includes(a.employeeId));
  }, [attendance, isSupervisor, user, teamMembers]);

  const getSupervisorTasks = useCallback(() => {
    if (!isSupervisor || !user) return tasks;
    const teamIds = teamMembers.map(m => m.employeeId);
    return tasks.filter(t => teamIds.includes(t.employeeId));
  }, [tasks, isSupervisor, user, teamMembers]);

  return {
    // Entities & setters
    reports, setReports,
    users, setUsers,
    attendance, setAttendance,
    citizens, setCitizens,
    auditLog, setAuditLog,
    supervisorReports, setSupervisorReports,
    screenTime, setScreenTime,
    tasks, setTasks,
    leaves, setLeaves,
    alerts, setAlerts,
    liveStatus, setLiveStatus,
    appNotifications, setAppNotifications,
    permissions, setPermissions,

    // Status
    isOnline, setIsOnline,
    syncing, setSyncing,
    syncLog, setSyncLog,
    isDataLoaded,
    pendingSync,

    // Helpers
    runSync,
    addAuditLog,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,

    // Computed
    teamMembers,
    filteredReports,
    filteredAttendance,
    filteredScreenTime,
    filteredTasks,
    filteredLeaves,
    filteredPermissions,
    filteredAlerts,
    employeePerformance,
    totalReports,
    totalRegistrations,
    totalCitizens,
    regionStats,
    attendanceSummary,
    topPerformers,
    teamPerformance,
    pendingPermissions,
    pendingLeaves,
    getSupervisorReports,
    getSupervisorLeaves,
    getSupervisorPermissions,
    getSupervisorAttendance,
    getSupervisorTasks
  };
}
