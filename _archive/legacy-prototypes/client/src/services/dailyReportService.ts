import db from '../db/index.ts';
import { api } from './api.ts';
import { DailyWorkReportItem } from '../types/index.ts';
import ScreenTimeTracker from './screenTimeTracker.ts';
import ActivityLogger from './activityLogger.ts';

export interface TodayStats {
  reportDate: string;
  citizenCountLocal: number;
  citizenCountServerConfirmed: number;
  activityCount: number;
  sessionCount: number;
  screenTimeSeconds: number;
  pendingSyncCount: number;
  failedSyncCount: number;
  existingReport: DailyWorkReportItem | null;
}

export class DailyReportService {
  /**
   * Helper to format seconds as HH:MM:SS
   */
  static formatScreenTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }

  /**
   * Collects automated fieldwork statistics for a given officer and report date.
   */
  static async getTodayStats(officerId: string, targetDate?: string): Promise<TodayStats> {
    const reportDate = targetDate || ScreenTimeTracker.getLocalDateString();

    try {
      // 1. Citizens registered today by officer
      const allCitizens = await db.citizens
        .where('registeredById')
        .equals(officerId)
        .toArray();

      const todayCitizens = allCitizens.filter((c) =>
        c.createdAt.startsWith(reportDate)
      );

      const citizenCountLocal = todayCitizens.length;
      const citizenCountServerConfirmed = todayCitizens.filter(
        (c) => c.syncStatus === 'SYNCED'
      ).length;

      // 2. Activity logs recorded today
      const allLogs = await db.activityLogs
        .where('officerId')
        .equals(officerId)
        .toArray();

      const todayLogs = allLogs.filter((l) =>
        l.deviceTimestamp.startsWith(reportDate)
      );
      const activityCount = todayLogs.length;

      // 3. Screen time and sessions today
      const screenTimeData = await ScreenTimeTracker.getTodayScreenTime(
        officerId,
        reportDate
      );

      // 4. Sync queue counts
      const pendingSyncCount = await db.syncQueue
        .where('status')
        .equals('PENDING')
        .count();

      const failedSyncCount = await db.syncQueue
        .where('status')
        .equals('FAILED')
        .count();

      // 5. Check if report already exists for today in Dexie
      const existingReport = await db.dailyWorkReports
        .where('[officerId+reportDate]')
        .equals([officerId, reportDate])
        .first();

      return {
        reportDate,
        citizenCountLocal,
        citizenCountServerConfirmed,
        activityCount,
        sessionCount: screenTimeData.sessionCount,
        screenTimeSeconds: screenTimeData.totalSeconds,
        pendingSyncCount,
        failedSyncCount,
        existingReport: existingReport || null,
      };
    } catch (err) {
      console.error('Failed to calculate today stats:', err);
      return {
        reportDate,
        citizenCountLocal: 0,
        citizenCountServerConfirmed: 0,
        activityCount: 0,
        sessionCount: 0,
        screenTimeSeconds: 0,
        pendingSyncCount: 0,
        failedSyncCount: 0,
        existingReport: null,
      };
    }
  }

  /**
   * Submits Daily Work Report offline:
   * 1. Finalizes screen-time total.
   * 2. Persists report to IndexedDB with isLocked: true.
   * 3. Queues submission for sync.
   * 4. Logs activity event.
   */
  static async submitDailyReport(params: {
    officerId: string;
    supervisorId?: string | null;
    reportDate: string;
    assignmentId?: string | null;
    citizenCountLocal: number;
    citizenCountServerConfirmed: number;
    activityCount: number;
    sessionCount: number;
    comments?: string | null;
  }): Promise<DailyWorkReportItem> {
    const reportId = crypto.randomUUID();
    const now = new Date();

    // 1. Finalize screen-time total
    const screenTimeSeconds = await ScreenTimeTracker.finalizeDay(
      params.officerId,
      params.reportDate
    );

    const reportItem: DailyWorkReportItem = {
      id: reportId,
      officerId: params.officerId,
      supervisorId: params.supervisorId || null,
      reportDate: params.reportDate,
      assignmentId: params.assignmentId || null,
      citizenCountLocal: params.citizenCountLocal,
      citizenCountServerConfirmed: params.citizenCountServerConfirmed,
      activityCount: params.activityCount,
      sessionCount: params.sessionCount,
      screenTimeSeconds,
      comments: params.comments || null,
      submittedAt: now.toISOString(),
      syncStatus: 'PENDING',
      isLocked: true, // Lock against ordinary modification
    };

    // 2. Persist locally to IndexedDB
    await db.dailyWorkReports.put(reportItem);

    // 3. Queue in syncQueue
    await db.syncQueue.add({
      clientRecordId: reportId,
      entityType: 'DAILY_REPORT',
      action: 'CREATE',
      payload: reportItem,
      status: 'PENDING',
      retryCount: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    // 4. Record Activity Log
    await ActivityLogger.logEvent(
      'DAILY_REPORT_SUBMITTED',
      `Submitted Daily Work Report for ${params.reportDate} with ${params.citizenCountLocal} citizens registered and ${Math.round(screenTimeSeconds / 60)} mins active screen time.`,
      {
        officerId: params.officerId,
        assignmentId: params.assignmentId || null,
        relatedRecordId: reportId,
        metadata: {
          reportDate: params.reportDate,
          screenTimeSeconds,
          citizenCountLocal: params.citizenCountLocal,
        },
      }
    );

    // 5. Try immediate sync if online
    if (navigator.onLine) {
      this.syncReportToServer(reportItem).catch(() => {
        // Safe retry in background sync engine
      });
    }

    return reportItem;
  }

  /**
   * Attempt direct sync of single report to server
   */
  static async syncReportToServer(report: DailyWorkReportItem): Promise<boolean> {
    try {
      const res = await api.post('/daily-reports', {
        id: report.id,
        officerId: report.officerId,
        supervisorId: report.supervisorId,
        reportDate: report.reportDate,
        assignmentId: report.assignmentId,
        citizenCountLocal: report.citizenCountLocal,
        citizenCountServerConfirmed: report.citizenCountServerConfirmed,
        activityCount: report.activityCount,
        sessionCount: report.sessionCount,
        screenTimeSeconds: report.screenTimeSeconds,
        comments: report.comments,
        submittedAt: report.submittedAt,
      });

      if (res.data?.success) {
        await db.dailyWorkReports.update(report.id, {
          syncStatus: 'SYNCED',
          serverReceivedAt: res.data.data?.serverReceivedAt || new Date().toISOString(),
        });
        return true;
      }
    } catch (err: any) {
      console.warn('Daily report sync deferred to background sync queue:', err.message);
    }
    return false;
  }

  /**
   * Fetch submitted daily reports from server (for Supervisor / Manager)
   */
  static async fetchServerReports(params?: {
    officerId?: string;
    reportDate?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<DailyWorkReportItem[]> {
    const res = await api.get('/daily-reports', { params });
    return res.data?.data || [];
  }
}

export default DailyReportService;
