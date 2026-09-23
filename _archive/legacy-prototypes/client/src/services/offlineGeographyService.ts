import db from '../db/index.ts';
import GeographicService from './geographicService.ts';
import { Region, Zone, Woreda, Kebele } from '../types/index.ts';
import fallbackHierarchy from '../data/ethiopiaHierarchy.json';

interface RawHierarchyZone {
  name: string;
  code: string;
  woredas: string[];
}

interface RawHierarchyRegion {
  name: string;
  code: string;
  description?: string;
  zones: RawHierarchyZone[];
}

const rawData: RawHierarchyRegion[] = fallbackHierarchy as unknown as RawHierarchyRegion[];

export class OfflineGeographyService {
  /**
   * Fetch Regions: Checks remote API first, caches result in IndexedDB; fallbacks to cache or bundled dataset if offline.
   */
  static async getRegions(): Promise<Region[]> {
    const cacheKey = 'geography_regions';

    if (navigator.onLine) {
      try {
        const remoteRegions = await GeographicService.getRegions();
        if (remoteRegions && remoteRegions.length > 0) {
          db.cachedGeography.put({
            key: cacheKey,
            data: remoteRegions,
            cachedAt: new Date().toISOString(),
          }).catch((e) => console.warn('Cache write failed:', e));
          return remoteRegions;
        }
      } catch (err) {
        console.warn('Failed to fetch remote regions, attempting cache fallback:', err);
      }
    }

    // Check local IndexedDB
    const cached = await db.cachedGeography.get(cacheKey);
    if (cached && cached.data && Array.isArray(cached.data) && cached.data.length > 0) {
      return cached.data as Region[];
    }

    // Bundled fallback for full offline reliability
    const fallbackRegions: Region[] = rawData.map((r) => ({
      id: r.code,
      name: r.name,
      code: r.code,
      description: r.description || null,
    }));

    return fallbackRegions;
  }

  /**
   * Fetch Zones for a Region: Checks remote API first, fallbacks to IndexedDB or bundled dataset.
   */
  static async getZonesByRegion(regionId: string): Promise<Zone[]> {
    if (!regionId) return [];
    const cacheKey = `geography_zones_${regionId}`;

    if (navigator.onLine) {
      try {
        const remoteZones = await GeographicService.getZonesByRegion(regionId);
        if (remoteZones && remoteZones.length > 0) {
          db.cachedGeography.put({
            key: cacheKey,
            data: remoteZones,
            cachedAt: new Date().toISOString(),
          }).catch((e) => console.warn('Cache write failed:', e));
          return remoteZones;
        }
      } catch (err) {
        console.warn('Failed to fetch remote zones, checking cache:', err);
      }
    }

    const cached = await db.cachedGeography.get(cacheKey);
    if (cached && cached.data && Array.isArray(cached.data) && cached.data.length > 0) {
      return cached.data as Zone[];
    }

    // Bundled fallback: match by region ID or region code or region name
    const cachedRegions = (await db.cachedGeography.get('geography_regions'))?.data as Region[] | undefined;
    const regionObj = cachedRegions?.find((r) => r.id === regionId);
    const regionCodeOrName = regionObj ? regionObj.code : regionId;

    const matchedRegion = rawData.find(
      (r) => r.code === regionCodeOrName || r.name.toLowerCase() === regionCodeOrName.toLowerCase()
    );

    if (matchedRegion) {
      return matchedRegion.zones.map((z) => ({
        id: z.code,
        name: z.name,
        code: z.code,
        regionId: regionId,
        description: null,
      }));
    }

    return [];
  }

  /**
   * Fetch Woredas for a Zone: Checks remote API first, fallbacks to IndexedDB or bundled dataset.
   */
  static async getWoredasByZone(zoneId: string): Promise<Woreda[]> {
    if (!zoneId) return [];
    const cacheKey = `geography_woredas_${zoneId}`;

    if (navigator.onLine) {
      try {
        const remoteWoredas = await GeographicService.getWoredasByZone(zoneId);
        if (remoteWoredas && remoteWoredas.length > 0) {
          db.cachedGeography.put({
            key: cacheKey,
            data: remoteWoredas,
            cachedAt: new Date().toISOString(),
          }).catch((e) => console.warn('Cache write failed:', e));
          return remoteWoredas;
        }
      } catch (err) {
        console.warn('Failed to fetch remote woredas, checking cache:', err);
      }
    }

    const cached = await db.cachedGeography.get(cacheKey);
    if (cached && cached.data && Array.isArray(cached.data) && cached.data.length > 0) {
      return cached.data as Woreda[];
    }

    // Find zone in bundled dataset
    for (const reg of rawData) {
      const matchedZone = reg.zones.find(
        (z) => z.code === zoneId || z.name.toLowerCase() === zoneId.toLowerCase()
      );
      if (matchedZone) {
        return matchedZone.woredas.map((wName, idx) => ({
          id: `WOR-${matchedZone.code.replace('ZN-', '')}-${String(idx + 1).padStart(2, '0')}`,
          name: wName,
          code: `WOR-${matchedZone.code.replace('ZN-', '')}-${String(idx + 1).padStart(2, '0')}`,
          zoneId: zoneId,
          description: null,
        }));
      }
    }

    return [];
  }

  /**
   * Fetch Kebeles for a Woreda: Checks remote API first, fallbacks to IndexedDB or synthesized kebeles.
   */
  static async getKebelesByWoreda(woredaId: string): Promise<Kebele[]> {
    if (!woredaId) return [];
    const cacheKey = `geography_kebeles_${woredaId}`;

    if (navigator.onLine) {
      try {
        const remoteKebeles = await GeographicService.getKebelesByWoreda(woredaId);
        if (remoteKebeles && remoteKebeles.length > 0) {
          db.cachedGeography.put({
            key: cacheKey,
            data: remoteKebeles,
            cachedAt: new Date().toISOString(),
          }).catch((e) => console.warn('Cache write failed:', e));
          return remoteKebeles;
        }
      } catch (err) {
        console.warn('Failed to fetch remote kebeles, checking cache:', err);
      }
    }

    const cached = await db.cachedGeography.get(cacheKey);
    if (cached && cached.data && Array.isArray(cached.data) && cached.data.length > 0) {
      return cached.data as Kebele[];
    }

    // Synthesized default kebeles for complete offline resilience
    return [
      { id: `KEB-${woredaId}-01`, name: 'Kebele 01', code: `KEB-${woredaId}-01`, woredaId, description: null },
      { id: `KEB-${woredaId}-02`, name: 'Kebele 02', code: `KEB-${woredaId}-02`, woredaId, description: null },
      { id: `KEB-${woredaId}-03`, name: 'Kebele 03', code: `KEB-${woredaId}-03`, woredaId, description: null },
    ];
  }

  /**
   * Pre-cache an officer's geographic path so all dropdowns work seamlessly offline.
   */
  static async precacheOfficerJurisdiction(
    regionId?: string | null,
    zoneId?: string | null,
    woredaId?: string | null
  ): Promise<void> {
    if (!navigator.onLine) return;

    try {
      await this.getRegions();
      if (regionId) await this.getZonesByRegion(regionId);
      if (zoneId) await this.getWoredasByZone(zoneId);
      if (woredaId) await this.getKebelesByWoreda(woredaId);
    } catch (err) {
      console.warn('Failed to pre-cache officer jurisdiction:', err);
    }
  }
}

export default OfflineGeographyService;
