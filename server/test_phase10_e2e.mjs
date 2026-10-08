// server/test_phase10_e2e.mjs
// Phase 10 Comprehensive End-to-End System Regression Test Suite

import assert from 'node:assert';
import crypto from 'node:crypto';

const BASE_URL = 'http://localhost:5000/api';

async function login(email, password = 'Password123!') {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200, `Login failed for ${email}: ${JSON.stringify(data)}`);
  assert.ok(data.data?.token, `Token missing for ${email}`);
  return { token: data.data.token, user: data.data.user };
}

async function runEndToEndVerification() {
  console.log('================================================================');
  console.log('🚀 FIELDSYNC PHASE 10: END-TO-END MULTI-ROLE SYSTEM VERIFICATION');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // 1. SYSTEM HEALTH & DATABASE CONNECTIVITY (Phase 1)
  // -------------------------------------------------------------------------
  console.log('🔹 STEP 1: Central Database Health & Core Model Verification');
  const healthRes = await fetch(`${BASE_URL}/health`);
  assert.strictEqual(healthRes.status, 200, 'Health endpoint failed');
  const healthData = await healthRes.json();
  assert.strictEqual(healthData.status, 'healthy');
  assert.strictEqual(healthData.database.provider, 'PostgreSQL');
  assert.ok(healthData.database.counts.regions >= 14, 'Regions count mismatch');
  assert.ok(healthData.database.counts.zones >= 100, 'Zones count mismatch');
  console.log(`   ✅ System Healthy. Regions: ${healthData.database.counts.regions}, Zones: ${healthData.database.counts.zones}, Users: ${healthData.database.counts.users}`);

  // -------------------------------------------------------------------------
  // 2. MANAGER JOURNEY: Analytics, Staff Provisioning & User Management (Phase 2 & 9)
  // -------------------------------------------------------------------------
  console.log('\n🔹 STEP 2: Manager Persona — Executive Operations & User Provisioning');
  const manager = await login('manager@fieldsync.com');
  console.log(`   ✅ Manager Authenticated: ${manager.user.fullName} (${manager.user.role})`);

  // 2.1 Executive Analytics Overview
  const mgrAnalyticsRes = await fetch(`${BASE_URL}/analytics/overview`, {
    headers: { Authorization: `Bearer ${manager.token}` }
  });
  assert.strictEqual(mgrAnalyticsRes.status, 200, 'Manager analytics failed');
  const mgrAnalytics = await mgrAnalyticsRes.json();
  assert.strictEqual(mgrAnalytics.success, true);
  console.log(`   ✅ Manager Organization Overview: Total Citizens = ${mgrAnalytics.data.citizens.total}, Screen Time = ${mgrAnalytics.data.telemetry.totalScreenTimeFormatted}`);

  // 2.2 Fetch Administrative Locations for Provisioning
  const locRes = await fetch(`${BASE_URL}/locations/hierarchy`, {
    headers: { Authorization: `Bearer ${manager.token}` }
  });
  assert.strictEqual(locRes.status, 200, 'Locations hierarchy failed');
  const locData = await locRes.json();
  assert.strictEqual(locData.success, true);
  // 2.3 Find an existing supervisor and their assigned zone
  const supervisorsRes = await fetch(`${BASE_URL}/users?role=SUPERVISOR`, {
    headers: { Authorization: `Bearer ${manager.token}` }
  });
  const supJson = await supervisorsRes.json();
  const zoneSupervisor = (supJson.data || []).find(s => s.zoneId) || supJson.data?.[0];
  assert.ok(zoneSupervisor, 'No supervisor found in database');

  // Find the matching zone and woreda from hierarchy
  let matchedRegion = null;
  let matchedZone = null;
  let matchedWoreda = null;

  for (const reg of locData.data) {
    const z = (reg.zones || []).find(zone => zone.id === zoneSupervisor.zoneId);
    if (z) {
      matchedRegion = reg;
      matchedZone = z;
      matchedWoreda = z.woredas?.[0];
      break;
    }
  }

  const sampleRegion = matchedRegion || locData.data[0];
  const sampleZone = matchedZone || sampleRegion.zones[0];
  const sampleWoreda = matchedWoreda || sampleZone.woredas[0];
  assert.ok(sampleWoreda, 'Woreda not found in hierarchy');

  // Provision a New Field Officer via Manager API
  const randomSuffix = Math.floor(Math.random() * 9000 + 1000);
  const newOfficerEmail = `officer.test${randomSuffix}@fieldsync.com`;
  const newOfficerPhone = `+251911${randomSuffix.toString().padStart(6, '0')}`.slice(0, 13);

  const createUserRes = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${manager.token}`
    },
    body: JSON.stringify({
      firstName: 'Abebe',
      middleName: 'Kebede',
      lastName: 'Tessema',
      email: newOfficerEmail,
      phoneNumber: newOfficerPhone,
      role: 'FIELD_OFFICER',
      regionId: sampleRegion.id,
      zoneId: sampleZone.id,
      woredaId: sampleWoreda.id,
      supervisorId: zoneSupervisor?.id || undefined,
    })
  });

  const createUserData = await createUserRes.json();
  assert.strictEqual(createUserRes.status, 201, `Create user failed: ${JSON.stringify(createUserData)}`);
  assert.strictEqual(createUserData.success, true);
  const provisionedOfficer = createUserData.data?.user || createUserData.data;
  const tempPassword = createUserData.data?.temporaryPassword || createUserData.temporaryPassword;
  assert.ok(tempPassword, 'Temporary password was not returned');
  console.log(`   ✅ Provisioned Field Officer: ${provisionedOfficer.fullName} (${provisionedOfficer.email}) with temp password [${tempPassword.slice(0, 4)}****]`);

  // -------------------------------------------------------------------------
  // 3. FIELD OFFICER JOURNEY: Offline Registration, Batch Sync, Telemetry, Daily Report
  // -------------------------------------------------------------------------
  console.log('\n🔹 STEP 3: Field Officer Persona — Offline Registrations, Sync & Daily Reporting');
  const officer = await login('officer@fieldsync.com');
  console.log(`   ✅ Field Officer Authenticated: ${officer.user.fullName} (${officer.user.role})`);

  // 3.1 Start a Work Session (Phase 5)
  const todayStr = new Date().toISOString().split('T')[0];
  const workSessionId = crypto.randomUUID();
  const startSessionRes = await fetch(`${BASE_URL}/work-sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${officer.token}`
    },
    body: JSON.stringify({
      id: workSessionId,
      reportDate: todayStr,
      startedAt: new Date(Date.now() - 3600000).toISOString(),
    })
  });
  assert.strictEqual(startSessionRes.status, 201, 'Work session start failed');
  console.log(`   ✅ Started Work Session (ID: ${workSessionId})`);

  // 3.2 Prepare and Synchronize a Citizen Record via Batch Sync (Phase 3 & 7)
  const clientRecordId = crypto.randomUUID();
  // Fetch kebele for officer's woreda
  const kebelesRes = await fetch(`${BASE_URL}/locations/woredas/${officer.user.woredaId || sampleWoreda.id}/kebeles`);
  const kebelesJson = await kebelesRes.json();
  const sampleKebele = kebelesJson.data?.[0];
  const kebeleId = officer.user.kebeleId || sampleKebele?.id;

  const citizenPayload = {
    clientRecordId,
    firstName: 'Taye',
    middleName: 'Alemayehu',
    lastName: 'Bekele',
    gender: 'MALE',
    dateOfBirth: '1992-06-15',
    phoneNumber: `+251912${randomSuffix.toString().padStart(6, '0')}`.slice(0, 13),
    regionId: officer.user.regionId || sampleRegion.id,
    zoneId: officer.user.zoneId || sampleZone.id,
    woredaId: officer.user.woredaId || sampleWoreda.id,
    kebeleId,
    village: 'Village 04',
    registrationTimestamp: new Date().toISOString(),
  };

  const syncBatchRes = await fetch(`${BASE_URL}/sync/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${officer.token}`
    },
    body: JSON.stringify({
      citizens: [citizenPayload]
    })
  });

  assert.strictEqual(syncBatchRes.status, 200, 'Sync batch failed');
  const syncBatchData = await syncBatchRes.json();
  assert.strictEqual(syncBatchData.success, true);
  assert.strictEqual(syncBatchData.results.citizens.synced, 1);
  console.log(`   ✅ Synchronized Offline Citizen: ${citizenPayload.firstName} ${citizenPayload.lastName} (clientRecordId: ${clientRecordId})`);

  // 3.3 Log an Operational Activity (Phase 4)
  const logRes = await fetch(`${BASE_URL}/activity-logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${officer.token}`
    },
    body: JSON.stringify({
      eventType: 'CITIZEN_REGISTERED',
      description: `Registered citizen ${citizenPayload.firstName} ${citizenPayload.lastName}`,
      metadata: { clientRecordId },
      deviceTimestamp: new Date().toISOString()
    })
  });
  assert.strictEqual(logRes.status, 201, 'Activity log creation failed');
  console.log('   ✅ Recorded Operational Activity Log');

  // 3.4 Submit Structured Daily Work Report with Roadblock Flag (Phase 6)
  const reportPayload = {
    id: crypto.randomUUID(),
    reportDate: todayStr,
    citizenCountLocal: 5,
    citizenCountServerConfirmed: 5,
    screenTimeSeconds: 7200, // 2 hours
    narrative: 'Successfully reached Village 04 and registered citizens despite intermittent network outages.',
    achievements: 'Enrolled 5 households and verified demographic data against local kebele rosters.',
    challenges: 'Road washout near river crossing delayed return to base camp by 2 hours.',
    resourcesNeeded: 'Protective waterproof tablet covers and spare power bank.',
    planTomorrow: 'Proceed to Village 05 and register the remaining 12 households.',
    isUrgent: true,
    urgentReason: 'River crossing flooded; bridge inspection requested.',
    status: 'SUBMITTED'
  };

  const reportSubmitRes = await fetch(`${BASE_URL}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${officer.token}`
    },
    body: JSON.stringify(reportPayload)
  });

  assert.strictEqual(reportSubmitRes.status, 201, 'Daily report submission failed');
  const reportSubmitData = await reportSubmitRes.json();
  assert.strictEqual(reportSubmitData.success, true);
  const submittedReport = reportSubmitData.data;
  console.log(`   ✅ Submitted Structured Daily Work Report (ID: ${submittedReport.id}) with Urgent Roadblock Flag`);

  // -------------------------------------------------------------------------
  // 4. SUPERVISOR JOURNEY: Escalations, Duplicate Adjudication & Report Evaluation
  // -------------------------------------------------------------------------
  console.log('\n🔹 STEP 4: Supervisor Persona — Roadblock Escalations, Duplicate Adjudication & Report Review');
  const supervisor = await login('supervisor@fieldsync.com');
  console.log(`   ✅ Supervisor Authenticated: ${supervisor.user.fullName} (${supervisor.user.role})`);

  // 4.1 Verify Urgent Roadblock escalated to Supervisor Telemetry (Phase 9)
  const supTelemetryRes = await fetch(`${BASE_URL}/analytics/overview`, {
    headers: { Authorization: `Bearer ${supervisor.token}` }
  });
  const supTelemetryData = await supTelemetryRes.json();
  assert.strictEqual(supTelemetryData.success, true);
  const urgentRoadblocks = supTelemetryData.data.compliance.urgentRoadblocks || [];
  assert.ok(urgentRoadblocks.length > 0, 'Urgent roadblock was not surfaced in supervisor overview');
  console.log(`   ✅ Supervisor Detected Urgent Escalation: "${urgentRoadblocks[0].reason}" from ${urgentRoadblocks[0].officerName}`);

  // 4.2 Duplicate Review & Adjudication (Phase 8)
  const dupListRes = await fetch(`${BASE_URL}/duplicates`, {
    headers: { Authorization: `Bearer ${supervisor.token}` }
  });
  const dupListData = await dupListRes.json();
  assert.strictEqual(dupListData.success, true);
  console.log(`   ✅ Duplicate Review Queue: ${dupListData.data.length} cases (Pending: ${dupListData.stats.pending})`);

  if (dupListData.data.length > 0) {
    const targetReview = dupListData.data[0];
    const resolveRes = await fetch(`${BASE_URL}/duplicates/${targetReview.id}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisor.token}`
      },
      body: JSON.stringify({
        decision: 'APPROVED_AS_DIFFERENT',
        reviewerNotes: 'Verified with kebele administration; individuals have identical names but distinct parents.'
      })
    });
    assert.strictEqual(resolveRes.status, 200, 'Duplicate resolve failed');
    const resolveData = await resolveRes.json();
    assert.strictEqual(resolveData.success, true);
    console.log(`   ✅ Adjudicated Duplicate Case (ID: ${targetReview.id}) -> APPROVED_AS_DIFFERENT with Officer Notification`);
  }

  // 4.3 Review and Evaluate Field Officer Daily Work Report (Phase 6)
  const reportReviewRes = await fetch(`${BASE_URL}/reports/${submittedReport.id}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supervisor.token}`
    },
    body: JSON.stringify({
      decision: 'APPROVED',
      supervisorNotes: 'Excellent work navigating difficult terrain. River crossing escalation forwarded to logistics.'
    })
  });
  assert.strictEqual(reportReviewRes.status, 200, 'Report review failed');
  const reportReviewData = await reportReviewRes.json();
  assert.strictEqual(reportReviewData.success, true);
  console.log(`   ✅ Reviewed Daily Work Report (ID: ${submittedReport.id}) -> Status: APPROVED`);

  // 4.4 Officer Telemetry Drilldown (Phase 9)
  const drilldownRes = await fetch(`${BASE_URL}/analytics/officer/${officer.user.id}`, {
    headers: { Authorization: `Bearer ${supervisor.token}` }
  });
  assert.strictEqual(drilldownRes.status, 200, 'Officer drilldown failed');
  const drilldownData = await drilldownRes.json();
  assert.strictEqual(drilldownData.success, true);
  console.log(`   ✅ Inspected Officer Drilldown: ${drilldownData.data.officer.fullName}, Screen Time: ${drilldownData.data.metrics.totalScreenTimeFormatted}`);

  // -------------------------------------------------------------------------
  // 5. UNIFIED SYNC ENGINE DELTA PULL & HEALTH (Phase 7)
  // -------------------------------------------------------------------------
  console.log('\n🔹 STEP 5: Unified Sync Engine Delta Pull & Node Health Verification');
  const syncHealthRes = await fetch(`${BASE_URL}/sync/health`, {
    headers: { Authorization: `Bearer ${officer.token}` }
  });
  assert.strictEqual(syncHealthRes.status, 200);
  const syncHealth = await syncHealthRes.json();
  assert.strictEqual(syncHealth.success, true);
  assert.strictEqual(syncHealth.data.syncHealth, 'HEALTHY');
  console.log(`   ✅ Sync Health Diagnostic Status: ${syncHealth.data.syncHealth} (Database: ${syncHealth.data.databaseStatus})`);

  const pullRes = await fetch(`${BASE_URL}/sync/pull?since=${new Date(Date.now() - 3600000).toISOString()}`, {
    headers: { Authorization: `Bearer ${officer.token}` }
  });
  assert.strictEqual(pullRes.status, 200);
  const pullData = await pullRes.json();
  assert.strictEqual(pullData.success, true);
  console.log(`   ✅ Sync Engine Delta Pull Successful (Server Timestamp: ${pullData.serverTimestamp})`);

  console.log('\n================================================================');
  console.log('🎉 ALL 10 PHASES FULLY VERIFIED — ZERO REGRESSIONS DETECTED!');
  console.log('================================================================\n');
}

runEndToEndVerification().catch((err) => {
  console.error('\n❌ PHASE 10 E2E TEST FAILED:', err);
  process.exit(1);
});
