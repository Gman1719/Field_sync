import api from './api.ts';
import { Region, Zone, Woreda, Kebele } from '../types/index.ts';

export interface SupervisorOption {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
}

export class GeographicService {
  // 1. Fetch all Regions
  static async getRegions(): Promise<Region[]> {
    const res = await api.get<{ success: boolean; data: Region[] }>('/geography/regions');
    return res.data.data;
  }

  // 2. Fetch Zones in a Region
  static async getZonesByRegion(regionId: string): Promise<Zone[]> {
    const res = await api.get<{ success: boolean; data: Zone[] }>(
      `/geography/regions/${regionId}/zones`
    );
    return res.data.data;
  }

  // 3. Fetch Woredas in a Zone
  static async getWoredasByZone(zoneId: string): Promise<Woreda[]> {
    const res = await api.get<{ success: boolean; data: Woreda[] }>(
      `/geography/zones/${zoneId}/woredas`
    );
    return res.data.data;
  }

  // 4. Fetch Kebeles in a Woreda
  static async getKebelesByWoreda(woredaId: string): Promise<Kebele[]> {
    const res = await api.get<{ success: boolean; data: Kebele[] }>(
      `/geography/woredas/${woredaId}/kebeles`
    );
    return res.data.data;
  }

  // 5. Fetch Active Supervisors stationed in a Woreda
  static async getSupervisorsByWoreda(woredaId: string): Promise<SupervisorOption[]> {
    const res = await api.get<{ success: boolean; data: SupervisorOption[] }>(
      `/geography/woredas/${woredaId}/supervisors`
    );
    return res.data.data;
  }
}

export default GeographicService;
