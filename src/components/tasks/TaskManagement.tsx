// Fieldwork Assignments Management with Target Progress & Lifecycle State Transitions (Phase 4)

import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Briefcase, Plus, Play, Pause, CheckCircle2, Clock,
  Calendar, MapPin, User, Target, AlertCircle, RefreshCw,
  ChevronRight, Shield, Award
} from 'lucide-react';

import { offlineDb } from '../../db/offlineDb';
import { API_BASE } from '../../config/api';
import ActivityLogger from '../../services/activityLogger';
import CreateAssignmentModal from './CreateAssignmentModal';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import StatCard from '../ui/StatCard';
import { useUserLanguage } from '../../context/UserLanguageContext';

export default function TaskManagement({ user, addNotification }) {
  const { userT } = useUserLanguage();
  const [assignments, setAssignments] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const isOfficer = user?.role === 'field_officer';
  const isSupervisor = user?.role === 'supervisor';
  const isManager = user?.role === 'manager';

  // 1. Load Assignments from Server / Dexie
  const loadAssignments = async () => {
    setIsLoading(true);
    try {
      // Step A: Load from Dexie first
      let localRecords = await offlineDb.assignments.toArray();

      // Step B: If online, fetch from backend API to get live citizen counts & sync
      const authToken = localStorage.getItem('fieldsync_token');
      if (navigator.onLine && authToken) {
        try {
          const res = await fetch(`${API_BASE}/assignments`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (res.ok) {
            const resData = await res.json();
            if (resData.success && resData.data) {
              const serverAssignments = resData.data;
              // Cache in Dexie
              for (const a of serverAssignments) {
                await offlineDb.assignments.put({
                  id: a.id,
                  title: a.title,
                  description: a.description,
                  targetCount: a.targetCount,
                  status: a.status,
                  assignedOfficerId: a.assignedOfficerId,
                  assignedSupervisorId: a.assignedSupervisorId,
                  woredaId: a.woredaId,
                  kebeleId: a.kebeleId,
                  startDate: a.startDate,
                  endDate: a.endDate,
                });
              }
              setAssignments(serverAssignments);
              setIsLoading(false);
              setIsRefreshing(false);
              return;
            }
          }
        } catch (serverErr) {
          console.warn('Could not reach backend assignments API, falling back to local Dexie:', serverErr.message);
        }
      }

      // If offline, compute live registered count from local Dexie citizens
      const localCitizens = await offlineDb.citizens.toArray();
      const enrichedLocal = localRecords.map((a) => {
        const count = localCitizens.filter((c) => c.assignmentId === a.id).length;
        const target = a.targetCount || 1;
        return {
          ...a,
          registeredCount: count,
          progressPercentage: Math.min(100, Math.round((count / target) * 100)),
        };
      });

      // Filter by officer if offline officer
      if (isOfficer && user?.id) {
        setAssignments(enrichedLocal.filter((a) => a.assignedOfficerId === user.id));
      } else {
        setAssignments(enrichedLocal);
      }
    } catch (err) {
      console.error('Error loading assignments:', err);
      toast.error('Failed to load fieldwork assignments');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, [user]);

  // 2. Lifecycle Transition Handler (Start, Pause, Resume, Complete)
  const handleTransitionStatus = async (assignmentId, newStatus) => {
    setIsTransitioning(true);
    try {
      const assignment = assignments.find((a) => a.id === assignmentId);
      if (!assignment) return;

      const previousStatus = assignment.status;

      // Event type mapping for local activity logging
      let eventType = 'ASSIGNMENT_STATUS_CHANGED';
      if (newStatus === 'IN_PROGRESS') {
        eventType = previousStatus === 'PAUSED' ? 'ASSIGNMENT_RESUMED' : 'ASSIGNMENT_STARTED';
      } else if (newStatus === 'PAUSED') {
        eventType = 'ASSIGNMENT_PAUSED';
      } else if (newStatus === 'COMPLETED') {
        eventType = 'ASSIGNMENT_COMPLETED';
      }

      // Step A: Update Dexie local storage immediately
      await offlineDb.assignments.update(assignmentId, { status: newStatus });

      // Step B: Record local activity log
      await ActivityLogger.log(
        eventType,
        `Assignment "${assignment.title}" moved to ${newStatus}`,
        {
          officerId: user?.id || assignment.assignedOfficerId,
          officerName: user?.fullName || user?.name || 'Field Officer',
          assignmentId,
          relatedRecordId: assignmentId,
          metadata: {
            title: assignment.title,
            newStatus,
            previousStatus,
          },
        }
      );

      // Step C: If online, update server
      const authToken = localStorage.getItem('fieldsync_token');
      if (navigator.onLine && authToken) {
        try {
          const res = await fetch(`${API_BASE}/assignments/${assignmentId}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ status: newStatus }),
          });
          if (res.ok) {
            toast.success(`Assignment transitioned to ${newStatus}`);
          }
        } catch (e) {
          console.warn('Network sync failed, preserved locally:', e.message);
          toast.success(`Status updated locally (${newStatus}) — pending sync`);
        }
      } else {
        toast.success(`Saved locally (${newStatus}) — will sync when online`);
      }

      if (addNotification) {
        addNotification({
          title: 'Assignment Updated',
          message: `Mission "${assignment.title}" is now ${newStatus}`,
          type: 'info',
        });
      }

      // Re-read assignments
      await loadAssignments();
    } catch (err) {
      console.error('Error transitioning assignment status:', err);
      toast.error('Failed to update assignment status');
    } finally {
      setIsTransitioning(false);
    }
  };

  // 3. Computed KPI Stats
  const stats = useMemo(() => {
    const total = assignments.length;
    const inProgress = assignments.filter((a) => a.status === 'IN_PROGRESS').length;
    const completed = assignments.filter((a) => a.status === 'COMPLETED').length;
    const pending = assignments.filter((a) => a.status === 'ASSIGNED' || a.status === 'PAUSED').length;

    return { total, inProgress, completed, pending };
  }, [assignments]);

  // 4. Filtered List
  const filteredAssignments = useMemo(() => {
    if (filterStatus === 'ALL') return assignments;
    return assignments.filter((a) => a.status === filterStatus);
  }, [assignments, filterStatus]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-xs">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                {isOfficer ? userT('My Fieldwork Assignments') : userT('Fieldwork Missions & Assignments')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isOfficer
                  ? userT('Track citizen registration targets, update mission status, and monitor completion progress')
                  : userT('Deploy registration quotas, monitor officer fieldwork progress, and manage assignments')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">

          {(isManager || isSupervisor) && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="text-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {userT('Deploy Assignment')}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={userT('Total Assigned')}
          value={stats.total}
          icon={Briefcase}
          color="blue"
        />
        <StatCard
          title={userT('Missions In Progress')}
          value={stats.inProgress}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title={userT('Completed Targets')}
          value={stats.completed}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title={userT('Pending / Paused')}
          value={stats.pending}
          icon={AlertCircle}
          color="indigo"
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl max-w-fit text-xs font-semibold border border-transparent dark:border-slate-700">
        {[
          { key: 'ALL', label: userT('All Tasks') },
          { key: 'ASSIGNED', label: userT('Assigned') },
          { key: 'IN_PROGRESS', label: userT('In Progress') },
          { key: 'PAUSED', label: userT('Paused') },
          { key: 'COMPLETED', label: userT('Completed') },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterStatus(tab.key)}
            className={`py-1.5 px-3 rounded-lg transition-all ${
              filterStatus === tab.key
                ? 'bg-white dark:bg-slate-800 text-[#1E3A8A] dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
            <RefreshCw className="w-6 h-6 text-[#1E3A8A] dark:text-blue-400 animate-spin mx-auto mb-2" />
            {userT('Loading fieldwork assignments...')}
          </CardContent>
        </Card>
      ) : filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
            <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{userT('No Assignments Found')}</p>
            <p className="text-slate-400 dark:text-slate-500">
              {filterStatus !== 'ALL'
                ? `${userT('No assignments currently in')} ${userT(filterStatus)} ${userT('status')}.`
                : isOfficer
                ? userT('You do not have any pending fieldwork assignments assigned to your workstation.')
                : userT('No assignments have been deployed yet. Click "Deploy Assignment" above to assign quotas.')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssignments.map((assignment) => {
            const isCompleted = assignment.status === 'COMPLETED';
            const isInProgress = assignment.status === 'IN_PROGRESS';
            const isPaused = assignment.status === 'PAUSED';
            const isAssigned = assignment.status === 'ASSIGNED';

            const progress = assignment.progressPercentage ?? 0;
            const regCount = assignment.registeredCount ?? 0;
            const target = assignment.targetCount ?? 0;

            return (
              <Card key={assignment.id} className="border border-slate-200/90 dark:border-slate-700 shadow-card hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                <CardContent className="p-5 space-y-4">
                  {/* Top Bar: Title & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-[#F8FAFC] text-sm">
                          {assignment.title}
                        </span>
                      </div>
                      {assignment.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {assignment.description}
                        </p>
                      )}
                    </div>

                    <Badge
                      variant={
                        isCompleted
                          ? 'success'
                          : isInProgress
                          ? 'primary'
                          : isPaused
                          ? 'warning'
                          : 'default'
                      }
                      className="shrink-0"
                    >
                      {userT(assignment.status)}
                    </Badge>
                  </div>

                  {/* Progress Bar & Target Count */}
                  <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-[#1E3A8A] dark:text-blue-400" />
                        {userT('Target Progress')}
                      </span>
                      <span className="text-[#1E3A8A] dark:text-blue-400">
                        {regCount} / {target} {userT('Citizens')} ({progress}%)
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          isCompleted
                            ? 'bg-emerald-600'
                            : progress >= 80
                            ? 'bg-blue-600'
                            : progress >= 40
                            ? 'bg-indigo-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Meta Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {[assignment.woredaName, assignment.kebeleName].filter(Boolean).join(', ') || userT('Assigned District')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{userT('Due')}: {assignment.endDate || userT('Ongoing')}</span>
                    </div>

                    {!isOfficer && (
                      <div className="col-span-2 flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium pt-1 border-t border-slate-100 dark:border-slate-700">
                        <User className="w-3.5 h-3.5 text-[#1E3A8A] dark:text-blue-400 shrink-0" />
                        <span>{userT('Officer')}: {assignment.officerName || userT('Field Officer')}</span>
                      </div>
                    )}
                  </div>

                  {/* Field Officer Interactive Action Controls */}
                  {isOfficer && !isCompleted && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2">
                      {isAssigned && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={isTransitioning}
                          onClick={() => handleTransitionStatus(assignment.id, 'IN_PROGRESS')}
                          className="w-full sm:w-auto text-xs"
                        >
                          <Play className="w-3.5 h-3.5 mr-1.5" />
                          {userT('Start Assignment')}
                        </Button>
                      )}

                      {isInProgress && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isTransitioning}
                            onClick={() => handleTransitionStatus(assignment.id, 'PAUSED')}
                            className="text-xs"
                          >
                            <Pause className="w-3.5 h-3.5 mr-1" />
                            {userT('Pause')}
                          </Button>

                          <Button
                            type="button"
                            variant="success"
                            size="sm"
                            disabled={isTransitioning}
                            onClick={() => handleTransitionStatus(assignment.id, 'COMPLETED')}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            {userT('Report Completion')}
                          </Button>
                        </>
                      )}

                      {isPaused && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={isTransitioning}
                          onClick={() => handleTransitionStatus(assignment.id, 'IN_PROGRESS')}
                          className="w-full sm:w-auto text-xs"
                        >
                          <Play className="w-3.5 h-3.5 mr-1.5" />
                          {userT('Resume Assignment')}
                        </Button>
                      )}
                    </div>
                  )}

                  {isCompleted && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-center text-xs font-semibold text-emerald-700 dark:text-emerald-400 gap-1.5">
                      <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{userT('Mission Successfully Completed & Reported')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Assignment Modal for Manager / Supervisor */}
      {(isManager || isSupervisor) && (
        <CreateAssignmentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onAssignmentCreated={() => {
            loadAssignments();
          }}
          currentUser={user}
        />
      )}
    </div>
  );
}