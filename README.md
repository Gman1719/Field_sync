# FieldSync — Offline-First Registration & Reporting System

FieldSync is an enterprise offline-first citizen registration and reporting system built for field officers working in remote locations with unstable or non-existent internet connectivity.

## Monorepo Architecture

```
fieldsync/
├── client/          # Frontend: React 18 + Vite + TypeScript + Tailwind CSS + Dexie.js
├── server/          # Backend: Node.js + Express + TypeScript + Prisma ORM + PostgreSQL
├── docs/            # Architecture diagrams & API documentation
├── _archive_legacy/ # Archived legacy code & assets (preserved for reference)
└── package.json     # Monorepo scripts
```

## Technology Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Dexie.js (IndexedDB), React Router, React Hook Form, Zod, Lucide React, Recharts.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, JWT, bcrypt, Zod.
- **Offline Storage**: IndexedDB via Dexie.js with transactional idempotency and automatic queue synchronization.

## Quick Start for Windows 11 (PowerShell)

### 1. Install Dependencies
```powershell
# From project root
npm run install:all
```

### 2. Start Development Servers
In Terminal 1 (Backend Server):
```powershell
npm run dev:server
```

In Terminal 2 (Frontend Client):
```powershell
npm run dev:client
```
Client runs at `http://localhost:5173`. Server runs at `http://localhost:5000`.
