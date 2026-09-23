// routes/sync.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /api/sync
router.post('/', async (req, res) => {
    try {
        const { type, data } = req.body;
        let result;

        switch (type) {
            case 'report':
                result = await pool.query(
                    `INSERT INTO reports (
                        report_id, employee_id, employee_name, supervisor_id,
                        report_date, region, site_name, registrations,
                        operational_status, attendance, work_hours,
                        activities, equipment_status, materials_used,
                        team_members, weather_conditions, community_feedback,
                        challenges, issues, comments, submitted_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
                    ON CONFLICT (report_id) DO UPDATE SET
                        site_name = EXCLUDED.site_name,
                        registrations = EXCLUDED.registrations,
                        updated_at = CURRENT_TIMESTAMP
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
                break;

            case 'attendance':
                result = await pool.query(
                    `INSERT INTO attendance (
                        id, employee_id, employee_name, date, status,
                        check_in, check_out, work_hours, region,
                        supervisor_id, supervisor_name, notes,
                        submitted_to_manager, submitted_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    ON CONFLICT (id) DO UPDATE SET
                        status = EXCLUDED.status,
                        check_in = EXCLUDED.check_in,
                        check_out = EXCLUDED.check_out,
                        work_hours = EXCLUDED.work_hours
                    RETURNING *`,
                    [
                        data.id || require('crypto').randomUUID(),
                        data.employeeId, data.employeeName, data.date,
                        data.status, data.checkIn, data.checkOut,
                        data.workHours, data.region, data.supervisorId,
                        data.supervisorName, data.notes,
                        data.submittedToManager || false,
                        data.submittedAt || new Date().toISOString()
                    ]
                );
                break;

            case 'citizen':
                result = await pool.query(
                    `INSERT INTO citizens (
                        national_id, first_name, last_name, date_of_birth,
                        gender, phone, email, address, region,
                        district, village, occupation, marital_status,
                        registration_date, registered_by, registered_by_name,
                        id_type, id_number, biometrics
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                    ON CONFLICT (national_id) DO UPDATE SET
                        first_name = EXCLUDED.first_name,
                        last_name = EXCLUDED.last_name,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING *`,
                    [
                        data.nationalId, data.firstName, data.lastName,
                        data.dateOfBirth, data.gender, data.phone,
                        data.email, data.address, data.region,
                        data.district, data.village, data.occupation,
                        data.maritalStatus, data.registrationDate,
                        data.registeredBy, data.registeredByName,
                        data.idType, data.idNumber, data.biometrics || false
                    ]
                );
                break;

            case 'leave':
                result = await pool.query(
                    `INSERT INTO leaves (
                        id, employee_id, employee_name, start_date, end_date,
                        reason, type, status, created_at, approved_by, approved_at, synced
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    ON CONFLICT (id) DO UPDATE SET
                        employee_id = EXCLUDED.employee_id,
                        employee_name = EXCLUDED.employee_name,
                        start_date = EXCLUDED.start_date,
                        end_date = EXCLUDED.end_date,
                        reason = EXCLUDED.reason,
                        type = EXCLUDED.type,
                        status = EXCLUDED.status,
                        approved_by = EXCLUDED.approved_by,
                        approved_at = EXCLUDED.approved_at,
                        synced = EXCLUDED.synced,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING *`,
                    [
                        data.id,
                        data.employeeId,
                        data.employeeName,
                        data.startDate,
                        data.endDate,
                        data.reason,
                        data.type,
                        data.status || 'pending',
                        data.createdAt || new Date().toISOString(),
                        data.approvedBy || null,
                        data.approvedAt || null,
                        data.synced || false
                    ]
                );
                break;

            case 'leave_update':
                if (!data || !data.id) {
                    return res.status(400).json({ error: 'Missing required field "id" for leave_update' });
                }
                result = await pool.query(
                    `UPDATE leaves SET
                        status = $1,
                        approved_by = $2,
                        approved_at = $3,
                        synced = true
                    WHERE id = $4
                    RETURNING *`,
                    [
                        data.status,
                        data.approvedBy,
                        data.approvedAt || new Date().toISOString(),
                        data.id
                    ]
                );
                if (result.rows.length === 0) {
                    return res.status(404).json({ error: `Leave record ${data.id} not found on server to update` });
                }
                break;

            case 'permission':
                const syncPermType = data.permissionType || data.type || 'regular';
                result = await pool.query(
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
                        syncPermType,
                        data.startDate,
                        data.endDate,
                        data.reason,
                        data.status || 'pending',
                        data.requestedAt || new Date().toISOString(),
                        data.approvedBy || null,
                        data.approvedAt || null,
                        data.synced !== undefined ? data.synced : true
                    ]
                );
                break;

            case 'permission_update':
                if (!data || !data.id) {
                    return res.status(400).json({ error: 'Missing required field "id" for permission_update' });
                }
                result = await pool.query(
                    `UPDATE permissions SET
                        status = $1,
                        approved_by = $2,
                        approved_at = $3,
                        synced = true
                    WHERE id = $4
                    RETURNING *`,
                    [
                        data.status,
                        data.approvedBy,
                        data.approvedAt || new Date().toISOString(),
                        data.id
                    ]
                );
                if (result.rows.length === 0) {
                    return res.status(404).json({ error: `Permission record ${data.id} not found on server to update` });
                }
                break;

            case 'user':
                result = await pool.query(
                    `INSERT INTO users (
                        id, employee_id, name, email, password_hash,
                        role, region, supervisor_id, status, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        email = EXCLUDED.email,
                        role = EXCLUDED.role,
                        status = EXCLUDED.status,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING *`,
                    [
                        data.id, data.employeeId, data.name, data.email, data.password,
                        data.role, data.region, data.supervisorId || null,
                        data.status || 'active', data.createdAt || new Date().toISOString()
                    ]
                );
                break;

            case 'user_status_update':
                result = await pool.query(
                    'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
                    [data.status, data.userId]
                );
                break;

            case 'user_delete':
                result = await pool.query(
                    'DELETE FROM users WHERE id = $1 RETURNING *',
                    [data.userId]
                );
                break;

            case 'task':
                result = await pool.query(
                    `INSERT INTO tasks (
                        id, employee_id, assigned_by, assigned_by_name,
                        title, description, deadline, priority, status,
                        created_at, updated_at, completed_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        description = EXCLUDED.description,
                        deadline = EXCLUDED.deadline,
                        priority = EXCLUDED.priority,
                        status = EXCLUDED.status,
                        completed_at = EXCLUDED.completed_at,
                        updated_at = CURRENT_TIMESTAMP
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
                break;

            case 'task_update':
                result = await pool.query(
                    `UPDATE tasks SET
                        status = $1,
                        completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                    RETURNING *`,
                    [data.status, data.taskId]
                );
                break;

            case 'screen_time':
                result = await pool.query(
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
                break;

            case 'screen_time_update':
                result = await pool.query(
                    `UPDATE screen_time SET
                        screen_time_limit = $1,
                        verified = $2,
                        verified_by = $3,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $4
                    RETURNING *`,
                    [data.limit * 3600, data.verified, data.verifiedBy, data.id]
                );
                break;

            case 'audit':
                result = await pool.query(
                    `INSERT INTO audit_logs (id, user_id, user_name, action, details, timestamp, ip)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     ON CONFLICT (id) DO UPDATE SET
                         details = EXCLUDED.details,
                         timestamp = EXCLUDED.timestamp
                     RETURNING *`,
                    [
                        data.id,
                        data.userId,
                        data.userName,
                        data.action,
                        data.details || '',
                        data.timestamp || new Date().toISOString(),
                        data.ip || '127.0.0.1'
                    ]
                );
                break;

            case 'alert':
                result = await pool.query(
                    `INSERT INTO alerts (
                        id, title, message, priority, type, timestamp, read,
                        target_all, target_employee_id, sent_by, sent_by_name
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        message = EXCLUDED.message,
                        read = EXCLUDED.read,
                        timestamp = EXCLUDED.timestamp
                    RETURNING *`,
                    [
                        data.id,
                        data.title,
                        data.message,
                        data.priority || 'medium',
                        data.type || 'emergency',
                        data.timestamp || new Date().toISOString(),
                        data.read || false,
                        data.targetAll !== undefined ? data.targetAll : true,
                        data.targetEmployeeId || null,
                        data.sentBy,
                        data.sentByName
                    ]
                );
                break;

            case 'alert_read':
                result = await pool.query(
                    'UPDATE alerts SET read = $1 WHERE id = $2 RETURNING *',
                    [data.read, data.alertId]
                );
                break;

            case 'verification':
                result = await pool.query(
                    `INSERT INTO verification_history (
                        id, officer_id, officer_name, question, answer, success,
                        score, response_time, timestamp, message, penalties
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (id) DO UPDATE SET
                        answer = EXCLUDED.answer,
                        success = EXCLUDED.success,
                        score = EXCLUDED.score,
                        response_time = EXCLUDED.response_time,
                        message = EXCLUDED.message,
                        penalties = EXCLUDED.penalties
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
                break;

            case 'supervisor_report':
                result = await pool.query(
                    `INSERT INTO supervisor_reports (
                        id, supervisor_id, supervisor_name, officer_id, officer_name,
                        officer_region, report_date, performance, attendance, quality,
                        punctuality, teamwork, communication, comments, recommendations,
                        overall_rating, status, submitted_at, region, type
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                    ON CONFLICT (id) DO UPDATE SET
                        performance = EXCLUDED.performance,
                        attendance = EXCLUDED.attendance,
                        quality = EXCLUDED.quality,
                        punctuality = EXCLUDED.punctuality,
                        teamwork = EXCLUDED.teamwork,
                        communication = EXCLUDED.communication,
                        comments = EXCLUDED.comments,
                        recommendations = EXCLUDED.recommendations,
                        overall_rating = EXCLUDED.overall_rating,
                        status = EXCLUDED.status
                    RETURNING *`,
                    [
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
                        data.type || 'officer_report'
                    ]
                );
                break;

            default:
                return res.status(400).json({ error: 'Unknown sync type: ' + type });
        }

        res.json({
            success: true,
            data: result?.rows?.[0] || null,
            message: `${type} synced successfully`
        });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
