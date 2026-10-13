import { Router, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPermissions } from './permissions.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const LEAVES_FILE = path.join(DATA_DIR, 'leaves.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (_e) {}
}

export function readLeaves(): any[] {
  try {
    if (fs.existsSync(LEAVES_FILE)) {
      const content = fs.readFileSync(LEAVES_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading leaves file:', err);
  }
  return [];
}

export function writeLeaves(leaves: any[]): void {
  try {
    fs.writeFileSync(LEAVES_FILE, JSON.stringify(leaves, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing leaves file:', err);
  }
}

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { employeeId, officerId, status } = req.query;
    let leaves = readLeaves();

    if (employeeId || officerId) {
      const targetId = String(employeeId || officerId).toLowerCase();
      leaves = leaves.filter(
        (l) =>
          String(l.employeeId || l.officerId || '').toLowerCase() === targetId ||
          String(l.submittedBy || '').toLowerCase() === targetId
      );
    }

    if (status && typeof status === 'string') {
      leaves = leaves.filter(
        (l) => String(l.status || '').toLowerCase() === status.toLowerCase()
      );
    }

    res.json(leaves);
  } catch (error: any) {
    console.error('GET /api/leaves error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve leaves' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const leaves = readLeaves();
    const item = leaves.find((l) => l.id === id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Leave request not found' });
      return;
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve leave request' });
  }
});

router.post('/', (req: Request, res: Response): void => {
  try {
    const body = req.body || {};
    const todayStr = new Date().toISOString().split('T')[0];
    const sDate = String(body.startDate || '').split('T')[0];
    const eDate = String(body.endDate || '').split('T')[0];
    const empId = String(body.employeeId || body.officerId || '').trim().toLowerCase();

    // 1. Past date validation
    if (sDate && sDate < todayStr) {
      res.status(400).json({ success: false, error: 'Start date cannot be in the past' });
      return;
    }
    if (eDate && eDate < todayStr) {
      res.status(400).json({ success: false, error: 'End date cannot be in the past' });
      return;
    }
    if (sDate && eDate && eDate < sDate) {
      res.status(400).json({ success: false, error: 'End date cannot be before start date' });
      return;
    }

    // 2. Overlap validation with existing leaves
    const leaves = readLeaves();
    const overlappingLeave = leaves.find((l) => {
      if (body.id && l.id === body.id) return false;
      const lEmp = String(l.employeeId || l.officerId || '').trim().toLowerCase();
      if (empId && lEmp && lEmp !== empId) return false;
      const st = String(l.status || '').toLowerCase();
      if (st !== 'pending' && st !== 'approved' && st !== 'active') return false;
      const ls = String(l.startDate || '').split('T')[0];
      const le = String(l.endDate || '').split('T')[0];
      if (!ls || !le) return false;
      return sDate <= le && eDate >= ls;
    });

    if (overlappingLeave) {
      res.status(400).json({
        success: false,
        error: `Conflicts with an existing ${overlappingLeave.status} leave request (${overlappingLeave.startDate} - ${overlappingLeave.endDate})`,
      });
      return;
    }

    // 3. Duplication validation with existing permissions
    const perms = readPermissions();
    const conflictingPerm = perms.find((p) => {
      const pEmp = String(p.employeeId || p.officerId || '').trim().toLowerCase();
      if (empId && pEmp && pEmp !== empId) return false;
      const st = String(p.status || '').toLowerCase();
      if (st !== 'pending' && st !== 'approved' && st !== 'active') return false;
      const pDate = String(p.date || '').split('T')[0];
      if (!pDate) return false;
      return pDate >= sDate && pDate <= eDate;
    });

    if (conflictingPerm) {
      res.status(400).json({
        success: false,
        error: `Duplicate conflict: You already requested permission on ${conflictingPerm.date}. Cannot request leave on the same date.`,
      });
      return;
    }

    const newRecord = {
      id: body.id || `leave_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      employeeId: body.employeeId || body.officerId || 'unknown',
      employeeName: body.employeeName || body.officerName || 'Staff Member',
      leaveType: body.leaveType || body.type || 'Annual',
      startDate: body.startDate || new Date().toISOString(),
      endDate: body.endDate || new Date().toISOString(),
      days: body.days || 1,
      reason: body.reason || '',
      status: body.status || 'Pending',
      rejectionReason: body.rejectionReason || '',
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: true,
      ...body,
    };

    const existingIndex = leaves.findIndex((l) => l.id === newRecord.id);

    if (existingIndex >= 0) {
      leaves[existingIndex] = { ...leaves[existingIndex], ...newRecord, updatedAt: new Date().toISOString() };
    } else {
      leaves.unshift(newRecord);
    }

    writeLeaves(leaves);
    res.status(201).json(newRecord);
  } catch (error: any) {
    console.error('POST /api/leaves error:', error);
    res.status(500).json({ success: false, error: 'Failed to create leave request' });
  }
});

// PATCH /api/leaves/:id or PUT /api/leaves/:id
const updateLeaveHandler = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const leaves = readLeaves();
    const index = leaves.findIndex((l) => l.id === id);

    if (index === -1) {
      // If not found, create it
      const created = {
        id,
        ...updates,
        updatedAt: new Date().toISOString(),
        synced: true,
      };
      leaves.unshift(created);
      writeLeaves(leaves);
      res.json(created);
      return;
    }

    leaves[index] = {
      ...leaves[index],
      ...updates,
      updatedAt: new Date().toISOString(),
      synced: true,
    };

    writeLeaves(leaves);
    res.json(leaves[index]);
  } catch (error: any) {
    console.error('Update leave error:', error);
    res.status(500).json({ success: false, error: 'Failed to update leave request' });
  }
};

router.patch('/:id', updateLeaveHandler);
router.put('/:id', updateLeaveHandler);

// DELETE /api/leaves/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let leaves = readLeaves();
    leaves = leaves.filter((l) => l.id !== id);
    writeLeaves(leaves);
    res.json({ success: true, message: 'Leave request deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to delete leave request' });
  }
});

export default router;
