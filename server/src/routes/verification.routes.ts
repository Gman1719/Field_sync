import { Router, Request, Response } from 'express';
import prisma from '../config/db.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const VERIFICATION_FILE = path.join(DATA_DIR, 'verification.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (_e) {}
}

export function readVerifications(): any[] {
  try {
    if (fs.existsSync(VERIFICATION_FILE)) {
      const content = fs.readFileSync(VERIFICATION_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading verification file:', err);
  }
  return [];
}

export function writeVerifications(records: any[]): void {
  try {
    fs.writeFileSync(VERIFICATION_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing verification file:', err);
  }
}

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    let dbVerifications: any[] = [];
    try {
      const records = await prisma.workVerification.findMany({
        include: {
          officer: { select: { fullName: true } },
        },
        orderBy: { scheduledAt: 'desc' },
        take: 100,
      });

      dbVerifications = records.map((v: any) => ({
        id: v.id,
        officer_id: v.officerId,
        officer_name: v.officer?.fullName || 'Field Officer',
        question: 'Periodic presence and work integrity check',
        answer: v.status === 'CONFIRMED' || v.status === 'CONFIRMED_OFFLINE' ? 'Confirmed' : 'Missed',
        success: v.status === 'CONFIRMED' || v.status === 'CONFIRMED_OFFLINE',
        score: v.status === 'CONFIRMED' ? 100 : 0,
        response_time: v.responseTimeSeconds || 12,
        timestamp: v.respondedAt ? v.respondedAt.toISOString() : v.scheduledAt.toISOString(),
        message: v.notes || (v.status === 'CONFIRMED' ? 'Verification passed successfully' : 'Verification check missed'),
        penalties: [],
        synced: true,
      }));
    } catch (_dbErr) {}

    const localRecords = readVerifications();
    const map = new Map<string, any>();
    for (const v of dbVerifications) map.set(v.id, v);
    for (const v of localRecords) if (!map.has(v.id)) map.set(v.id, v);

    res.json(Array.from(map.values()));
  } catch (error: any) {
    console.error('GET /api/verification error:', error);
    res.json(readVerifications());
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const newRecord = {
      id: body.id || `ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      officer_id: body.officer_id || body.officerId || 'unknown',
      officer_name: body.officer_name || body.officerName || 'Field Officer',
      question: body.question || 'Standard operational verification prompt',
      answer: body.answer || 'Confirmed',
      success: body.success ?? true,
      score: body.score ?? 100,
      response_time: body.response_time ?? body.responseTime ?? 10,
      timestamp: body.timestamp || new Date().toISOString(),
      message: body.message || 'Verification recorded successfully',
      penalties: body.penalties || [],
      synced: true,
      ...body,
    };

    const verifications = readVerifications();
    const existingIdx = verifications.findIndex((v) => v.id === newRecord.id);
    if (existingIdx >= 0) {
      verifications[existingIdx] = { ...verifications[existingIdx], ...newRecord };
    } else {
      verifications.unshift(newRecord);
    }
    writeVerifications(verifications);

    res.status(201).json(newRecord);
  } catch (error: any) {
    console.error('POST /api/verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to record verification' });
  }
});

export default router;
