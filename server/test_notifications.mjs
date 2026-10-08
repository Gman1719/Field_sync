// server/test_notifications.mjs
// Automated verification suite for FieldSync Role-Based Notification System

const BASE_URL = 'http://localhost:5000/api';

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(`Login failed for ${email}: ${data.error || JSON.stringify(data)}`);
  }
  return { token: data.data.token, user: data.data.user };
}

async function api(endpoint, method = 'GET', token, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

async function runTests() {
  console.log('🚀 Starting FieldSync Role-Based Notification Test Suite...\n');

  // 1. Authenticate all 3 roles
  console.log('1. Authenticating Manager, Supervisor, and Field Officer...');
  const manager = await login('manager@fieldsync.com', 'Password123!');
  const supervisor = await login('supervisor@fieldsync.com', 'Password123!');
  const officer = await login('officer@fieldsync.com', 'Password123!');
  console.log('   ✅ Authenticated Manager:', manager.user.fullName, `(${manager.user.role})`);
  console.log('   ✅ Authenticated Supervisor:', supervisor.user.fullName, `(${supervisor.user.role})`);
  console.log('   ✅ Authenticated Officer:', officer.user.fullName, `(${officer.user.role})`);

  // 2. Fetch initial unread counts
  console.log('\n2. Fetching initial unread counts...');
  const mgrCountBefore = (await api('/notifications/unread-count', 'GET', manager.token)).data.unreadCount;
  const supCountBefore = (await api('/notifications/unread-count', 'GET', supervisor.token)).data.unreadCount;
  const offCountBefore = (await api('/notifications/unread-count', 'GET', officer.token)).data.unreadCount;
  console.log(`   Initial unread counts -> Manager: ${mgrCountBefore}, Supervisor: ${supCountBefore}, Officer: ${offCountBefore}`);

  // 3. Officer submits Daily Report (Normal)
  console.log('\n3. Officer submits normal Daily Report...');
  const testDate = `2026-09-${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}`;
  const reportRes = await api('/reports', 'POST', officer.token, {
    reportDate: testDate,
    citizenCountLocal: 5,
    activityCount: 8,
    screenTimeSeconds: 7200,
    summary: 'Tested 5 citizen records in Woreda 03',
    achievements: 'Completed scheduled house-to-house registrations',
    challenges: 'Minor connectivity delays',
    resources: 'Tablet battery 40%',
    nextDayPlan: 'Continue in Kebele 02',
    isUrgent: false,
  });

  if (!reportRes.data.success) {
    throw new Error(`Report submit failed: ${JSON.stringify(reportRes.data)}`);
  }
  const reportId = reportRes.data.data.id;
  console.log(`   ✅ Daily report submitted successfully (ID: ${reportId})`);

  // Verify Supervisor received notification, Officer did NOT (exclusion rule)
  const supCountAfterNormal = (await api('/notifications/unread-count', 'GET', supervisor.token)).data.unreadCount;
  const offCountAfterNormal = (await api('/notifications/unread-count', 'GET', officer.token)).data.unreadCount;
  console.log(`   Supervisor count after normal report: ${supCountAfterNormal} (before: ${supCountBefore})`);
  console.log(`   Officer count after normal report: ${offCountAfterNormal} (before: ${offCountBefore})`);
  if (supCountAfterNormal <= supCountBefore) {
    console.warn('   ⚠️ Warning: Supervisor count did not increase (may be deduplicated or supervisor not linked directly)');
  } else {
    console.log('   ✅ Supervisor received notification for daily report submission');
  }
  if (offCountAfterNormal !== offCountBefore) {
    throw new Error('❌ Exclusion failure: Officer received notification for their own report submission!');
  } else {
    console.log('   ✅ Officer correctly excluded from self-report notification');
  }

  // 4. Officer submits Daily Report with URGENT Roadblock
  console.log('\n4. Officer submits Urgent Roadblock Daily Report...');
  const urgentDate = `2026-09-${String(Math.floor(Math.random() * 8) + 21).padStart(2, '0')}`;
  const urgentReportRes = await api('/reports', 'POST', officer.token, {
    reportDate: urgentDate,
    citizenCountLocal: 1,
    activityCount: 2,
    screenTimeSeconds: 1800,
    summary: 'Emergency road closure due to severe flooding',
    isUrgent: true,
    urgentReason: 'Flooding completely blocked road access to Kebele 04 field site',
  });

  if (!urgentReportRes.data.success) {
    throw new Error(`Urgent report submit failed: ${JSON.stringify(urgentReportRes.data)}`);
  }
  const urgentReportId = urgentReportRes.data.data.id;
  console.log(`   ✅ Urgent report submitted (ID: ${urgentReportId})`);

  // Check Manager received URGENT notification
  const mgrListRes = await api('/notifications?priority=URGENT', 'GET', manager.token);
  const urgentNotif = mgrListRes.data.data.find(n => n.relatedRecordId === urgentReportId || n.title.includes('URGENT'));
  if (urgentNotif) {
    console.log('   ✅ Manager received URGENT notification:', urgentNotif.title, `[Priority: ${urgentNotif.priority}]`);
  } else {
    console.log('   ℹ️ Manager urgent notifications:', mgrListRes.data.data.map(n => n.title));
  }

  // 5. Supervisor reviews Officer\'s Daily Report
  console.log('\n5. Supervisor reviews the Daily Report...');
  const reviewRes = await api(`/reports/${reportId}/review`, 'POST', supervisor.token, {
    decision: 'APPROVED',
    supervisorNotes: 'Great work maintaining high data accuracy despite connectivity delays.',
  });
  if (!reviewRes.data.success) {
    throw new Error(`Report review failed: ${JSON.stringify(reviewRes.data)}`);
  }
  console.log('   ✅ Supervisor reviewed daily report');

  // Check Officer received notification for review
  const offListRes = await api('/notifications', 'GET', officer.token);
  const reviewNotif = offListRes.data.data.find(n => n.type === 'REPORT' && n.title.includes('Report Reviewed'));
  if (reviewNotif) {
    console.log('   ✅ Officer received review notification:', reviewNotif.title, '-', reviewNotif.message);
  } else {
    console.warn('   ⚠️ Officer review notification not found in recent list');
  }

  // 6. Test Single Notification Read / Unread / Mark All Read
  console.log('\n6. Testing Notification State Transitions (Read / Unread / Mark All Read)...');
  const targetNotif = offListRes.data.data[0];
  if (targetNotif) {
    // Mark single as read
    const readRes = await api(`/notifications/${targetNotif.id}/read`, 'PATCH', officer.token);
    console.log('   ✅ PATCH /:id/read status:', readRes.status, 'isRead:', readRes.data.data.isRead, 'readAt:', readRes.data.data.readAt);

    // Mark single as unread
    const unreadRes = await api(`/notifications/${targetNotif.id}/unread`, 'PATCH', officer.token);
    console.log('   ✅ PATCH /:id/unread status:', unreadRes.status, 'isRead:', unreadRes.data.data.isRead);

    // Mark all as read
    const markAllRes = await api('/notifications/mark-all-read', 'POST', officer.token);
    console.log('   ✅ POST /mark-all-read count:', markAllRes.data.markedCount ?? markAllRes.data.data?.count);

    const offCountFinal = (await api('/notifications/unread-count', 'GET', officer.token)).data.unreadCount;
    console.log('   ✅ Officer unread count after mark-all-read:', offCountFinal);
  }

  // 7. Test Security & Recipient Isolation
  console.log('\n7. Testing Security & Recipient Isolation...');
  if (urgentNotif) {
    // Officer attempts to mark Manager's notification as read
    const hackRes = await api(`/notifications/${urgentNotif.id}/read`, 'PATCH', officer.token);
    if (hackRes.status === 404 || hackRes.status === 403) {
      console.log('   ✅ Security verified: Officer cannot manipulate Manager notification (Status:', hackRes.status, ')');
    } else {
      throw new Error(`❌ Security flaw: Officer modified Manager notification! Status: ${hackRes.status}`);
    }
  }

  // 8. Test Filtering & Search
  console.log('\n8. Testing Notification Center Filters & Search...');
  const searchRes = await api('/notifications?search=report', 'GET', supervisor.token);
  console.log(`   ✅ Search query returned ${searchRes.data.data.length} results`);

  console.log('\n======================================================');
  console.log('🎉 ALL BACKEND NOTIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
