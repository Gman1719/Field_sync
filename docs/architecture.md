# FieldSync System Architecture

## Overview
FieldSync is designed around a three-tier role-based operational model:
- **Field Officer**: Offline-first registration, local sync queue management, personal metrics.
- **Supervisor**: Team activity monitoring, duplicate review, report validation.
- **Manager**: Organization-wide governance, regional statistics, user & region administration, audit logs.

## Offline-First Synchronization State Machine

```
   [Citizen Registration Form]
               │
               ▼
      (Validate with Zod)
               │
               ▼
[Generate UUID clientRecordId]
               │
               ▼
    [Save to IndexedDB]
    Status: PENDING
               │
      ┌────────┴──────────────────────────┐
      │                                   │
(Device Offline)                  (Backend Reachable)
      │                                   │
[Remain in Queue]                         ▼
      │                             [POST /api/sync]
      │                                   │
      └───────────────────────────────────┼─────────────────────┐
                                          │                     │
                                   (Success 200/201)    (Demographic Duplicate)
                                          │                     │
                                          ▼                     ▼
                                    Status: SYNCED      Status: NEEDS_REVIEW
                                          │                     │
                                     (Confirmed)        (Supervisor Review)
```

## Security & Access Control
- Passwords hashed using bcrypt.
- Stateless authentication using JWT bearer tokens.
- Server-enforced Role-Based Access Control (RBAC).
- Comprehensive audit trails for sensitive administrative actions.
