// routes/screenTime.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all screen time (managers)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM screen_time ORDER BY date DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET screen time for a specific employee
router.get('/employee/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const result = await pool.query(
            'SELECT * FROM screen_time WHERE employee_id = $1 ORDER BY date DESC',
            [employeeId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST (upsert) a screen time record – used by officer’s device
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        const result = await pool.query(
            `INSERT INTO screen_time (
                id, employee_id, employee_name, date, login_time, logout_time,
                total_screen_time, screen_time_limit, trust_score, is_logged_in,
                verified, verified_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO UPDATE SET
                login_time = EXCLUDED.login_time,
                logout_time = EXCLUDED.logout_time,
                total_screen_time = EXCLUDED.total_screen_time,
                is_logged_in = EXCLUDED.is_logged_in,
                trust_score = EXCLUDED.trust_score,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *`,
            [
                data.id, data.employeeId, data.employeeName, data.date,
                data.loginTime, data.logoutTime,
                data.totalScreenTime || 0,
                data.screenTimeLimit || 28800,
                data.trustScore || 0,
                data.isLoggedIn || false,
                data.verified || false,
                data.verifiedBy || null,
                data.createdAt || new Date().toISOString(),
                data.updatedAt || new Date().toISOString()
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT – update screen time limit (manager/supervisor)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { screenTimeLimit, verified, verifiedBy } = req.body;
        const result = await pool.query(
            `UPDATE screen_time SET
                screen_time_limit = COALESCE($1, screen_time_limit),
                verified = COALESCE($2, verified),
                verified_by = COALESCE($3, verified_by),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *`,
            [screenTimeLimit, verified, verifiedBy, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Screen time record not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE (optional)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM screen_time WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.json({ message: 'Screen time record deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;