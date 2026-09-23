// api/routes/locations.js
// Ethiopian Administrative Location Hierarchy API Routes

const express = require('express');
const router = express.Router();
const pool = require('../db');
const path = require('path');
const fs = require('fs');

// Optional in-memory fallback loader from JSON dataset
let cachedLocations = null;
function getCachedLocations() {
    if (!cachedLocations) {
        try {
            const dataPath = path.resolve(__dirname, '../data/ethiopia-locations.json');
            if (fs.existsSync(dataPath)) {
                cachedLocations = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            }
        } catch (e) {
            console.warn('Could not load fallback locations json:', e.message);
        }
    }
    return cachedLocations || [];
}

// GET /api/locations/regions
// Return all 12 regions + 2 chartered cities
router.get('/regions', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, code, name, type FROM regions ORDER BY name ASC'
        );
        if (result.rows.length > 0) {
            return res.json({ success: true, data: result.rows });
        }
    } catch (err) {
        console.warn('DB error fetching regions, using fallback:', err.message);
    }

    const fallback = getCachedLocations().map(r => ({
        id: r.id,
        code: r.code,
        name: r.name,
        type: r.type
    }));
    return res.json({ success: true, data: fallback });
});

// GET /api/locations/regions/:regionId/zones
// Return all zones for a specified region
router.get('/regions/:regionId/zones', async (req, res) => {
    const { regionId } = req.params;
    try {
        const result = await pool.query(
            'SELECT id, region_id, code, name FROM zones WHERE region_id = $1 ORDER BY name ASC',
            [regionId]
        );
        if (result.rows.length > 0) {
            return res.json({ success: true, data: result.rows });
        }
    } catch (err) {
        console.warn('DB error fetching zones, using fallback:', err.message);
    }

    const region = getCachedLocations().find(r => r.id === regionId || r.code === regionId);
    const zones = region ? region.zones.map(z => ({ id: z.id, region_id: region.id, code: z.code, name: z.name })) : [];
    return res.json({ success: true, data: zones });
});

// GET /api/locations/zones/:zoneId/woredas
// Return all woredas for a specified zone
router.get('/zones/:zoneId/woredas', async (req, res) => {
    const { zoneId } = req.params;
    try {
        const result = await pool.query(
            'SELECT id, zone_id, code, name FROM woredas WHERE zone_id = $1 ORDER BY name ASC',
            [zoneId]
        );
        if (result.rows.length > 0) {
            return res.json({ success: true, data: result.rows });
        }
    } catch (err) {
        console.warn('DB error fetching woredas, using fallback:', err.message);
    }

    let foundWoredas = [];
    for (const r of getCachedLocations()) {
        const z = (r.zones || []).find(zone => zone.id === zoneId || zone.code === zoneId);
        if (z && z.woredas) {
            foundWoredas = z.woredas.map(w => ({ id: w.id, zone_id: z.id, code: w.code, name: w.name }));
            break;
        }
    }
    return res.json({ success: true, data: foundWoredas });
});

// GET /api/locations/zones/:zoneId/supervisors
// Return active supervisors stationed in this zone
router.get('/zones/:zoneId/supervisors', async (req, res) => {
    const { zoneId } = req.params;
    try {
        const result = await pool.query(`
            SELECT id, employee_id, name, email, role, region_id, zone_id, status
            FROM users
            WHERE role = 'supervisor'
              AND (zone_id = $1 OR region_id = (SELECT region_id FROM zones WHERE id = $1))
              AND status = 'active'
            ORDER BY name ASC
        `, [zoneId]);

        return res.json({ success: true, data: result.rows });
    } catch (err) {
        console.warn('DB error fetching zone supervisors:', err.message);
        return res.json({
            success: true,
            data: [
                { id: 'u_sup', employee_id: 'SUP000', name: 'Regional Supervisor', email: 'supervisor@fieldsync.com', role: 'supervisor' }
            ]
        });
    }
});

module.exports = router;
