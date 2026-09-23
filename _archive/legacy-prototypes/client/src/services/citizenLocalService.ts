import db from '../db/index.ts';
import { LocalCitizenRecord, SyncStatus, Gender } from '../types/index.ts';
import ActivityLogger from './activityLogger.ts';

export interface CreateCitizenLocalInput {
  fullName: string;
  dateOfBirth: string;
  gender: Gender;
  phoneNumber?: string | null;
  address: string;
  regionId: string;
  zoneId: string;
  woredaId: string;
  kebeleId: string;
  regionName?: string;
  zoneName?: string;
  woredaName?: string;
  kebeleName?: string;
  photoUrl?: string | null;
  registeredById: string;
  registeredByName?: string;
}

export interface LocalDuplicateMatch {
  citizen: LocalCitizenRecord;
  matchReason: 'EXACT_NAME_AND_DOB' | 'PHONE_NUMBER';
}

export class CitizenLocalService {
  /**
   * Save a newly registered citizen locally to IndexedDB and queue for sync.
   */
  static async createCitizen(input: CreateCitizenLocalInput): Promise<LocalCitizenRecord> {
    const now = new Date().toISOString();
    const clientRecordId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'cl-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();

    const record: LocalCitizenRecord = {
      clientRecordId,
      fullName: input.fullName.trim(),
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      phoneNumber: input.phoneNumber?.trim() || null,
      address: input.address.trim(),
      regionId: input.regionId,
      zoneId: input.zoneId,
      woredaId: input.woredaId,
      kebeleId: input.kebeleId,
      regionName: input.regionName,
      zoneName: input.zoneName,
      woredaName: input.woredaName,
      kebeleName: input.kebeleName,
      photoUrl: input.photoUrl || null,
      registeredById: input.registeredById,
      registeredByName: input.registeredByName,
      syncStatus: 'PENDING',
      syncAttempts: 0,
      lastSyncError: null,
      createdAt: now,
      updatedAt: now,
    };

    // Use transaction to ensure both citizen and syncQueue items are created atomically
    await db.transaction('rw', [db.citizens, db.syncQueue], async () => {
      await db.citizens.add(record);

      await db.syncQueue.add({
        clientRecordId,
        entityType: 'CITIZEN',
        action: 'CREATE',
        payload: {
          clientRecordId,
          fullName: record.fullName,
          dateOfBirth: record.dateOfBirth,
          gender: record.gender,
          phoneNumber: record.phoneNumber,
          address: record.address,
          regionId: record.regionId,
          zoneId: record.zoneId,
          woredaId: record.woredaId,
          kebeleId: record.kebeleId,
          photoUrl: record.photoUrl,
          registeredById: record.registeredById,
          createdAt: record.createdAt,
        },
        status: 'PENDING',
        retryCount: 0,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Auto-record activity event in offline logger
    ActivityLogger.logEvent(
      'CITIZEN_REGISTRATION_SAVED_OFFLINE',
      `Registered citizen ${record.fullName} locally in Kebele ${record.kebeleName || ''}`,
      {
        officerId: record.registeredById,
        relatedRecordId: record.clientRecordId,
        metadata: {
          kebeleId: record.kebeleId,
          woredaId: record.woredaId,
        },
      }
    ).catch(() => {});

    return record;
  }

  /**
   * Check local IndexedDB for potential duplicate registrations before submitting.
   */
  static async checkLocalDuplicates(
    fullName: string,
    dateOfBirth: string,
    phoneNumber?: string | null
  ): Promise<LocalDuplicateMatch[]> {
    const trimmedName = fullName.trim().toLowerCase();
    const matches: LocalDuplicateMatch[] = [];

    const allCitizens = await db.citizens.toArray();

    for (const citizen of allCitizens) {
      // 1. Check Full Name + Date of Birth collision
      if (
        citizen.fullName.trim().toLowerCase() === trimmedName &&
        citizen.dateOfBirth === dateOfBirth
      ) {
        matches.push({
          citizen,
          matchReason: 'EXACT_NAME_AND_DOB',
        });
        continue;
      }

      // 2. Check Phone Number collision (if phone number is provided)
      if (
        phoneNumber &&
        phoneNumber.trim().length > 6 &&
        citizen.phoneNumber &&
        citizen.phoneNumber.trim() === phoneNumber.trim()
      ) {
        matches.push({
          citizen,
          matchReason: 'PHONE_NUMBER',
        });
      }
    }

    return matches;
  }

  /**
   * Retrieve all local citizens, optionally filtered by status or search.
   */
  static async getCitizens(options?: {
    status?: SyncStatus;
    search?: string;
  }): Promise<LocalCitizenRecord[]> {
    let collection = db.citizens.orderBy('createdAt').reverse();

    let items = await collection.toArray();

    if (options?.status) {
      items = items.filter((c) => c.syncStatus === options.status);
    }

    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      items = items.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          (c.phoneNumber && c.phoneNumber.includes(q)) ||
          (c.kebeleName && c.kebeleName.toLowerCase().includes(q)) ||
          c.clientRecordId.toLowerCase().includes(q)
      );
    }

    return items;
  }

  /**
   * Get single citizen by local clientRecordId.
   */
  static async getCitizenByClientRecordId(
    clientRecordId: string
  ): Promise<LocalCitizenRecord | undefined> {
    return db.citizens.get(clientRecordId);
  }

  /**
   * Count how many records are awaiting synchronization.
   */
  static async getPendingCount(): Promise<number> {
    return db.citizens.where('syncStatus').equals('PENDING').count();
  }

  /**
   * Update sync status of a local citizen.
   */
  static async updateSyncStatus(
    clientRecordId: string,
    status: SyncStatus,
    serverId?: string,
    error?: string | null
  ): Promise<void> {
    const updateData: Partial<LocalCitizenRecord> = {
      syncStatus: status,
      updatedAt: new Date().toISOString(),
    };

    if (serverId) {
      updateData.id = serverId;
    }

    if (error !== undefined) {
      updateData.lastSyncError = error;
    }

    await db.citizens.update(clientRecordId, updateData);
  }
}

export default CitizenLocalService;
