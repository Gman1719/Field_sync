@echo off
title FieldSync Enterprise
echo ============================================================
echo   🚀 Starting FieldSync Enterprise System...
echo   📡 Backend REST API:  http://localhost:5000
echo   💻 Frontend Web App:  http://localhost:5173
echo ============================================================

cd /d "%~dp0"
node scripts/dev-all.js
pause
