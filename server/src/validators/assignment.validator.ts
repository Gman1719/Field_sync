// server/src/validators/assignment.validator.ts
// Zod schemas for Assignment Creation and Status Lifecycle Transitions

import { z } from 'zod';

export const createAssignmentSchema = z.object({
  title: z
    .string({ required_error: 'Assignment title is required' })
    .trim()
    .min(3, 'Assignment title must be at least 3 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  description: z
    .string()
    .trim()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional()
    .nullable(),
  targetCount: z
    .coerce
    .number({ required_error: 'Target citizen count is required' })
    .int('Target count must be a whole number')
    .min(1, 'Target count must be at least 1 citizen'),
  assignedOfficerId: z
    .string({ required_error: 'Assigned officer ID is required' })
    .min(1, 'Please select an officer'),
  assignedSupervisorId: z
    .string()
    .optional()
    .nullable(),
  woredaId: z
    .string()
    .optional()
    .nullable(),
  kebeleId: z
    .string()
    .optional()
    .nullable(),
  startDate: z
    .string()
    .optional(),
  endDate: z
    .string()
    .optional()
    .nullable(),
});

export const updateAssignmentStatusSchema = z.object({
  status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED'], {
    required_error: 'Valid assignment status is required',
  }),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentStatusInput = z.infer<typeof updateAssignmentStatusSchema>;
