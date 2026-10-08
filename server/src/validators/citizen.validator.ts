// server/src/validators/citizen.validator.ts
// Zod Request Validation Schema for Citizen Registration

import { z } from 'zod';
import { validateEthiopianPhone, normalizeEthiopianPhone } from '../utils/phone.utils.js';

export const citizenSchema = z
  .object({
    clientRecordId: z
      .string({ required_error: 'Client Record ID is required' })
      .min(8, 'Invalid client record ID'),
    firstName: z
      .string({ required_error: 'First name is required' })
      .trim()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name cannot exceed 50 characters'),
    middleName: z
      .string()
      .trim()
      .max(50, 'Middle name cannot exceed 50 characters')
      .optional()
      .nullable(),
    lastName: z
      .string({ required_error: 'Last name is required' })
      .trim()
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name cannot exceed 50 characters'),
    dateOfBirth: z
      .string()
      .optional()
      .nullable(),
    age: z
      .coerce
      .number()
      .int('Age must be a whole number')
      .min(0, 'Age cannot be negative')
      .max(125, 'Please enter a valid age')
      .optional()
      .nullable(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER'], {
      required_error: 'Gender is required',
    }),
    maritalStatus: z
      .string()
      .optional()
      .nullable(),
    phoneNumber: z
      .string({ required_error: 'Phone number is required' })
      .trim()
      .min(1, 'Phone number is required')
      .refine(
        (val) => validateEthiopianPhone(val, true),
        'Invalid Ethiopian phone number. Must start with +2519, +2517, 09, or 07 followed by 8 digits.'
      )
      .transform((val) => normalizeEthiopianPhone(val)),
    email: z
      .string()
      .optional()
      .nullable(),
    alternativePhone: z
      .string()
      .optional()
      .nullable()
      .refine(
        (val) => !val || validateEthiopianPhone(val),
        'Invalid Ethiopian alternative phone number'
      )
      .transform((val) => normalizeEthiopianPhone(val)),
    // Full Address Hierarchy
    regionId: z
      .string({ required_error: 'Region is required' })
      .min(1, 'Region is required'),
    zoneId: z
      .string({ required_error: 'Zone is required' })
      .min(1, 'Zone is required'),
    woredaId: z
      .string({ required_error: 'Woreda is required' })
      .min(1, 'Woreda is required'),
    kebeleId: z
      .string({ required_error: 'Kebele is required' })
      .min(1, 'Kebele is required'),
    village: z
      .string({ required_error: 'Village or Community is required' })
      .trim()
      .min(1, 'Village or Community name cannot be empty')
      .max(100, 'Village name cannot exceed 100 characters'),
    assignmentId: z
      .string()
      .optional()
      .nullable(),
    registrationTimestamp: z
      .string()
      .optional(),
  })
  .refine((data) => data.dateOfBirth || (data.age !== undefined && data.age !== null), {
    message: 'Either Date of Birth or Age must be provided',
    path: ['age'],
  });

export type CitizenInput = z.infer<typeof citizenSchema>;
