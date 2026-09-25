// src/utils/duplicateDetector.ts
// Offline-First Multi-Level Duplicate Citizen Detection for FieldSync (Phase 3)

import { offlineDb } from '../db/offlineDb';
import type { Citizen } from '../types/index';
import { normalizeEthiopianPhone } from './phoneUtils';

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  matchReasons: string[];
  duplicates: Citizen[];
}

export interface CandidateCitizen {
  clientRecordId?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth?: string | null;
  age?: number | null;
  gender: string;
  phoneNumber?: string | null;
  regionId: string;
  zoneId: string;
  woredaId: string;
  kebeleId: string;
  village?: string;
}

/**
 * Checks local Dexie.js database for existing matching citizens
 */
export async function detectLocalDuplicates(
  candidate: CandidateCitizen
): Promise<DuplicateCheckResult> {
  const matchReasons: string[] = [];
  const duplicatesMap = new Map<string, Citizen>();

  try {
    const existingCitizens = await offlineDb.citizens.toArray();
    const normalizedPhone = normalizeEthiopianPhone(candidate.phoneNumber);

    const candFirst = candidate.firstName.trim().toLowerCase();
    const candLast = candidate.lastName.trim().toLowerCase();

    for (const existing of existingCitizens) {
      // Don't compare with self if editing existing client record
      if (candidate.clientRecordId && existing.clientRecordId === candidate.clientRecordId) {
        continue;
      }

      let isMatch = false;

      // Level 0: Exact Unique Citizen ID Match
      if (candidate.clientRecordId && (existing.clientRecordId === candidate.clientRecordId || existing.id === candidate.clientRecordId)) {
        matchReasons.push(
          `System Citizen ID (${candidate.clientRecordId}) already registered to: ${existing.firstName} ${existing.lastName}`
        );
        duplicatesMap.set(existing.clientRecordId, existing);
        isMatch = true;
      }

      // Level 1: Exact Phone Number Match (normalized, if phone provided)
      if (normalizedPhone && existing.phoneNumber) {
        const existNormalized = normalizeEthiopianPhone(existing.phoneNumber);
        if (existNormalized && existNormalized === normalizedPhone) {
          matchReasons.push(
            `Phone number (${normalizedPhone}) matches existing citizen: ${existing.firstName} ${existing.lastName}`
          );
          duplicatesMap.set(existing.clientRecordId, existing);
          isMatch = true;
        }
      }

      // Level 2: Personal Information Matching (Name + DOB or Name + Gender + Age)
      const existFirst = (existing.firstName || '').trim().toLowerCase();
      const existLast = (existing.lastName || '').trim().toLowerCase();
      const isNameMatch = candFirst === existFirst && candLast === existLast;
      const isGenderMatch = existing.gender === candidate.gender;

      const isDobMatch = !!(candidate.dateOfBirth && existing.dateOfBirth && candidate.dateOfBirth === existing.dateOfBirth);
      const isAgeMatch = !!(candidate.age && existing.age && candidate.age === existing.age);

      if (isNameMatch && isDobMatch) {
        matchReasons.push(
          `Identical name and date of birth (${candidate.dateOfBirth}) with existing citizen: ${existing.firstName} ${existing.lastName}`
        );
        duplicatesMap.set(existing.clientRecordId, existing);
        isMatch = true;
      } else if (isNameMatch && isGenderMatch && isAgeMatch) {
        matchReasons.push(
          `Identical name, gender, and age (${candidate.age || ''} yrs) with citizen: ${existing.firstName} ${existing.lastName}`
        );
        duplicatesMap.set(existing.clientRecordId, existing);
        isMatch = true;
      }

      // Level 3: Location-Based Matching (Same name in same Kebele)
      if (isNameMatch && candidate.kebeleId && existing.kebeleId === candidate.kebeleId && !isMatch) {
        matchReasons.push(
          `Matching name "${candidate.firstName} ${candidate.lastName}" registered in the same Kebele`
        );
        duplicatesMap.set(existing.clientRecordId, existing);
      }
    }

    const duplicates = Array.from(duplicatesMap.values());

    return {
      hasDuplicate: duplicates.length > 0,
      matchReasons,
      duplicates,
    };
  } catch (error) {
    console.error('Local duplicate detection error:', error);
    return {
      hasDuplicate: false,
      matchReasons: [],
      duplicates: [],
    };
  }
}

export default detectLocalDuplicates;
