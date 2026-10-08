// server/test_phase9_analytics.mjs
// Phase 9 Integration Test: Real-Time Monitoring & Telemetry Dashboards

import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000/api';

async function login(email, password = 'Password123!') {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200, `Login failed for ${email}: ${JSON.stringify(data)}`);
  assert.ok(data.data?.token, 'Token missing in login response');
  return { token: data.data.token, user: data.data.user };
}

async function runPhase9Tests() {
  console.log('====================================================');
  console.log('🚀 STARTING PHASE 9 REAL-TIME TELEMETRY & ANALYTICS TEST');
  console.log('====================================================\n');

  // Test 1: Manager Authentication & Organization-wide Analytics
  console.log('👉 Test 1: Manager Authentication & Executive Overview');
  const manager = await login('manager@fieldsync.com');
  const mgrRes = await fetch(`${BASE_URL}/analytics/overview`, {
    headers: { Authorization: `Bearer ${manager.token}` },
  });
  assert.strictEqual(mgrRes.status, 200, 'Manager overview returned non-200');
  const mgrData = await mgrRes.json();
  assert.strictEqual(mgrData.success, true);
  assert.ok(mgrData.data.citizens, 'citizens section missing');
  assert.ok(mgrData.data.telemetry, 'telemetry section missing');
  assert.ok(mgrData.data.compliance, 'compliance section missing');
  assert.ok(mgrData.data.duplicates, 'duplicates section missing');
  assert.ok(Array.isArray(mgrData.data.recentActivity), 'recentActivity is not an array');

  console.log(`   ✅ Manager Organization Citizens Total: ${mgrData.data.citizens.total}`);
  console.log(`   ✅ Manager Telemetry Screen Time: ${mgrData.data.telemetry.totalScreenTimeFormatted}`);
  console.log(`   ✅ Manager Report Compliance: ${mgrData.data.compliance.complianceRatePercentage}%`);
  console.log(`   ✅ Manager Pending Duplicate Reviews: ${mgrData.data.duplicates.pending}`);

  // Test 2: Supervisor Authentication & Zone Scoped Telemetry
  console.log('\n👉 Test 2: Supervisor Scoped Overview');
  const supervisor = await login('supervisor@fieldsync.com');
  const supRes = await fetch(`${BASE_URL}/analytics/overview`, {
    headers: { Authorization: `Bearer ${supervisor.token}` },
  });
  assert.strictEqual(supRes.status, 200, 'Supervisor overview returned non-200');
  const supData = await supRes.json();
  assert.strictEqual(supData.success, true);
  assert.ok(supData.data.citizens.total <= mgrData.data.citizens.total, 'Supervisor should see <= manager total');
  console.log(`   ✅ Supervisor Scoped Citizens Total: ${supData.data.citizens.total}`);
  console.log(`   ✅ Supervisor Scoped Screen Time: ${supData.data.telemetry.todayScreenTimeFormatted}`);
  console.log(`   ✅ Supervisor Assigned Staff: ${supData.data.compliance.totalAssignedStaff}`);

  // Test 3: Field Officer Overview
  console.log('\n👉 Test 3: Field Officer Scoped Overview');
  const officer = await login('officer@fieldsync.com');
  const offRes = await fetch(`${BASE_URL}/analytics/overview`, {
    headers: { Authorization: `Bearer ${officer.token}` },
  });
  assert.strictEqual(offRes.status, 200, 'Officer overview returned non-200');
  const offData = await offRes.json();
  assert.strictEqual(offData.success, true);
  console.log(`   ✅ Officer Personal Citizens Registered: ${offData.data.citizens.total}`);
  console.log(`   ✅ Officer Today Screen Time: ${offData.data.telemetry.todayScreenTimeFormatted}`);

  // Test 4: Individual Officer Telemetry Drilldown API
  console.log('\n👉 Test 4: Individual Officer Drilldown API (/api/analytics/officer/:officerId)');
  const drillRes = await fetch(`${BASE_URL}/analytics/officer/${officer.user.id}`, {
    headers: { Authorization: `Bearer ${supervisor.token}` },
  });
  assert.strictEqual(drillRes.status, 200, 'Drilldown returned non-200');
  const drillData = await drillRes.json();
  assert.strictEqual(drillData.success, true);
  assert.strictEqual(drillData.data.officer.id, officer.user.id);
  assert.ok(drillData.data.metrics, 'metrics missing in drilldown');
  assert.ok(Array.isArray(drillData.data.recentReports), 'recentReports missing in drilldown');
  console.log(`   ✅ Drilldown Officer: ${drillData.data.officer.fullName}`);
  console.log(`   ✅ Registered Count: ${drillData.data.metrics.citizensRegistered}`);
  console.log(`   ✅ Total Screen Time: ${drillData.data.metrics.totalScreenTimeFormatted}`);
  console.log(`   ✅ Reports Count: ${drillData.data.metrics.reportsCount}`);

  // Test 5: Verify Geographic Distribution & Demographics formatting
  console.log('\n👉 Test 5: Geographic Woreda Breakdown & Demographic Data');
  assert.ok(Array.isArray(mgrData.data.citizens.genderDistribution), 'genderDistribution must be array');
  assert.ok(Array.isArray(mgrData.data.citizens.geographicDistribution), 'geographicDistribution must be array');
  console.log(`   ✅ Gender Groups Returned: ${mgrData.data.citizens.genderDistribution.length}`);
  console.log(`   ✅ Geographic Woredas Returned: ${mgrData.data.citizens.geographicDistribution.length}`);

  console.log('\n====================================================');
  console.log('🎉 ALL PHASE 9 REAL-TIME TELEMETRY & ANALYTICS TESTS PASSED 100%!');
  console.log('====================================================');
}

runPhase9Tests().catch((err) => {
  console.error('❌ Phase 9 Test Failure:', err);
  process.exit(1);
});
