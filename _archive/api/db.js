const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'fieldsync_db',
  password: String(process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'password'),
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

// Test Connection
pool.connect((err, client, release) => {
  if (err) {
    console.warn('⚠️ PostgreSQL database connection warning:', err.message);
    console.warn('ℹ️ Running in fallback mode. Ensure PostgreSQL is running and credentials in .env are correct.');
  } else {
    console.log('✅ Connected to PostgreSQL database:', process.env.DB_NAME || 'fieldsync_db');
    if (release) release();
  }
});

pool.on('error', (err) => {
  console.warn('⚠️ Unexpected error on idle PostgreSQL client:', err.message);
});

module.exports = pool;
