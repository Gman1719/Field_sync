import api from './api.ts';

export interface AuditLogItem {
  id: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  createdAt: string;
  actor?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
}

export class AuditService {
  static async getAuditLogs(params?: {
    action?: string;
    entityType?: string;
    limit?: number;
  }): Promise<AuditLogItem[]> {
    const res = await api.get<{ success: boolean; data: AuditLogItem[] }>('/audit-logs', {
      params,
    });
    return res.data.data;
  }
}

export default AuditService;
