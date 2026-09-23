import api from './api.ts';
import { User, Role } from '../types/index.ts';

export interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  phoneNumber?: string | null;
  regionId?: string | null;
  zoneId?: string | null;
  woredaId?: string | null;
  kebeleId?: string | null;
  supervisorId?: string | null;
  isActive?: boolean;
}

export class UserService {
  static async getUsers(params?: {
    role?: string;
    regionId?: string;
    zoneId?: string;
    woredaId?: string;
    search?: string;
  }): Promise<User[]> {
    const res = await api.get<{ success: boolean; data: User[] }>('/users', { params });
    return res.data.data;
  }

  static async createUser(payload: CreateUserPayload): Promise<User> {
    const res = await api.post<{ success: boolean; data: User }>('/users', payload);
    return res.data.data;
  }

  static async toggleUserStatus(userId: string, isActive: boolean): Promise<User> {
    const res = await api.patch<{ success: boolean; data: User }>(`/users/${userId}/status`, {
      isActive,
    });
    return res.data.data;
  }
}

export default UserService;
