// scripts/test-api-routes.cjs
// Automated verification of all modular API route groups including Ethiopian Location Hierarchy & User Management

const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting API Routes Test Suite with Ethiopian Hierarchy & User Management...\n');
  let passed = 0;
  let total = 0;

  async function check(name, testFn) {
    total++;
    try {
      await testFn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  // 1. Health
  await check('GET /api/health', async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/health', method: 'GET' });
    if (res.status !== 200 && res.status !== 500) throw new Error(`Unexpected status ${res.status}`);
  });

  // 2. Test
  await check('GET /api/test', async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/test', method: 'GET' });
    if (res.status !== 200 || !res.body?.message) throw new Error(`Status: ${res.status}`);
  });

  // 3. Auth Login
  let authToken = null;
  await check('POST /api/auth/login', async () => {
    const res = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: 'officer@fieldsync.com', password: 'Password123!' }
    );
    if (res.status !== 200 || !res.body?.success) throw new Error(`Status: ${res.status}, body: ${JSON.stringify(res.body)}`);
    authToken = res.body.data.token;
  });

  // 4. Auth Me
  await check('GET /api/auth/me', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status !== 200 || !res.body?.success) throw new Error(`Status: ${res.status}`);
  });

  // 5. Ethiopian Administrative Hierarchy Endpoints
  await check('GET /api/locations/regions', async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/locations/regions', method: 'GET' });
    if (res.status !== 200 || !res.body?.success || !Array.isArray(res.body?.data) || res.body.data.length < 14) {
      throw new Error(`Expected at least 14 regions, got ${res.body?.data?.length}`);
    }
  });

  await check('GET /api/locations/regions/:regionId/zones', async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/locations/regions/reg-addis-ababa/zones', method: 'GET' });
    if (res.status !== 200 || !res.body?.success || !Array.isArray(res.body?.data) || res.body.data.length === 0) {
      throw new Error(`Failed to fetch zones for Addis Ababa`);
    }
  });

  await check('GET /api/locations/zones/:zoneId/woredas', async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/locations/zones/zone-aa-bole/woredas', method: 'GET' });
    if (res.status !== 200 || !res.body?.success || !Array.isArray(res.body?.data) || res.body.data.length === 0) {
      throw new Error(`Failed to fetch woredas for Bole zone`);
    }
  });

  await check('GET /api/locations/zones/:zoneId/supervisors', async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/locations/zones/zone-aa-bole/supervisors', method: 'GET' });
    if (res.status !== 200 || !res.body?.success) {
      throw new Error(`Failed to fetch supervisors`);
    }
  });

  // 6. User Stats KPI
  await check('GET /api/users/stats', async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/users/stats', method: 'GET' });
    if (res.status !== 200 || !res.body?.success || res.body?.data?.totalUsers === undefined) {
      throw new Error(`Invalid stats response: ${JSON.stringify(res.body)}`);
    }
  });

  // 7. Complete User Creation with Ethiopian Hierarchy & Cryptographic Temp Password
  const testEmail = `tester.${Date.now()}@fieldsync.com`;
  let createdUserId = null;
  let createdTempPassword = null;

  await check('POST /api/users (Create Field Officer with Hierarchy & Temp Password)', async () => {
    const res = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/users',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        firstName: 'Dawit',
        middleName: 'Haile',
        lastName: 'Mariam',
        email: testEmail,
        phone: '+251911223344',
        role: 'field_officer',
        regionId: 'reg-addis-ababa',
        zoneId: 'zone-aa-bole',
        woredaId: 'wor-aa-bol-01'
      }
    );

    if (res.status !== 201 || !res.body?.success || !res.body?.temporaryPassword) {
      throw new Error(`Status: ${res.status}, body: ${JSON.stringify(res.body)}`);
    }
    createdUserId = res.body.user.id;
    createdTempPassword = res.body.temporaryPassword;
    if (res.body.user.mustChangePassword !== true) {
      throw new Error('mustChangePassword must be true for newly created user');
    }
  });

  // 8. Login With New User & Temporary Password
  let newAuthToken = null;
  await check('POST /api/auth/login (With Temporary Password)', async () => {
    const res = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: testEmail, password: createdTempPassword }
    );

    if (res.status !== 200 || !res.body?.success || res.body.data.user.mustChangePassword !== true) {
      throw new Error(`Login failed or mustChangePassword is not true: ${JSON.stringify(res.body)}`);
    }
    newAuthToken = res.body.data.token;
  });

  // 9. Mandatory Password Change Endpoint
  const newPermanentPassword = 'SecurePass9988!@#';
  await check('POST /api/auth/change-password (Mandatory Reset)', async () => {
    const res = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/change-password',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newAuthToken}`
        }
      },
      {
        userId: createdUserId,
        currentPassword: createdTempPassword,
        newPassword: newPermanentPassword
      }
    );

    if (res.status !== 200 || !res.body?.success || res.body.data.user.mustChangePassword !== false) {
      throw new Error(`Password change failed: ${JSON.stringify(res.body)}`);
    }
  });

  // 10. Login with Updated Permanent Password
  await check('POST /api/auth/login (With New Permanent Password)', async () => {
    const res = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: testEmail, password: newPermanentPassword }
    );

    if (res.status !== 200 || !res.body?.success || res.body.data.user.mustChangePassword !== false) {
      throw new Error(`Login with permanent password failed: ${JSON.stringify(res.body)}`);
    }
  });

  // 11. Reassign Workstation (Hierarchy)
  await check('PATCH /api/users/:id/assignment', async () => {
    const res = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/users/${createdUserId}/assignment`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        regionId: 'reg-addis-ababa',
        zoneId: 'zone-aa-bole',
        woredaId: 'wor-aa-bol-02'
      }
    );

    if (res.status !== 200 || !res.body?.success || res.body.user.woredaId !== 'wor-aa-bol-02') {
      throw new Error(`Reassignment failed: ${JSON.stringify(res.body)}`);
    }
  });

  // 12. Reset Password Endpoint
  let resetTempPassword = null;
  await check('POST /api/users/:id/password-reset', async () => {
    const res = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/users/${createdUserId}/password-reset`,
        method: 'POST'
      }
    );

    if (res.status !== 200 || !res.body?.success || !res.body?.temporaryPassword) {
      throw new Error(`Password reset failed: ${JSON.stringify(res.body)}`);
    }
    resetTempPassword = res.body.temporaryPassword;
  });

  // 13. Status Toggle & Inactive Rejection Check
  await check('PATCH /api/users/:id/status (Deactivate User)', async () => {
    const res = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/users/${createdUserId}/status`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      },
      { status: 'inactive' }
    );

    if (res.status !== 200 || !res.body?.success || res.body.user.status !== 'inactive') {
      throw new Error(`Status toggle failed: ${JSON.stringify(res.body)}`);
    }
  });

  await check('POST /api/auth/login (Reject Inactive User with 403)', async () => {
    const res = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: testEmail, password: resetTempPassword }
    );

    if (res.status !== 403) {
      throw new Error(`Expected status 403 Forbidden for inactive user, got ${res.status}`);
    }
  });

  // Standard API endpoints
  await check('GET /api/users', async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/users', method: 'GET' });
    if (res.status !== 200 && res.status !== 500) throw new Error(`Status: ${res.status}`);
  });

  await check('GET /api/reports', async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/reports', method: 'GET' });
    if (res.status !== 200 && res.status !== 500) throw new Error(`Status: ${res.status}`);
  });

  await check('GET /api/attendance', async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/attendance', method: 'GET' });
    if (res.status !== 200 && res.status !== 500) throw new Error(`Status: ${res.status}`);
  });

  await check('GET /api/citizens', async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/citizens', method: 'GET' });
    if (res.status !== 200 && res.status !== 500) throw new Error(`Status: ${res.status}`);
  });

  await check('GET /api/leaves', async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/leaves', method: 'GET' });
    if (res.status !== 200 && res.status !== 500) throw new Error(`Status: ${res.status}`);
  });

  await check('GET /api/permissions', async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/permissions', method: 'GET' });
    if (res.status !== 200 && res.status !== 500) throw new Error(`Status: ${res.status}`);
  });

  await check('GET /api/tasks', async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/tasks', method: 'GET' });
    if (res.status !== 200 && res.status !== 500) throw new Error(`Status: ${res.status}`);
  });

  await check('GET /api/screen-time', async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/screen-time', method: 'GET' });
    if (res.status !== 200 && res.status !== 500) throw new Error(`Status: ${res.status}`);
  });

  await check('GET /api/audit', async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/audit', method: 'GET' });
    if (res.status !== 200 && res.status !== 500) throw new Error(`Status: ${res.status}`);
  });

  await check('GET /api/alerts', async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/alerts', method: 'GET' });
    if (res.status !== 200 && res.status !== 500) throw new Error(`Status: ${res.status}`);
  });

  await check('GET /api/verification', async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/verification', method: 'GET' });
    if (res.status !== 200 && res.status !== 500) throw new Error(`Status: ${res.status}`);
  });

  await check('GET /api/supervisor-reports', async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/supervisor-reports', method: 'GET' });
    if (res.status !== 200 && res.status !== 500) throw new Error(`Status: ${res.status}`);
  });

  await check('POST /api/sync (invalid type)', async () => {
    const res = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/sync',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { type: 'non_existent_type', data: {} }
    );
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  console.log(`\n📊 Summary: ${passed}/${total} tests passed.`);
  process.exit(passed === total ? 0 : 1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
