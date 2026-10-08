const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM supervisor_reports ORDER BY submitted_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET by supervisor
router.get('/supervisor/:supervisorId', async (req, res) => {
    try {
        const { supervisorId } = req.params;
        const result = await pool.query(
            'SELECT * FROM supervisor_reports WHERE supervisor_id = $1 ORDER BY submitted_at DESC',
            [supervisorId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET by officer
router.get('/officer/:officerId', async (req, res) => {
    try {
        const { officerId } = req.params;
        const result = await pool.query(
            'SELECT * FROM supervisor_reports WHERE officer_id = $1 ORDER BY submitted_at DESC',
            [officerId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST – handles both types correctly
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        // Determine report type based on presence of officerId
        const isSelfReport = !data.officerId || data.officerId === 'null' || data.officerId === null;

        let query, params;

        if (isSelfReport) {
            // SELF REPORT – includes site visits, etc.
            query = `
                INSERT INTO supervisor_reports (
                    id, supervisor_id, supervisor_name, officer_id, officer_name,
                    officer_region, report_date, performance, attendance, quality,
                    punctuality, teamwork, communication, comments, recommendations,
                    overall_rating, status, submitted_at, region, type,
                    site_visits, issues_resolved, challenges, achievements,
                    team_morale, resource_status, overall_status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
                RETURNING *`;
            params = [
                data.id,
                data.supervisorId,
                data.supervisorName,
                null, // officer_id
                null, // officer_name
                null, // officer_region
                data.reportDate,
                null, // performance
                null, // attendance
                null, // quality
                null, // punctuality
                null, // teamwork
                null, // communication
                data.challenges || '', // comments
                data.recommendations || '',
                null, // overall_rating
                data.status || 'submitted',
                data.submittedAt || new Date().toISOString(),
                data.region || null,
                'self_report',
                data.siteVisits !== undefined ? parseInt(data.siteVisits) : 0,
                data.issuesResolved !== undefined ? parseInt(data.issuesResolved) : 0,
                data.challenges || '',
                data.achievements || '',
                data.teamMorale || 'good',
                data.resourceStatus || 'adequate',
                data.overallStatus || 'good'
            ];
        } else {
            // OFFICER REPORT – uses performance, attendance, etc.
            query = `
                INSERT INTO supervisor_reports (
                    id, supervisor_id, supervisor_name, officer_id, officer_name,
                    officer_region, report_date, performance, attendance, quality,
                    punctuality, teamwork, communication, comments, recommendations,
                    overall_rating, status, submitted_at, region, type,
                    site_visits, issues_resolved, challenges, achievements,
                    team_morale, resource_status, overall_status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
                RETURNING *`;
            params = [
                data.id,
                data.supervisorId,
                data.supervisorName,
                data.officerId || null,
                data.officerName || null,
                data.officerRegion || null,
                data.reportDate,
                data.performance || 'good',
                data.attendance || 'good',
                data.quality || 'good',
                data.punctuality || 'good',
                data.teamwork || 'good',
                data.communication || 'good',
                data.comments || '',
                data.recommendations || '',
                data.overallRating || 3,
                data.status || 'submitted',
                data.submittedAt || new Date().toISOString(),
                data.region || null,
                'officer_report',
                null, // site_visits
                null, // issues_resolved
                null, // challenges
                null, // achievements
                null, // team_morale
                null, // resource_status
                null  // overall_status
            ];
        }

        const result = await pool.query(query, params);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error inserting supervisor report:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT (update) – only common fields
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const result = await pool.query(
            `UPDATE supervisor_reports SET
                performance = COALESCE($1, performance),
                attendance = COALESCE($2, attendance),
                quality = COALESCE($3, quality),
                punctuality = COALESCE($4, punctuality),
                teamwork = COALESCE($5, teamwork),
                communication = COALESCE($6, communication),
                comments = COALESCE($7, comments),
                recommendations = COALESCE($8, recommendations),
                overall_rating = COALESCE($9, overall_rating),
                status = COALESCE($10, status)
            WHERE id = $11
            RETURNING *`,
            [
                data.performance,
                data.attendance,
                data.quality,
                data.punctuality,
                data.teamwork,
                data.communication,
                data.comments,
                data.recommendations,
                data.overallRating,
                data.status,
                id
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

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM supervisor_reports WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }
        res.json({ message: 'Report deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;