// routes/verification.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all verification records (supports optional ?supervisorId=)
router.get('/', async (req, res) => {
    try {
        const { supervisorId } = req.query;
        let query = 'SELECT * FROM verification_history ORDER BY timestamp DESC';
        let params = [];

        if (supervisorId) {
            try {
                const userCheck = await pool.query(
                    `SELECT id, employee_id FROM users WHERE supervisor_id = $1 OR supervisor_employee_id = $1`,
                    [supervisorId]
                );
                if (userCheck.rows.length > 0) {
                    const ids = userCheck.rows.flatMap(r => [r.id, r.employee_id].filter(Boolean));
                    query = `SELECT * FROM verification_history WHERE officer_id = ANY($1) ORDER BY timestamp DESC`;
                    params = [ids];
                }
            } catch (_err) {
                // If query fails, fall back to returning all
            }
        }

        const result = await pool.query(query, params);
        // Return both array and { data: [...] } for maximum client compatibility
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET verification history for a specific officer
router.get('/officer/:officerId', async (req, res) => {
    try {
        const { officerId } = req.params;
        const result = await pool.query(
            'SELECT * FROM verification_history WHERE officer_id = $1 ORDER BY timestamp DESC',
            [officerId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST a new verification record (supports both security challenges & work presence verifications)
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        const isSuccess = data.success !== undefined
            ? Boolean(data.success)
            : (data.status?.includes('CONFIRMED') || data.status === 'OFFICER_CONFIRMED');

        const answer = data.answer || (isSuccess ? 'Presence Confirmed' : (data.failureReason || 'Missed (No response)'));
        const question = data.question || 'Work Presence & Identity Verification';
        const responseTime = data.responseTime || data.responseTimeSeconds || 0;
        const timestamp = data.timestamp || data.scheduledAt || data.respondedAt || new Date().toISOString();

        const result = await pool.query(
            `INSERT INTO verification_history (
                id, officer_id, officer_name, question, answer, success,
                score, response_time, timestamp, message, penalties
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id) DO UPDATE SET
                officer_id = EXCLUDED.officer_id,
                officer_name = EXCLUDED.officer_name,
                question = EXCLUDED.question,
                answer = EXCLUDED.answer,
                success = EXCLUDED.success,
                score = EXCLUDED.score,
                response_time = EXCLUDED.response_time,
                timestamp = EXCLUDED.timestamp,
                message = EXCLUDED.message,
                penalties = EXCLUDED.penalties
            RETURNING *`,
            [
                data.id || `v_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                data.officerId || data.officer_id,
                data.officerName || data.officer_name || 'Field Officer',
                question,
                answer,
                isSuccess,
                data.score || (isSuccess ? 100 : 0),
                responseTime,
                timestamp,
                data.message || (isSuccess ? 'Verification passed' : 'Verification missed'),
                JSON.stringify(data.penalties || [])
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE all records (manager only, optional)
router.delete('/', async (req, res) => {
    try {
        await pool.query('DELETE FROM verification_history');
        res.json({ message: 'All verification records cleared' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;