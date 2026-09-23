// routes/verification.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all verification records (manager)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM verification_history ORDER BY timestamp DESC');
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

// POST a new verification record
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        const result = await pool.query(
            `INSERT INTO verification_history (
                id, officer_id, officer_name, question, answer, success,
                score, response_time, timestamp, message, penalties
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *`,
            [
                data.id,
                data.officerId,
                data.officerName,
                data.question,
                data.answer,
                data.success || false,
                data.score || 0,
                data.responseTime || 0,
                data.timestamp || new Date().toISOString(),
                data.message || '',
                data.penalties || []
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