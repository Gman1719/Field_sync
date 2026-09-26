import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { uid, getToday } from '../utils/helpers';

export interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

export interface CheckInRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  type: 'check_in' | 'check_out';
  location?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  date: string;
  synced: boolean;
  checkInId?: string;
}

export interface LocationRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  date: string;
  synced: boolean;
}

export const useGPS = (
  user: any,
  gpsLocations: LocationRecord[],
  setGpsLocations: React.Dispatch<React.SetStateAction<LocationRecord[]>>,
  checkIns: CheckInRecord[],
  setCheckIns: React.Dispatch<React.SetStateAction<CheckInRecord[]>>
) => {
  const [currentPosition, setCurrentPosition] = useState<GPSPosition | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackHistory, setTrackHistory] = useState<GPSPosition[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getCurrentPosition = useCallback((): Promise<GPSPosition | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setError('Geolocation not supported');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos: GPSPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
          };
          setCurrentPosition(pos);
          resolve(pos);
        },
        (err) => {
          setError(err.message);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const pos: GPSPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        };

        setCurrentPosition(pos);
        setTrackHistory((prev) => [...prev, pos]);

        if (user) {
          const locationRecord: LocationRecord = {
            id: uid(),
            employeeId: user.employeeId,
            employeeName: user.name,
            latitude: pos.latitude,
            longitude: pos.longitude,
            accuracy: pos.accuracy,
            timestamp: pos.timestamp,
            date: getToday(),
            synced: navigator.onLine,
          };

          try {
            await db.gps_locations.add(locationRecord);
            setGpsLocations((prev) => [locationRecord, ...prev]);
          } catch (err) {
            console.error('Error saving GPS location:', err);
          }
        }
      },
      (err) => {
        setError(err.message);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
    );

    setWatchId(id);
    setIsTracking(true);
    getCurrentPosition();
  }, [user, getCurrentPosition, setGpsLocations, watchId]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  }, [watchId]);

  const checkIn = useCallback(
    async (location = 'Work Site') => {
      if (!user) return { success: false, error: 'No user logged in' };

      try {
        const pos = await getCurrentPosition();
        if (!pos) {
          return { success: false, error: 'Could not get location' };
        }

        const checkInRecord: CheckInRecord = {
          id: uid(),
          employeeId: user.employeeId,
          employeeName: user.name,
          type: 'check_in',
          location: location,
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy,
          timestamp: new Date().toISOString(),
          date: getToday(),
          synced: navigator.onLine,
        };

        await db.check_ins.add(checkInRecord);
        setCheckIns((prev) => [checkInRecord, ...prev]);

        const existingStatus = await db.status.where('employeeId').equals(user.employeeId).first();
        if (existingStatus) {
          await db.status.update(existingStatus.id, {
            ...existingStatus,
            isCheckedIn: true,
            lastCheckIn: checkInRecord.timestamp,
            currentLocation: location,
            latitude: pos.latitude,
            longitude: pos.longitude,
          });
        } else {
          await db.status.add({
            id: uid(),
            employeeId: user.employeeId,
            employeeName: user.name,
            isCheckedIn: true,
            lastCheckIn: checkInRecord.timestamp,
            currentLocation: location,
            latitude: pos.latitude,
            longitude: pos.longitude,
            status: 'active',
          });
        }

        return {
          success: true,
          location,
          coords: { lat: pos.latitude, lng: pos.longitude },
          checkIn: checkInRecord,
        };
      } catch (err: any) {
        console.error('Check in error:', err);
        return { success: false, error: err.message };
      }
    },
    [user, getCurrentPosition, setCheckIns]
  );

  const checkOut = useCallback(
    async (location = 'Work Site') => {
      if (!user) return { success: false, error: 'No user logged in' };

      try {
        const pos = await getCurrentPosition();
        if (!pos) {
          return { success: false, error: 'Could not get location' };
        }

        const today = getToday();
        const todayCheckIns = checkIns.filter(
          (c) => c.employeeId === user.employeeId && c.date === today && c.type === 'check_in'
        );

        if (todayCheckIns.length === 0) {
          return { success: false, error: 'No active check-in found' };
        }

        const latestCheckIn = todayCheckIns[todayCheckIns.length - 1];

        const checkOutRecord: CheckInRecord = {
          id: uid(),
          employeeId: user.employeeId,
          employeeName: user.name,
          type: 'check_out',
          checkInId: latestCheckIn.id,
          location,
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy,
          timestamp: new Date().toISOString(),
          date: today,
          synced: navigator.onLine,
        };

        await db.check_ins.add(checkOutRecord);
        setCheckIns((prev) => [checkOutRecord, ...prev]);

        const existingStatus = await db.status.where('employeeId').equals(user.employeeId).first();
        if (existingStatus) {
          await db.status.update(existingStatus.id, {
            ...existingStatus,
            isCheckedIn: false,
            lastCheckOut: checkOutRecord.timestamp,
            currentLocation: location,
          });
        }

        return {
          success: true,
          location,
          coords: { lat: pos.latitude, lng: pos.longitude },
          checkOut: checkOutRecord,
        };
      } catch (err: any) {
        console.error('Check out error:', err);
        return { success: false, error: err.message };
      }
    },
    [user, getCurrentPosition, checkIns, setCheckIns]
  );

  const isCheckedIn = useCallback((): boolean => {
    if (!user) return false;
    const today = getToday();
    const todayCheckIns = checkIns.filter(
      (c) => c.employeeId === user.employeeId && c.date === today && c.type === 'check_in'
    );
    if (todayCheckIns.length === 0) return false;
    const latestCheckIn = todayCheckIns[todayCheckIns.length - 1];
    const hasCheckOut = checkIns.some(
      (c) =>
        c.employeeId === user.employeeId &&
        c.date === today &&
        c.type === 'check_out' &&
        c.checkInId === latestCheckIn.id
    );
    return !hasCheckOut;
  }, [user, checkIns]);

  const currentCheckIn = useCallback((): CheckInRecord | null => {
    if (!user) return null;
    const today = getToday();
    const todayCheckIns = checkIns.filter(
      (c) => c.employeeId === user.employeeId && c.date === today && c.type === 'check_in'
    );
    if (todayCheckIns.length === 0) return null;
    const latestCheckIn = todayCheckIns[todayCheckIns.length - 1];
    const hasCheckOut = checkIns.some(
      (c) =>
        c.employeeId === user.employeeId &&
        c.date === today &&
        c.type === 'check_out' &&
        c.checkInId === latestCheckIn.id
    );
    return hasCheckOut ? null : latestCheckIn;
  }, [user, checkIns]);

  const getDailyHistory = useCallback(
    (date: string | null = null) => {
      const targetDate = date || getToday();
      if (!user) return [];
      return gpsLocations
        .filter((l) => l.employeeId === user.employeeId && l.date === targetDate)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    },
    [user, gpsLocations]
  );

  const getLocationHistory = useCallback(
    (employeeId: string, days = 7) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString();

      return gpsLocations
        .filter((l) => l.employeeId === employeeId && l.timestamp >= cutoffStr)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    },
    [gpsLocations]
  );

  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const getNearbyOfficers = useCallback(
    (users: any[], locations: LocationRecord[], radius = 5) => {
      if (!currentPosition) return [];

      const nearby: any[] = [];
      const activeUsers = users.filter((u) => u.role === 'field_officer' && u.id !== user?.id);

      for (const officer of activeUsers) {
        const latestLocation = locations
          .filter((l) => l.employeeId === officer.employeeId)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

        if (latestLocation) {
          const distance = calculateDistance(
            currentPosition.latitude,
            currentPosition.longitude,
            latestLocation.latitude,
            latestLocation.longitude
          );

          if (distance <= radius) {
            const isOfficerCheckedIn = checkIns.some(
              (c) =>
                c.employeeId === officer.employeeId &&
                c.date === getToday() &&
                c.type === 'check_in' &&
                !checkIns.some(
                  (co) =>
                    co.employeeId === officer.employeeId &&
                    co.date === getToday() &&
                    co.type === 'check_out' &&
                    co.checkInId === c.id
                )
            );

            nearby.push({
              ...officer,
              distance: Math.round(distance * 10) / 10,
              isCheckedIn: isOfficerCheckedIn,
              lastLocation: latestLocation,
            });
          }
        }
      }

      return nearby.sort((a, b) => a.distance - b.distance);
    },
    [currentPosition, user, checkIns, calculateDistance]
  );

  const clearHistory = useCallback(() => {
    setTrackHistory([]);
  }, []);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    currentPosition,
    watchId,
    isTracking,
    trackHistory,
    error,
    startTracking,
    stopTracking,
    getCurrentPosition,
    checkIn,
    checkOut,
    isCheckedIn: isCheckedIn(),
    currentCheckIn: currentCheckIn(),
    getDailyHistory,
    getLocationHistory,
    calculateDistance,
    getNearbyOfficers,
    clearHistory,
  };
};

export default useGPS;
