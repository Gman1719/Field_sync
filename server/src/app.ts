// server/src/app.ts
// Express Application Setup & Middleware Configuration for FieldSync

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import prisma from './config/db.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.routes.js';
import locationsRoutes from './routes/locations.routes.js';
import citizensRoutes from './routes/citizens.routes.js';
import assignmentsRoutes from './routes/assignments.routes.js';
import activityLogsRoutes from './routes/activityLogs.routes.js';
import workSessionsRoutes from './routes/workSessions.routes.js';
import dailyReportsRoutes from './routes/dailyReports.routes.js';
import syncRoutes from './routes/sync.routes.js';
import duplicatesRoutes from './routes/duplicates.routes.js';
import usersRoutes from './routes/users.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import auditLogsRoutes from './routes/auditLogs.routes.js';
import workMonitoringRoutes from './routes/workMonitoring.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = (): Express => {
  const app = express();

  // Configured allowed origins (local development + production CLIENT_URL)
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.CLIENT_URL,
  ]
    .filter(Boolean)
    .map((origin) => (origin as string).replace(/\/+$/, ''));

  // Security Middleware
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  // Root endpoint: Server Status & Metadata
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      service: 'FieldSync Backend',
      status: 'running',
      health: '/api/health',
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // REST API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/locations', locationsRoutes);
  app.use('/api/citizens', citizensRoutes);
  app.use('/api/assignments', assignmentsRoutes);
  app.use('/api/activity-logs', activityLogsRoutes);
  app.use('/api/activity', activityLogsRoutes);
  app.use('/api/work-sessions', workSessionsRoutes);
  app.use('/api/reports', dailyReportsRoutes);
  app.use('/api/sync', syncRoutes);
  app.use('/api/duplicates', duplicatesRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/audit-logs', auditLogsRoutes);
  app.use('/api/audit', auditLogsRoutes);
  app.use('/api/work-monitoring', workMonitoringRoutes);

  // Phase 1 Health Check & Database Verification
  app.get('/api/health', async (_req: Request, res: Response) => {
    try {
      // Verify database connection and fetch core statistics
      const [usersCount, regionsCount, zonesCount, woredasCount, citizensCount] = await Promise.all([
        prisma.user.count(),
        prisma.region.count(),
        prisma.zone.count(),
        prisma.woreda.count(),
        prisma.citizen.count(),
      ]);

      res.json({
        status: 'healthy',
        service: 'FieldSync Backend Server (Phase 1)',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          provider: 'PostgreSQL',
          orm: 'Prisma v5.22.0',
          counts: {
            users: usersCount,
            regions: regionsCount,
            zones: zonesCount,
            woredas: woredasCount,
            citizens: citizensCount,
          },
        },
        offlineFirstReady: true,
      });
    } catch (error: any) {
      console.error('Health check database error:', error.message);
      res.status(500).json({
        status: 'unhealthy',
        service: 'FieldSync Backend Server (Phase 1)',
        database: {
          connected: false,
          error: error.message,
        },
      });
    }
  });

  // Global Error Handling Middleware
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err.message && err.message.startsWith('CORS policy')) {
      res.status(403).json({
        success: false,
        error: err.message,
      });
      return;
    }
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
  });

  return app;
};

export default createApp;
