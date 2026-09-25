// routes/workSessions.js
// Work Session & Screen Time Tracking API for FieldSync
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Ensure work_sessions table exists
const ensureTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS work_sessions (
      id VARCHAR(100) PRIMARY KEY,
      officer_id VARCHAR(50) NOT NULL,
      employee_id VARCHAR(50),
      employee_name VARCHAR(100),
      report_date DATE NOT NULL,
      started_at TIMESTAMP WITH TIME ZONE NOT NULL,
      ended_at TIMESTAMP WITH TIME ZONE,
      duration_seconds INTEGER DEFAULT 0,
      device_reported BOOLEAN DEFAULT true,
      sync_status VARCHAR(20) DEFAULT 'SYNCED',
      region VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_screen_time_summary (
      id VARCHAR(100) PRIMARY KEY,
      officer_id VARCHAR(50) NOT NULL,
      employee_id VARCHAR(50),
      employee_name VARCHAR(100),
      report_date DATE NOT NULL,
      total_seconds INTEGER DEFAULT 0,
      session_count INTEGER DEFAULT 0,
      finalized BOOLEAN DEFAULT false,
      finalized_at TIMESTAMP WITH TIME ZONE,
      region VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(officer_id, report_date)
    )
  `);
};

ensureTable().catch(console.error);

// POST /api/work-sessions/sync — Bulk sync offline sessions (idempotent upsert)
router.post('/sync', async (req, res) => {
  try {
    const { sessions, officerId } = req.body;
    if (!sessions || !Array.isArray(sessions)) {
      return res.status(400).json({ error: 'sessions array required' });
    }

    let synced = 0;
    for (const s of sessions) {
      await pool.query(`
        INSERT INTO work_sessions (
          id, officer_id, employee_id, employee_name, report_date,
          started_at, ended_at, duration_seconds, device_reported, sync_status, region
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'SYNCED',$10)
        ON CONFLICT (id) DO UPDATE SET
          ended_at = EXCLUDED.ended_at,
          duration_seconds = EXCLUDED.duration_seconds,
          sync_status = 'SYNCED',
          updated_at = CURRENT_TIMESTAMP
      `, [
        s.id, s.officerId || officerId, s.employeeId, s.employeeName,
        s.reportDate, s.startedAt, s.endedAt || null,
        s.durationSeconds || 0, true, s.region || null
      ]);
      synced++;
    }

    res.json({ success: true, synced });
  } catch (error) {
    console.error('work-sessions sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/work-sessions/daily-summary?date=YYYY-MM-DD&officerId=xxx
router.get('/daily-summary', async (req, res) => {
  try {
    const { date, officerId } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    let query, params;
    if (officerId) {
      query = `
        SELECT 
          officer_id,
          employee_name,
          report_date,
          SUM(duration_seconds) as total_seconds,
          COUNT(*) as session_count
        FROM work_sessions
        WHERE report_date = $1 AND officer_id = $2
        GROUP BY officer_id, employee_name, report_date
      `;
      params = [targetDate, officerId];
    } else {
      query = `
        SELECT 
          officer_id,
          employee_name,
          region,
          report_date,
          SUM(duration_seconds) as total_seconds,
          COUNT(*) as session_count
        FROM work_sessions
        WHERE report_date = $1
        GROUP BY officer_id, employee_name, region, report_date
        ORDER BY total_seconds DESC
      `;
      params = [targetDate];
    }

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, date: targetDate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/work-sessions/officer/:officerId?startDate=&endDate=
router.get('/officer/:officerId', async (req, res) => {
  try {
    const { officerId } = req.params;
    const { startDate, endDate } = req.query;
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || start;

    const result = await pool.query(`
      SELECT * FROM work_sessions
      WHERE officer_id = $1 AND report_date BETWEEN $2 AND $3
      ORDER BY started_at DESC
    `, [officerId, start, end]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/work-sessions/team-overview?date=YYYY-MM-DD&supervisorId=xxx
router.get('/team-overview', async (req, res) => {
  try {
    const { date, supervisorId, region } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    let whereClause = 'WHERE ws.report_date = $1';
    const params = [targetDate];
    let idx = 2;

    if (region && region !== 'all') {
      whereClause += ` AND ws.region = $${idx}`;
      params.push(region);
      idx++;
    }

    const result = await pool.query(`
      SELECT 
        ws.officer_id,
        u.name as employee_name,
        u.region,
        ws.report_date,
        SUM(ws.duration_seconds) as total_seconds,
        COUNT(ws.id) as session_count,
        MIN(ws.started_at) as first_session_start,
        MAX(COALESCE(ws.ended_at, ws.started_at)) as last_activity
      FROM work_sessions ws
      LEFT JOIN users u ON u.id = ws.officer_id
      ${whereClause}
      GROUP BY ws.officer_id, u.name, u.region, ws.report_date
      ORDER BY total_seconds DESC
    `, params);

    res.json({ success: true, data: result.rows, date: targetDate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/work-sessions/analytics?startDate=&endDate=&region=
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate, region } = req.query;
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || start;

    let whereClause = 'WHERE ws.report_date BETWEEN $1 AND $2';
    const params = [start, end];
    let idx = 3;

    if (region && region !== 'all') {
      whereClause += ` AND ws.region = $${idx}`;
      params.push(region);
      idx++;
    }

    // Daily totals
    const dailyResult = await pool.query(`
      SELECT 
        report_date,
        SUM(duration_seconds) as total_seconds,
        COUNT(DISTINCT officer_id) as active_officers,
        COUNT(id) as total_sessions
      FROM work_sessions ws
      ${whereClause}
      GROUP BY report_date
      ORDER BY report_date ASC
    `, params);

    // Region breakdown
    const regionResult = await pool.query(`
      SELECT 
        COALESCE(ws.region, 'Unknown') as region,
        SUM(duration_seconds) as total_seconds,
        COUNT(DISTINCT officer_id) as officer_count,
        COUNT(id) as session_count
      FROM work_sessions ws
      ${whereClause}
      GROUP BY region
      ORDER BY total_seconds DESC
    `, params);

    // Top officers
    const topOfficers = await pool.query(`
      SELECT 
        ws.officer_id,
        u.name as employee_name,
        u.region,
        SUM(ws.duration_seconds) as total_seconds,
        COUNT(ws.id) as session_count
      FROM work_sessions ws
      LEFT JOIN users u ON u.id = ws.officer_id
      ${whereClause}
      GROUP BY ws.officer_id, u.name, u.region
      ORDER BY total_seconds DESC
      LIMIT 10
    `, params);

    res.json({
      success: true,
      data: {
        dailyTotals: dailyResult.rows,
        regionBreakdown: regionResult.rows,
        topOfficers: topOfficers.rows,
        dateRange: { start, end }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
