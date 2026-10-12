import { Router, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const PERMISSIONS_FILE = path.join(DATA_DIR, 'permissions.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (_e) {}
}

export function readPermissions(): any[] {
  try {
    if (fs.existsSync(PERMISSIONS_FILE)) {
      const content = fs.readFileSync(PERMISSIONS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading permissions file:', err);
  }
  return [];
}

export function writePermissions(permissions: any[]): void {
  try {
    fs.writeFileSync(PERMISSIONS_FILE, JSON.stringify(permissions, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing permissions file:', err);
  }
}

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { employeeId, officerId, status } = req.query;
    let perms = readPermissions();

    if (employeeId || officerId) {
      const targetId = String(employeeId || officerId).toLowerCase();
      perms = perms.filter(
        (p) =>
          String(p.employeeId || p.officerId || '').toLowerCase() === targetId ||
          String(p.submittedBy || '').toLowerCase() === targetId
      );
    }

    if (status && typeof status === 'string') {
      perms = perms.filter(
        (p) => String(p.status || '').toLowerCase() === status.toLowerCase()
      );
    }

    res.json(perms);
  } catch (error: any) {
    console.error('GET /api/permissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve permissions' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const perms = readPermissions();
    const item = perms.find((p) => p.id === id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Permission request not found' });
      return;
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve permission request' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const newRecord = {
      id: body.id || `perm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      employeeId: body.employeeId || body.officerId || 'unknown',
      employeeName: body.employeeName || body.officerName || 'Staff Member',
      permissionType: body.permissionType || body.type || 'Personal',
      date: body.date || new Date().toISOString().split('T')[0],
      startTime: body.startTime || '09:00',
      endTime: body.endTime || '12:00',
      reason: body.reason || '',
      status: body.status || 'Pending',
      rejectionReason: body.rejectionReason || '',
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: true,
      ...body,
    };

    const perms = readPermissions();
    const existingIndex = perms.findIndex((p) => p.id === newRecord.id);

    if (existingIndex >= 0) {
      perms[existingIndex] = { ...perms[existingIndex], ...newRecord, updatedAt: new Date().toISOString() };
    } else {
      perms.unshift(newRecord);
    }

    writePermissions(perms);
    res.status(201).json(newRecord);
  } catch (error: any) {
    console.error('POST /api/permissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to create permission request' });
  }
});

// PATCH /api/permissions/:id or PUT /api/permissions/:id
const updatePermissionHandler = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const perms = readPermissions();
    const index = perms.findIndex((p) => p.id === id);

    if (index === -1) {
      const created = {
        id,
        ...updates,
        updatedAt: new Date().toISOString(),
        synced: true,
      };
      perms.unshift(created);
      writePermissions(perms);
      res.json(created);
      return;
    }

    perms[index] = {
      ...perms[index],
      ...updates,
      updatedAt: new Date().toISOString(),
      synced: true,
    };

    writePermissions(perms);
    res.json(perms[index]);
  } catch (error: any) {
    console.error('Update permission error:', error);
    res.status(500).json({ success: false, error: 'Failed to update permission request' });
  }
};

router.patch('/:id', updatePermissionHandler);
router.put('/:id', updatePermissionHandler);

// DELETE /api/permissions/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let perms = readPermissions();
    perms = perms.filter((p) => p.id !== id);
    writePermissions(perms);
    res.json({ success: true, message: 'Permission request deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to delete permission request' });
  }
});

export default router;
