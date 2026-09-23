// routes/permissions.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all permissions
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM permissions ORDER BY requested_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create or upsert permission
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        const permType = data.permissionType || data.type || 'regular';
        const result = await pool.query(
            `INSERT INTO permissions (
                id, employee_id, employee_name, type, permission_type,
                start_date, end_date, reason, status, requested_at,
                approved_by, approved_at, synced
            ) VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) DO UPDATE SET
                employee_id = EXCLUDED.employee_id,
                employee_name = EXCLUDED.employee_name,
                type = EXCLUDED.type,
                permission_type = EXCLUDED.permission_type,
                start_date = EXCLUDED.start_date,
                end_date = EXCLUDED.end_date,
                reason = EXCLUDED.reason,
                status = EXCLUDED.status,
                approved_by = EXCLUDED.approved_by,
                approved_at = EXCLUDED.approved_at,
                synced = EXCLUDED.synced
            RETURNING *`,
            [
                data.id,
                data.employeeId,
                data.employeeName,
                permType,
                data.startDate,
                data.endDate,
                data.reason,
                data.status || 'pending',
                data.requestedAt || new Date().toISOString(),
                data.approvedBy || null,
                data.approvedAt || null,
                data.synced || false
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating permission:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT update permission (supports partial approval/rejection updates)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const permType = data.permissionType || data.type || null;
        const result = await pool.query(
            `UPDATE permissions SET
                employee_id = COALESCE($1, employee_id),
                employee_name = COALESCE($2, employee_name),
                type = COALESCE($3, type),
                permission_type = COALESCE($3, permission_type),
                start_date = COALESCE($4, start_date),
                end_date = COALESCE($5, end_date),
                reason = COALESCE($6, reason),
                status = COALESCE($7, status),
                approved_by = COALESCE($8, approved_by),
                approved_at = COALESCE($9, approved_at),
                synced = true
            WHERE id = $10
            RETURNING *`,
            [
                data.employeeId || null,
                data.employeeName || null,
                permType,
                data.startDate || null,
                data.endDate || null,
                data.reason || null,
                data.status || null,
                data.approvedBy || null,
                data.approvedAt || (data.status ? new Date().toISOString() : null),
                id
            ]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Permission not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating permission:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
