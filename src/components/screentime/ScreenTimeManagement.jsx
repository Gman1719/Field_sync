// src/components/screentime/ScreenTimeManagement.jsx – Enterprise Screen Time & Activity Tracking

import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Clock, Smartphone, CheckCircle2, AlertTriangle,
  User, Calendar, Filter, ShieldCheck, Activity
} from 'lucide-react';
import { formatTime } from '../../utils/helpers';
import { db, checkRealInternet, syncQueue } from '../../services/database';
import { API_BASE as API_BASE_URL } from '../../config/api';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import StatCard from '../ui/StatCard';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';

export default function ScreenTimeManagement({
  screenTime = [],
  user,
  isManager,
  isSupervisor,
  isOfficer,
  teamMembers = [],
  addNotification,
  setScreenTime
}) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const checkNetwork = async () => {
      const online = await checkRealInternet();
      setIsOnline(online);
      setPendingCount(syncQueue.count());
    };

    checkNetwork();
    const interval = setInterval(checkNetwork, 5000);

    const handleQueueUpdate = () => {
      setPendingCount(syncQueue.count());
    };

    window.addEventListener('sync-queue-updated', handleQueueUpdate);
    window.addEventListener('sync-complete', handleQueueUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('sync-queue-updated', handleQueueUpdate);
      window.removeEventListener('sync-complete', handleQueueUpdate);
    };
  }, []);

  const convertTo12Hour = (time24) => {
    if (!time24) return '--';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const sendScreenTimeUpdateToServer = async (id, limit, verifiedBy) => {
    const response = await fetch(`${API_BASE_URL}/screen-time/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        screenTimeLimit: limit * 3600,
        verified: true,
        verifiedBy: verifiedBy
      })
    });
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    return await response.json();
  };

  const filteredScreenTime = useMemo(() => {
    let filtered = [...screenTime];

    if (selectedDate) {
      filtered = filtered.filter(s => s.date === selectedDate);
    }

    if (isOfficer && user) {
      filtered = filtered.filter(s => s.employeeId === user.employeeId);
    } else if (isSupervisor && user) {
      const teamIds = teamMembers.map(m => m.employeeId);
      filtered = filtered.filter(s => teamIds.includes(s.employeeId) || s.employeeId === user.employeeId);
    } else if (isManager) {
      if (selectedEmployee !== 'all') {
        filtered = filtered.filter(s => s.employeeId === selectedEmployee);
      }
    }

    if (selectedStatus === 'exceeded') {
      filtered = filtered.filter(s => (s.totalScreenTime || 0) > (s.screenTimeLimit || 8 * 3600));
    } else if (selectedStatus === 'normal') {
      filtered = filtered.filter(s => (s.totalScreenTime || 0) <= (s.screenTimeLimit || 8 * 3600));
    }

    return filtered;
  }, [screenTime, selectedDate, isOfficer, isSupervisor, isManager, user, teamMembers, selectedEmployee, selectedStatus]);

  const uniqueEmployees = useMemo(() => {
    const map = new Map();
    screenTime.forEach(s => {
      if (s.employeeId && !map.has(s.employeeId)) {
        map.set(s.employeeId, s.employeeName);
      }
    });
    return Array.from(map.entries());
  }, [screenTime]);

  const totalSeconds = useMemo(() => {
    return filteredScreenTime.reduce((acc, curr) => acc + (curr.totalScreenTime || 0), 0);
  }, [filteredScreenTime]);

  const exceededCount = useMemo(() => {
    return filteredScreenTime.filter(s => (s.totalScreenTime || 0) > (s.screenTimeLimit || 8 * 3600)).length;
  }, [filteredScreenTime]);

  const avgSeconds = filteredScreenTime.length > 0 ? Math.round(totalSeconds / filteredScreenTime.length) : 0;

  const handleUpdateLimit = async (recordId, currentLimit) => {
    const newLimitHours = window.prompt('Set new screen time limit in hours (e.g. 8, 10, 12):', currentLimit ? (currentLimit / 3600).toString() : '8');
    if (!newLimitHours || isNaN(parseFloat(newLimitHours))) return;

    const limitHours = parseFloat(newLimitHours);
    const limitSeconds = limitHours * 3600;

    try {
      await db.screenTime.update(recordId, {
        screenTimeLimit: limitSeconds,
        verified: true,
        verifiedBy: user.employeeId
      });

      if (setScreenTime) {
        setScreenTime(prev => prev.map(s => s.id === recordId ? { ...s, screenTimeLimit: limitSeconds, verified: true } : s));
      }

      if (isOnline) {
        try {
          await sendScreenTimeUpdateToServer(recordId, limitHours, user.employeeId);
          toast.success('Screen time limit updated!');
        } catch (serverErr) {
          syncQueue.add({ type: 'screen_time_update', id: recordId, data: { limit: limitSeconds } });
          toast('Updated locally. Queued for sync.', { icon: '💾' });
        }
      } else {
        syncQueue.add({ type: 'screen_time_update', id: recordId, data: { limit: limitSeconds } });
        toast('Updated offline! Will sync when connected.', { icon: '💾' });
      }
    } catch (err) {
      toast.error('Failed to update limit: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-[#1E3A8A]" />
            Screen Time & Activity
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor active device usage, shift duration, and operational health
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto h-9 text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
            className="h-9"
          >
            Today
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Active Officers"
          value={filteredScreenTime.length}
          subtitle={`On ${selectedDate}`}
          icon={User}
          iconColor="text-blue-700"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Total Device Time"
          value={formatTime(totalSeconds)}
          subtitle="Cumulative field session"
          icon={Clock}
          iconColor="text-indigo-700"
          iconBg="bg-indigo-50"
        />
        <StatCard
          title="Average Usage"
          value={formatTime(avgSeconds)}
          subtitle="Per field officer"
          icon={Activity}
          iconColor="text-teal-700"
          iconBg="bg-teal-50"
        />
        <StatCard
          title="Over Limit"
          value={exceededCount}
          subtitle="Exceeded 8 hr benchmark"
          icon={AlertTriangle}
          iconColor="text-rose-700"
          iconBg="bg-rose-50"
        />
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isManager && (
              <Select
                label="Filter by Officer"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="all">All Field Officers</option>
                {uniqueEmployees.map(([empId, empName]) => (
                  <option key={empId} value={empId}>{empName} ({empId})</option>
                ))}
              </Select>
            )}

            <Select
              label="Usage Status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Usage Levels</option>
              <option value="normal">Normal (Within Limit)</option>
              <option value="exceeded">Exceeded Recommended Limit</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Usage Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-sm">Session Logs ({filteredScreenTime.length})</CardTitle>
            <CardDescription>Tracked foreground active app duration and shift limits</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredScreenTime.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <Smartphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <span>No screen time records found for this date and filter</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3.5 pl-6">Officer</th>
                    <th className="py-3.5 px-4">Active Time</th>
                    <th className="py-3.5 px-4">Usage vs Limit</th>
                    <th className="py-3.5 px-4">First Session</th>
                    <th className="py-3.5 px-4">Last Active</th>
                    <th className="py-3.5 px-4">Status</th>
                    {(isManager || isSupervisor) && <th className="py-3.5 pr-6 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredScreenTime.map(item => {
                    const limitSec = item.screenTimeLimit || 8 * 3600;
                    const usedSec = item.totalScreenTime || 0;
                    const percent = Math.min(100, Math.round((usedSec / limitSec) * 100));
                    const isOver = usedSec > limitSec;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 pl-6">
                          <p className="font-semibold text-slate-900">{item.employeeName || 'Staff Member'}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{item.employeeId}</p>
                        </td>

                        <td className="py-4 px-4 font-mono font-semibold text-slate-900 text-sm">
                          {formatTime(usedSec)}
                        </td>

                        <td className="py-4 px-4 min-w-[180px]">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                              <span>{percent}%</span>
                              <span>Limit: {Math.round(limitSec / 3600)} hrs</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isOver ? 'bg-rose-500' : percent > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-slate-600 font-mono">
                          {convertTo12Hour(item.firstLogin)}
                        </td>

                        <td className="py-4 px-4 text-slate-600 font-mono">
                          {convertTo12Hour(item.lastActive)}
                        </td>

                        <td className="py-4 px-4">
                          <Badge variant={isOver ? 'error' : 'success'} dot>
                            {isOver ? 'EXCEEDED' : 'NORMAL'}
                          </Badge>
                        </td>

                        {(isManager || isSupervisor) && (
                          <td className="py-4 pr-6 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateLimit(item.id, limitSec)}
                              className="h-8 px-2 text-xs"
                            >
                              Adjust Limit
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}