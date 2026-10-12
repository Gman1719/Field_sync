import { Router, Request, Response } from 'express';
import prisma from '../config/db.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const SCREEN_TIME_FILE = path.join(DATA_DIR, 'screen_time.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (_e) {}
}

function readLocalScreenTime(): any[] {
  try {
    if (fs.existsSync(SCREEN_TIME_FILE)) {
      const content = fs.readFileSync(SCREEN_TIME_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading screen-time file:', err);
  }
  return [];
}

function writeLocalScreenTime(records: any[]): void {
  try {
    fs.writeFileSync(SCREEN_TIME_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing screen-time file:', err);
  }
}

const router = Router();

function mapToLegacyScreenTime(record: any) {
  return {
    id: record.id,
    employee_id: record.officerId,
    employee_name: record.officer?.fullName || record.employee_name || 'Field Officer',
    date: record.date,
    login_time: record.startedAt ? new Date(record.startedAt).toISOString() : record.login_time || new Date().toISOString(),
    logout_time: record.finalizedAt ? new Date(record.finalizedAt).toISOString() : record.logout_time || null,
    total_screen_time: record.totalEligibleSeconds ?? record.total_screen_time ?? 0,
    screen_time_limit: record.screen_time_limit || 28800, 
    trust_score: record.trust_score || 100,
    is_logged_in: record.status === 'TRACKING' || record.is_logged_in || false,
    verified: record.verified ?? true,
    verified_by: record.verified_by || 'system',
    created_at: record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString(),
    updated_at: record.updatedAt ? new Date(record.updatedAt).toISOString() : new Date().toISOString(),
  };
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const dbRecords = await prisma.dailyScreenTime.findMany({
      include: {
        officer: { select: { fullName: true } },
      },
      orderBy: { date: 'desc' },
      take: 200,
    });

    const mappedDbRecords = dbRecords.map(mapToLegacyScreenTime);
    const localRecords = readLocalScreenTime();

    const recordMap = new Map<string, any>();
    for (const r of mappedDbRecords) {
      recordMap.set(r.id, r);
    }
    for (const r of localRecords) {
      if (!recordMap.has(r.id)) {
        recordMap.set(r.id, r);
      }
    }

    const merged = Array.from(recordMap.values());
    res.json(merged);
  } catch (error: any) {
    console.warn('DB screen-time query failed, using local fallback:', error.message);
    const local = readLocalScreenTime();
    res.json(local);
  }
});

router.get('/employee/:employeeId', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    const dbRecords = await prisma.dailyScreenTime.findMany({
      where: {
        officerId: employeeId,
      },
      include: {
        officer: { select: { fullName: true } },
      },
      orderBy: { date: 'desc' },
    });

    const mapped = dbRecords.map(mapToLegacyScreenTime);
    const local = readLocalScreenTime().filter(
      (r) => String(r.employee_id || r.employeeId).toLowerCase() === employeeId.toLowerCase()
    );

    const recordMap = new Map<string, any>();
    for (const r of mapped) recordMap.set(r.id, r);
    for (const r of local) if (!recordMap.has(r.id)) recordMap.set(r.id, r);

    res.json(Array.from(recordMap.values()));
  } catch (error: any) {
    const local = readLocalScreenTime().filter(
      (r) => String(r.employee_id || r.employeeId).toLowerCase() === req.params.employeeId.toLowerCase()
    );
    res.json(local);
  }
});

const saveScreenTimeHandler = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const localRecord = {
      id: body.id || `st_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      employee_id: body.employee_id || body.employeeId || 'unknown',
      employee_name: body.employee_name || body.employeeName || 'Field Officer',
      date: body.date || new Date().toISOString().split('T')[0],
      login_time: body.login_time || body.loginTime || new Date().toISOString(),
      logout_time: body.logout_time || body.logoutTime || null,
      total_screen_time: body.total_screen_time ?? body.totalScreenTime ?? 0,
      screen_time_limit: body.screen_time_limit || 28800,
      trust_score: body.trust_score || 100,
      is_logged_in: body.is_logged_in ?? body.isLoggedIn ?? false,
      verified: body.verified ?? true,
      verified_by: body.verified_by || body.verifiedBy || 'system',
      created_at: body.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...body,
    };

    const localList = readLocalScreenTime();
    const idx = localList.findIndex((r) => r.id === localRecord.id);
    if (idx >= 0) {
      localList[idx] = { ...localList[idx], ...localRecord, updated_at: new Date().toISOString() };
    } else {
      localList.unshift(localRecord);
    }
    writeLocalScreenTime(localList);

    res.status(201).json({ success: true, data: localRecord });
  } catch (error: any) {
    console.error('Save screen time error:', error);
    res.status(500).json({ success: false, error: 'Failed to record screen time' });
  }
};

router.post('/', saveScreenTimeHandler);
router.post('/sync', saveScreenTimeHandler);

export default router;
