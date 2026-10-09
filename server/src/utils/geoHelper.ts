// server/src/utils/geoHelper.ts
// Helper to guarantee that Region, Zone, Woreda, and Kebele records exist in PostgreSQL
// preventing Foreign Key constraint violations during offline sync and direct registration.

import prisma from '../config/db.js';

export async function ensureGeographicHierarchy(data: {
  regionId?: string | null;
  regionName?: string | null;
  zoneId?: string | null;
  zoneName?: string | null;
  woredaId?: string | null;
  woredaName?: string | null;
  kebeleId?: string | null;
  kebeleName?: string | null;
}) {
  const { regionId, zoneId, woredaId, kebeleId } = data;
  if (!regionId || !zoneId || !woredaId || !kebeleId) return;

  try {
    // 1. Ensure Region exists
    const regName = data.regionName || regionId.replace('reg-', '').replace(/-/g, ' ');
    const regCode = regionId.replace('reg-', '').substring(0, 4).toUpperCase();
    await prisma.region.upsert({
      where: { id: regionId },
      update: {},
      create: {
        id: regionId,
        name: regName,
        code: regCode,
      },
    });

    // 2. Ensure Zone exists
    const zName = data.zoneName || zoneId.replace('zone-', '').replace(/-/g, ' ');
    const zCode = zoneId.replace('zone-', '').substring(0, 6).toUpperCase();
    await prisma.zone.upsert({
      where: { id: zoneId },
      update: { regionId },
      create: {
        id: zoneId,
        name: zName,
        code: zCode,
        regionId,
      },
    });

    // 3. Ensure Woreda exists
    const wName = data.woredaName || woredaId.replace('wor-', '').replace(/-/g, ' ');
    const wCode = woredaId.replace('wor-', '').substring(0, 10).toUpperCase();
    await prisma.woreda.upsert({
      where: { id: woredaId },
      update: { zoneId },
      create: {
        id: woredaId,
        name: wName,
        code: wCode,
        zoneId,
      },
    });

    // 4. Ensure Kebele exists
    const kName = data.kebeleName || kebeleId.replace('keb-', '').replace(/-/g, ' ');
    const kCode = kebeleId.replace('keb-', '').substring(0, 12).toUpperCase();
    await prisma.kebele.upsert({
      where: { id: kebeleId },
      update: { woredaId },
      create: {
        id: kebeleId,
        name: kName,
        code: kCode,
        woredaId,
      },
    });
  } catch (err: any) {
    console.warn('Geographic hierarchy auto-ensure warning:', err.message);
  }
}
