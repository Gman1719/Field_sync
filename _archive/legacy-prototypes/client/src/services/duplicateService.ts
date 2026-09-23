import api from './api.ts';

export type DuplicateReviewStatus =
  | 'PENDING_REVIEW'
  | 'CONFIRMED_DUPLICATE'
  | 'RESOLVED_AS_VALID';

export interface DuplicateReviewItem {
  id: string;
  citizenId: string;
  suspectedDuplicateId?: string | null;
  status: DuplicateReviewStatus;
  matchReason: string;
  notes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  citizen: {
    id: string;
    fullName: string;
    dateOfBirth: string;
    gender: string;
    phoneNumber?: string | null;
    address: string;
    region?: { name: string };
    zone?: { name: string };
    woreda?: { name: string };
    kebele?: { name: string };
    registeredBy?: { fullName: string; email: string };
    clientRecordId?: string;
  };
  suspectedDuplicate?: {
    id: string;
    fullName: string;
    dateOfBirth: string;
    gender: string;
    phoneNumber?: string | null;
    address: string;
    region?: { name: string };
    zone?: { name: string };
    woreda?: { name: string };
    kebele?: { name: string };
    registeredBy?: { fullName: string; email: string };
  } | null;
  reviewer?: {
    fullName: string;
    role: string;
  } | null;
}

export class DuplicateService {
  static async getDuplicates(status?: string): Promise<DuplicateReviewItem[]> {
    const res = await api.get<{ success: boolean; data: DuplicateReviewItem[] }>('/duplicates', {
      params: { status },
    });
    return res.data.data;
  }

  static async resolveDuplicate(
    id: string,
    status: DuplicateReviewStatus,
    notes?: string
  ): Promise<DuplicateReviewItem> {
    const res = await api.patch<{ success: boolean; data: DuplicateReviewItem }>(
      `/duplicates/${id}/resolve`,
      { status, notes }
    );
    return res.data.data;
  }
}

export default DuplicateService;
