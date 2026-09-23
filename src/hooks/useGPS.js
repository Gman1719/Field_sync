import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { uid, getToday } from '../utils/helpers';

export const useGPS = (user, gpsLocations, setGpsLocations, checkIns, setCheckIns) => {
  const [currentPosition, setCurrentPosition] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackHistory, setTrackHistory] = useState([]);
  const [error, setError] = useState(null);

  // Get current position
  const getCurrentPosition = useCallback(() => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setError('Geolocation not supported');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
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

  // Start tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
    }

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const pos = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        };
        
        setCurrentPosition(pos);
        setTrackHistory(prev => [...prev, pos]);

        // Save to database
        if (user) {
          const locationRecord = {
            id: uid(),
            employeeId: user.employeeId,
            employeeName: user.name,
            latitude: pos.latitude,
            longitude: pos.longitude,
            accuracy: pos.accuracy,
            timestamp: pos.timestamp,
            date: getToday(),
            synced: navigator.onLine
          };

          try {
            await db.gps_locations.add(locationRecord);
            setGpsLocations(prev => [locationRecord, ...prev]);
          } catch (error) {
            console.error('Error saving GPS location:', error);
          }
        }
      },
      (err) => {
        setError(err.message);
        console.error('GPS watch error:', err);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
    );

    setWatchId(id);
    setIsTracking(true);
    getCurrentPosition();
  }, [user, getCurrentPosition, setGpsLocations]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  }, [watchId]);

  // Check in
  const checkIn = useCallback(async (location = 'Work Site') => {
    if (!user) return { success: false, error: 'No user logged in' };

    try {
      const pos = await getCurrentPosition();
      if (!pos) {
        return { success: false, error: 'Could not get location' };
      }

      const checkInRecord = {
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
        synced: navigator.onLine
      };

      await db.check_ins.add(checkInRecord);
      setCheckIns(prev => [checkInRecord, ...prev]);

      // Update live status
      const existingStatus = await db.status.where('employeeId').equals(user.employeeId).first();
      if (existingStatus) {
        await db.status.update(existingStatus.id, {
          ...existingStatus,
          isCheckedIn: true,
          lastCheckIn: checkInRecord.timestamp,
          currentLocation: location,
          latitude: pos.latitude,
          longitude: pos.longitude
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
          status: 'active'
        });
      }

      return { 
        success: true, 
        location: location, 
        coords: { lat: pos.latitude, lng: pos.longitude },
        checkIn: checkInRecord
      };
    } catch (error) {
      console.error('Check in error:', error);
      return { success: false, error: error.message };
    }
  }, [user, getCurrentPosition, setCheckIns]);

  // Check out
  const checkOut = useCallback(async (location = 'Work Site') => {
    if (!user) return { success: false, error: 'No user logged in' };

    try {
      const pos = await getCurrentPosition();
      if (!pos) {
        return { success: false, error: 'Could not get location' };
      }

      // Find current check-in
      const today = getToday();
      const todayCheckIns = checkIns.filter(c => 
        c.employeeId === user.employeeId && 
        c.date === today &&
        c.type === 'check_in'
      );

      if (todayCheckIns.length === 0) {
        return { success: false, error: 'No active check-in found' };
      }

      const latestCheckIn = todayCheckIns[todayCheckIns.length - 1];

      const checkOutRecord = {
        id: uid(),
        employeeId: user.employeeId,
        employeeName: user.name,
        type: 'check_out',
        checkInId: latestCheckIn.id,
        location: location,
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
        timestamp: new Date().toISOString(),
        date: today,
        synced: navigator.onLine
      };

      await db.check_ins.add(checkOutRecord);
      setCheckIns(prev => [checkOutRecord, ...prev]);

      // Update live status
      const existingStatus = await db.status.where('employeeId').equals(user.employeeId).first();
      if (existingStatus) {
        await db.status.update(existingStatus.id, {
          ...existingStatus,
          isCheckedIn: false,
          lastCheckOut: checkOutRecord.timestamp,
          currentLocation: location
        });
      }

      return { 
        success: true, 
        location: location, 
        coords: { lat: pos.latitude, lng: pos.longitude },
        checkOut: checkOutRecord
      };
    } catch (error) {
      console.error('Check out error:', error);
      return { success: false, error: error.message };
    }
  }, [user, getCurrentPosition, checkIns, setCheckIns]);

  // Check if user is checked in
  const isCheckedIn = useCallback(() => {
    if (!user) return false;
    const today = getToday();
    const todayCheckIns = checkIns.filter(c => 
      c.employeeId === user.employeeId && 
      c.date === today &&
      c.type === 'check_in'
    );
    if (todayCheckIns.length === 0) return false;
    const latestCheckIn = todayCheckIns[todayCheckIns.length - 1];
    const hasCheckOut = checkIns.some(c => 
      c.employeeId === user.employeeId &&
      c.date === today &&
      c.type === 'check_out' &&
      c.checkInId === latestCheckIn.id
    );
    return !hasCheckOut;
  }, [user, checkIns]);

  // Get current check-in
  const currentCheckIn = useCallback(() => {
    if (!user) return null;
    const today = getToday();
    const todayCheckIns = checkIns.filter(c => 
      c.employeeId === user.employeeId && 
      c.date === today &&
      c.type === 'check_in'
    );
    if (todayCheckIns.length === 0) return null;
    const latestCheckIn = todayCheckIns[todayCheckIns.length - 1];
    const hasCheckOut = checkIns.some(c => 
      c.employeeId === user.employeeId &&
      c.date === today &&
      c.type === 'check_out' &&
      c.checkInId === latestCheckIn.id
    );
    return hasCheckOut ? null : latestCheckIn;
  }, [user, checkIns]);

  // Get daily history
  const getDailyHistory = useCallback((date = null) => {
    const targetDate = date || getToday();
    if (!user) return [];
    return gpsLocations
      .filter(l => l.employeeId === user.employeeId && l.date === targetDate)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [user, gpsLocations]);

  // Get location history for a user
  const getLocationHistory = useCallback((employeeId, days = 7) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString();
    
    return gpsLocations
      .filter(l => l.employeeId === employeeId && l.timestamp >= cutoffStr)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [gpsLocations]);

  // Calculate distance between two points
  const calculateDistance = useCallback((lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Get nearby officers
  const getNearbyOfficers = useCallback((users, locations, radius = 5) => {
    if (!currentPosition) return [];
    
    const nearby = [];
    const activeUsers = users.filter(u => u.role === 'field_officer' && u.id !== user?.id);
    
    for (const officer of activeUsers) {
      const latestLocation = locations
        .filter(l => l.employeeId === officer.employeeId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
      
      if (latestLocation) {
        const distance = calculateDistance(
          currentPosition.latitude,
          currentPosition.longitude,
          latestLocation.latitude,
          latestLocation.longitude
        );
        
        if (distance <= radius) {
          const isCheckedIn = checkIns.some(c => 
            c.employeeId === officer.employeeId &&
            c.date === getToday() &&
            c.type === 'check_in' &&
            !checkIns.some(co => 
              co.employeeId === officer.employeeId &&
              co.date === getToday() &&
              co.type === 'check_out' &&
              co.checkInId === c.id
            )
          );
          
          nearby.push({
            ...officer,
            distance: Math.round(distance * 10) / 10,
            isCheckedIn,
            lastLocation: latestLocation
          });
        }
      }
    }
    
    return nearby.sort((a, b) => a.distance - b.distance);
  }, [currentPosition, user, checkIns, calculateDistance]);

  // Clear history
  const clearHistory = useCallback(() => {
    setTrackHistory([]);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchId) {
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
    clearHistory
  };
};