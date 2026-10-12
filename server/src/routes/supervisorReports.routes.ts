import { Router, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const REPORTS_FILE = path.join(DATA_DIR, 'supervisor_reports.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (_e) {}
}

export function readReports(): any[] {
  try {
    if (fs.existsSync(REPORTS_FILE)) {
      const content = fs.readFileSync(REPORTS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading supervisor reports file:', err);
  }
  return [];
}

export function writeReports(reports: any[]): void {
  try {
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing supervisor reports file:', err);
  }
}

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const reports = readReports();
    res.json(reports);
  } catch (error: any) {
    console.error('GET /api/supervisor-reports error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve supervisor reports' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const report = {
      id: body.id || `sup_rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      supervisor_id: body.supervisor_id || body.supervisorId || 'unknown',
      supervisor_name: body.supervisor_name || body.supervisorName || 'Supervisor',
      officer_id: body.officer_id || body.officerId || 'unknown',
      officer_name: body.officer_name || body.officerName || 'Field Officer',
      officer_region: body.officer_region || body.officerRegion || 'Addis Ababa',
      report_date: body.report_date || body.reportDate || new Date().toISOString().split('T')[0],
      performance: body.performance || 85,
      attendance: body.attendance || 90,
      quality: body.quality || 88,
      punctuality: body.punctuality || 92,
      teamwork: body.teamwork || 87,
      communication: body.communication || 89,
      comments: body.comments || '',
      recommendations: body.recommendations || '',
      overall_rating: body.overall_rating || body.overallRating || 4.5,
      status: body.status || 'Submitted',
      submitted_at: body.submitted_at || body.submittedAt || new Date().toISOString(),
      region: body.region || 'Addis Ababa',
      type: body.type || 'Daily Evaluation',
      synced: true,
      ...body,
    };

    const reports = readReports();
    const existingIndex = reports.findIndex((r) => r.id === report.id);
    if (existingIndex >= 0) {
      reports[existingIndex] = { ...reports[existingIndex], ...report };
    } else {
      reports.unshift(report);
    }
    writeReports(reports);

    res.status(201).json(report);
  } catch (error: any) {
    console.error('POST /api/supervisor-reports error:', error);
    res.status(500).json({ success: false, error: 'Failed to record supervisor report' });
  }
});

export default router;
