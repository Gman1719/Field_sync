// server.js – FieldSync Express API Server
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const pool = require('./db');

// Router imports
const authRouter = require('./routes/auth');
const reportsRouter = require('./routes/reports');
const attendanceRouter = require('./routes/attendance');
const citizensRouter = require('./routes/citizens');
const usersRouter = require('./routes/users');
const leavesRouter = require('./routes/leaves');
const permissionsRouter = require('./routes/permissions');
const tasksRouter = require('./routes/tasks');
const screenTimeRouter = require('./routes/screenTime');
const auditRouter = require('./routes/audit');
const alertsRouter = require('./routes/alerts');
const verificationRouter = require('./routes/verification');
const supervisorReportsRouter = require('./routes/supervisorReports');
const syncRouter = require('./routes/sync');
const locationsRouter = require('./routes/locations');
const workSessionsRouter = require('./routes/workSessions');


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.set('json spaces', 2);

// Test & Health check endpoints
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
});

app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message
        });
    }
});

// Mount modular routers
app.use('/api/auth', authRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/citizens', citizensRouter);
app.use('/api/users', usersRouter);
app.use('/api/leaves', leavesRouter);
app.use('/api/permissions', permissionsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/screen-time', screenTimeRouter);
app.use('/api/audit', auditRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/verification', verificationRouter);
app.use('/api/supervisor-reports', supervisorReportsRouter);
app.use('/api/sync', syncRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/work-sessions', workSessionsRouter);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 FieldSync API running on http://localhost:${PORT}`);
    console.log(`📡 All 14 modular route groups mounted successfully`);
});

module.exports = app;