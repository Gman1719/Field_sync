// routes/leaves.js
// Comprehensive Leave Request Management API for FieldSync
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Ensure schema columns exist
const ensureTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS leaves (
                id VARCHAR(50) PRIMARY KEY,
                employee_id VARCHAR(50) NOT NULL,
                employee_name VARCHAR(100),
                supervisor_id VARCHAR(50),
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                reason TEXT NOT NULL,
                type VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                attachment_name VARCHAR(255),
                attachment_data TEXT,
                decision_note TEXT,
                decided_by VARCHAR(50),
                decided_by_name VARCHAR(100),
                decided_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                approved_by VARCHAR(50),
                approved_at TIMESTAMP WITH TIME ZONE,
                synced BOOLEAN DEFAULT true,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE leaves ADD COLUMN IF NOT EXISTS supervisor_id VARCHAR(50);
            ALTER TABLE leaves ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255);
            ALTER TABLE leaves ADD COLUMN IF NOT EXISTS attachment_data TEXT;
            ALTER TABLE leaves ADD COLUMN IF NOT EXISTS decision_note TEXT;
            ALTER TABLE leaves ADD COLUMN IF NOT EXISTS decided_by VARCHAR(50);
            ALTER TABLE leaves ADD COLUMN IF NOT EXISTS decided_by_name VARCHAR(100);
            ALTER TABLE leaves ADD COLUMN IF NOT EXISTS decided_at TIMESTAMP WITH TIME ZONE;
        `);
    } catch (e) {
        console.warn('Leaves table initialization notice:', e.message);
    }
};

ensureTable().catch(() => {});

const VALID_LEAVE_TYPES = ['annual', 'sick', 'emergency', 'personal', 'other'];

// Helper to validate date string YYYY-MM-DD
function isValidDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const d = new Date(dateStr);
    return d instanceof Date && !isNaN(d.getTime());
}

// GET /api/leaves - Fetch leaves with optional filtering
router.get('/', async (req, res) => {
    try {
        const { employeeId, supervisorId, status } = req.query;
        let query = 'SELECT * FROM leaves';
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

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching leaves:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/leaves - Create or upsert leave request with strict validation
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        const employeeId = data.employeeId || data.officerId;
        const employeeName = data.employeeName || 'Field Officer';
        const supervisorId = data.supervisorId || null;
        const type = (data.type || '').trim().toLowerCase();
        const startDate = data.startDate;
        const endDate = data.endDate;
        const reason = (data.reason || '').trim();
        const id = data.id || `leave_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const status = (data.status || 'pending').toLowerCase();
        const attachmentName = data.attachmentName || null;
        const attachmentData = data.attachmentData || data.attachmentUrl || null;

        // 1. Validate required fields
        if (!employeeId) {
            return res.status(400).json({ error: 'Employee / Officer ID is required.' });
        }
        if (!type || !VALID_LEAVE_TYPES.includes(type)) {
            return res.status(400).json({
                error: `Invalid leave type. Must be one of: ${VALID_LEAVE_TYPES.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}.`
            });
        }
        if (!isValidDate(startDate)) {
            return res.status(400).json({ error: 'Start date is required and must be a valid date (YYYY-MM-DD).' });
        }
        if (!isValidDate(endDate)) {
            return res.status(400).json({ error: 'End date is required and must be a valid date (YYYY-MM-DD).' });
        }
        if (endDate < startDate) {
            return res.status(400).json({ error: 'End date cannot be before start date.' });
        }
        if (!reason || reason.length < 5) {
            return res.status(400).json({ error: 'Reason is required and must contain meaningful text (minimum 5 characters).' });
        }

        // 2. Prevent duplicate or overlapping approved/pending requests for this officer
        const overlapQuery = `
            SELECT id, type, start_date, end_date, status 
            FROM leaves 
            WHERE employee_id = $1 
              AND status IN ('pending', 'approved') 
              AND id != $2
              AND start_date <= $3 
              AND end_date >= $4
            LIMIT 1
        `;
        const overlapRes = await pool.query(overlapQuery, [employeeId, id, endDate, startDate]);
        if (overlapRes.rows.length > 0) {
            const existing = overlapRes.rows[0];
            const fromD = existing.start_date.toISOString ? existing.start_date.toISOString().split('T')[0] : existing.start_date;
            const toD = existing.end_date.toISOString ? existing.end_date.toISOString().split('T')[0] : existing.end_date;
            return res.status(400).json({
                error: `An active or pending ${existing.type} leave request already exists covering this period (${fromD} to ${toD}, Status: ${existing.status}).`
            });
        }

        // 3. Insert or upsert into database
        const query = `
            INSERT INTO leaves (
                id, employee_id, employee_name, supervisor_id,
                start_date, end_date, reason, type, status,
                attachment_name, attachment_data, created_at, synced, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, true, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
                employee_id = EXCLUDED.employee_id,
                employee_name = EXCLUDED.employee_name,
                supervisor_id = EXCLUDED.supervisor_id,
                start_date = EXCLUDED.start_date,
                end_date = EXCLUDED.end_date,
                reason = EXCLUDED.reason,
                type = EXCLUDED.type,
                status = EXCLUDED.status,
                attachment_name = COALESCE(EXCLUDED.attachment_name, leaves.attachment_name),
                attachment_data = COALESCE(EXCLUDED.attachment_data, leaves.attachment_data),
                synced = true,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        const result = await pool.query(query, [
            id, employeeId, employeeName, supervisorId,
            startDate, endDate, reason, type, status,
            attachmentName, attachmentData
        ]);

        // 4. Create notification for Supervisor if supervisorId is available
        if (supervisorId) {
            try {
                await pool.query(`
                    INSERT INTO notifications (id, user_id, title, message, type, is_read, action_url)
                    VALUES ($1, $2, $3, $4, 'LEAVE_REQUEST', false, '/leaves')
                `, [
                    `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    supervisorId,
                    'New Leave Request Submitted',
                    `${employeeName} requested ${type} leave from ${startDate} to ${endDate}.`
                ]);
            } catch (_) {}
        }

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating leave request:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/leaves/:id - Decision update (Approve / Reject) or Cancellation
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

        // Fetch existing leave
        const existingRes = await pool.query('SELECT * FROM leaves WHERE id = $1', [id]);
        if (existingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Leave request not found.' });
        }
        const existing = existingRes.rows[0];

        // If cancelling, ensure it was pending
        if (status === 'cancelled' && existing.status !== 'pending') {
            return res.status(400).json({ error: `Cannot cancel a leave request that has already been ${existing.status}.` });
        }

        const result = await pool.query(
            `UPDATE leaves SET
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

        // Notify the field officer of supervisor decision
        if (status === 'approved' || status === 'rejected') {
            try {
                const decisionTitle = status === 'approved' ? 'Leave Request Approved' : 'Leave Request Rejected';
                const decisionMsg = status === 'approved'
                    ? `Your ${updated.type} leave (${updated.start_date.toISOString().slice(0, 10)} to ${updated.end_date.toISOString().slice(0, 10)}) was approved.${decisionNote ? ` Note: ${decisionNote}` : ''}`
                    : `Your ${updated.type} leave (${updated.start_date.toISOString().slice(0, 10)} to ${updated.end_date.toISOString().slice(0, 10)}) was rejected. Reason: ${decisionNote}`;

                await pool.query(`
                    INSERT INTO notifications (id, user_id, title, message, type, is_read, action_url)
                    VALUES ($1, $2, $3, $4, 'LEAVE_DECISION', false, '/leaves')
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
        console.error('Error updating leave request:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
