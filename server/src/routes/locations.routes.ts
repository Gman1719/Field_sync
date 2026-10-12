import { Router, Request, Response } from 'express';
import prisma from '../config/db.js';

const router = Router();

router.get('/regions', async (_req: Request, res: Response): Promise<void> => {
  try {
    const regions = await prisma.region.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
      },
    });

    res.json({
      success: true,
      data: regions,
      count: regions.length,
    });
  } catch (error: any) {
    console.error('Fetch regions error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve regions' });
  }
});

router.get('/regions/:regionId/zones', async (req: Request, res: Response): Promise<void> => {
  try {
    const { regionId } = req.params;
    const zones = await prisma.zone.findMany({
      where: { regionId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        regionId: true,
        description: true,
      },
    });

    res.json({
      success: true,
      data: zones,
      count: zones.length,
    });
  } catch (error: any) {
    console.error('Fetch zones error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve zones' });
  }
});

router.get('/zones', async (req: Request, res: Response): Promise<void> => {
  try {
    const { regionId } = req.query;
    const where: any = {};
    if (regionId && typeof regionId === 'string') {
      where.regionId = regionId;
    }
    const zones = await prisma.zone.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        regionId: true,
        description: true,
      },
    });

    res.json({
      success: true,
      data: zones,
      count: zones.length,
    });
  } catch (error: any) {
    console.error('Fetch all zones error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve zones' });
  }
});

router.get('/zones/:zoneId/woredas', async (req: Request, res: Response): Promise<void> => {
  try {
    const { zoneId } = req.params;
    const woredas = await prisma.woreda.findMany({
      where: { zoneId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        zoneId: true,
        description: true,
      },
    });

    res.json({
      success: true,
      data: woredas,
      count: woredas.length,
    });
  } catch (error: any) {
    console.error('Fetch woredas error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve woredas' });
  }
});

router.get('/zones/:zoneId/supervisors', async (req: Request, res: Response): Promise<void> => {
  try {
    const { zoneId } = req.params;
    const supervisors = await prisma.user.findMany({
      where: {
        zoneId,
        role: 'SUPERVISOR',
        isActive: true,
      },
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        zoneId: true,
      },
    });

    res.json({
      success: true,
      data: supervisors.map((s) => ({
        id: s.id,
        name: s.fullName,
        fullName: s.fullName,
        email: s.email,
        phone: s.phoneNumber,
        phoneNumber: s.phoneNumber,
        zoneId: s.zoneId,
      })),
      count: supervisors.length,
    });
  } catch (error: any) {
    console.error('Fetch zone supervisors error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve zone supervisors' });
  }
});

router.get('/woredas/:woredaId/kebeles', async (req: Request, res: Response): Promise<void> => {
  try {
    const { woredaId } = req.params;
    const kebeles = await prisma.kebele.findMany({
      where: { woredaId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        woredaId: true,
        description: true,
      },
    });

    res.json({
      success: true,
      data: kebeles,
      count: kebeles.length,
    });
  } catch (error: any) {
    console.error('Fetch kebeles error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve kebeles' });
  }
});

router.get('/bundle', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [regions, zones, woredas, kebeles] = await Promise.all([
      prisma.region.findMany({ select: { id: true, name: true, code: true } }),
      prisma.zone.findMany({ select: { id: true, regionId: true, name: true, code: true } }),
      prisma.woreda.findMany({ select: { id: true, zoneId: true, name: true, code: true } }),
      prisma.kebele.findMany({ select: { id: true, woredaId: true, name: true, code: true } }),
    ]);

    res.json({
      success: true,
      data: {
        regions,
        zones,
        woredas,
        kebeles,
      },
      counts: {
        regions: regions.length,
        zones: zones.length,
        woredas: woredas.length,
        kebeles: kebeles.length,
      },
    });
  } catch (error: any) {
    console.error('Bundle locations error:', error);
    res.status(500).json({ success: false, error: 'Failed to bundle location hierarchy' });
  }
});

router.get('/hierarchy', async (_req: Request, res: Response): Promise<void> => {
  try {
    const hierarchy = await prisma.region.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        zones: {
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            code: true,
            woredas: {
              orderBy: { name: 'asc' },
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: hierarchy,
    });
  } catch (error: any) {
    console.error('Fetch hierarchy error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve location hierarchy' });
  }
});

export default router;
