// server/src/routes/analytics.routes.ts
// Real-Time Advanced Analytics & Telemetry Engine for FieldSync (Data-Driven PostgreSQL)

import { Router, Request, Response } from 'express';
import prisma from '../config/db.js';
import { authenticate, requireSupervisor } from '../middleware/auth.middleware.js';
import { Role, SyncStatus, DuplicateReviewStatus } from '@prisma/client';

const router = Router();

function formatDuration(totalSeconds: number = 0): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatHMS(secs: number = 0): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Parses period ('today' | 'week' | 'month' | 'custom') and returns normalized date boundaries
 */
function resolveDateRange(period?: string, startDateStr?: string, endDateStr?: string) {
  const now = new Date();
  let start: Date;
  let end: Date = new Date();
  let prevStart: Date;
  let prevEnd: Date;

  const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  if (period === 'today') {
    start = todayMidnight;
    end = todayEnd;
    // Previous period: yesterday
    prevStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    prevEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  } else if (period === 'week') {
    // Last 7 days
    start = new Date(todayMidnight.getTime() - 6 * 24 * 60 * 60 * 1000);
    end = todayEnd;
    const duration = end.getTime() - start.getTime();
    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - duration);
  } else if (period === 'month') {
    // Last 30 days
    start = new Date(todayMidnight.getTime() - 29 * 24 * 60 * 60 * 1000);
    end = todayEnd;
    const duration = end.getTime() - start.getTime();
    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - duration);
  } else if (period === 'custom' && startDateStr && endDateStr) {
    start = new Date(`${startDateStr}T00:00:00.000Z`);
    end = new Date(`${endDateStr}T23:59:59.999Z`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      start = new Date(todayMidnight.getTime() - 29 * 24 * 60 * 60 * 1000);
      end = todayEnd;
    }
    const duration = Math.max(24 * 60 * 60 * 1000, end.getTime() - start.getTime());
    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - duration);
  } else {
    // Default to last 30 days
    start = new Date(todayMidnight.getTime() - 29 * 24 * 60 * 60 * 1000);
    end = todayEnd;
    const duration = end.getTime() - start.getTime();
    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - duration);
  }

  // Days count for expectation metrics
  const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));

  return {
    period: period || 'month',
    startDate: start,
    endDate: end,
    startDateStr: start.toISOString().split('T')[0],
    endDateStr: end.toISOString().split('T')[0],
    prevStartDate: prevStart,
    prevEndDate: prevEnd,
    diffDays,
  };
}

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Enterprise Analytics Dashboard for Manager (National) and Supervisor (Zone-Scoped)
 * @access  Private (Supervisor & Manager)
 */
router.get('/dashboard', authenticate, requireSupervisor, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { period, startDate, endDate, zoneId: queryZoneId, regionId: queryRegionId } = req.query;

    const dateRange = resolveDateRange(
      typeof period === 'string' ? period : undefined,
      typeof startDate === 'string' ? startDate : undefined,
      typeof endDate === 'string' ? endDate : undefined
    );

    // 1. Enforce Role & Geographic Scoping
    let effectiveZoneId: string | null = null;
    let effectiveRegionId: string | null = null;

    if (user.role === Role.SUPERVISOR) {
      // Supervisor is STRICTLY scoped to their assigned Zone
      effectiveZoneId = user.zoneId;
      if (!effectiveZoneId) {
        // Fallback: lookup supervisor's user record in DB
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { zoneId: true, regionId: true },
        });
        effectiveZoneId = dbUser?.zoneId || null;
        effectiveRegionId = dbUser?.regionId || null;
      }
    } else if (user.role === Role.MANAGER) {
      // Manager can query organization-wide or optionally drill down
      if (typeof queryZoneId === 'string' && queryZoneId !== 'all') {
        effectiveZoneId = queryZoneId;
      }
      if (typeof queryRegionId === 'string' && queryRegionId !== 'all') {
        effectiveRegionId = queryRegionId;
      }
    }

    // Build Prisma where clauses based on scope
    const citizenScopeWhere: any = {};
    let officerScopeWhere: any = { role: Role.FIELD_OFFICER };
    const reportScopeWhere: any = {};
    const dupScopeWhere: any = {};
    const sessionScopeWhere: any = {};
    const syncErrorScopeWhere: any = {};

    if (user.role === Role.SUPERVISOR) {
      // Find all officers assigned to supervisor or in their zone
      const assignedOfficers = await prisma.user.findMany({
        where: {
          role: Role.FIELD_OFFICER,
          OR: [
            { supervisorId: user.id },
            ...(effectiveZoneId ? [{ zoneId: effectiveZoneId }] : []),
          ],
        },
        select: { id: true },
      });
      const assignedOfficerIds = assignedOfficers.map((o) => o.id);
      assignedOfficerIds.push(user.id);

      citizenScopeWhere.OR = [
        { registeredById: { in: assignedOfficerIds } },
        ...(effectiveZoneId ? [{ zoneId: effectiveZoneId }] : []),
      ];
      officerScopeWhere = {
        role: Role.FIELD_OFFICER,
        OR: [
          { supervisorId: user.id },
          ...(effectiveZoneId ? [{ zoneId: effectiveZoneId }] : []),
        ],
      };
      reportScopeWhere.OR = [
        { supervisorId: user.id },
        { officerId: { in: assignedOfficerIds } },
      ];
      dupScopeWhere.OR = [
        { citizen: { registeredById: { in: assignedOfficerIds } } },
        ...(effectiveZoneId ? [{ citizen: { zoneId: effectiveZoneId } }] : []),
      ];
      sessionScopeWhere.officerId = { in: assignedOfficerIds };
      syncErrorScopeWhere.officerId = { in: assignedOfficerIds };
    } else if (effectiveZoneId) {
      citizenScopeWhere.zoneId = effectiveZoneId;
      officerScopeWhere.zoneId = effectiveZoneId;
      reportScopeWhere.officer = { zoneId: effectiveZoneId };
      dupScopeWhere.citizen = { zoneId: effectiveZoneId };
      sessionScopeWhere.officer = { zoneId: effectiveZoneId };
      syncErrorScopeWhere.officer = { zoneId: effectiveZoneId };
    } else if (effectiveRegionId) {
      citizenScopeWhere.regionId = effectiveRegionId;
      officerScopeWhere.regionId = effectiveRegionId;
      reportScopeWhere.officer = { regionId: effectiveRegionId };
      dupScopeWhere.citizen = { regionId: effectiveRegionId };
      sessionScopeWhere.officer = { regionId: effectiveRegionId };
      syncErrorScopeWhere.officer = { regionId: effectiveRegionId };
    }

    // Date-bounded where clauses
    const citizenPeriodWhere = {
      ...citizenScopeWhere,
      registrationTimestamp: { gte: dateRange.startDate, lte: dateRange.endDate },
    };

    const citizenPrevPeriodWhere = {
      ...citizenScopeWhere,
      registrationTimestamp: { gte: dateRange.prevStartDate, lte: dateRange.prevEndDate },
    };

    const reportPeriodWhere = {
      ...reportScopeWhere,
      reportDate: { gte: dateRange.startDateStr, lte: dateRange.endDateStr },
    };

    const sessionPeriodWhere = {
      ...sessionScopeWhere,
      startedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
    };

    // 2. Fetch Data in Parallel via Prisma
    const [
      // Citizen Registrations
      periodCitizenCount,
      allTimeCitizenCount,
      prevPeriodCitizenCount,
      citizensByRegionRaw,
      citizensByZoneRaw,
      citizensByWoredaRaw,
      allPeriodCitizens,

      // Officers in Scope
      scopedOfficers,

      // Daily Reports in Scope
      periodReports,
      allTimeReportsCount,

      // Duplicate Reviews in Scope
      pendingDuplicatesCount,
      confirmedDuplicatesCount,
      approvedDuplicatesCount,

      // Sync Errors & Health
      unresolvedSyncErrorsCount,
      citizensSyncStats,

      // Work Sessions in Scope
      periodWorkSessions,

      // Geography Reference Data (for Coverage & Names)
      allRegions,
      allZones,
      allWoredas,
      allSupervisors,
    ] = await Promise.all([
      // Citizen Counts
      prisma.citizen.count({ where: citizenPeriodWhere }),
      prisma.citizen.count({ where: citizenScopeWhere }),
      prisma.citizen.count({ where: citizenPrevPeriodWhere }),

      // Regional/Zonal/Woreda aggregations for current period
      prisma.citizen.groupBy({
        by: ['regionId'],
        where: citizenPeriodWhere,
        _count: { id: true },
      }),
      prisma.citizen.groupBy({
        by: ['zoneId'],
        where: citizenPeriodWhere,
        _count: { id: true },
      }),
      prisma.citizen.groupBy({
        by: ['woredaId'],
        where: citizenPeriodWhere,
        _count: { id: true },
      }),

      // Raw records in period for trend charting & validation analysis
      prisma.citizen.findMany({
        where: citizenPeriodWhere,
        select: {
          id: true,
          gender: true,
          dateOfBirth: true,
          age: true,
          phoneNumber: true,
          alternativePhone: true,
          regionId: true,
          zoneId: true,
          woredaId: true,
          kebeleId: true,
          village: true,
          registeredById: true,
          syncStatus: true,
          registrationTimestamp: true,
        },
      }),

      // Officers in Scope
      prisma.user.findMany({
        where: officerScopeWhere,
        include: {
          region: { select: { id: true, name: true } },
          zone: { select: { id: true, name: true } },
          woreda: { select: { id: true, name: true } },
          supervisor: { select: { id: true, fullName: true, email: true } },
        },
      }),

      // Reports in Scope
      prisma.dailyWorkReport.findMany({
        where: reportPeriodWhere,
        select: {
          id: true,
          officerId: true,
          supervisorId: true,
          reportDate: true,
          citizenCountLocal: true,
          citizenCountServerConfirmed: true,
          screenTimeSeconds: true,
          comments: true,
          submittedAt: true,
          syncStatus: true,
        },
      }),
      prisma.dailyWorkReport.count({ where: reportScopeWhere }),

      // Duplicate Reviews
      prisma.duplicateReview.count({
        where: {
          ...dupScopeWhere,
          status: { in: [DuplicateReviewStatus.POSSIBLE_DUPLICATE, DuplicateReviewStatus.NEEDS_REVIEW] },
        },
      }),
      prisma.duplicateReview.count({
        where: { ...dupScopeWhere, status: DuplicateReviewStatus.CONFIRMED_DUPLICATE },
      }),
      prisma.duplicateReview.count({
        where: { ...dupScopeWhere, status: DuplicateReviewStatus.APPROVED_AS_DIFFERENT },
      }),

      // Sync Errors & Health
      prisma.syncError.count({
        where: { ...syncErrorScopeWhere, resolved: false },
      }),
      prisma.citizen.groupBy({
        by: ['syncStatus'],
        where: citizenScopeWhere,
        _count: { id: true },
      }),

      // Work Sessions
      prisma.workSession.findMany({
        where: sessionPeriodWhere,
        select: {
          id: true,
          officerId: true,
          durationSeconds: true,
          startedAt: true,
          endedAt: true,
          reportDate: true,
        },
      }),

      // Administrative Metadata
      prisma.region.findMany({ select: { id: true, name: true, code: true } }),
      prisma.zone.findMany({ select: { id: true, name: true, code: true, regionId: true } }),
      prisma.woreda.findMany({ select: { id: true, name: true, code: true, zoneId: true } }),
      prisma.user.findMany({
        where: { role: Role.SUPERVISOR, isActive: true },
        select: { id: true, fullName: true, email: true, regionId: true, zoneId: true },
      }),
    ]);

    // 3. Name Lookup Mappings
    const regionMap = new Map(allRegions.map((r) => [r.id, r.name]));
    const zoneMap = new Map(allZones.map((z) => [z.id, { name: z.name, regionId: z.regionId }]));
    const woredaMap = new Map(allWoredas.map((w) => [w.id, { name: w.name, zoneId: w.zoneId }]));

    // 4. Construct Registration Analytics & Trends
    const percentChange =
      prevPeriodCitizenCount === 0
        ? periodCitizenCount > 0
          ? 100
          : 0
        : Math.round(((periodCitizenCount - prevPeriodCitizenCount) / prevPeriodCitizenCount) * 100);

    // Grouping by Region
    const byRegion = citizensByRegionRaw.map((r) => ({
      regionId: r.regionId,
      regionName: regionMap.get(r.regionId) || 'Unknown Region',
      count: r._count.id,
      percentage: periodCitizenCount > 0 ? Math.round((r._count.id / periodCitizenCount) * 100) : 0,
    })).sort((a, b) => b.count - a.count);

    // Grouping by Zone
    const byZone = citizensByZoneRaw.map((z) => {
      const info = zoneMap.get(z.zoneId);
      return {
        zoneId: z.zoneId,
        zoneName: info?.name || 'Unknown Zone',
        regionName: (info && regionMap.get(info.regionId)) || '',
        count: z._count.id,
        percentage: periodCitizenCount > 0 ? Math.round((z._count.id / periodCitizenCount) * 100) : 0,
      };
    }).sort((a, b) => b.count - a.count);

    // Grouping by Woreda
    const byWoreda = citizensByWoredaRaw.map((w) => {
      const info = woredaMap.get(w.woredaId);
      const zoneInfo = info ? zoneMap.get(info.zoneId) : null;
      return {
        woredaId: w.woredaId,
        woredaName: info?.name || 'Unknown Woreda',
        zoneName: zoneInfo?.name || '',
        count: w._count.id,
        percentage: periodCitizenCount > 0 ? Math.round((w._count.id / periodCitizenCount) * 100) : 0,
      };
    }).sort((a, b) => b.count - a.count);

    // Daily Registration Trend Series (Generating continuous date series)
    const dailyCountsMap = new Map<string, number>();
    for (let d = new Date(dateRange.startDate); d <= dateRange.endDate; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split('T')[0];
      dailyCountsMap.set(dStr, 0);
    }

    allPeriodCitizens.forEach((c) => {
      const dateKey = new Date(c.registrationTimestamp).toISOString().split('T')[0];
      if (dailyCountsMap.has(dateKey)) {
        dailyCountsMap.set(dateKey, (dailyCountsMap.get(dateKey) || 0) + 1);
      }
    });

    const dailyTrends = Array.from(dailyCountsMap.entries()).map(([date, count]) => {
      const [year, month, day] = date.split('-');
      const dObj = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      const label = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { date, label, count };
    });

    // 4b. Construct Gender Distribution
    const genderCountsMap = new Map<string, number>([
      ['MALE', 0],
      ['FEMALE', 0],
      ['OTHER', 0],
    ]);
    allPeriodCitizens.forEach((c) => {
      const g = (c.gender || 'OTHER').toUpperCase();
      if (genderCountsMap.has(g)) {
        genderCountsMap.set(g, (genderCountsMap.get(g) || 0) + 1);
      } else {
        genderCountsMap.set('OTHER', (genderCountsMap.get('OTHER') || 0) + 1);
      }
    });

    const byGender = [
      {
        name: 'Female',
        key: 'FEMALE',
        count: genderCountsMap.get('FEMALE') || 0,
        percentage: periodCitizenCount > 0 ? Math.round(((genderCountsMap.get('FEMALE') || 0) / periodCitizenCount) * 100) : 0,
      },
      {
        name: 'Male',
        key: 'MALE',
        count: genderCountsMap.get('MALE') || 0,
        percentage: periodCitizenCount > 0 ? Math.round(((genderCountsMap.get('MALE') || 0) / periodCitizenCount) * 100) : 0,
      },
      {
        name: 'Other',
        key: 'OTHER',
        count: genderCountsMap.get('OTHER') || 0,
        percentage: periodCitizenCount > 0 ? Math.round(((genderCountsMap.get('OTHER') || 0) / periodCitizenCount) * 100) : 0,
      },
    ].filter(item => item.count > 0 || (genderCountsMap.get('FEMALE') === 0 && genderCountsMap.get('MALE') === 0));

    // 4c. Construct Age Group Distribution
    const ageGroupsMap = new Map<string, number>([
      ['0-17', 0],
      ['18-29', 0],
      ['30-49', 0],
      ['50-64', 0],
      ['65+', 0],
      ['Unknown', 0],
    ]);

    const nowEpoch = Date.now();
    allPeriodCitizens.forEach((c) => {
      let age: number | null = c.age;
      if ((age === null || age === undefined) && c.dateOfBirth) {
        const dob = new Date(c.dateOfBirth);
        if (!isNaN(dob.getTime())) {
          age = Math.floor((nowEpoch - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        }
      }

      if (age === null || age === undefined || age < 0) {
        ageGroupsMap.set('Unknown', (ageGroupsMap.get('Unknown') || 0) + 1);
      } else if (age <= 17) {
        ageGroupsMap.set('0-17', (ageGroupsMap.get('0-17') || 0) + 1);
      } else if (age <= 29) {
        ageGroupsMap.set('18-29', (ageGroupsMap.get('18-29') || 0) + 1);
      } else if (age <= 49) {
        ageGroupsMap.set('30-49', (ageGroupsMap.get('30-49') || 0) + 1);
      } else if (age <= 64) {
        ageGroupsMap.set('50-64', (ageGroupsMap.get('50-64') || 0) + 1);
      } else {
        ageGroupsMap.set('65+', (ageGroupsMap.get('65+') || 0) + 1);
      }
    });

    const byAgeGroup = [
      { group: '0-17', label: '0–17', description: 'Children/Youth', count: ageGroupsMap.get('0-17') || 0, percentage: periodCitizenCount > 0 ? Math.round(((ageGroupsMap.get('0-17') || 0) / periodCitizenCount) * 100) : 0 },
      { group: '18-29', label: '18–29', description: 'Young Adults', count: ageGroupsMap.get('18-29') || 0, percentage: periodCitizenCount > 0 ? Math.round(((ageGroupsMap.get('18-29') || 0) / periodCitizenCount) * 100) : 0 },
      { group: '30-49', label: '30–49', description: 'Adults', count: ageGroupsMap.get('30-49') || 0, percentage: periodCitizenCount > 0 ? Math.round(((ageGroupsMap.get('30-49') || 0) / periodCitizenCount) * 100) : 0 },
      { group: '50-64', label: '50–64', description: 'Middle-Aged', count: ageGroupsMap.get('50-64') || 0, percentage: periodCitizenCount > 0 ? Math.round(((ageGroupsMap.get('50-64') || 0) / periodCitizenCount) * 100) : 0 },
      { group: '65+', label: '65+', description: 'Seniors', count: ageGroupsMap.get('65+') || 0, percentage: periodCitizenCount > 0 ? Math.round(((ageGroupsMap.get('65+') || 0) / periodCitizenCount) * 100) : 0 },
    ];
    if ((ageGroupsMap.get('Unknown') || 0) > 0) {
      byAgeGroup.push({
        group: 'Unknown',
        label: 'Unknown',
        description: 'Unspecified',
        count: ageGroupsMap.get('Unknown') || 0,
        percentage: periodCitizenCount > 0 ? Math.round(((ageGroupsMap.get('Unknown') || 0) / periodCitizenCount) * 100) : 0,
      });
    }

    // 5. Construct Field Officer Activity Analytics
    const officerRegistrationsMap = new Map<string, number>();
    allPeriodCitizens.forEach((c) => {
      const oId = c.registeredById;
      officerRegistrationsMap.set(oId, (officerRegistrationsMap.get(oId) || 0) + 1);
    });

    const officerReportsMap = new Map<string, number>();
    periodReports.forEach((r) => {
      officerReportsMap.set(r.officerId, (officerReportsMap.get(r.officerId) || 0) + 1);
    });

    const officerSessionsMap = new Map<string, { count: number; seconds: number }>();
    periodWorkSessions.forEach((s) => {
      const cur = officerSessionsMap.get(s.officerId) || { count: 0, seconds: 0 };
      cur.count += 1;
      cur.seconds += s.durationSeconds || 0;
      officerSessionsMap.set(s.officerId, cur);
    });

    const nowTime = Date.now();
    const officerActivityList = scopedOfficers.map((officer) => {
      const regCount = officerRegistrationsMap.get(officer.id) || 0;
      const repCount = officerReportsMap.get(officer.id) || 0;
      const sessInfo = officerSessionsMap.get(officer.id) || { count: 0, seconds: 0 };

      // Calculate last sync time
      const lastSyncDate = officer.updatedAt;
      const hoursSinceSync = Math.max(0, Math.round((nowTime - new Date(lastSyncDate).getTime()) / (1000 * 60 * 60)));

      let syncStatus: 'HEALTHY' | 'DELAYED' | 'PROLONGED_DELAY' = 'HEALTHY';
      if (hoursSinceSync >= 24) {
        syncStatus = 'PROLONGED_DELAY';
      } else if (hoursSinceSync >= 12) {
        syncStatus = 'DELAYED';
      }

      return {
        id: officer.id,
        fullName: officer.fullName,
        email: officer.email,
        phoneNumber: officer.phoneNumber,
        isActive: officer.isActive,
        regionName: officer.region?.name || 'Unassigned',
        zoneName: officer.zone?.name || 'Unassigned',
        woredaName: officer.woreda?.name || 'Unassigned',
        supervisorName: officer.supervisor?.fullName || 'Unassigned',
        registrationsInPeriod: regCount,
        reportsSubmitted: repCount,
        workSessionsCount: sessInfo.count,
        totalScreenTimeSeconds: sessInfo.seconds,
        formattedScreenTime: formatDuration(sessInfo.seconds),
        lastSyncTime: lastSyncDate.toISOString(),
        hoursSinceSync,
        syncStatus,
      };
    }).sort((a, b) => b.registrationsInPeriod - a.registrationsInPeriod);

    // Officers with prolonged synchronization delays (> 24 hours)
    const prolongedSyncDelays = officerActivityList.filter((o) => o.isActive && o.syncStatus === 'PROLONGED_DELAY');

    // 6. Construct Assignment Coverage Analytics
    const activeSupervisorsCount = allSupervisors.length;
    const activeOfficersCount = scopedOfficers.filter((o) => o.isActive).length;

    // Supervisor Coverage by Zone
    const zonesWithSupervisor = new Set(allSupervisors.map((s) => s.zoneId).filter(Boolean));
    const scopedZones = effectiveRegionId
      ? allZones.filter((z) => z.regionId === effectiveRegionId)
      : allZones;

    const zonesWithoutSupervisor = scopedZones
      .filter((z) => !zonesWithSupervisor.has(z.id))
      .map((z) => ({
        id: z.id,
        name: z.name,
        code: z.code,
        regionName: regionMap.get(z.regionId) || '',
      }));

    const zoneCoveragePercentage =
      scopedZones.length > 0
        ? Math.round(((scopedZones.length - zonesWithoutSupervisor.length) / scopedZones.length) * 100)
        : 100;

    // Field Officer Coverage by Woreda
    const woredasWithOfficer = new Set(scopedOfficers.filter((o) => o.isActive).map((o) => o.woredaId).filter(Boolean));
    const scopedWoredas = effectiveZoneId
      ? allWoredas.filter((w) => w.zoneId === effectiveZoneId)
      : allWoredas;

    const woredaCoveragePercentage =
      scopedWoredas.length > 0
        ? Math.round((woredasWithOfficer.size / scopedWoredas.length) * 100)
        : 0;

    // Assigned vs Unassigned Field Officers
    const assignedOfficersCount = scopedOfficers.filter((o) => o.supervisorId && o.woredaId).length;
    const unassignedOfficersCount = scopedOfficers.length - assignedOfficersCount;

    // 7. Construct Synchronization Analytics
    const syncStatusCounts = new Map<string, number>();
    citizensSyncStats.forEach((s) => {
      syncStatusCounts.set(s.syncStatus, s._count.id);
    });

    const serverConfirmedCount = syncStatusCounts.get(SyncStatus.SYNCED) || 0;
    const pendingOfflineCount = (syncStatusCounts.get(SyncStatus.PENDING) || 0) + (syncStatusCounts.get(SyncStatus.NEEDS_REVIEW) || 0);
    const failedRecordsCount = (syncStatusCounts.get(SyncStatus.FAILED) || 0) + unresolvedSyncErrorsCount;

    const totalSyncEvaluated = serverConfirmedCount + pendingOfflineCount + failedRecordsCount;
    const syncSuccessRate = totalSyncEvaluated > 0 ? Math.round((serverConfirmedCount / totalSyncEvaluated) * 100) : 100;
    const syncFailureRate = totalSyncEvaluated > 0 ? Math.round((failedRecordsCount / totalSyncEvaluated) * 100) : 0;

    // Device-reported pending discrepancy
    let deviceReportedPendingDiscrepancy = 0;
    periodReports.forEach((r) => {
      if (r.citizenCountLocal > r.citizenCountServerConfirmed) {
        deviceReportedPendingDiscrepancy += (r.citizenCountLocal - r.citizenCountServerConfirmed);
      }
    });

    // 8. Construct Daily Report Analytics
    const totalReportsSubmitted = periodReports.length;
    // Expected reports: active officers * working days in period (approx 5 days / 7 days)
    const workingDays = Math.max(1, Math.round(dateRange.diffDays * (5 / 7)));
    const expectedReportsCount = activeOfficersCount * workingDays;
    const reportSubmissionRate = expectedReportsCount > 0
      ? Math.min(100, Math.round((totalReportsSubmitted / expectedReportsCount) * 100))
      : 100;

    let reportsAwaitingReview = 0;
    let reportsReviewed = 0;
    let reportsReturnedForCorrection = 0;

    periodReports.forEach((r) => {
      let decision: string | null = null;
      if (r.comments) {
        try {
          const parsed = JSON.parse(r.comments);
          decision = parsed.reviewDecision || null;
        } catch {
          // Plain string comment
        }
      }

      if (decision === 'APPROVED' || decision === 'REJECTED') {
        reportsReviewed += 1;
      } else if (decision === 'RETURNED_FOR_CORRECTION' || decision === 'NEEDS_REVISION') {
        reportsReturnedForCorrection += 1;
      } else {
        reportsAwaitingReview += 1;
      }
    });

    // Daily Report Submission Trends
    const reportTrendMap = new Map<string, number>();
    for (let d = new Date(dateRange.startDate); d <= dateRange.endDate; d.setDate(d.getDate() + 1)) {
      reportTrendMap.set(d.toISOString().split('T')[0], 0);
    }
    periodReports.forEach((r) => {
      if (reportTrendMap.has(r.reportDate)) {
        reportTrendMap.set(r.reportDate, (reportTrendMap.get(r.reportDate) || 0) + 1);
      }
    });

    const reportTrends = Array.from(reportTrendMap.entries()).map(([date, count]) => {
      const [year, month, day] = date.split('-');
      const dObj = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      const label = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { date, label, count };
    });

    // 9. Construct Data Quality Analytics
    let validRecordsCount = 0;
    let missingDobCount = 0;
    let missingPhoneCount = 0;
    let missingAltPhoneCount = 0;
    let missingVillageCount = 0;

    allPeriodCitizens.forEach((c) => {
      let isValid = true;
      if (!c.gender || !c.regionId || !c.zoneId || !c.woredaId || !c.kebeleId || !c.village) {
        isValid = false;
      }
      if (!c.dateOfBirth && (c.age === null || c.age === undefined)) {
        missingDobCount += 1;
      }
      if (!c.phoneNumber) {
        missingPhoneCount += 1;
      }
      if (!c.alternativePhone) {
        missingAltPhoneCount += 1;
      }
      if (!c.village) {
        missingVillageCount += 1;
      }

      if (isValid) validRecordsCount += 1;
    });

    const validationRate = periodCitizenCount > 0 ? Math.round((validRecordsCount / periodCitizenCount) * 100) : 100;

    // 10. Construct Work Sessions & Telemetry
    const totalSessionSeconds = periodWorkSessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    const avgSessionSeconds = periodWorkSessions.length > 0 ? Math.round(totalSessionSeconds / periodWorkSessions.length) : 0;

    // Fetch recent operational activity stream in scope
    const recentActivityLogs = await prisma.activityLog.findMany({
      where: effectiveZoneId ? { officer: { zoneId: effectiveZoneId } } : {},
      take: 8,
      orderBy: { deviceTimestamp: 'desc' },
      include: {
        officer: { select: { fullName: true, role: true, woreda: { select: { name: true } } } },
      },
    });

    const recentActivity = recentActivityLogs.map((log) => ({
      id: log.id,
      eventType: log.eventType,
      description: log.description,
      officerName: log.officer?.fullName || 'System',
      woredaName: log.officer?.woreda?.name || '',
      deviceTimestamp: log.deviceTimestamp,
      syncStatus: log.syncStatus,
    }));

    // 11. Final Response Assembly
    res.json({
      success: true,
      data: {
        scope: {
          role: user.role,
          effectiveZoneId,
          effectiveZoneName: effectiveZoneId ? zoneMap.get(effectiveZoneId)?.name || 'Assigned Zone' : 'National / All Zones',
          effectiveRegionId,
          effectiveRegionName: effectiveRegionId ? regionMap.get(effectiveRegionId) || 'Assigned Region' : 'National',
          availableZones: allZones.map((z) => ({
            id: z.id,
            name: z.name,
            code: z.code,
            regionName: regionMap.get(z.regionId) || '',
          })),
        },
        dateRange: {
          period: dateRange.period,
          startDate: dateRange.startDateStr,
          endDate: dateRange.endDateStr,
          days: dateRange.diffDays,
        },
        citizens: {
          periodTotal: periodCitizenCount,
          allTimeTotal: allTimeCitizenCount,
          previousPeriodTotal: prevPeriodCitizenCount,
          percentChange,
          byGender,
          byAgeGroup,
          byRegion,
          byZone,
          byWoreda,
          dailyTrends,
        },
        officers: {
          totalActiveOfficers: activeOfficersCount,
          activityList: officerActivityList,
          prolongedSyncDelays,
          prolongedSyncDelaysCount: prolongedSyncDelays.length,
        },
        assignmentCoverage: {
          totalActiveSupervisors: activeSupervisorsCount,
          totalActiveOfficers: activeOfficersCount,
          totalZones: scopedZones.length,
          coveredZones: scopedZones.length - zonesWithoutSupervisor.length,
          zoneCoveragePercentage,
          zonesWithoutSupervisor,
          totalWoredas: scopedWoredas.length,
          coveredWoredas: woredasWithOfficer.size,
          woredaCoveragePercentage,
          assignedOfficersCount,
          unassignedOfficersCount,
        },
        syncAnalytics: {
          serverConfirmedRecords: serverConfirmedCount,
          pendingOfflineRecords: pendingOfflineCount,
          failedSyncRecords: failedRecordsCount,
          totalSyncRecords: totalSyncEvaluated,
          successRatePercentage: syncSuccessRate,
          failureRatePercentage: syncFailureRate,
          deviceReportedPendingCount: deviceReportedPendingDiscrepancy,
          unresolvedSyncErrorsCount,
        },
        dailyReports: {
          totalSubmitted: totalReportsSubmitted,
          allTimeSubmitted: allTimeReportsCount,
          expectedReports: expectedReportsCount,
          submissionRatePercentage: reportSubmissionRate,
          awaitingReview: reportsAwaitingReview,
          reviewed: reportsReviewed,
          returnedForCorrection: reportsReturnedForCorrection,
          dailyTrends: reportTrends,
        },
        dataQuality: {
          totalEvaluated: periodCitizenCount,
          validRecordsCount,
          validationRatePercentage: validationRate,
          possibleDuplicatesCount: pendingDuplicatesCount,
          confirmedDuplicatesCount,
          approvedDifferentDuplicatesCount: approvedDuplicatesCount,
          unresolvedSyncConflicts: pendingOfflineCount + unresolvedSyncErrorsCount,
          missingDataBreakdown: {
            missingDobOrAge: missingDobCount,
            missingPhoneNumber: missingPhoneCount,
            missingAlternativePhone: missingAltPhoneCount,
            missingVillage: missingVillageCount,
          },
        },
        workSessions: {
          totalSessions: periodWorkSessions.length,
          totalDurationSeconds: totalSessionSeconds,
          formattedDuration: formatDuration(totalSessionSeconds),
          averageSessionSeconds: avgSessionSeconds,
          formattedAverageSession: formatDuration(avgSessionSeconds),
          recentActivity,
        },
      },
    });
  } catch (error: any) {
    console.error('Analytics dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to compute analytics dashboard' });
  }
});

/**
 * @route   GET /api/analytics/overview (Maintained for backward compatibility)
 */
router.get('/overview', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const todayStr = new Date().toISOString().split('T')[0];
    const startOfToday = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfToday = new Date(`${todayStr}T23:59:59.999Z`);
    const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const citizenWhere: any = {};
    const logWhere: any = {};
    const sessionWhere: any = {};
    const reportWhere: any = {};
    const dupWhere: any = {};

    let totalStaffCount = 1;

    if (user.role === Role.FIELD_OFFICER) {
      citizenWhere.registeredById = user.id;
      logWhere.officerId = user.id;
      sessionWhere.officerId = user.id;
      reportWhere.officerId = user.id;
      dupWhere.citizen = { registeredById: user.id };
      totalStaffCount = 1;
    } else if (user.role === Role.SUPERVISOR) {
      if (user.zoneId) {
        citizenWhere.zoneId = user.zoneId;
        logWhere.officer = { zoneId: user.zoneId };
        sessionWhere.officer = { zoneId: user.zoneId };
        reportWhere.officer = { zoneId: user.zoneId };
        dupWhere.citizen = { zoneId: user.zoneId };
      } else {
        citizenWhere.registeredBy = { supervisorId: user.id };
        logWhere.officer = { supervisorId: user.id };
        sessionWhere.officer = { supervisorId: user.id };
        reportWhere.supervisorId = user.id;
        dupWhere.citizen = { registeredBy: { supervisorId: user.id } };
      }

      totalStaffCount = await prisma.user.count({
        where: { supervisorId: user.id, role: Role.FIELD_OFFICER, isActive: true },
      });
      if (totalStaffCount === 0) totalStaffCount = 1;
    } else {
      totalStaffCount = await prisma.user.count({
        where: { role: Role.FIELD_OFFICER, isActive: true },
      });
      if (totalStaffCount === 0) totalStaffCount = 1;
    }

    const [
      citizensTotal,
      citizensToday,
      citizensThisWeek,
      citizensSynced,
      citizensPending,
      rawGenderGroups,
      rawCitizensByWoreda,
    ] = await Promise.all([
      prisma.citizen.count({ where: citizenWhere }),
      prisma.citizen.count({
        where: {
          ...citizenWhere,
          registrationTimestamp: { gte: startOfToday, lte: endOfToday },
        },
      }),
      prisma.citizen.count({
        where: {
          ...citizenWhere,
          registrationTimestamp: { gte: startOfWeek },
        },
      }),
      prisma.citizen.count({
        where: { ...citizenWhere, syncStatus: SyncStatus.SYNCED },
      }),
      prisma.citizen.count({
        where: { ...citizenWhere, syncStatus: SyncStatus.PENDING },
      }),
      prisma.citizen.groupBy({
        by: ['gender'],
        where: citizenWhere,
        _count: { id: true },
      }),
      prisma.citizen.groupBy({
        by: ['woredaId'],
        where: citizenWhere,
        _count: { id: true },
      }),
    ]);

    const genderDistribution = rawGenderGroups.map((g) => ({
      gender: g.gender,
      count: g._count.id,
    }));

    const woredaIds = rawCitizensByWoreda.map((w) => w.woredaId).filter(Boolean);
    const woredas = await prisma.woreda.findMany({
      where: { id: { in: woredaIds } },
      select: { id: true, name: true },
    });
    const woredaMap = new Map(woredas.map((w) => [w.id, w.name]));

    const geographicDistribution = rawCitizensByWoreda.map((w) => ({
      woredaId: w.woredaId,
      woredaName: woredaMap.get(w.woredaId) || 'Unknown Woreda',
      count: w._count.id,
    }));

    const [allSessions, todaySessions] = await Promise.all([
      prisma.workSession.findMany({
        where: sessionWhere,
        select: { durationSeconds: true },
      }),
      prisma.workSession.findMany({
        where: { ...sessionWhere, reportDate: todayStr },
        select: { durationSeconds: true },
      }),
    ]);

    const totalScreenTimeSeconds = allSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    const todayScreenTimeSeconds = todaySessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);

    const [reportsTodayCount, rawTodayReports] = await Promise.all([
      prisma.dailyWorkReport.count({
        where: { ...reportWhere, reportDate: todayStr },
      }),
      prisma.dailyWorkReport.findMany({
        where: { ...reportWhere, reportDate: todayStr },
        include: {
          officer: { select: { fullName: true, woreda: { select: { name: true } } } },
        },
      }),
    ]);

    const complianceRate = Math.min(100, Math.round((reportsTodayCount / totalStaffCount) * 100));

    const urgentRoadblocks = rawTodayReports
      .filter((r) => {
        if (!r.comments) return false;
        try {
          const parsed = JSON.parse(r.comments);
          return Boolean(parsed.isUrgent);
        } catch {
          return false;
        }
      })
      .map((r) => {
        let reason = 'Urgent assistance requested';
        try {
          const parsed = JSON.parse(r.comments!);
          reason = parsed.urgentReason || parsed.challenges || reason;
        } catch {}
        return {
          reportId: r.id,
          officerName: r.officer?.fullName || 'Field Officer',
          woredaName: r.officer?.woreda?.name || 'Woreda',
          reason,
          submittedAt: r.submittedAt,
        };
      });

    const [pendingDuplicates, confirmedDuplicates, approvedDuplicates] = await Promise.all([
      prisma.duplicateReview.count({
        where: {
          ...dupWhere,
          status: { in: [DuplicateReviewStatus.NEEDS_REVIEW, DuplicateReviewStatus.POSSIBLE_DUPLICATE] },
        },
      }),
      prisma.duplicateReview.count({
        where: { ...dupWhere, status: DuplicateReviewStatus.CONFIRMED_DUPLICATE },
      }),
      prisma.duplicateReview.count({
        where: { ...dupWhere, status: DuplicateReviewStatus.APPROVED_AS_DIFFERENT },
      }),
    ]);

    const recentActivityLogs = await prisma.activityLog.findMany({
      where: logWhere,
      take: 10,
      orderBy: { deviceTimestamp: 'desc' },
      include: {
        officer: { select: { fullName: true, role: true } },
      },
    });

    const recentActivityStream = recentActivityLogs.map((log) => ({
      id: log.id,
      eventType: log.eventType,
      description: log.description,
      officerName: log.officer?.fullName || 'System',
      deviceTimestamp: log.deviceTimestamp,
      syncStatus: log.syncStatus,
    }));

    res.json({
      success: true,
      data: {
        citizens: {
          total: citizensTotal,
          today: citizensToday,
          thisWeek: citizensThisWeek,
          synced: citizensSynced,
          pending: citizensPending,
          genderDistribution,
          geographicDistribution,
        },
        telemetry: {
          totalScreenTimeSeconds,
          totalScreenTimeFormatted: formatHMS(totalScreenTimeSeconds),
          todayScreenTimeSeconds,
          todayScreenTimeFormatted: formatHMS(todayScreenTimeSeconds),
          todaySessionsCount: todaySessions.length,
          totalSessionsCount: allSessions.length,
        },
        compliance: {
          reportsSubmittedToday: reportsTodayCount,
          totalAssignedStaff: totalStaffCount,
          complianceRatePercentage: complianceRate,
          urgentRoadblocksCount: urgentRoadblocks.length,
          urgentRoadblocks,
        },
        duplicates: {
          pending: pendingDuplicates,
          confirmed: confirmedDuplicates,
          approved: approvedDuplicates,
          total: pendingDuplicates + confirmedDuplicates + approvedDuplicates,
        },
        recentActivity: recentActivityStream,
        serverTimestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve analytics overview' });
  }
});

/**
 * @route   GET /api/analytics/officer/:officerId
 * @desc    Detailed telemetry & performance drilldown for an individual field officer
 * @access  Private (Supervisor, Manager)
 */
router.get('/officer/:officerId', authenticate, requireSupervisor, async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = req.user!;
    const { officerId } = req.params;

    const officer = await prisma.user.findUnique({
      where: { id: officerId },
      include: {
        zone: { select: { id: true, name: true } },
        woreda: { select: { id: true, name: true } },
        kebele: { select: { id: true, name: true } },
        supervisor: { select: { id: true, fullName: true } },
      },
    });

    if (!officer) {
      res.status(404).json({ success: false, error: 'Officer not found' });
      return;
    }

    // Role-based zone scoping check for Supervisor
    if (caller.role === Role.SUPERVISOR) {
      if (caller.zoneId && officer.zoneId && officer.zoneId !== caller.zoneId) {
        res.status(403).json({ success: false, error: 'Access denied to officer outside assigned Zone' });
        return;
      }
    }

    const [citizensCount, sessions, reports] = await Promise.all([
      prisma.citizen.count({ where: { registeredById: officerId } }),
      prisma.workSession.findMany({
        where: { officerId },
        select: { durationSeconds: true, reportDate: true },
      }),
      prisma.dailyWorkReport.findMany({
        where: { officerId },
        take: 15,
        orderBy: { reportDate: 'desc' },
      }),
    ]);

    const totalSeconds = sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);

    res.json({
      success: true,
      data: {
        officer: {
          id: officer.id,
          fullName: officer.fullName,
          email: officer.email,
          phoneNumber: officer.phoneNumber,
          zoneName: officer.zone?.name || '',
          woredaName: officer.woreda?.name || '',
          kebeleName: officer.kebele?.name || '',
          supervisorName: officer.supervisor?.fullName || '',
        },
        metrics: {
          citizensRegistered: citizensCount,
          totalSessions: sessions.length,
          totalScreenTimeSeconds: totalSeconds,
          totalScreenTimeFormatted: formatHMS(totalSeconds),
          reportsCount: reports.length,
        },
        recentReports: reports.map((r) => ({
          id: r.id,
          reportDate: r.reportDate,
          citizenCountLocal: r.citizenCountLocal,
          citizenCountServerConfirmed: r.citizenCountServerConfirmed,
          screenTimeSeconds: r.screenTimeSeconds,
          screenTimeFormatted: formatHMS(r.screenTimeSeconds),
          syncStatus: r.syncStatus,
        })),
      },
    });
  } catch (error: any) {
    console.error('Officer analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve officer analytics' });
  }
});

export default router;
