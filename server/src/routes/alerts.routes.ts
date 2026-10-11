// server/src/routes/alerts.routes.ts
// REST API Routes for Field Alerts, Broadcast Notifications & Urgent Operational Signals

import { Router, Request, Response } from 'express';
import prisma from '../config/db.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const ALERTS_FILE = path.join(DATA_DIR, 'alerts.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (_e) {}
}

export function readAlerts(): any[] {
  try {
    if (fs.existsSync(ALERTS_FILE)) {
      const content = fs.readFileSync(ALERTS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading alerts file:', err);
  }
  return [];
}

export function writeAlerts(alerts: any[]): void {
  try {
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(alerts, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing alerts file:', err);
  }
}

const router = Router();

// GET /api/alerts
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Attempt to merge Prisma Notifications if available
    let dbAlerts: any[] = [];
    try {
      const notifications = await prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      dbAlerts = notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        priority: n.priority || 'NORMAL',
        type: n.type || 'alert',
        timestamp: n.createdAt.toISOString(),
        read: n.isRead,
        target_all: !n.recipientId,
        target_employee_id: n.recipientId,
        sent_by: 'system',
        sent_by_name: 'FieldSync Operations',
        synced: true,
      }));
    } catch (_dbErr) {}

    const localAlerts = readAlerts();
    const map = new Map<string, any>();
    for (const a of dbAlerts) map.set(a.id, a);
    for (const a of localAlerts) if (!map.has(a.id)) map.set(a.id, a);

    res.json(Array.from(map.values()));
  } catch (error: any) {
    console.error('GET /api/alerts error:', error);
    res.json(readAlerts());
  }
});

// POST /api/alerts
router.post('/', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const alert = {
      id: body.id || `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: body.title || 'Operational Notice',
      message: body.message || '',
      priority: body.priority || 'NORMAL',
      type: body.type || 'system',
      timestamp: body.timestamp || new Date().toISOString(),
      read: body.read || false,
      target_all: body.target_all ?? body.targetAll ?? true,
      target_employee_id: body.target_employee_id || body.targetEmployeeId || null,
      sent_by: body.sent_by || body.sentBy || 'system',
      sent_by_name: body.sent_by_name || body.sentByName || 'System Dispatcher',
      synced: true,
      ...body,
    };

    const alerts = readAlerts();
    alerts.unshift(alert);
    writeAlerts(alerts);

    res.status(201).json(alert);
  } catch (error: any) {
    console.error('POST /api/alerts error:', error);
    res.status(500).json({ success: false, error: 'Failed to create alert' });
  }
});

// PATCH /api/alerts/:id/read
router.patch('/:id/read', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const alerts = readAlerts();
    const found = alerts.find((a) => a.id === id);
    if (found) {
      found.read = true;
      writeAlerts(alerts);
    }
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update alert' });
  }
});

export default router;
