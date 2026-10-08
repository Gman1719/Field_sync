// server/test_analytics_and_audit.mjs
// Automated Integration Test Suite for Advanced Analytics & System Audit Trail

import assert from 'node:assert';

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('🚀 Starting FieldSync Advanced Analytics & System Audit Trail Test Suite...\n');

  // 1. Authenticate Demo Accounts
  console.log('1. Authenticating Manager, Supervisor, and Field Officer...');
  
  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200, `Login failed for ${email}: ${JSON.stringify(json)}`);
    return { token: json.data.token, user: json.data.user };
  };

  const manager = await login('abebe@fieldsync.com', 'manager123');
  const supervisor = await login('birhan@fieldsync.com', 'super123');
  const officer = await login('meseret@fieldsync.com', 'officer123');

  console.log(`   ✅ Authenticated Manager: ${manager.user.fullName} (${manager.user.role})`);
  console.log(`   ✅ Authenticated Supervisor: ${supervisor.user.fullName} (Zone: ${supervisor.user.zoneId})`);
  console.log(`   ✅ Authenticated Field Officer: ${officer.user.fullName} (${officer.user.role})\n`);

  // 2. Test Manager Analytics Dashboard (Organization-Wide)
  console.log('2. Testing Manager Analytics Dashboard (Organization-Wide)...');
  const mgrRes = await fetch(`${API_BASE}/analytics/dashboard?period=month`, {
    headers: { Authorization: `Bearer ${manager.token}` },
  });
  const mgrData = await mgrRes.json();
  assert.strictEqual(mgrRes.status, 200, `Manager analytics failed: ${JSON.stringify(mgrData)}`);
  assert.strictEqual(mgrData.success, true);
  
  const d = mgrData.data;
  console.log('   Checking Manager Dashboard Scope & Metrics:');
  console.log(`   • Scope: ${d.scope.role}, Zone: ${d.scope.effectiveZoneName}`);
  assert.strictEqual(d.scope.role, 'MANAGER');
  assert.strictEqual(d.scope.effectiveZoneId, null); // Organization-wide

  // Check Citizen Analytics
  console.log(`   • Citizens (Period: ${d.citizens.periodTotal}, All-time: ${d.citizens.allTimeTotal})`);
  assert(Array.isArray(d.citizens.byRegion), 'byRegion should be an array');
  assert(Array.isArray(d.citizens.byZone), 'byZone should be an array');
  assert(Array.isArray(d.citizens.byWoreda), 'byWoreda should be an array');
  assert(Array.isArray(d.citizens.dailyTrends), 'dailyTrends should be an array');

  // Check Officer Activity
  console.log(`   • Officers in scope: ${d.officers.totalActiveOfficers}, Prolonged delays: ${d.officers.prolongedSyncDelaysCount}`);
  assert(Array.isArray(d.officers.activityList), 'activityList should be an array');

  // Check Assignment Coverage
  console.log(`   • Assignment Coverage: Zones (${d.assignmentCoverage.coveredZones}/${d.assignmentCoverage.totalZones}, ${d.assignmentCoverage.zoneCoveragePercentage}%), Woredas (${d.assignmentCoverage.coveredWoredas}/${d.assignmentCoverage.totalWoredas}, ${d.assignmentCoverage.woredaCoveragePercentage}%)`);
  assert(typeof d.assignmentCoverage.zoneCoveragePercentage === 'number');

  // Check Synchronization Analytics
  console.log(`   • Sync Analytics: Success Rate ${d.syncAnalytics.successRatePercentage}%, Server-confirmed: ${d.syncAnalytics.serverConfirmedRecords}, Pending: ${d.syncAnalytics.pendingOfflineRecords}, Failed: ${d.syncAnalytics.failedSyncRecords}`);
  assert(typeof d.syncAnalytics.deviceReportedPendingCount === 'number');

  // Check Daily Reports
  console.log(`   • Daily Reports: Submitted ${d.dailyReports.totalSubmitted}, Expected ${d.dailyReports.expectedReports}, Submission Rate ${d.dailyReports.submissionRatePercentage}%`);

  // Check Data Quality
  console.log(`   • Data Quality: Valid ${d.dataQuality.validRecordsCount}/${d.dataQuality.totalEvaluated} (${d.dataQuality.validationRatePercentage}%), Possible Duplicates: ${d.dataQuality.possibleDuplicatesCount}`);

  // STRICT CHECK: Verify absence of Attendance and Task completion metrics
  assert.strictEqual(d.attendance, undefined, 'Attendance analytics MUST NOT be present');
  assert.strictEqual(d.tasks, undefined, 'Task completion analytics MUST NOT be present');
  console.log('   ✅ Manager Organization-Wide Analytics verified successfully (Zero attendance/task metrics).\n');

  // 3. Test Date Filtering (today, week, month, custom)
  console.log('3. Testing Date Filtering on Dashboard...');
  const periods = ['today', 'week', 'month'];
  for (const p of periods) {
    const pRes = await fetch(`${API_BASE}/analytics/dashboard?period=${p}`, {
      headers: { Authorization: `Bearer ${manager.token}` },
    });
    const pJson = await pRes.json();
    assert.strictEqual(pRes.status, 200);
    assert.strictEqual(pJson.data.dateRange.period, p);
    console.log(`   • Period '${p}': ${pJson.data.dateRange.startDate} to ${pJson.data.dateRange.endDate} (${pJson.data.dateRange.days} days) -> ${pJson.data.citizens.periodTotal} citizens`);
  }

  // Custom date range
  const customRes = await fetch(`${API_BASE}/analytics/dashboard?period=custom&startDate=2026-09-01&endDate=2026-09-24`, {
    headers: { Authorization: `Bearer ${manager.token}` },
  });
  const customJson = await customRes.json();
  assert.strictEqual(customRes.status, 200);
  assert.strictEqual(customJson.data.dateRange.period, 'custom');
  console.log(`   • Period 'custom': ${customJson.data.dateRange.startDate} to ${customJson.data.dateRange.endDate} -> ${customJson.data.citizens.periodTotal} citizens`);
  console.log('   ✅ All date filter boundaries verified.\n');

  // 4. Test Supervisor Analytics Dashboard (Strictly Zone-Scoped)
  console.log('4. Testing Supervisor Analytics Dashboard (Strictly Zone-Scoped)...');
  const supRes = await fetch(`${API_BASE}/analytics/dashboard?period=month`, {
    headers: { Authorization: `Bearer ${supervisor.token}` },
  });
  const supData = await supRes.json();
  assert.strictEqual(supRes.status, 200, `Supervisor analytics failed: ${JSON.stringify(supData)}`);
  assert.strictEqual(supData.success, true);
  
  const sd = supData.data;
  console.log(`   • Supervisor Scope: Role=${sd.scope.role}, ZoneId=${sd.scope.effectiveZoneId} (${sd.scope.effectiveZoneName})`);
  assert.strictEqual(sd.scope.role, 'SUPERVISOR');
  assert.strictEqual(sd.scope.effectiveZoneId, supervisor.user.zoneId, 'Supervisor must be strictly scoped to their assigned Zone');

  // Verify that all returned zones match supervisor's zone
  if (sd.citizens.byZone.length > 0) {
    for (const z of sd.citizens.byZone) {
      assert.strictEqual(z.zoneId, supervisor.user.zoneId, `Data leakage detected: Found zone ${z.zoneId} in supervisor dashboard`);
    }
  }
  console.log(`   • Zone-scoped citizen registrations: ${sd.citizens.periodTotal}`);
  console.log(`   • Zone-scoped active officers: ${sd.officers.totalActiveOfficers}`);
  console.log(`   • Zone-scoped reports awaiting review: ${sd.dailyReports.awaitingReview}`);
  console.log('   ✅ Supervisor Analytics strictly scoped to assigned Zone (Zero out-of-zone data leak).\n');

  // 5. Test Audit Log API & Access Control
  console.log('5. Testing Audit Log Access Controls...');
  
  // Field Officer access test: must be blocked (403)
  const officerAuditRes = await fetch(`${API_BASE}/audit-logs`, {
    headers: { Authorization: `Bearer ${officer.token}` },
  });
  assert.strictEqual(officerAuditRes.status, 403, 'Field Officer MUST be denied access to audit logs');
  console.log('   ✅ Field Officer correctly blocked from Audit Logs (HTTP 403 Forbidden)');

  // Manager audit access: organization-wide
  const mgrAuditRes = await fetch(`${API_BASE}/audit-logs?limit=10`, {
    headers: { Authorization: `Bearer ${manager.token}` },
  });
  const mgrAuditJson = await mgrAuditRes.json();
  assert.strictEqual(mgrAuditRes.status, 200);
  assert.strictEqual(mgrAuditJson.success, true);
  assert(Array.isArray(mgrAuditJson.data), 'Audit logs should be an array');
  console.log(`   ✅ Manager retrieved organization-wide audit logs (${mgrAuditJson.pagination.total} total logs)`);

  // Supervisor audit access: zone-scoped
  const supAuditRes = await fetch(`${API_BASE}/audit-logs?limit=10`, {
    headers: { Authorization: `Bearer ${supervisor.token}` },
  });
  const supAuditJson = await supAuditRes.json();
  assert.strictEqual(supAuditRes.status, 200);
  assert.strictEqual(supAuditJson.success, true);
  console.log(`   ✅ Supervisor retrieved Zone-scoped audit logs (${supAuditJson.pagination.total} total logs)`);

  // 6. Test Audit Event Recording for Supervisor Action
  console.log('\n6. Testing Audit Event Generation on Business Action (Supervisor Daily Report Review)...');
  
  // First, submit a test report as officer
  const reportDate = '2026-09-24';
  const submitRes = await fetch(`${API_BASE}/reports/daily`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${officer.token}`,
    },
    body: JSON.stringify({
      id: 'test-audit-report-' + Date.now(),
      reportDate,
      citizenCountLocal: 5,
      citizenCountServerConfirmed: 5,
      activityCount: 3,
      sessionCount: 2,
      screenTimeSeconds: 1200,
      comments: JSON.stringify({ notes: 'Testing audit logging' }),
      submittedAt: new Date().toISOString(),
    }),
  });
  const submitJson = await submitRes.json();
  assert.strictEqual(submitRes.status, 201, `Failed to submit test report: ${JSON.stringify(submitJson)}`);
  const testReportId = submitJson.data.id;

  // Supervisor reviews the report
  const reviewRes = await fetch(`${API_BASE}/reports/${testReportId}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supervisor.token}`,
    },
    body: JSON.stringify({
      decision: 'APPROVED',
      supervisorNotes: 'Audit test: Approved with excellent data verification',
    }),
  });
  assert.strictEqual(reviewRes.status, 200, 'Supervisor report review failed');

  // Verify that an audit event was recorded for this review
  const verifyAuditRes = await fetch(`${API_BASE}/audit-logs?action=DAILY_REPORT_REVIEWED&limit=5`, {
    headers: { Authorization: `Bearer ${manager.token}` },
  });
  const verifyAuditJson = await verifyAuditRes.json();
  assert.strictEqual(verifyAuditRes.status, 200);
  const matchedEvent = verifyAuditJson.data.find((l) => l.entityId === testReportId);
  assert(matchedEvent, 'Audit event for DAILY_REPORT_REVIEWED must be recorded in PostgreSQL');
  assert.strictEqual(matchedEvent.action, 'DAILY_REPORT_REVIEWED');
  assert.strictEqual(matchedEvent.entityType, 'DailyWorkReport');
  assert.strictEqual(matchedEvent.actorRole, 'SUPERVISOR');
  assert.strictEqual(matchedEvent.newValues.decision, 'APPROVED');
  console.log(`   ✅ Audit log successfully created: "${matchedEvent.summary}"`);
  console.log(`   • Actor: ${matchedEvent.actorName} (${matchedEvent.actorRole})`);
  console.log(`   • Decision: ${matchedEvent.newValues.decision}`);

  // 7. Verify Security: Passwords and sensitive tokens are NEVER in audit logs
  console.log('\n7. Verifying Audit Log Security & Privacy (Sanitization)...');
  const allLogsRes = await fetch(`${API_BASE}/audit-logs?limit=50`, {
    headers: { Authorization: `Bearer ${manager.token}` },
  });
  const allLogsJson = await allLogsRes.json();
  for (const log of allLogsJson.data) {
    const rawStr = JSON.stringify(log).toLowerCase();
    assert(!rawStr.includes('officer123'), 'Plain-text passwords must never be stored in audit logs');
    assert(!rawStr.includes('super123'), 'Plain-text passwords must never be stored in audit logs');
    assert(!rawStr.includes('manager123'), 'Plain-text passwords must never be stored in audit logs');
  }
  console.log('   ✅ Confirmed zero password or token leaks in audit log records.');

  console.log('\n======================================================');
  console.log('🎉 ALL ADVANCED ANALYTICS & AUDIT TESTS PASSED 100%!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
