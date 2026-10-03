// routes/notifications.js
// Modular Notification API for FieldSync (Online & Offline synchronization)
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Ensure notifications table exists
const ensureTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id VARCHAR(50) PRIMARY KEY,
                recipient_id VARCHAR(50) NOT NULL,
                user_id VARCHAR(50),
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'SYSTEM',
                priority VARCHAR(20) DEFAULT 'MEDIUM',
                is_read BOOLEAN DEFAULT false,
                read_at TIMESTAMP WITH TIME ZONE,
                related_record_id VARCHAR(50),
                action_url VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_id VARCHAR(50);
            ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id VARCHAR(50);
            ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title VARCHAR(255);
            ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
            ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50);
            ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(20);
            ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
            ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;
            ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_record_id VARCHAR(50);
            ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url VARCHAR(255);
        `);
    } catch (e) {
        console.warn('Notifications table initialization notice:', e.message);
    }
};

ensureTable().catch(() => {});

// GET /api/notifications - List notifications for user
router.get('/', async (req, res) => {
    try {
        const { recipientId, userId, status, page = 1, limit = 20 } = req.query;
        let query = 'SELECT * FROM notifications';
        const params = [];
        const conditions = [];

        const targetUser = recipientId || userId;
        if (targetUser) {
            params.push(targetUser);
            conditions.push(`(recipient_id = $${params.length} OR user_id = $${params.length} OR recipient_id = 'all')`);
        }

        if (status === 'unread') {
            conditions.push(`is_read = false`);
        } else if (status === 'read') {
            conditions.push(`is_read = true`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC';

        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        params.push(parseInt(limit, 10));
        query += ` LIMIT $${params.length}`;
        params.push(offset);
        query += ` OFFSET $${params.length}`;

        const result = await pool.query(query, params);

        // Count total
        let countQuery = 'SELECT COUNT(*) FROM notifications';
        if (conditions.length > 0) {
            countQuery += ' WHERE ' + conditions.join(' AND ');
        }
        const countRes = await pool.query(countQuery, params.slice(0, conditions.length));
        const total = parseInt(countRes.rows[0]?.count || 0, 10);

        res.json({
            success: true,
            data: result.rows.map(r => ({
                id: r.id,
                recipientId: r.recipient_id || r.user_id,
                title: r.title,
                message: r.message,
                type: r.type,
                priority: r.priority,
                isRead: Boolean(r.is_read),
                readAt: r.read_at,
                relatedRecordId: r.related_record_id,
                actionUrl: r.action_url,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
            })),
            pagination: {
                total,
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                totalPages: Math.ceil(total / parseInt(limit, 10)) || 1,
            }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res) => {
    try {
        const { recipientId, userId } = req.query;
        let query = 'SELECT COUNT(*) FROM notifications WHERE is_read = false';
        const params = [];
        const targetUser = recipientId || userId;
        if (targetUser) {
            params.push(targetUser);
            query += ` AND (recipient_id = $1 OR user_id = $1 OR recipient_id = 'all')`;
        }
        const result = await pool.query(query, params);
        res.json({ unreadCount: parseInt(result.rows[0]?.count || 0, 10) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/notifications - Create notification
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        const id = data.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const recipientId = data.recipientId || data.userId || 'all';
        const title = data.title || 'Notification';
        const message = data.message || '';
        const type = data.type || 'SYSTEM';
        const priority = data.priority || 'MEDIUM';
        const relatedRecordId = data.relatedRecordId || null;
        const actionUrl = data.actionUrl || null;

        const query = `
            INSERT INTO notifications (
                id, recipient_id, user_id, title, message, type,
                priority, is_read, related_record_id, action_url,
                created_at, updated_at
            ) VALUES ($1, $2, $2, $3, $4, $5, $6, false, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                message = EXCLUDED.message,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const result = await pool.query(query, [
            id, recipientId, title, message, type, priority, relatedRecordId, actionUrl
        ]);

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/notifications/:id/read - Mark as read
router.patch('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
            [id]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/notifications/mark-all-read - Mark all as read
router.post('/mark-all-read', async (req, res) => {
    try {
        const { recipientId } = req.body;
        let query = 'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE is_read = false';
        const params = [];
        if (recipientId) {
            params.push(recipientId);
            query += ' AND (recipient_id = $1 OR user_id = $1)';
        }
        const result = await pool.query(query, params);
        res.json({ success: true, markedCount: result.rowCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
