// server/src/server.ts
// FieldSync Server Entrypoint

import dns from 'node:dns';
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './app.js';
import { VerificationSchedulerService } from './services/verificationScheduler.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env relative to server root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = createApp();
const PORT = parseInt(process.env.PORT || '5000', 10);

app.listen(PORT, () => {
  console.log('====================================================');
  console.log('🚀 FieldSync Backend Server');
  console.log(`📡 Server running on port ${PORT}`);
  console.log('🩺 Health endpoint: /api/health');
  console.log('====================================================');

  // Start authoritative verification scheduler
  VerificationSchedulerService.start();
});
