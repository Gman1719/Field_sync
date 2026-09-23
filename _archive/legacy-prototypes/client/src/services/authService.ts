import api from './api.ts';
import { User } from '../types/index.ts';

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
  error?: string;
}

export interface MeResponse {
  success: boolean;
  data: User;
  error?: string;
}

export class AuthService {
  static async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    const { user, token } = response.data.data;
    localStorage.setItem('fieldsync_token', token);
    localStorage.setItem('fieldsync_user', JSON.stringify(user));

    return { user, token };
  }

  static async getMe(): Promise<User> {
    const response = await api.get<MeResponse>('/auth/me');
    const user = response.data.data;
    localStorage.setItem('fieldsync_user', JSON.stringify(user));
    return user;
  }

  static async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('fieldsync_token');
      localStorage.removeItem('fieldsync_user');
    }
  }

  static getStoredUser(): User | null {
    try {
      const stored = localStorage.getItem('fieldsync_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  static getStoredToken(): string | null {
    return localStorage.getItem('fieldsync_token');
  }
}

export default AuthService;
