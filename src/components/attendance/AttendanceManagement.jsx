// src/components/attendance/AttendanceManagement.jsx – Enterprise Attendance Management

import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  CalendarCheck, Clock, UserCheck, AlertCircle, Filter,
  CheckCircle2, XCircle, RefreshCw, Calendar, User, Edit2,
  Check, X, ShieldAlert
} from 'lucide-react';
import { db, syncQueue, checkRealInternet, clearStuckSyncItems } from '../../services/database';
import { getToday, uid } from '../../utils/helpers';
import { API_BASE } from '../../config/api';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import StatCard from '../ui/StatCard';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';

export default function AttendanceManagement({
  filteredAttendance,
  attendance = [],
  setAttendance,
  users = [],
  user,
  isSupervisor,
  isOfficer,
  teamMembers = [],
  selectedDate: externalSelectedDate,
  setSelectedDate: externalSetSelectedDate,
  attendanceFilter: externalAttendanceFilter,
  setAttendanceFilter: externalSetAttendanceFilter,
  addNotification
}) {
  const [internalSelectedDate, setInternalSelectedDate] = useState(getToday());
  const selectedDate = externalSelectedDate !== undefined ? externalSelectedDate : internalSelectedDate;
  const setSelectedDate = externalSetSelectedDate || setInternalSelectedDate;

  const [internalFilter, setInternalFilter] = useState('all');
  const attendanceFilter = externalAttendanceFilter !== undefined ? externalAttendanceFilter : internalFilter;
  const setAttendanceFilter = externalSetAttendanceFilter || setInternalFilter;

  const [showModal, setShowModal] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [stuckCount, setStuckCount] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const [form, setForm] = useState({
    status: 'present',
    checkIn: '08:00',
    checkOut: '17:00',
    notes: '',
    workHours: 8,
    overtime: 0,
    breakTime: 0
  });

  useEffect(() => {
    const checkNetwork = async () => {
      const online = await checkRealInternet();
      setIsOnline(online);

      const count = syncQueue.count();
      setPendingCount(count);

      const stuck = attendance.filter(a => a.synced === 'syncing').length;
      setStuckCount(stuck);

      if (stuck > 0 || count > 0) {
        setIsClearing(true);
        try {
          await clearStuckSyncItems();
          const updatedAttendance = await db.attendance.toArray();
          if (setAttendance) setAttendance(updatedAttendance);
          setStuckCount(updatedAttendance.filter(a => a.synced === 'syncing').length);
          setPendingCount(syncQueue.count());
          if (online && syncQueue.count() > 0) {
            window.dispatchEvent(new CustomEvent('force-sync'));
          }
        } catch (error) {
          console.error('Error clearing stuck items:', error);
        } finally {
          setIsClearing(false);
        }
      }
    };

    checkNetwork();
    const interval = setInterval(checkNetwork, 5000);

    const handleSyncComplete = async () => {
      setPendingCount(syncQueue.count());
      const updatedAttendance = await db.attendance.toArray();
      if (setAttendance) setAttendance(updatedAttendance);
      setStuckCount(updatedAttendance.filter(a => a.synced === 'syncing').length);
    };

    const handleQueueUpdate = () => {
      setPendingCount(syncQueue.count());
    };

    window.addEventListener('sync-complete', handleSyncComplete);
    window.addEventListener('sync-queue-updated', handleQueueUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('sync-complete', handleSyncComplete);
      window.removeEventListener('sync-queue-updated', handleQueueUpdate);
    };
  }, [attendance, setAttendance]);

  const supervisorOfficers = useMemo(() => {
    if (isSupervisor && user) {
      return users.filter(u => u.supervisorId === user.id && u.role === 'field_officer');
    }
    return [];
  }, [users, user, isSupervisor]);

  const handleOpenModal = (officer) => {
    setSelectedOfficer(officer);
    const today = getToday();
    const existing = attendance.find(a => a.employeeId === officer.employeeId && a.date === today);
    setForm({
      status: existing?.status || 'present',
      checkIn: existing?.checkIn || '08:00',
      checkOut: existing?.checkOut || '17:00',
      notes: existing?.notes || '',
      workHours: existing?.workHours || 8,
      overtime: existing?.overtime || 0,
      breakTime: existing?.breakTime || 0
    });
    setShowModal(true);
  };

  const handleSubmitAttendance = async () => {
    if (!selectedOfficer) return;
    const today = getToday();

    const online = await checkRealInternet();
    setIsOnline(online);

    let workHours = 0;
    if (form.checkIn && form.checkOut) {
      const checkIn = form.checkIn.split(':');
      const checkOut = form.checkOut.split(':');
      const inHours = parseInt(checkIn[0]);
      const inMins = parseInt(checkIn[1]);
      const outHours = parseInt(checkOut[0]);
      const outMins = parseInt(checkOut[1]);
      workHours = (outHours - inHours) + (outMins - inMins) / 60;
      if (workHours < 0) workHours += 24;
      workHours = workHours - (form.breakTime || 0);
    }

    try {
      const existingRecord = attendance.find(
        a => a.employeeId === selectedOfficer.employeeId && a.date === today
      );

      const attendanceData = {
        status: form.status,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        workHours: Math.round(workHours * 10) / 10,
        notes: form.notes || '',
        overtime: Number(form.overtime) || 0,
        breakTime: Number(form.breakTime) || 0,
        approved: false,
        approvedBy: null,
        approvedAt: null,
        updatedBy: user.employeeId,
        updatedByName: user.name,
        supervisorId: user.id,
        supervisorName: user.name,
        submittedToManager: true,
        submittedAt: new Date().toISOString(),
        region: selectedOfficer.region || user.region,
        seenByManager: false,
        seenAt: null,
        seenBy: null,
        editedBySupervisor: true,
        lastEditedAt: new Date().toISOString(),
        synced: false,
        lastSyncAttempt: Date.now()
      };

      let recordId;

      if (existingRecord) {
        await db.attendance.update(existingRecord.id, attendanceData);
        setAttendance(prev =>
          prev.map(a => a.id === existingRecord.id ? { ...a, ...attendanceData } : a)
        );
        recordId = existingRecord.id;
      } else {
        const newRecord = {
          id: uid(),
          employeeId: selectedOfficer.employeeId,
          employeeName: selectedOfficer.name,
          date: today,
          region: selectedOfficer.region || user.region,
          supervisorId: user.id,
          supervisorName: user.name,
          ...attendanceData,
          createdAt: new Date().toISOString()
        };
        await db.attendance.add(newRecord);
        setAttendance(prev => [newRecord, ...prev]);
        recordId = newRecord.id;
      }

      const payload = {
        employeeId: selectedOfficer.employeeId,
        employeeName: selectedOfficer.name,
        date: today,
        status: form.status,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        workHours: Math.round(workHours * 10) / 10,
        region: selectedOfficer.region || user.region,
        supervisorId: user.id,
        supervisorName: user.name,
        notes: form.notes || '',
        submittedToManager: true,
        submittedAt: new Date().toISOString(),
      };

      if (online) {
        try {
          const response = await fetch(`${API_BASE}/attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            await db.attendance.update(recordId, { synced: true });
            if (setAttendance) {
              setAttendance(prev =>
                prev.map(a => a.id === recordId ? { ...a, synced: true } : a)
              );
            }
            toast.success('Attendance recorded and synchronized!');
          } else {
            throw new Error('API failed');
          }
        } catch (apiError) {
          syncQueue.add({ type: 'attendance', id: recordId, data: payload });
          setPendingCount(syncQueue.count());
          toast('Saved locally. Will sync when server is reachable.', { icon: '💾' });
        }
      } else {
        syncQueue.add({ type: 'attendance', id: recordId, data: payload });
        setPendingCount(syncQueue.count());
        toast('Attendance saved offline! Will sync automatically.', { icon: '💾' });
      }

      const manager = users.find(u => u.role === 'manager');
      if (manager && addNotification) {
        await addNotification(
          manager.id,
          'Attendance Updated',
          `${user.name} updated attendance for ${selectedOfficer.name}`,
          'info'
        );
      }

      if (addNotification) {
        await addNotification(
          selectedOfficer.id,
          'Attendance Updated',
          `Your attendance status has been updated by ${user.name}`,
          'info'
        );
      }

      setShowModal(false);
      setSelectedOfficer(null);
    } catch (error) {
      console.error('Error submitting attendance:', error);
      toast.error('Error recording attendance: ' + error.message);
    }
  };

  const today = getToday();
  const syncedAttendance = attendance.filter(a => a.synced === true);

  const getFilteredDisplayAttendance = () => {
    let filtered = [...attendance];

    if (isSupervisor && user) {
      const officerIds = supervisorOfficers.map(o => o.employeeId);
      filtered = filtered.filter(a => officerIds.includes(a.employeeId));
    } else if (isOfficer && user) {
      filtered = filtered.filter(a => a.employeeId === user.employeeId);
    }

    filtered = filtered.filter(a => a.synced === true);

    if (selectedDate) {
      filtered = filtered.filter(a => a.date === selectedDate);
    }

    if (attendanceFilter !== 'all') {
      filtered = filtered.filter(a => a.status === attendanceFilter);
    }

    return filtered;
  };

  const displayList = getFilteredDisplayAttendance();

  const totalSelected = displayList.length;
  const presentCount = displayList.filter(a => a.status === 'present').length;
  const lateCount = displayList.filter(a => a.status === 'late').length;
  const absentCount = displayList.filter(a => a.status === 'absent').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-[#2563EB] dark:text-[#60A5FA]" />
            Attendance Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isOfficer ? 'Review your daily shift attendance and verification log' : 'Log and manage shift attendance for your field team'}
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

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Scheduled"
          value={totalSelected}
          subtitle={`On ${selectedDate}`}
          icon={User}
          iconColor="text-blue-700"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Present"
          value={presentCount}
          subtitle="On-time check-ins"
          icon={CheckCircle2}
          iconColor="text-emerald-700"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Late"
          value={lateCount}
          subtitle="Tardy arrivals"
          icon={Clock}
          iconColor="text-amber-700"
          iconBg="bg-amber-50"
        />
        <StatCard
          title="Absent"
          value={absentCount}
          subtitle="Unexcused or missed"
          icon={XCircle}
          iconColor="text-rose-700"
          iconBg="bg-rose-50"
        />
      </div>

      {/* Supervisor Team Quick Log Section */}
      {isSupervisor && supervisorOfficers.length > 0 && selectedDate === today && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-sm">Team Roster (Today)</CardTitle>
              <CardDescription>Click any officer to record or adjust their check-in time</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {supervisorOfficers.map(officer => {
                const todayRecord = attendance.find(a => a.employeeId === officer.employeeId && a.date === today);
                const status = todayRecord?.status || 'not_marked';

                return (
                  <div
                    key={officer.id}
                    onClick={() => handleOpenModal(officer)}
                    className="p-3.5 bg-slate-50 dark:bg-[#0F172A] hover:bg-slate-100/80 dark:hover:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-[#334155] cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{officer.name}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{officer.employeeId}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={status === 'present' ? 'success' : status === 'late' ? 'warning' : status === 'absent' ? 'error' : 'neutral'}
                        dot
                      >
                        {status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter and Attendance Log Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm">Attendance Records</CardTitle>
            <CardDescription>Verified check-in timestamps and logged hours</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={attendanceFilter}
              onChange={(e) => setAttendanceFilter(e.target.value)}
              className="text-xs h-9 w-36"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="half_day">Half Day</option>
              <option value="absent">Absent</option>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {displayList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
              <CalendarCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <span>No attendance logs found for this filter criteria</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#334155] text-slate-600 dark:text-slate-200 font-bold uppercase tracking-wider bg-slate-50/90 dark:bg-[#0F172A] text-[11px]">
                    <th className="py-3.5 pl-6">Officer</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Check-In</th>
                    <th className="py-3.5 px-4">Check-Out</th>
                    <th className="py-3.5 px-4">Hours</th>
                    <th className="py-3.5 pr-6 text-right">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                  {displayList.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 pl-6">
                        <p className="font-semibold text-slate-900 dark:text-white">{rec.employeeName || 'Staff'}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{rec.employeeId}</p>
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-700 dark:text-slate-300">{rec.date}</td>
                      <td className="py-4 px-4">
                        <Badge
                          variant={rec.status === 'present' ? 'success' : rec.status === 'late' ? 'warning' : 'error'}
                          dot
                        >
                          {rec.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-600 dark:text-slate-300">{rec.checkIn || '--:--'}</td>
                      <td className="py-4 px-4 font-mono text-slate-600 dark:text-slate-300">{rec.checkOut || '--:--'}</td>
                      <td className="py-4 px-4 font-mono font-semibold text-slate-900 dark:text-white">{rec.workHours || 0} hrs</td>
                      <td className="py-4 pr-6 text-right text-slate-500 dark:text-slate-400 truncate max-w-xs">{rec.notes || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Log Attendance: ${selectedOfficer?.name || ''}`}
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Shift Status"
            value={form.status}
            onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
          >
            <option value="present">Present (On Duty)</option>
            <option value="late">Late Arrival</option>
            <option value="half_day">Half Day Shift</option>
            <option value="absent">Absent</option>
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Check-In Time"
              type="time"
              value={form.checkIn}
              onChange={(e) => setForm(prev => ({ ...prev, checkIn: e.target.value }))}
            />

            <Input
              label="Check-Out Time"
              type="time"
              value={form.checkOut}
              onChange={(e) => setForm(prev => ({ ...prev, checkOut: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Break Time (hours)"
              type="number"
              step="0.5"
              min="0"
              value={form.breakTime}
              onChange={(e) => setForm(prev => ({ ...prev, breakTime: parseFloat(e.target.value) || 0 }))}
            />

            <Input
              label="Overtime (hours)"
              type="number"
              step="0.5"
              min="0"
              value={form.overtime}
              onChange={(e) => setForm(prev => ({ ...prev, overtime: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <Textarea
            label="Field Attendance Notes"
            value={form.notes}
            onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Reason for late arrival or schedule change..."
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitAttendance}
            >
              Save Attendance Record
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}