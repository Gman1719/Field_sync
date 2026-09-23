import { useState, useEffect, useRef, useCallback } from 'react';
import { db, checkRealInternet, syncQueue } from '../services/database';
import { getToday, getCurrentTime, formatTime } from '../utils/helpers';
import { API_BASE as API_BASE_URL } from '../config/api';

// Helper to send screen time record to server
const sendScreenTimeToServer = async (record) => {
  const response = await fetch(`${API_BASE_URL}/screen-time`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }
  return response.json();
};

export function useScreenTime(user) {
  const [screenTimeCounter, setScreenTimeCounter] = useState(0);
  const [screenTimeDisplay, setScreenTimeDisplay] = useState('00:00:00');
  const [isScreenTimeRunning, setIsScreenTimeRunning] = useState(false);
  const [screenTimeSessionId, setScreenTimeSessionId] = useState(null);
  const [isTabActive, setIsTabActive] = useState(true); // NEW: true when tab visible + window focused

  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const isActiveRef = useRef(true);   // NEW: mirrors isTabActive, read inside the interval
  const activeSecondsRef = useRef(0); // NEW: accumulates only ACTIVE seconds
  const idleSecondsRef = useRef(0);   // NEW: accumulates INACTIVE seconds

  // NEW: Watch tab visibility + window focus, pause/resume counting
  useEffect(() => {
    const updateActivity = () => {
      const active = document.visibilityState === 'visible' && document.hasFocus();
      isActiveRef.current = active;
      setIsTabActive(active);
    };

    document.addEventListener('visibilitychange', updateActivity);
    window.addEventListener('focus', updateActivity);
    window.addEventListener('blur', updateActivity);

    updateActivity();

    return () => {
      document.removeEventListener('visibilitychange', updateActivity);
      window.removeEventListener('focus', updateActivity);
      window.removeEventListener('blur', updateActivity);
    };
  }, []);

  // AUTO-START when user logs in (for officers only)
  useEffect(() => {
    if (user && user.role === 'field_officer' && !isScreenTimeRunning) {
      startScreenTime();
    }
    return () => {
      if (isScreenTimeRunning) {
        stopScreenTime();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const startScreenTime = useCallback(async () => {
    if (!user || isScreenTimeRunning || user.role !== 'field_officer') return;

    const today = getToday();
    const currentTime = getCurrentTime();
    const online = await checkRealInternet();

    // 1. Check for any existing active session (should be closed, but just in case)
    const existingSession = await db.screen_time
      .where('employeeId')
      .equals(user.employeeId)
      .and(s => s.date === today && s.isLoggedIn === true)
      .first();

    if (existingSession) {
      console.log('⚠️ Found active session, closing it before starting fresh');
      await db.screen_time.update(existingSession.id, {
        logoutTime: getCurrentTime(),
        sessionEnd: new Date().toISOString(),
        isLoggedIn: false,
        synced: false
      });
      const updatedRecord = await db.screen_time.get(existingSession.id);
      if (updatedRecord) {
        syncQueue.add({ type: 'screen_time', id: updatedRecord.id, data: updatedRecord });
      }
    }

    // 2. Create a brand new session with zero totals
    const sessionId = `session_${Date.now()}`;
    setScreenTimeSessionId(sessionId);

    const record = {
      id: sessionId,
      employeeId: user.employeeId,
      employeeName: user.name,
      date: today,
      loginTime: currentTime,
      logoutTime: null,
      activeHours: 0,
      idleTime: 0,
      screenTime: 0,
      trustScore: 70,
      supervisorId: user.supervisorId,
      verified: false,
      notes: '',
      verifiedBy: null,
      screenTimeLimit: 8,
      screenTimeWarnings: 0,
      screenTimeExceeded: false,
      isLoggedIn: true,
      sessionStart: new Date().toISOString(),
      sessionEnd: null,
      totalScreenTime: 0,
      synced: online ? true : false,
    };

    await db.screen_time.add(record);

    await db.status.where('employeeId').equals(user.employeeId).modify({
      status: 'online',
      lastActive: new Date().toISOString()
    });

    if (online) {
      try {
        await sendScreenTimeToServer(record);
        await db.screen_time.update(sessionId, { synced: true });
        console.log('✅ Screen time start synced to server');
      } catch (error) {
        console.error('Failed to sync screen time start:', error);
        await db.screen_time.update(sessionId, { synced: false });
        syncQueue.add({ type: 'screen_time', id: sessionId, data: record });
      }
    } else {
      syncQueue.add({ type: 'screen_time', id: sessionId, data: record });
    }

    // Reset counters
    activeSecondsRef.current = 0;
    idleSecondsRef.current = 0;
    setScreenTimeCounter(0);
    setScreenTimeDisplay('00:00:00');
    setIsScreenTimeRunning(true);
    startTimeRef.current = Date.now();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // CHANGED: only increments the counter when the tab is actually active
    intervalRef.current = setInterval(() => {
      if (isActiveRef.current) {
        activeSecondsRef.current += 1;
        setScreenTimeCounter(activeSecondsRef.current);
        setScreenTimeDisplay(formatTime(activeSecondsRef.current));
        updateScreenTime(activeSecondsRef.current, idleSecondsRef.current);
      } else {
        idleSecondsRef.current += 1;
      }
    }, 1000);
  }, [user, isScreenTimeRunning]);

  // Periodic update of total time in IndexedDB (local only)
  const updateScreenTime = async (activeElapsed, idleElapsed) => {
    if (activeElapsed % 5 === 0 && activeElapsed > 0 && screenTimeSessionId) {
      const hours = activeElapsed / 3600;
      await db.screen_time.update(screenTimeSessionId, {
        screenTime: Math.round(hours * 10) / 10,
        totalScreenTime: activeElapsed,
        activeHours: Math.round(hours * 10) / 10,
        idleTime: idleElapsed,
      });
    }
  };

  const stopScreenTime = useCallback(async () => {
    if (!user || !isScreenTimeRunning) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const totalSeconds = activeSecondsRef.current; // CHANGED: use active seconds, not wall clock
    const totalHours = totalSeconds / 3600;
    const currentTime = getCurrentTime();
    const online = await checkRealInternet();

    const finalUpdate = {
      logoutTime: currentTime,
      sessionEnd: new Date().toISOString(),
      isLoggedIn: false,
      screenTime: Math.round(totalHours * 10) / 10,
      activeHours: Math.round(totalHours * 10) / 10,
      totalScreenTime: totalSeconds,
      idleTime: idleSecondsRef.current,
      screenTimeExceeded: totalHours > 8,
      verified: true,
      verifiedBy: 'system',
      synced: online ? true : false,
    };

    if (screenTimeSessionId) {
      await db.screen_time.update(screenTimeSessionId, finalUpdate);
    }

    await db.status.where('employeeId').equals(user.employeeId).modify({
      status: 'offline',
      lastActive: new Date().toISOString()
    });

    const fullRecord = await db.screen_time.get(screenTimeSessionId);
    if (!fullRecord) {
      console.warn('No full record found, skipping sync');
      setIsScreenTimeRunning(false);
      startTimeRef.current = null;
      setScreenTimeSessionId(null);
      setScreenTimeCounter(0);
      setScreenTimeDisplay('00:00:00');
      return;
    }

    if (online) {
      try {
        await sendScreenTimeToServer(fullRecord);
        await db.screen_time.update(screenTimeSessionId, { synced: true });
        console.log('✅ Screen time final record synced to server');
      } catch (error) {
        console.error('Failed to sync screen time stop:', error);
        await db.screen_time.update(screenTimeSessionId, { synced: false });
        syncQueue.add({ type: 'screen_time', id: screenTimeSessionId, data: fullRecord });
        console.log('📦 Screen time final record queued for offline sync');
      }
    } else {
      syncQueue.add({ type: 'screen_time', id: screenTimeSessionId, data: fullRecord });
      console.log('📦 Screen time final record queued (offline)');
    }

    setIsScreenTimeRunning(false);
    startTimeRef.current = null;
    setScreenTimeSessionId(null);
    setScreenTimeCounter(0);
    setScreenTimeDisplay('00:00:00');
  }, [user, isScreenTimeRunning, screenTimeSessionId]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return {
    screenTimeDisplay,
    isScreenTimeRunning,
    screenTimeCounter,
    isTabActive, // NEW: use this in the header to show "Paused" when true is false
    startScreenTime,
    stopScreenTime,
  };
}