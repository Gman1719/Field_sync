// routes/attendance.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all attendance records
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM attendance ORDER BY date DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET attendance by employee ID
router.get('/employee/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const result = await pool.query(
            'SELECT * FROM attendance WHERE employee_id = $1 ORDER BY date DESC',
            [employeeId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create attendance record
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        const result = await pool.query(
            `INSERT INTO attendance (
                employee_id, employee_name, date, status,
                check_in, check_out, work_hours, region,
                supervisor_id, supervisor_name, notes,
                submitted_to_manager, submitted_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *`,
            [
                data.employeeId, data.employeeName, data.date,
                data.status, data.checkIn, data.checkOut,
                data.workHours, data.region, data.supervisorId,
                data.supervisorName, data.notes,
                data.submittedToManager || false,
                data.submittedAt || new Date().toISOString()
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update attendance approval
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { approved, approved_by, seen_by_manager } = req.body;
        const result = await pool.query(
            `UPDATE attendance 
             SET approved = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP,
                 seen_by_manager = $3, seen_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [approved, approved_by, seen_by_manager, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Attendance record not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
