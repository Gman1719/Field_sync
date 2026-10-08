// server/src/validators/user.validator.ts
// Zod input validation schemas for User Profile & User Management

import { z } from 'zod';
import crypto from 'crypto';
import { ETHIOPIAN_PHONE_REGEX } from '../utils/phone.utils.js';
import { Role } from '@prisma/client';

/**
 * Normalizes input role string to valid Prisma Role enum
 */
export const normalizeRole = (val: unknown): Role => {
  if (typeof val !== 'string') return Role.FIELD_OFFICER;
  const upper = val.trim().toUpperCase();
  if (upper === 'MANAGER') return Role.MANAGER;
  if (upper === 'SUPERVISOR') return Role.SUPERVISOR;
  if (upper === 'FIELD_OFFICER' || upper === 'OFFICER') return Role.FIELD_OFFICER;
  return Role.FIELD_OFFICER;
};

/**
 * Cryptographically secure random temporary password generator
 * Generates high-entropy 12-character strings containing uppercase,
 * lowercase, numbers, and special symbols, shuffled with Fisher-Yates.
 */
export const generateSecureTempPassword = (): string => {
  const upperCharset = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // excludes ambiguous I, O
  const lowerCharset = 'abcdefghijkmnopqrstuvwxyz'; // excludes ambiguous l
  const digitCharset = '23456789';                 // excludes 0, 1
  const symbolCharset = '!@#$%^&*';

  // Guarantee at least 2 characters from each category
  const chars: string[] = [
    upperCharset[crypto.randomInt(0, upperCharset.length)],
    upperCharset[crypto.randomInt(0, upperCharset.length)],
    lowerCharset[crypto.randomInt(0, lowerCharset.length)],
    lowerCharset[crypto.randomInt(0, lowerCharset.length)],
    digitCharset[crypto.randomInt(0, digitCharset.length)],
    digitCharset[crypto.randomInt(0, digitCharset.length)],
    symbolCharset[crypto.randomInt(0, symbolCharset.length)],
    symbolCharset[crypto.randomInt(0, symbolCharset.length)],
  ];

  const allCharset = upperCharset + lowerCharset + digitCharset + symbolCharset;
  while (chars.length < 12) {
    chars.push(allCharset[crypto.randomInt(0, allCharset.length)]);
  }

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
};

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(50).optional(),
  middleName: z.string().trim().max(50).nullable().optional(),
  lastName: z.string().trim().min(1, 'Last name is required').max(50).optional(),
  phoneNumber: z
    .string()
    .trim()
    .regex(ETHIOPIAN_PHONE_REGEX, 'Invalid Ethiopian phone number. Use 09..., 07..., or +251...')
    .nullable()
    .optional(),
  phone: z.string().trim().nullable().optional(),
  profilePhotoUrl: z.string().trim().max(10000000).nullable().optional(),
  email: z.string().trim().email('Invalid email address').toLowerCase().optional(),
});

export const adminUpdateUserSchema = z.object({
  firstName: z.string().trim().min(1).max(50).optional(),
  middleName: z.string().trim().max(50).nullable().optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  fullName: z.string().trim().min(1).optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  phoneNumber: z
    .string()
    .trim()
    .regex(ETHIOPIAN_PHONE_REGEX, 'Invalid Ethiopian phone number')
    .nullable()
    .optional(),
  phone: z.string().trim().nullable().optional(),
  role: z.preprocess((val) => (val ? normalizeRole(val) : undefined), z.nativeEnum(Role).optional()),
  isActive: z.boolean().optional(),
  regionId: z.string().nullable().optional(),
  zoneId: z.string().nullable().optional(),
  woredaId: z.string().nullable().optional(),
  kebeleId: z.string().nullable().optional(),
  supervisorId: z.string().nullable().optional(),
});

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(50),
  middleName: z.string().trim().max(50).nullable().optional(),
  lastName: z.string().trim().min(1, 'Last name is required').max(50),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  phoneNumber: z
    .string()
    .trim()
    .regex(ETHIOPIAN_PHONE_REGEX, 'Invalid Ethiopian phone number. Use 09..., 07..., or +251...')
    .nullable()
    .optional(),
  phone: z.string().trim().nullable().optional(),
  role: z.preprocess((val) => normalizeRole(val), z.nativeEnum(Role)).default(Role.FIELD_OFFICER),
  regionId: z.string().nullable().optional(),
  zoneId: z.string().nullable().optional(),
  woredaId: z.string().nullable().optional(),
  kebeleId: z.string().nullable().optional(),
  supervisorId: z.string().nullable().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export const reassignLocationSchema = z.object({
  regionId: z.string().nullable().optional(),
  zoneId: z.string().nullable().optional(),
  woredaId: z.string().nullable().optional(),
  kebeleId: z.string().nullable().optional(),
  supervisorId: z.string().nullable().optional(),
  transferSupervisorId: z.string().nullable().optional(),
  officerTransfers: z.union([z.record(z.string()), z.array(z.any())]).optional(),
});
