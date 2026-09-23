// api/routes/users.js
// Complete User Management module with Ethiopian Administrative Assignment

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const pool = require('../db');

// --- Helper: Generate Cryptographically Secure Temporary Password ---
function generateSecureTempPassword(length = 12) {
    // Exclude confusing characters: 0, O, 1, l, I
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '!@#$%^&*';

    let password = [
        upper[crypto.randomInt(0, upper.length)],
        lower[crypto.randomInt(0, lower.length)],
        numbers[crypto.randomInt(0, numbers.length)],
        symbols[crypto.randomInt(0, symbols.length)],
    ];

    const allChars = upper + lower + numbers + symbols;
    for (let i = password.length; i < length; i++) {
        password.push(allChars[crypto.randomInt(0, allChars.length)]);
    }

    // Cryptographic shuffle
    for (let i = password.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [password[i], password[j]] = [password[j], password[i]];
    }

    return password.join('');
}

// --- Helper: Format User Model ---
function formatUser(row) {
    return {
        id: row.id,
        employeeId: row.employee_id,
        name: row.name,
        firstName: row.first_name || '',
        middleName: row.middle_name || '',
        lastName: row.last_name || '',
        email: row.email,
        role: row.role,
        regionId: row.region_id || null,
        zoneId: row.zone_id || null,
        woredaId: row.woreda_id || null,
        region: row.region || row.region_name || '',
        zone: row.zone || row.zone_name || '',
        woreda: row.woreda || row.woreda_name || '',
        supervisorId: row.supervisor_id || null,
        supervisorName: row.supervisor_name || null,
        status: row.status || 'active',
        mustChangePassword: Boolean(row.must_change_password),
        phone: row.phone || '',
        shift: row.shift || 'Day',
        department: row.department || '',
        createdAt: row.created_at,
        lastLogin: row.last_login || null
    };
}

// --- Zod Validation Schema for User Creation ---
const createUserSchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
    middleName: z.string().min(2, 'Middle name must be at least 2 characters').max(50),
    lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
    email: z.string().email('Invalid email address'),
    role: z.enum(['manager', 'supervisor', 'field_officer'], {
        errorMap: () => ({ message: "Role must be one of: 'manager', 'supervisor', 'field_officer'" })
    }),
    phone: z.string().optional().nullable(),
    employeeId: z.string().optional().nullable(),
    regionId: z.string().optional().nullable(),
    zoneId: z.string().optional().nullable(),
    woredaId: z.string().optional().nullable(),
    supervisorId: z.string().optional().nullable(),
    shift: z.string().optional().default('Day'),
    department: z.string().optional().default('Field Operations')
});

// GET /api/users/stats
// KPI Metrics for User Management Dashboard
router.get('/stats', async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*)::int as total,
                COUNT(*) FILTER (WHERE role = 'manager')::int as managers,
                COUNT(*) FILTER (WHERE role = 'supervisor')::int as supervisors,
                COUNT(*) FILTER (WHERE role = 'field_officer')::int as field_officers,
                COUNT(*) FILTER (WHERE status = 'active')::int as active,
                COUNT(*) FILTER (WHERE status = 'inactive')::int as inactive,
                COUNT(*) FILTER (WHERE role = 'field_officer' AND (supervisor_id IS NULL OR woreda_id IS NULL))::int as unassigned_officers
            FROM users
        `;
        const result = await pool.query(statsQuery);
        const row = result.rows[0];

        res.json({
            success: true,
            data: {
                totalUsers: row.total || 0,
                managers: row.managers || 0,
                supervisors: row.supervisors || 0,
                fieldOfficers: row.field_officers || 0,
                activeUsers: row.active || 0,
                inactiveUsers: row.inactive || 0,
                unassignedFieldOfficers: row.unassigned_officers || 0
            }
        });
    } catch (err) {
        console.error('Error fetching user stats:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/users
// Fetch all users with joined hierarchy and supervisor names
router.get('/', async (req, res) => {
    try {
        const { role, status, region, zone, search } = req.query;

        let query = `
            SELECT u.*,
                   s.name as supervisor_name,
                   r.name as region_name,
                   z.name as zone_name,
                   w.name as woreda_name
            FROM users u
            LEFT JOIN users s ON u.supervisor_id = s.id
            LEFT JOIN regions r ON u.region_id = r.id
            LEFT JOIN zones z ON u.zone_id = z.id
            LEFT JOIN woredas w ON u.woreda_id = w.id
            WHERE 1=1
        `;
        const params = [];

        if (role && role !== 'all') {
            params.push(role);
            query += ` AND u.role = $${params.length}`;
        }

        if (status && status !== 'all') {
            params.push(status);
            query += ` AND u.status = $${params.length}`;
        }

        if (region && region !== 'all') {
            params.push(region);
            query += ` AND (u.region_id = $${params.length} OR LOWER(u.region) = LOWER($${params.length}))`;
        }

        if (zone && zone !== 'all') {
            params.push(zone);
            query += ` AND (u.zone_id = $${params.length} OR LOWER(u.zone) = LOWER($${params.length}))`;
        }

        if (search) {
            params.push(`%${search.trim().toLowerCase()}%`);
            query += ` AND (
                LOWER(u.name) LIKE $${params.length} OR
                LOWER(u.email) LIKE $${params.length} OR
                LOWER(u.employee_id) LIKE $${params.length}
            )`;
        }

        query += ` ORDER BY u.created_at DESC, u.name ASC`;

        const result = await pool.query(query, params);
        const users = result.rows.map(formatUser);

        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT u.*,
                   s.name as supervisor_name,
                   r.name as region_name,
                   z.name as zone_name,
                   w.name as woreda_name
            FROM users u
            LEFT JOIN users s ON u.supervisor_id = s.id
            LEFT JOIN regions r ON u.region_id = r.id
            LEFT JOIN zones z ON u.zone_id = z.id
            LEFT JOIN woredas w ON u.woreda_id = w.id
            WHERE u.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(formatUser(result.rows[0]));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/users
// Create new user with Ethiopian location hierarchy and cryptographically secure temporary password
router.post('/', async (req, res) => {
    try {
        // 1. Zod Validation
        const parsed = createUserSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: parsed.error.errors.map(e => e.message).join(', ')
            });
        }

        const data = parsed.data;
        const normalizedEmail = data.email.trim().toLowerCase();

        // 2. Check for duplicate email
        const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, error: 'A user with this email address already exists' });
        }

        // 3. Enforce Role & Location Rules
        let regionId = null;
        let zoneId = null;
        let woredaId = null;
        let regionName = '';
        let zoneName = '';
        let woredaName = '';
        let supervisorId = null;

        if (data.role === 'manager') {
            // Manager: Organization-wide, no Zone or Woreda
            regionName = 'Organization-wide';
        } else if (data.role === 'supervisor') {
            // Supervisor: Region and Zone required; Woreda disallowed
            if (!data.regionId || !data.zoneId) {
                return res.status(400).json({
                    success: false,
                    error: 'Supervisors must be assigned to a Region and Zone'
                });
            }
            regionId = data.regionId;
            zoneId = data.zoneId;

            // Fetch Region and Zone names
            const regRow = await pool.query('SELECT name FROM regions WHERE id = $1', [regionId]);
            const zoneRow = await pool.query('SELECT name FROM zones WHERE id = $1', [zoneId]);
            regionName = regRow.rows[0]?.name || '';
            zoneName = zoneRow.rows[0]?.name || '';
        } else if (data.role === 'field_officer') {
            // Field Officer: Region, Zone, and Woreda all required
            if (!data.regionId || !data.zoneId || !data.woredaId) {
                return res.status(400).json({
                    success: false,
                    error: 'Field Officers must be assigned to a Region, Zone, and Woreda'
                });
            }
            regionId = data.regionId;
            zoneId = data.zoneId;
            woredaId = data.woredaId;

            const regRow = await pool.query('SELECT name FROM regions WHERE id = $1', [regionId]);
            const zoneRow = await pool.query('SELECT name FROM zones WHERE id = $1', [zoneId]);
            const worRow = await pool.query('SELECT name FROM woredas WHERE id = $1', [woredaId]);
            regionName = regRow.rows[0]?.name || '';
            zoneName = zoneRow.rows[0]?.name || '';
            woredaName = worRow.rows[0]?.name || '';

            // Auto-assign supervisor if not explicitly provided
            if (data.supervisorId) {
                supervisorId = data.supervisorId;
            } else {
                const supResult = await pool.query(`
                    SELECT id FROM users
                    WHERE role = 'supervisor' AND zone_id = $1 AND status = 'active'
                    LIMIT 1
                `, [zoneId]);
                if (supResult.rows.length > 0) {
                    supervisorId = supResult.rows[0].id;
                }
            }
        }

        // 4. Generate Unique ID and Employee ID
        const userId = 'u_' + crypto.randomUUID().slice(0, 8);
        let employeeId = data.employeeId?.trim();
        if (!employeeId) {
            const prefix = data.role === 'manager' ? 'MGR' : data.role === 'supervisor' ? 'SUP' : 'FO';
            const countRes = await pool.query("SELECT COUNT(*) FROM users WHERE role = $1", [data.role]);
            const count = parseInt(countRes.rows[0].count, 10) + 1;
            employeeId = `${prefix}${String(count).padStart(3, '0')}`;
        }

        // 5. Generate Cryptographic Temporary Password & Hash
        const temporaryPassword = generateSecureTempPassword(12);
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(temporaryPassword, salt);

        // 6. Concatenate Full Name
        const fullName = `${data.firstName.trim()} ${data.middleName.trim()} ${data.lastName.trim()}`.trim();

        // 7. Insert Into Database
        const insertQuery = `
            INSERT INTO users (
                id, employee_id, name, first_name, middle_name, last_name,
                email, password_hash, role, region_id, zone_id, woreda_id,
                region, zone, woreda, supervisor_id, status, must_change_password,
                phone, shift, department, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11, $12,
                $13, $14, $15, $16, 'active', true,
                $17, $18, $19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
            RETURNING *
        `;

        const insertRes = await pool.query(insertQuery, [
            userId, employeeId, fullName, data.firstName.trim(), data.middleName.trim(), data.lastName.trim(),
            normalizedEmail, passwordHash, data.role, regionId, zoneId, woredaId,
            regionName, zoneName, woredaName, supervisorId,
            data.phone || null, data.shift || 'Day', data.department || 'Field Operations'
        ]);

        const createdUser = formatUser(insertRes.rows[0]);

        // Return user object and temporary password (displayed strictly once to manager)
        return res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: createdUser,
            temporaryPassword
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PATCH /api/users/:id/role
// Update user role and realign location hierarchy requirements
router.patch('/:id/role', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['manager', 'supervisor', 'field_officer'].includes(role)) {
            return res.status(400).json({ success: false, error: 'Invalid role' });
        }

        const currentRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (currentRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        let updateQuery = '';
        let params = [];

        if (role === 'manager') {
            updateQuery = `
                UPDATE users 
                SET role = $1, region_id = NULL, zone_id = NULL, woreda_id = NULL,
                    region = 'Organization-wide', zone = NULL, woreda = NULL,
                    supervisor_id = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 RETURNING *`;
            params = [role, id];
        } else if (role === 'supervisor') {
            updateQuery = `
                UPDATE users 
                SET role = $1, woreda_id = NULL, woreda = NULL,
                    supervisor_id = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 RETURNING *`;
            params = [role, id];
        } else {
            updateQuery = `UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`;
            params = [role, id];
        }

        const result = await pool.query(updateQuery, params);
        res.json({ success: true, user: formatUser(result.rows[0]) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PATCH /api/users/:id/status
// Toggle user active / inactive status
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({ success: false, error: "Status must be 'active' or 'inactive'" });
        }

        const result = await pool.query(
            'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({ success: true, user: formatUser(result.rows[0]) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PATCH /api/users/:id/assignment
// Reassign user location hierarchy while preserving historical data
router.patch('/:id/assignment', async (req, res) => {
    try {
        const { id } = req.params;
        const { regionId, zoneId, woredaId, supervisorId } = req.body;

        const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        const user = userRes.rows[0];

        let finalRegId = null;
        let finalZoneId = null;
        let finalWorId = null;
        let regName = '';
        let zoneName = '';
        let worName = '';
        let finalSupId = null;

        if (user.role === 'manager') {
            regName = 'Organization-wide';
        } else if (user.role === 'supervisor') {
            if (!regionId || !zoneId) {
                return res.status(400).json({ success: false, error: 'Region and Zone are required for Supervisors' });
            }
            finalRegId = regionId;
            finalZoneId = zoneId;
            const regRow = await pool.query('SELECT name FROM regions WHERE id = $1', [regionId]);
            const zoneRow = await pool.query('SELECT name FROM zones WHERE id = $1', [zoneId]);
            regName = regRow.rows[0]?.name || '';
            zoneName = zoneRow.rows[0]?.name || '';
        } else if (user.role === 'field_officer') {
            if (!regionId || !zoneId || !woredaId) {
                return res.status(400).json({ success: false, error: 'Region, Zone, and Woreda are required for Field Officers' });
            }
            finalRegId = regionId;
            finalZoneId = zoneId;
            finalWorId = woredaId;

            const regRow = await pool.query('SELECT name FROM regions WHERE id = $1', [regionId]);
            const zoneRow = await pool.query('SELECT name FROM zones WHERE id = $1', [zoneId]);
            const worRow = await pool.query('SELECT name FROM woredas WHERE id = $1', [woredaId]);
            regName = regRow.rows[0]?.name || '';
            zoneName = zoneRow.rows[0]?.name || '';
            worName = worRow.rows[0]?.name || '';

            if (supervisorId) {
                finalSupId = supervisorId;
            } else {
                const supResult = await pool.query(`
                    SELECT id FROM users
                    WHERE role = 'supervisor' AND zone_id = $1 AND status = 'active'
                    LIMIT 1
                `, [zoneId]);
                if (supResult.rows.length > 0) {
                    finalSupId = supResult.rows[0].id;
                }
            }
        }

        const updateRes = await pool.query(`
            UPDATE users
            SET region_id = $1,
                zone_id = $2,
                woreda_id = $3,
                region = $4,
                zone = $5,
                woreda = $6,
                supervisor_id = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `, [finalRegId, finalZoneId, finalWorId, regName, zoneName, worName, finalSupId, id]);

        res.json({ success: true, user: formatUser(updateRes.rows[0]) });
    } catch (err) {
        console.error('Error reassigning user:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/users/:id/password-reset
// Reset password, generate cryptographic temporary password, require change on next login
router.post('/:id/password-reset', async (req, res) => {
    try {
        const { id } = req.params;

        const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const temporaryPassword = generateSecureTempPassword(12);
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(temporaryPassword, salt);

        await pool.query(`
            UPDATE users
            SET password_hash = $1,
                must_change_password = true,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [passwordHash, id]);

        // Return temporary password strictly once to manager
        res.json({
            success: true,
            message: 'Password reset successfully',
            temporaryPassword
        });
    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/users/:id
// Update user details (name, phone, shift, department)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, middleName, lastName, phone, shift, department } = req.body;

        const currentRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (currentRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const current = currentRes.rows[0];

        const fName = firstName !== undefined ? firstName.trim() : (current.first_name || '');
        const mName = middleName !== undefined ? middleName.trim() : (current.middle_name || '');
        const lName = lastName !== undefined ? lastName.trim() : (current.last_name || '');
        const fullName = `${fName} ${mName} ${lName}`.trim() || current.name;

        const result = await pool.query(`
            UPDATE users
            SET name = $1,
                first_name = $2,
                middle_name = $3,
                last_name = $4,
                phone = COALESCE($5, phone),
                shift = COALESCE($6, shift),
                department = COALESCE($7, department),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `, [fullName, fName, mName, lName, phone, shift, department, id]);

        res.json(formatUser(result.rows[0]));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Attempt soft-delete or delete
        try {
            const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json({ message: 'User deleted successfully' });
        } catch (fkErr) {
            // If foreign key constraint prevents hard delete, soft-delete to inactive
            await pool.query("UPDATE users SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
            res.json({ message: 'User deactivated successfully (preserved for historical audit records)' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
