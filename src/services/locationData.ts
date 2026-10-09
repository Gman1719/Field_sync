// src/services/locationData.ts
// Robust Ethiopian Administrative Hierarchy caching & seeding utility for offline-first operation

import { offlineDb } from '../db/offlineDb';
import { API_BASE } from '../config/api';
import ethiopiaLocationsRaw from '../data/ethiopiaLocations.json';
import type { Region, Zone, Woreda, Kebele } from '../types/index';

let seedPromise: Promise<void> | null = null;

export async function ensureOfflineLocationsSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    try {
      const regionCount = await offlineDb.regions.count();
      if (regionCount > 0) {
        return;
      }

      // 1. If online, attempt to fetch live bundle from backend
      if (navigator.onLine) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2500);
          const bundleRes = await fetch(`${API_BASE}/locations/bundle`, {
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (bundleRes.ok) {
            const bundleData = await bundleRes.json();
            if (bundleData.success && bundleData.data) {
              await Promise.all([
                offlineDb.regions.bulkPut(bundleData.data.regions),
                offlineDb.zones.bulkPut(bundleData.data.zones),
                offlineDb.woredas.bulkPut(bundleData.data.woredas),
                offlineDb.kebeles.bulkPut(bundleData.data.kebeles),
              ]);
              return;
            }
          }
        } catch (_netErr) {
          // Backend offline or unreachable, fall back immediately to local bundle
        }
      }

      // 2. Offline fallback: Seed directly from bundled Ethiopian locations dataset
      const regions: Region[] = [];
      const zones: Zone[] = [];
      const woredas: Woreda[] = [];
      const kebeles: Kebele[] = [];

      for (const r of ethiopiaLocationsRaw as any[]) {
        regions.push({
          id: r.id,
          name: r.name,
          code: r.code,
          type: r.type || 'region',
        });

        for (const z of r.zones || []) {
          zones.push({
            id: z.id,
            regionId: r.id,
            name: z.name,
            code: z.code,
          });

          for (const w of z.woredas || []) {
            woredas.push({
              id: w.id,
              zoneId: z.id,
              name: w.name,
              code: w.code,
            });

            // Standard Kebeles (01 to 03) per Woreda
            for (let kIndex = 1; kIndex <= 3; kIndex++) {
              kebeles.push({
                id: `keb-${w.id}-${kIndex}`,
                woredaId: w.id,
                name: `${w.name} - Kebele 0${kIndex}`,
                code: `${w.code}-K0${kIndex}`,
              });
            }
          }
        }
      }

      await Promise.all([
        offlineDb.regions.bulkPut(regions),
        offlineDb.zones.bulkPut(zones),
        offlineDb.woredas.bulkPut(woredas),
        offlineDb.kebeles.bulkPut(kebeles),
      ]);
    } catch (err) {
      console.warn('Error seeding offline locations hierarchy:', err);
    } finally {
      seedPromise = null;
    }
  })();

  return seedPromise;
}
