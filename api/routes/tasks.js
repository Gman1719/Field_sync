// routes/tasks.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all tasks
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET tasks for a specific employee
router.get('/employee/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const result = await pool.query(
            'SELECT * FROM tasks WHERE employee_id = $1 ORDER BY deadline ASC',
            [employeeId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create a new task
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        const result = await pool.query(
            `INSERT INTO tasks (
                id, employee_id, assigned_by, assigned_by_name,
                title, description, deadline, priority, status,
                created_at, updated_at, completed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [
                data.id, data.employeeId, data.assignedBy, data.assignedByName,
                data.title, data.description, data.deadline, data.priority,
                data.status || 'pending',
                data.createdAt || new Date().toISOString(),
                data.updatedAt || new Date().toISOString(),
                data.completedAt || null
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update a task (status, etc.)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const result = await pool.query(
            `UPDATE tasks SET
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                deadline = COALESCE($3, deadline),
                priority = COALESCE($4, priority),
                status = COALESCE($5, status),
                completed_at = CASE WHEN $5 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *`,
            [
                data.title, data.description, data.deadline,
                data.priority, data.status, id
            ]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE a task
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;