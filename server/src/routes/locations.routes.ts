// server/src/routes/locations.routes.ts
// Ethiopian Administrative Division Endpoints (Region -> Zone -> Woreda -> Kebele)

import { Router, Request, Response } from 'express';
import prisma from '../config/db.js';

const router = Router();

/**
 * @route   GET /api/locations/regions
 * @desc    Get all administrative regions and chartered cities
 * @access  Public / Authenticated
 */
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

/**
 * @route   GET /api/locations/regions/:regionId/zones
 * @desc    Get all administrative zones within a specified region
 * @access  Public / Authenticated
 */
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

/**
 * @route   GET /api/locations/zones/:zoneId/woredas
 * @desc    Get all woredas / sub-city districts within a specified zone
 * @access  Public / Authenticated
 */
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

/**
 * @route   GET /api/locations/zones/:zoneId/supervisors
 * @desc    Get all active supervisors stationed in a specific administrative zone
 * @access  Public / Authenticated
 */
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

/**
 * @route   GET /api/locations/woredas/:woredaId/kebeles
 * @desc    Get all kebeles within a specified woreda
 * @access  Public / Authenticated
 */
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

/**
 * @route   GET /api/locations/bundle
 * @desc    Download complete location dataset for client offline Dexie caching
 * @access  Public / Authenticated
 */
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

/**
 * @route   GET /api/locations/hierarchy
 * @desc    Nested administrative hierarchy (Region -> Zones -> Woredas)
 * @access  Public / Authenticated
 */
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
