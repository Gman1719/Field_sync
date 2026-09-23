import { z } from 'zod';

export const citizenSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, 'Full name must be at least 3 characters long')
    .max(100, 'Full name cannot exceed 100 characters')
    .refine((val) => val.split(/\s+/).length >= 2, {
      message: 'Please provide at least first and father name (e.g., Abebe Kebede)',
    }),

  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required')
    .refine((val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) return false;
      const today = new Date();
      const minDate = new Date('1900-01-01');
      return date <= today && date >= minDate;
    }, {
      message: 'Date of birth must be a valid past date after 1900',
    }),

  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], {
    errorMap: () => ({ message: 'Please select a valid gender' }),
  }),

  phoneNumber: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val || val.length === 0) return true;
      // Ethiopian phone pattern: +251 9/7... or 09... / 07...
      const ethiopianRegex = /^(\+251|0)?[97][0-9]{8}$/;
      const cleaned = val.replace(/[\s-]/g, '');
      return ethiopianRegex.test(cleaned);
    }, {
      message: 'Please enter a valid Ethiopian phone number (e.g., +251912345678 or 0912345678)',
    }),

  address: z
    .string()
    .trim()
    .min(3, 'Address must be at least 3 characters long')
    .max(200, 'Address cannot exceed 200 characters'),

  regionId: z.string().min(1, 'Please select a Region'),
  zoneId: z.string().min(1, 'Please select a Zone'),
  woredaId: z.string().min(1, 'Please select a Woreda'),
  kebeleId: z.string().min(1, 'Please select a Kebele'),
  photoUrl: z.string().optional().nullable(),
});

export type CitizenFormData = z.infer<typeof citizenSchema>;
