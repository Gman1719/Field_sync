import db from '../db/index.ts';
import { api } from './api.ts';
import { Assignment, AssignmentStatus } from '../types/index.ts';
import ActivityLogger from './activityLogger.ts';

export class AssignmentService {
  /**
   * Fetch assignments (caches to IndexedDB for offline access)
   */
  static async getAssignments(params?: {
    status?: string;
    officerId?: string;
  }): Promise<Assignment[]> {
    try {
      if (navigator.onLine) {
        const res = await api.get('/assignments', { params });
        const serverData: Assignment[] = res.data?.data || [];

        // Cache to local Dexie
        for (const item of serverData) {
          await db.assignments.put(item);
        }
        return serverData;
      }
    } catch (err) {
      console.warn('Network unavailable, falling back to local assignments cache.');
    }

    // Offline fallback from IndexedDB
    try {
      let query = db.assignments.toCollection();
      if (params?.status) {
        query = db.assignments.where('status').equals(params.status);
      }
      return await query.toArray();
    } catch (err) {
      console.error('Failed to load assignments from IndexedDB:', err);
      return [];
    }
  }

  /**
   * Create an assignment (Supervisor or Manager)
   */
  static async createAssignment(data: {
    title: string;
    description?: string;
    targetCount: number;
    assignedOfficerId: string;
    woredaId?: string;
    kebeleId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Assignment> {
    const res = await api.post('/assignments', data);
    const created: Assignment = res.data?.data;
    await db.assignments.put(created);
    return created;
  }

  /**
   * Update assignment status (Start, Pause, Complete)
   * Records automatic activity log.
   */
  static async updateStatus(
    assignmentId: string,
    status: AssignmentStatus,
    officerId: string
  ): Promise<Assignment> {
    // 1. Update local cache
    await db.assignments.update(assignmentId, { status });

    // 2. Map status to activity log event
    let eventType = 'ASSIGNMENT_UPDATED';
    if (status === 'IN_PROGRESS') eventType = 'ASSIGNMENT_STARTED';
    else if (status === 'PAUSED') eventType = 'ASSIGNMENT_PAUSED';
    else if (status === 'COMPLETED') eventType = 'ASSIGNMENT_COMPLETED';

    await ActivityLogger.logEvent(
      eventType,
      `Assignment status updated to ${status}.`,
      {
        officerId,
        assignmentId,
      }
    );

    // 3. Attempt server update if online
    if (navigator.onLine) {
      try {
        const res = await api.patch(`/assignments/${assignmentId}/status`, { status });
        return res.data?.data;
      } catch (err) {
        console.warn('Assignment status update queued locally.');
      }
    }

    const local = await db.assignments.get(assignmentId);
    return local!;
  }
}

export default AssignmentService;
