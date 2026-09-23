// routes/reports.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all reports
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reports ORDER BY submitted_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET report by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM reports WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create report
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        const result = await pool.query(
            `INSERT INTO reports (
                report_id, employee_id, employee_name, supervisor_id,
                report_date, region, site_name, registrations,
                operational_status, attendance, work_hours,
                activities, equipment_status, materials_used,
                team_members, weather_conditions, community_feedback,
                challenges, issues, comments, submitted_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
            RETURNING *`,
            [
                data.reportId, data.employeeId, data.employeeName,
                data.supervisorId, data.reportDate, data.region,
                data.siteName, data.registrations,
                data.operationalStatus, data.attendance, data.workHours,
                data.activities, data.equipmentStatus, data.materialsUsed,
                data.teamMembers, data.weatherConditions,
                data.communityFeedback, data.challenges,
                data.issues, data.comments, data.submittedAt || new Date().toISOString()
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update report
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const result = await pool.query(
            `UPDATE reports SET 
                site_name = $1,
                registrations = $2,
                operational_status = $3,
                attendance = $4,
                work_hours = $5,
                activities = $6,
                equipment_status = $7,
                materials_used = $8,
                team_members = $9,
                weather_conditions = $10,
                community_feedback = $11,
                challenges = $12,
                issues = $13,
                comments = $14,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $15
            RETURNING *`,
            [
                data.siteName, data.registrations,
                data.operationalStatus, data.attendance, data.workHours,
                data.activities, data.equipmentStatus, data.materialsUsed,
                data.teamMembers, data.weatherConditions,
                data.communityFeedback, data.challenges,
                data.issues, data.comments, id
            ]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE report
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM reports WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }
        res.json({ message: 'Report deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
