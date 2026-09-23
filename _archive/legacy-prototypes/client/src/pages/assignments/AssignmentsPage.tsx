import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Play,
  Pause,
  CheckCircle2,
  Plus,
  RefreshCw,
  Target,
  User,
  MapPin,
} from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Badge from '../../components/ui/Badge.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import AssignmentService from '../../services/assignmentService.ts';
import UserService from '../../services/userService.ts';
import { Assignment, AssignmentStatus, User as UserType } from '../../types/index.ts';

export const AssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [officers, setOfficers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New assignment form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTarget, setNewTarget] = useState(50);
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAssignments = async () => {
    try {
      setIsLoading(true);
      const data = await AssignmentService.getAssignments();
      setAssignments(data);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOfficers = async () => {
    if (user?.role === 'SUPERVISOR' || user?.role === 'MANAGER') {
      try {
        const users = await UserService.getUsers({ role: 'FIELD_OFFICER' });
        setOfficers(users);
        if (users.length > 0) setSelectedOfficerId(users[0].id);
      } catch (err) {
        console.error('Failed to load officers:', err);
      }
    }
  };

  useEffect(() => {
    fetchAssignments();
    fetchOfficers();
  }, [user?.id]);

  const handleStatusChange = async (assignmentId: string, newStatus: AssignmentStatus) => {
    if (!user) return;
    try {
      setIsUpdatingId(assignmentId);
      await AssignmentService.updateStatus(assignmentId, newStatus, user.id);
      await fetchAssignments();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsUpdatingId(null);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !selectedOfficerId) return;

    try {
      setIsSubmitting(true);
      await AssignmentService.createAssignment({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        targetCount: Number(newTarget) || 0,
        assignedOfficerId: selectedOfficerId,
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      fetchAssignments();
    } catch (err) {
      console.error('Failed to create assignment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: AssignmentStatus) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Badge variant="info">In Progress</Badge>;
      case 'PAUSED':
        return <Badge variant="warning">Paused</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      default:
        return <Badge variant="default">Assigned</Badge>;
    }
  };

  const isManagement = user?.role === 'SUPERVISOR' || user?.role === 'MANAGER';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-emerald-600" />
              <span>Fieldwork Assignments & Tasks</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage field operations, registration targets, and operational milestones.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAssignments}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Refresh
            </Button>
            {isManagement && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowCreateModal(true)}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                Create Assignment
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
            <span>Loading assignments...</span>
          </div>
        ) : assignments.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-xs text-slate-400">
            No assignments currently active.
          </div>
        ) : (
          assignments.map((assignment: Assignment) => (
            <Card key={assignment.id}>
              <div className="p-5 flex flex-col justify-between h-full space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                      {assignment.title}
                    </h3>
                    {getStatusBadge(assignment.status)}
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {assignment.description || 'No detailed instructions provided.'}
                  </p>
                </div>

                {/* Assignment Target & Details */}
                <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Target className="h-3.5 w-3.5 text-slate-400" />
                      <span>Registration Target:</span>
                    </span>
                    <strong className="text-slate-800">{assignment.targetCount} citizens</strong>
                  </div>

                  {assignment.assignedOfficer && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>Assigned Officer:</span>
                      </span>
                      <strong className="text-slate-800">{assignment.assignedOfficer.fullName}</strong>
                    </div>
                  )}

                  {assignment.woreda && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span>Location:</span>
                      </span>
                      <span className="text-slate-700">{assignment.woreda.name}</span>
                    </div>
                  )}
                </div>

                {/* Status Action Buttons */}
                <div className="border-t border-slate-100 pt-3 flex items-center justify-end gap-2">
                  {assignment.status !== 'IN_PROGRESS' && assignment.status !== 'COMPLETED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Play className="h-3 w-3" />}
                      disabled={isUpdatingId === assignment.id}
                      onClick={() => handleStatusChange(assignment.id, 'IN_PROGRESS')}
                    >
                      Start Task
                    </Button>
                  )}

                  {assignment.status === 'IN_PROGRESS' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Pause className="h-3 w-3" />}
                        disabled={isUpdatingId === assignment.id}
                        onClick={() => handleStatusChange(assignment.id, 'PAUSED')}
                      >
                        Pause
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<CheckCircle2 className="h-3 w-3" />}
                        disabled={isUpdatingId === assignment.id}
                        onClick={() => handleStatusChange(assignment.id, 'COMPLETED')}
                      >
                        Complete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Create Fieldwork Assignment</h3>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assignment Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kirkos Kebele 01 Census Wave 1"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description & Operational Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Details on focal kebeles, target populations, or guidelines..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Registrations
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newTarget}
                    onChange={(e) => setNewTarget(parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Field Officer
                  </label>
                  <select
                    value={selectedOfficerId}
                    onChange={(e) => setSelectedOfficerId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    {officers.map((off: UserType) => (
                      <option key={off.id} value={off.id}>
                        {off.fullName} ({off.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                >
                  Save & Assign
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentsPage;
