// src/components/attendance/ManagerAttendance.jsx – Enterprise Manager Attendance Review

import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  ClipboardCheck, Clock, Users, CheckCircle2, XCircle,
  AlertCircle, Filter, Eye, Check, X, RefreshCw
} from 'lucide-react';
import { getToday } from '../../utils/helpers';
import { db, syncQueue, checkRealInternet, clearStuckSyncItems, processSyncQueue } from '../../services/database';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import StatCard from '../ui/StatCard';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';

export default function ManagerAttendance({
  attendance = [],
  users = [],
  setAttendance,
  addNotification
}) {
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSupervisor, setSelectedSupervisor] = useState('all');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const checkNetwork = async () => {
      const online = await checkRealInternet();
      setIsOnline(online);

      if (online) {
        await clearStuckSyncItems();
        const count = syncQueue.count();
        setPendingCount(count);

        if (count > 0) {
          setIsSyncing(true);
          try {
            await processSyncQueue(true);
            const updatedAttendance = await db.attendance.toArray();
            if (setAttendance) setAttendance(updatedAttendance);
            setPendingCount(syncQueue.count());
          } catch (error) {
            console.error('Sync error:', error);
          } finally {
            setIsSyncing(false);
          }
        } else {
          setIsSyncing(false);
          const updatedAttendance = await db.attendance.toArray();
          if (setAttendance) setAttendance(updatedAttendance);
        }
      } else {
        setIsSyncing(false);
        setPendingCount(syncQueue.count());
      }
    };

    checkNetwork();
    const interval = setInterval(checkNetwork, 3000);

    const handleSyncComplete = async () => {
      setPendingCount(syncQueue.count());
      setIsSyncing(false);
      const updatedAttendance = await db.attendance.toArray();
      if (setAttendance) setAttendance(updatedAttendance);
    };

    window.addEventListener('sync-complete', handleSyncComplete);

    return () => {
      clearInterval(interval);
      window.removeEventListener('sync-complete', handleSyncComplete);
    };
  }, [setAttendance]);

  const syncedRecords = useMemo(() => {
    return attendance.filter(a => a.synced === true);
  }, [attendance]);

  const supervisors = useMemo(() => {
    return users.filter(u => u.role === 'supervisor');
  }, [users]);

  const regions = useMemo(() => {
    const set = new Set();
    users.forEach(u => {
      if (u.region) set.add(u.region);
    });
    return Array.from(set);
  }, [users]);

  const filteredAttendance = useMemo(() => {
    return syncedRecords.filter(item => {
      if (selectedDate && item.date !== selectedDate) return false;
      if (selectedRegion !== 'all' && item.region !== selectedRegion) return false;
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
      if (selectedSupervisor !== 'all' && item.supervisorId !== selectedSupervisor) return false;
      return true;
    });
  }, [syncedRecords, selectedDate, selectedRegion, selectedStatus, selectedSupervisor]);

  const stats = useMemo(() => {
    const total = filteredAttendance.length;
    const present = filteredAttendance.filter(a => a.status === 'present').length;
    const late = filteredAttendance.filter(a => a.status === 'late').length;
    const absent = filteredAttendance.filter(a => a.status === 'absent').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, rate };
  }, [filteredAttendance]);

  const markAsSeen = async (id) => {
    try {
      const record = attendance.find(a => a.id === id);
      if (!record || record.seenByManager) return;

      const updatedRecord = {
        ...record,
        seenByManager: true,
        seenAt: new Date().toISOString(),
        seenBy: 'manager'
      };

      await db.attendance.update(id, updatedRecord);
      setAttendance(prev => prev.map(a => a.id === id ? updatedRecord : a));
      toast.success('Marked as reviewed');
    } catch (error) {
      console.error('Error marking as seen:', error);
    }
  };

  const approveAttendance = async (id, approve) => {
    try {
      const record = attendance.find(a => a.id === id);
      if (!record) return;

      const updatedRecord = {
        ...record,
        approved: approve,
        approvedBy: 'manager',
        approvedAt: new Date().toISOString(),
        managerNotes: approve ? 'Approved by Manager' : 'Rejected by Manager',
        seenByManager: true,
        seenAt: new Date().toISOString()
      };

      await db.attendance.update(id, updatedRecord);
      setAttendance(prev => prev.map(a => a.id === id ? updatedRecord : a));

      if (record.supervisorId && addNotification) {
        const supervisor = users.find(u => u.id === record.supervisorId);
        if (supervisor) {
          await addNotification(
            supervisor.id,
            approve ? 'Attendance Approved' : 'Attendance Rejected',
            `Manager has ${approve ? 'approved' : 'rejected'} attendance for ${record.employeeName} on ${record.date}`,
            approve ? 'success' : 'error'
          );
        }
      }

      toast.success(`Attendance ${approve ? 'approved' : 'rejected'} successfully!`);
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Error updating attendance: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-[#1E3A8A]" />
            Manager Attendance Review
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Consolidated staff attendance verification across all supervisors and regions
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
            onClick={() => setSelectedDate(getToday())}
            className="h-9"
          >
            Today
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <StatCard
          title="Total Scheduled"
          value={stats.total}
          subtitle={`On ${selectedDate}`}
          icon={Users}
          iconColor="text-blue-700"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Present"
          value={stats.present}
          subtitle="On-time arrivals"
          icon={CheckCircle2}
          iconColor="text-emerald-700"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Late"
          value={stats.late}
          subtitle="Tardy arrivals"
          icon={Clock}
          iconColor="text-amber-700"
          iconBg="bg-amber-50"
        />
        <StatCard
          title="Absent"
          value={stats.absent}
          subtitle="Missed shifts"
          icon={XCircle}
          iconColor="text-rose-700"
          iconBg="bg-rose-50"
        />
        <StatCard
          title="Attendance Rate"
          value={`${stats.rate}%`}
          subtitle="Present + Late ratio"
          icon={ClipboardCheck}
          iconColor="text-teal-700"
          iconBg="bg-teal-50"
        />
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Region"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
            >
              <option value="all">All Regions</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </Select>

            <Select
              label="Supervisor"
              value={selectedSupervisor}
              onChange={(e) => setSelectedSupervisor(e.target.value)}
            >
              <option value="all">All Supervisors</option>
              {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>

            <Select
              label="Status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="half_day">Half Day</option>
              <option value="absent">Absent</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-sm">Consolidated Records ({filteredAttendance.length})</CardTitle>
            <CardDescription>Verified attendance submissions from field teams</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredAttendance.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <span>No attendance records matching the current filters</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3.5 pl-6">Officer</th>
                    <th className="py-3.5 px-4">Region</th>
                    <th className="py-3.5 px-4">Supervisor</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Hours</th>
                    <th className="py-3.5 px-4">Manager Review</th>
                    <th className="py-3.5 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttendance.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 pl-6">
                        <p className="font-semibold text-slate-900">{rec.employeeName}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{rec.employeeId}</p>
                      </td>

                      <td className="py-4 px-4 text-slate-600">{rec.region || '--'}</td>

                      <td className="py-4 px-4 text-slate-600">{rec.supervisorName || '--'}</td>

                      <td className="py-4 px-4">
                        <Badge
                          variant={rec.status === 'present' ? 'success' : rec.status === 'late' ? 'warning' : 'error'}
                          dot
                        >
                          {rec.status.toUpperCase()}
                        </Badge>
                      </td>

                      <td className="py-4 px-4 font-mono font-medium text-slate-900">
                        {rec.workHours || 0} hrs
                      </td>

                      <td className="py-4 px-4">
                        {rec.approved ? (
                          <Badge variant="success">Approved</Badge>
                        ) : rec.seenByManager ? (
                          <Badge variant="info">Reviewed</Badge>
                        ) : (
                          <Badge variant="neutral">Unreviewed</Badge>
                        )}
                      </td>

                      <td className="py-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!rec.seenByManager && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsSeen(rec.id)}
                              className="h-8 px-2 text-xs text-slate-500"
                              title="Mark as seen"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Review
                            </Button>
                          )}
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => approveAttendance(rec.id, true)}
                            className="h-8 px-2 text-xs"
                            title="Approve"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => approveAttendance(rec.id, false)}
                            className="h-8 px-2 text-xs"
                            title="Reject"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}