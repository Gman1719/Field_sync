// routes/permissions.js
// Comprehensive Permission Request Management API for FieldSync
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Helper to convert "HH:mm" to total minutes from midnight
function timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return -1;
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return -1;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return -1;
    return h * 60 + m;
}

// Helper to validate date YYYY-MM-DD
function isValidDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const d = new Date(dateStr);
    return d instanceof Date && !isNaN(d.getTime());
}

// Ensure schema columns exist
const ensureTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS permissions (
                id VARCHAR(50) PRIMARY KEY,
                employee_id VARCHAR(50) NOT NULL,
                employee_name VARCHAR(100),
                supervisor_id VARCHAR(50),
                permission_date DATE,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                start_time VARCHAR(10),
                end_time VARCHAR(10),
                duration_minutes INTEGER DEFAULT 0,
                reason TEXT NOT NULL,
                type VARCHAR(50),
                permission_type VARCHAR(50),
                status VARCHAR(50) DEFAULT 'pending',
                attachment_name VARCHAR(255),
                attachment_data TEXT,
                decision_note TEXT,
                decided_by VARCHAR(50),
                decided_by_name VARCHAR(100),
                decided_at TIMESTAMP WITH TIME ZONE,
                requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                approved_by VARCHAR(50),
                approved_at TIMESTAMP WITH TIME ZONE,
                synced BOOLEAN DEFAULT true,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE permissions ADD COLUMN IF NOT EXISTS permission_date DATE;
            ALTER TABLE permissions ADD COLUMN IF NOT EXISTS start_time VARCHAR(10);
            ALTER TABLE permissions ADD COLUMN IF NOT EXISTS end_time VARCHAR(10);
            ALTER TABLE permissions ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0;
            ALTER TABLE permissions ADD COLUMN IF NOT EXISTS supervisor_id VARCHAR(50);
            ALTER TABLE permissions ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255);
            ALTER TABLE permissions ADD COLUMN IF NOT EXISTS attachment_data TEXT;
            ALTER TABLE permissions ADD COLUMN IF NOT EXISTS decision_note TEXT;
            ALTER TABLE permissions ADD COLUMN IF NOT EXISTS decided_by VARCHAR(50);
            ALTER TABLE permissions ADD COLUMN IF NOT EXISTS decided_by_name VARCHAR(100);
            ALTER TABLE permissions ADD COLUMN IF NOT EXISTS decided_at TIMESTAMP WITH TIME ZONE;
        `);
    } catch (e) {
        console.warn('Permissions table initialization notice:', e.message);
    }
};

ensureTable().catch(() => {});

// GET /api/permissions - Fetch permissions with optional filtering
router.get('/', async (req, res) => {
    try {
        const { employeeId, supervisorId, status, date } = req.query;
        let query = 'SELECT * FROM permissions';
        const params = [];
        const conditions = [];

        if (employeeId) {
            params.push(employeeId);
            conditions.push(`employee_id = $${params.length}`);
        }
        if (supervisorId) {
            params.push(supervisorId);
            conditions.push(`(supervisor_id = $${params.length} OR employee_id IN (SELECT id FROM users WHERE supervisor_id = $${params.length}))`);
        }
        if (status) {
            params.push(status.toLowerCase());
            conditions.push(`LOWER(status) = $${params.length}`);
        }
        if (date) {
            params.push(date);
            conditions.push(`(permission_date = $${params.length} OR start_date = $${params.length})`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY requested_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/permissions - Create or upsert permission with strict validations
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        const employeeId = data.employeeId || data.officerId;
        const employeeName = data.employeeName || 'Field Officer';
        const supervisorId = data.supervisorId || null;
        const permDate = data.date || data.permissionDate || data.startDate;
        const startTime = (data.startTime || '').trim();
        const endTime = (data.endTime || '').trim();
        const reason = (data.reason || '').trim();
        const id = data.id || `perm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const status = (data.status || 'pending').toLowerCase();
        const attachmentName = data.attachmentName || null;
        const attachmentData = data.attachmentData || data.attachmentUrl || null;
        const type = data.type || data.permissionType || 'official';

        // 1. Basic field validations
        if (!employeeId) {
            return res.status(400).json({ error: 'Employee / Officer ID is required.' });
        }
        if (!isValidDate(permDate)) {
            return res.status(400).json({ error: 'Permission date is required and must be a valid date (YYYY-MM-DD).' });
        }
        if (!startTime || !endTime) {
            return res.status(400).json({ error: 'Start time and end time are required.' });
        }

        const startMins = timeToMinutes(startTime);
        const endMins = timeToMinutes(endTime);

        if (startMins < 0 || endMins < 0) {
            return res.status(400).json({ error: 'Invalid time format. Please provide valid HH:mm times.' });
        }
        if (endMins <= startMins) {
            return res.status(400).json({ error: 'End time must be later than start time.' });
        }

        // 2. Working Hours Enforcement: 08:30 (510 min) to 17:30 (1050 min)
        const WORK_START = 510;  // 08:30
        const WORK_END = 1050;   // 17:30
        const LUNCH_START = 750; // 12:30
        const LUNCH_END = 810;   // 13:30

        if (startMins < WORK_START || endMins > WORK_END) {
            return res.status(400).json({
                error: 'Permission time must fall strictly within official working hours (8:30 AM – 5:30 PM).'
            });
        }

        // 3. Lunch break rule: Do not allow permission requests entirely inside lunch period
        if (startMins >= LUNCH_START && endMins <= LUNCH_END) {
            return res.status(400).json({
                error: 'Permission cannot be requested entirely during official lunch break (12:30 PM – 1:30 PM) as it is already non-working time.'
            });
        }

        // 4. Reason validation
        if (!reason || reason.length < 5) {
            return res.status(400).json({
                error: 'Reason is required and must contain meaningful text (minimum 5 characters).'
            });
        }

        const durationMinutes = endMins - startMins;

        // 5. Check if the officer already has an active or pending leave on this date
        const leaveCheck = await pool.query(`
            SELECT id, type, start_date, end_date, status 
            FROM leaves 
            WHERE employee_id = $1 
              AND status IN ('pending', 'approved') 
              AND start_date <= $2 AND end_date >= $2
            LIMIT 1
        `, [employeeId, permDate]);

        if (leaveCheck.rows.length > 0) {
            const exLeave = leaveCheck.rows[0];
            return res.status(400).json({
                error: `Cannot request permission: You already have an active ${exLeave.type} leave on ${permDate} (Status: ${exLeave.status}).`
            });
        }

        // 6. Prevent duplicate or overlapping approved/pending permission requests
        const overlapQuery = `
            SELECT id, start_time, end_time, status 
            FROM permissions 
            WHERE employee_id = $1 
              AND (permission_date = $2 OR start_date = $2)
              AND status IN ('pending', 'approved') 
              AND id != $3
        `;
        const overlapRes = await pool.query(overlapQuery, [employeeId, permDate, id]);

        for (const row of overlapRes.rows) {
            const exStart = timeToMinutes(row.start_time);
            const exEnd = timeToMinutes(row.end_time);
            if (exStart >= 0 && exEnd >= 0) {
                // Check if ranges overlap: [startMins, endMins] with [exStart, exEnd]
                if (startMins < exEnd && endMins > exStart) {
                    return res.status(400).json({
                        error: `An active or pending permission request already exists overlapping this time period (${row.start_time} – ${row.end_time}, Status: ${row.status}).`
                    });
                }
            }
        }

        // 7. Insert or upsert into database
        const query = `
            INSERT INTO permissions (
                id, employee_id, employee_name, supervisor_id,
                permission_date, start_date, end_date,
                start_time, end_time, duration_minutes,
                reason, type, permission_type, status,
                attachment_name, attachment_data, requested_at, synced, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $5, $5, $6, $7, $8, $9, $10, $10, $11, $12, $13, CURRENT_TIMESTAMP, true, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
                employee_id = EXCLUDED.employee_id,
                employee_name = EXCLUDED.employee_name,
                supervisor_id = EXCLUDED.supervisor_id,
                permission_date = EXCLUDED.permission_date,
                start_date = EXCLUDED.start_date,
                end_date = EXCLUDED.end_date,
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time,
                duration_minutes = EXCLUDED.duration_minutes,
                reason = EXCLUDED.reason,
                type = EXCLUDED.type,
                permission_type = EXCLUDED.permission_type,
                status = EXCLUDED.status,
                attachment_name = COALESCE(EXCLUDED.attachment_name, permissions.attachment_name),
                attachment_data = COALESCE(EXCLUDED.attachment_data, permissions.attachment_data),
                synced = true,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const result = await pool.query(query, [
            id, employeeId, employeeName, supervisorId,
            permDate, startTime, endTime, durationMinutes,
            reason, type, status, attachmentName, attachmentData
        ]);

        // 8. Create notification for Supervisor
        if (supervisorId) {
            try {
                await pool.query(`
                    INSERT INTO notifications (id, user_id, title, message, type, is_read, action_url)
                    VALUES ($1, $2, $3, $4, 'PERMISSION_REQUEST', false, '/permissions')
                `, [
                    `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    supervisorId,
                    'New Permission Request Submitted',
                    `${employeeName} requested permission for ${permDate} (${startTime} – ${endTime}).`
                ]);
            } catch (_) {}
        }

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating permission request:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/permissions/:id - Decision update (Approve / Reject) or Cancellation
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const status = (data.status || '').toLowerCase();
        const decisionNote = (data.decisionNote || data.rejectionReason || data.remarks || '').trim();
        const decidedBy = data.decidedBy || data.approvedBy || null;
        const decidedByName = data.decidedByName || null;

        // Validation for decision actions
        if (status === 'rejected' && (!decisionNote || decisionNote.length < 3)) {
            return res.status(400).json({ error: 'A rejection reason / decision note is required when rejecting a request.' });
        }

        // Fetch existing permission
        const existingRes = await pool.query('SELECT * FROM permissions WHERE id = $1', [id]);
        if (existingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Permission request not found.' });
        }
        const existing = existingRes.rows[0];

        // If cancelling, ensure it was pending
        if (status === 'cancelled' && existing.status !== 'pending') {
            return res.status(400).json({ error: `Cannot cancel a permission request that has already been ${existing.status}.` });
        }

        const result = await pool.query(
            `UPDATE permissions SET
                status = COALESCE($1, status),
                decision_note = COALESCE($2, decision_note),
                decided_by = COALESCE($3, decided_by),
                decided_by_name = COALESCE($4, decided_by_name),
                decided_at = CURRENT_TIMESTAMP,
                approved_by = COALESCE($3, approved_by),
                approved_at = CURRENT_TIMESTAMP,
                synced = true,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *`,
            [status || null, decisionNote || null, decidedBy, decidedByName, id]
        );

        const updated = result.rows[0];

        // Notify officer of supervisor decision
        if (status === 'approved' || status === 'rejected') {
            try {
                const pDate = updated.permission_date
                    ? (updated.permission_date.toISOString ? updated.permission_date.toISOString().slice(0, 10) : updated.permission_date)
                    : (updated.start_date.toISOString ? updated.start_date.toISOString().slice(0, 10) : updated.start_date);
                const decisionTitle = status === 'approved' ? 'Permission Request Approved' : 'Permission Request Rejected';
                const decisionMsg = status === 'approved'
                    ? `Your permission on ${pDate} (${updated.start_time} – ${updated.end_time}) was approved.${decisionNote ? ` Note: ${decisionNote}` : ''}`
                    : `Your permission on ${pDate} (${updated.start_time} – ${updated.end_time}) was rejected. Reason: ${decisionNote}`;

                await pool.query(`
                    INSERT INTO notifications (id, user_id, title, message, type, is_read, action_url)
                    VALUES ($1, $2, $3, $4, 'PERMISSION_DECISION', false, '/permissions')
                `, [
                    `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    updated.employee_id,
                    decisionTitle,
                    decisionMsg
                ]);
            } catch (_) {}
        }

        res.json(updated);
    } catch (error) {
        console.error('Error updating permission request:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
