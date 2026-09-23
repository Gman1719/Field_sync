import api from './api.ts';

export interface DashboardStats {
  totalCitizens: number;
  activeOfficers: number;
  duplicateAlerts: number;
  recentCitizens: Array<{
    id: string;
    fullName: string;
    dateOfBirth: string;
    gender: string;
    woreda?: { name: string };
    kebele?: { name: string };
    syncStatus: string;
    createdAt: string;
  }>;
}

export interface DemographicsData {
  total: number;
  genderDistribution: Array<{ name: string; value: number }>;
  regionalDistribution: Array<{ name: string; value: number }>;
  ageBrackets: Array<{ bracket: string; count: number }>;
}

export class StatsService {
  static async getDashboardStats(): Promise<DashboardStats> {
    const res = await api.get<{ success: boolean; data: DashboardStats }>('/stats/dashboard');
    return res.data.data;
  }

  static async getDemographics(): Promise<DemographicsData> {
    const res = await api.get<{ success: boolean; data: DemographicsData }>('/stats/demographics');
    return res.data.data;
  }
}

export default StatsService;
