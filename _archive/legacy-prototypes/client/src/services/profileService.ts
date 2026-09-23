import api from './api.ts';
import { User } from '../types/index.ts';

export class ProfileService {
  static async updateProfile(payload: {
    fullName?: string;
    phoneNumber?: string | null;
  }): Promise<User> {
    const res = await api.patch<{ success: boolean; data: User }>('/auth/profile', payload);
    return res.data.data;
  }

  static async updatePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    const res = await api.patch<{ success: boolean; message: string }>(
      '/auth/password',
      payload
    );
    return res.data;
  }
}

export default ProfileService;
