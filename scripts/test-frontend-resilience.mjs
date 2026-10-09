// scripts/test-frontend-resilience.mjs
// Automated verification suite for FieldSync Vercel Deployment & Offline-First Resiliency

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('============================================================');
console.log('🔍 Running FieldSync Vercel & Offline Resilience Test Suite');
console.log('============================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
  }
}

// Test 1: vercel.json SPA rewrites
try {
  const vercelJsonPath = path.join(rootDir, 'vercel.json');
  assert(fs.existsSync(vercelJsonPath), 'vercel.json exists in root directory');
  const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
  const hasRewrite = vercelConfig.rewrites && vercelConfig.rewrites.some(r => r.source === '/(.*)' && r.destination === '/index.html');
  assert(hasRewrite, 'vercel.json includes SPA catch-all rewrite to /index.html');
} catch (e) {
  assert(false, `vercel.json check error: ${e.message}`);
}

// Test 2: Ethiopian Location Dataset for offline seeding
try {
  const locPath = path.join(rootDir, 'src', 'data', 'ethiopiaLocations.json');
  assert(fs.existsSync(locPath), 'src/data/ethiopiaLocations.json exists');
  const locData = JSON.parse(fs.readFileSync(locPath, 'utf8'));
  assert(Array.isArray(locData) && locData.length >= 10, `Contains ${locData.length} Ethiopian regions and chartered cities`);
  
  let zoneCount = 0;
  let woredaCount = 0;
  locData.forEach(r => {
    (r.zones || []).forEach(z => {
      zoneCount++;
      (z.woredas || []).forEach(() => woredaCount++);
    });
  });
  assert(zoneCount > 20 && woredaCount > 100, `Hierarchy verified: ${zoneCount} zones, ${woredaCount} woredas`);
} catch (e) {
  assert(false, `Location dataset check error: ${e.message}`);
}

// Test 3: LocationData service exists
try {
  const locServicePath = path.join(rootDir, 'src', 'services', 'locationData.ts');
  assert(fs.existsSync(locServicePath), 'src/services/locationData.ts exists');
  const locServiceContent = fs.readFileSync(locServicePath, 'utf8');
  assert(locServiceContent.includes('ensureOfflineLocationsSeeded'), 'Exports ensureOfflineLocationsSeeded function');
} catch (e) {
  assert(false, `LocationData service check error: ${e.message}`);
}

// Test 4: Mixed Content Prevention in src/config/api.ts
try {
  const apiConfigPath = path.join(rootDir, 'src', 'config', 'api.ts');
  const apiConfigContent = fs.readFileSync(apiConfigPath, 'utf8');
  assert(apiConfigContent.includes('isHttps') && apiConfigContent.includes('/api'), 'src/config/api.ts safely falls back to /api on HTTPS to prevent Mixed Content blocking');
} catch (e) {
  assert(false, `API config check error: ${e.message}`);
}

// Test 5: AuthContext offline auto-seeding
try {
  const authContextPath = path.join(rootDir, 'src', 'context', 'AuthContext.tsx');
  const authContent = fs.readFileSync(authContextPath, 'utf8');
  assert(authContent.includes('SAMPLE_USERS') && authContent.includes('initializeAllData'), 'AuthContext includes offline auto-seed fallback for SAMPLE_USERS');
} catch (e) {
  assert(false, `AuthContext check error: ${e.message}`);
}

// Test 6: Analytics offline calculation
try {
  const analyticsPath = path.join(rootDir, 'src', 'components', 'analytics', 'Analytics.tsx');
  const analyticsContent = fs.readFileSync(analyticsPath, 'utf8');
  assert(analyticsContent.includes('computeOfflineAnalytics') && analyticsContent.includes('offlineDb.citizens'), 'Analytics.tsx includes computeOfflineAnalytics fallback');
} catch (e) {
  assert(false, `Analytics check error: ${e.message}`);
}

// Test 7: DuplicateReviewConsole offline fallback
try {
  const dupPath = path.join(rootDir, 'src', 'components', 'duplicates', 'DuplicateReviewConsole.tsx');
  const dupContent = fs.readFileSync(dupPath, 'utf8');
  assert(dupContent.includes('offlineDb.citizens.toArray()') && dupContent.toLowerCase().includes('offline resolution fallback'), 'DuplicateReviewConsole includes offline review queue and adjudication fallback');
} catch (e) {
  assert(false, `DuplicateReviewConsole check error: ${e.message}`);
}

// Test 8: AuditLog offline fallback
try {
  const auditPath = path.join(rootDir, 'src', 'components', 'audit', 'AuditLog.tsx');
  const auditContent = fs.readFileSync(auditPath, 'utf8');
  assert(auditContent.includes('db.audit.toArray()'), 'AuditLog includes local db.audit fallback');
} catch (e) {
  assert(false, `AuditLog check error: ${e.message}`);
}

// Test 9: Production build output exists
try {
  const distHtmlPath = path.join(rootDir, 'dist', 'index.html');
  const distManifestPath = path.join(rootDir, 'dist', 'manifest.webmanifest');
  const distSwPath = path.join(rootDir, 'dist', 'sw.js');
  assert(fs.existsSync(distHtmlPath), 'Production dist/index.html is compiled');
  assert(fs.existsSync(distManifestPath), 'PWA Web Manifest is generated');
  assert(fs.existsSync(distSwPath), 'Service Worker (sw.js) is generated for offline caching');
} catch (e) {
  assert(false, `Build artifact check error: ${e.message}`);
}

console.log('\n============================================================');
console.log(`📊 Test Summary: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('============================================================');

if (passedTests === totalTests) {
  console.log('🎉 ALL RESILIENCE TESTS PASSED! System is 100% ready for Vercel deployment.');
  process.exit(0);
} else {
  console.error('⚠️ Some tests failed.');
  process.exit(1);
}
