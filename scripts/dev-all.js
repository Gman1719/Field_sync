// scripts/dev-all.js - Runs frontend and backend API concurrently
import { spawn, execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const serverDir = path.resolve(rootDir, 'server');

console.log('🧹 Clearing any stale processes on Ports 5000 & 5173...');
try {
  if (process.platform === 'win32') {
    execSync(
      `powershell -NoProfile -Command "& { Get-NetTCPConnection -LocalPort 5000, 5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"`,
      { stdio: 'ignore' }
    );
  } else {
    execSync('fuser -k 5000/tcp 5173/tcp 2>/dev/null', { stdio: 'ignore' });
  }
} catch {}

console.log('============================================================');
console.log('  🚀 Starting FieldSync Enterprise System...');
console.log('  📡 Backend REST API:  http://localhost:5000');
console.log('  💻 Frontend Web App:  http://localhost:5173');
console.log('============================================================');

const tsxCli = path.join(serverDir, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const viteCli = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');

// Start Express Backend API in server/ directory
const apiProcess = spawn(process.execPath, [tsxCli, 'watch', 'src/server.ts'], {
  cwd: serverDir,
  stdio: ['ignore', 'inherit', 'inherit'],
  env: { ...process.env, PORT: process.env.PORT || '5000' }
});

// Start Frontend Vite Dev Server in root directory
const viteProcess = spawn(process.execPath, [viteCli, '--host'], {
  cwd: rootDir,
  stdio: ['ignore', 'inherit', 'inherit']
});

const cleanup = () => {
  console.log('\n🛑 Shutting down FieldSync processes...');
  try { apiProcess.kill(); } catch (_) {}
  try { viteProcess.kill(); } catch (_) {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
