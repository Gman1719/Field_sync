// api/scripts/import-locations.js
// Migration and Seed script for Ethiopian Location Hierarchy & User Schema

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('../db');

async function importLocations() {
    console.log('🌍 Starting Ethiopian Location & User Schema Migration...');

    try {
        // 1. Create Tables for Ethiopian Administrative Hierarchy
        console.log('📦 Creating hierarchy tables (regions, zones, woredas)...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS regions (
                id VARCHAR(50) PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                type VARCHAR(50) DEFAULT 'region',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS zones (
                id VARCHAR(50) PRIMARY KEY,
                region_id VARCHAR(50) NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
                code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS woredas (
                id VARCHAR(50) PRIMARY KEY,
                zone_id VARCHAR(50) NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
                code VARCHAR(50) NOT NULL,
                name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE woredas DROP CONSTRAINT IF EXISTS woredas_code_key;
            ALTER TABLE zones DROP CONSTRAINT IF EXISTS zones_code_key;
        `);

        // Clean out prior partial prototype location data to allow full fresh hierarchy import
        await pool.query(`
            DELETE FROM woredas;
            DELETE FROM zones;
            DELETE FROM regions;
        `);

        // 2. Add Missing Columns to users table safely
        console.log('👤 Updating users table schema...');
        const userColumnsToAdd = [
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS region_id VARCHAR(50) REFERENCES regions(id) ON DELETE SET NULL;`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS zone_id VARCHAR(50) REFERENCES zones(id) ON DELETE SET NULL;`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS woreda_id VARCHAR(50) REFERENCES woredas(id) ON DELETE SET NULL;`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS zone VARCHAR(100);`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS woreda VARCHAR(100);`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;`
        ];

        for (const colQuery of userColumnsToAdd) {
            await pool.query(colQuery);
        }

        // 3. Load & Upsert Locations Dataset
        const dataPath = path.resolve(__dirname, '../data/ethiopia-locations.json');
        if (!fs.existsSync(dataPath)) {
            throw new Error(`Location dataset not found at ${dataPath}`);
        }

        const rawData = fs.readFileSync(dataPath, 'utf-8');
        const regionsData = JSON.parse(rawData);

        console.log(`🗺️ Upserting ${regionsData.length} Regions and their child Zones & Woredas...`);

        let totalRegions = 0;
        let totalZones = 0;
        let totalWoredas = 0;

        for (const region of regionsData) {
            await pool.query(`
                INSERT INTO regions (id, code, name, type)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    code = EXCLUDED.code,
                    type = EXCLUDED.type;
            `, [region.id, region.code, region.name, region.type || 'region']);
            totalRegions++;

            if (Array.isArray(region.zones)) {
                for (const zone of region.zones) {
                    await pool.query(`
                        INSERT INTO zones (id, region_id, code, name)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            code = EXCLUDED.code,
                            region_id = EXCLUDED.region_id;
                    `, [zone.id, region.id, zone.code, zone.name]);
                    totalZones++;

                    if (Array.isArray(zone.woredas)) {
                        for (const woreda of zone.woredas) {
                            await pool.query(`
                                INSERT INTO woredas (id, zone_id, code, name)
                                VALUES ($1, $2, $3, $4)
                                ON CONFLICT (id) DO UPDATE SET
                                    name = EXCLUDED.name,
                                    code = EXCLUDED.code,
                                    zone_id = EXCLUDED.zone_id;
                            `, [woreda.id, zone.id, woreda.code, woreda.name]);
                            totalWoredas++;
                        }
                    }
                }
            }
        }

        console.log(`✅ Loaded ${totalRegions} regions, ${totalZones} zones, and ${totalWoredas} woredas.`);

        // 4. Update seed users with proper bcrypt hashes and location mapping
        console.log('🔑 Updating seed user accounts with bcrypt hashes and Ethiopian hierarchy assignments...');
        const salt = await bcrypt.genSalt(10);
        const defaultHash = await bcrypt.hash('Password123!', salt);

        const seedUsers = [
            {
                id: 'u_mgr',
                employee_id: 'MGR000',
                name: 'System Manager',
                first_name: 'System',
                middle_name: 'Admin',
                last_name: 'Manager',
                email: 'manager@fieldsync.com',
                password_hash: defaultHash,
                role: 'manager',
                region_id: null,
                zone_id: null,
                woreda_id: null,
                region: 'Organization-wide',
                zone: null,
                woreda: null,
                supervisor_id: null,
                status: 'active',
                must_change_password: false,
                phone: '+251911000000'
            },
            {
                id: 'u_sup',
                employee_id: 'SUP000',
                name: 'Regional Supervisor',
                first_name: 'Regional',
                middle_name: 'Lead',
                last_name: 'Supervisor',
                email: 'supervisor@fieldsync.com',
                password_hash: defaultHash,
                role: 'supervisor',
                region_id: 'reg-addis-ababa',
                zone_id: 'zone-aa-bole',
                woreda_id: null,
                region: 'Addis Ababa',
                zone: 'Bole Sub-City',
                woreda: null,
                supervisor_id: null,
                status: 'active',
                must_change_password: false,
                phone: '+251911000100'
            },
            {
                id: 'u_off',
                employee_id: 'FO000',
                name: 'Field Officer',
                first_name: 'Field',
                middle_name: 'Support',
                last_name: 'Officer',
                email: 'officer@fieldsync.com',
                password_hash: defaultHash,
                role: 'field_officer',
                region_id: 'reg-addis-ababa',
                zone_id: 'zone-aa-bole',
                woreda_id: 'wor-aa-bol-01',
                region: 'Addis Ababa',
                zone: 'Bole Sub-City',
                woreda: 'Bole Woreda 01',
                supervisor_id: 'u_sup',
                status: 'active',
                must_change_password: false,
                phone: '+251911000200'
            }
        ];

        for (const u of seedUsers) {
            await pool.query(`
                INSERT INTO users (
                    id, employee_id, name, first_name, middle_name, last_name,
                    email, password_hash, role, region_id, zone_id, woreda_id,
                    region, zone, woreda, supervisor_id, status, must_change_password, phone
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    first_name = EXCLUDED.first_name,
                    middle_name = EXCLUDED.middle_name,
                    last_name = EXCLUDED.last_name,
                    email = EXCLUDED.email,
                    password_hash = EXCLUDED.password_hash,
                    role = EXCLUDED.role,
                    region_id = EXCLUDED.region_id,
                    zone_id = EXCLUDED.zone_id,
                    woreda_id = EXCLUDED.woreda_id,
                    region = EXCLUDED.region,
                    zone = EXCLUDED.zone,
                    woreda = EXCLUDED.woreda,
                    supervisor_id = EXCLUDED.supervisor_id,
                    status = EXCLUDED.status,
                    must_change_password = EXCLUDED.must_change_password;
            `, [
                u.id, u.employee_id, u.name, u.first_name, u.middle_name, u.last_name,
                u.email, u.password_hash, u.role, u.region_id, u.zone_id, u.woreda_id,
                u.region, u.zone, u.woreda, u.supervisor_id, u.status, u.must_change_password, u.phone
            ]);
        }

        console.log('🎉 Location and user hierarchy migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration error:', err);
        process.exit(1);
    }
}

importLocations();
