// routes/citizens.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all citizens
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM citizens ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET citizen by national ID
router.get('/national/:nationalId', async (req, res) => {
    try {
        const { nationalId } = req.params;
        const result = await pool.query('SELECT * FROM citizens WHERE national_id = $1', [nationalId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Citizen not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create citizen
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        const result = await pool.query(
            `INSERT INTO citizens (
                national_id, first_name, last_name, date_of_birth,
                gender, phone, email, address, region,
                district, village, occupation, marital_status,
                registration_date, registered_by, registered_by_name,
                id_type, id_number, biometrics
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
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
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
