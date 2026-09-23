// scripts/dev-all.js - Runs frontend and backend API concurrently
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 Starting FieldSync Frontend (Vite) and Backend API (Express)...');

// Start Express Backend API
const apiProcess = spawn('node', ['api/server.js'], {
  cwd: rootDir,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
  env: { ...process.env, PORT: process.env.PORT || '5000' }
});

apiProcess.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[36m[API]\x1b[0m ${data}`);
});

apiProcess.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[31m[API ERROR]\x1b[0m ${data}`);
});

// Start Frontend Vite Dev Server
const viteProcess = spawn('npx', ['vite'], {
  cwd: rootDir,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

viteProcess.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[32m[VITE]\x1b[0m ${data}`);
});

viteProcess.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[33m[VITE WARN]\x1b[0m ${data}`);
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
