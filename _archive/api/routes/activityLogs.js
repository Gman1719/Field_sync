// routes/activityLogs.js
// REST endpoints for Activity Logs & System Audit Feeds
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/activity-logs
router.get('/', async (req, res) => {
    try {
        const { officerId, userId, limit } = req.query;
        let query = 'SELECT * FROM audit_logs';
        const params = [];
        const targetUser = officerId || userId;

        if (targetUser) {
            query += ' WHERE user_id = $1';
            params.push(targetUser);
        }

        query += ' ORDER BY timestamp DESC';

        if (limit) {
            query += ` LIMIT $${params.length + 1}`;
            params.push(parseInt(limit, 10) || 200);
        } else {
            query += ` LIMIT 300`;
        }

        const result = await pool.query(query, params);

        const mapped = result.rows.map(row => ({
            id: row.id,
            officerId: row.user_id,
            officerName: row.user_name,
            eventType: row.action,
            description: row.details,
            deviceTimestamp: row.timestamp,
            syncStatus: 'SYNCED',
        }));

        res.json({
            success: true,
            data: mapped,
        });
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/activity-logs
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        const result = await pool.query(
            `INSERT INTO audit_logs (id, user_id, user_name, action, details, timestamp, ip)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET
                 user_name = EXCLUDED.user_name,
                 action = EXCLUDED.action,
                 details = EXCLUDED.details,
                 timestamp = EXCLUDED.timestamp
             RETURNING *`,
            [
                data.id || require('crypto').randomUUID(),
                data.officerId || data.userId || 'system',
                data.officerName || data.userName || 'User',
                data.eventType || data.action || 'ACTIVITY',
                data.description || data.details || '',
                data.deviceTimestamp || data.timestamp || new Date().toISOString(),
                req.ip || '127.0.0.1',
            ]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error saving activity log:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
