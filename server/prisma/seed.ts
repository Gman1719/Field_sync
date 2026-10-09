// server/prisma/seed.ts
// Database Seed Script for FieldSync using Prisma ORM
// Seeds Ethiopian Administrative Hierarchy (Region -> Zone -> Woreda -> Kebele) and Initial Users

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting FieldSync Database Seed via Prisma...');

  // 1. Load Ethiopian Hierarchy
  const archivePath = path.resolve(__dirname, '../../_archive/api/data/ethiopia-locations.json');
  const legacyPath = path.resolve(__dirname, '../../api/data/ethiopia-locations.json');
  const dataPath = fs.existsSync(archivePath) ? archivePath : legacyPath;
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Location dataset not found at ${dataPath}`);
  }

  const raw = fs.readFileSync(dataPath, 'utf-8');
  const regionsData = JSON.parse(raw);

  console.log(`📦 Seeding ${regionsData.length} Regions, Zones, Woredas, and Kebeles...`);

  let seededRegions = 0;
  let seededZones = 0;
  let seededWoredas = 0;
  let seededKebeles = 0;

  for (const r of regionsData) {
    const region = await prisma.region.upsert({
      where: { code: r.code },
      update: { name: r.name },
      create: {
        id: r.id,
        name: r.name,
        code: r.code,
      },
    });
    seededRegions++;

    for (const z of r.zones || []) {
      const zone = await prisma.zone.upsert({
        where: { id: z.id },
        update: { name: z.name, regionId: region.id },
        create: {
          id: z.id,
          name: z.name,
          code: z.code,
          regionId: region.id,
        },
      });
      seededZones++;

      for (const w of z.woredas || []) {
        const woreda = await prisma.woreda.upsert({
          where: { id: w.id },
          update: { name: w.name, zoneId: zone.id },
          create: {
            id: w.id,
            name: w.name,
            code: w.code,
            zoneId: zone.id,
          },
        });
        seededWoredas++;

        // Generate standard Kebele units for each Woreda (Kebele 01 to Kebele 03)
        for (let kIndex = 1; kIndex <= 3; kIndex++) {
          const kCode = `${w.code}-K0${kIndex}`;
          const kId = `keb-${w.id}-${kIndex}`;
          const kName = `${w.name} - Kebele 0${kIndex}`;

          await prisma.kebele.upsert({
            where: { id: kId },
            update: { name: kName, woredaId: woreda.id },
            create: {
              id: kId,
              name: kName,
              code: kCode,
              woredaId: woreda.id,
            },
          });
          seededKebeles++;
        }
      }
    }
  }

  console.log(`✅ Hierarchy Seeded: ${seededRegions} Regions, ${seededZones} Zones, ${seededWoredas} Woredas, ${seededKebeles} Kebeles`);

  // 2. Seed Initial Users
  console.log('👤 Seeding System Users (Manager, Supervisor, Field Officer)...');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 2.1 System Manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@fieldsync.com' },
    update: { fullName: 'System Manager', passwordHash },
    create: {
      id: 'u_mgr',
      fullName: 'System Manager',
      email: 'manager@fieldsync.com',
      passwordHash,
      role: Role.MANAGER,
      phoneNumber: '+251911000000',
      isActive: true,
      mustChangePassword: false,
    },
  });

  // 2.2 Regional Supervisor (Assigned to Bole Sub-City)
  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@fieldsync.com' },
    update: { fullName: 'Regional Supervisor', passwordHash },
    create: {
      id: 'u_sup',
      fullName: 'Regional Supervisor',
      email: 'supervisor@fieldsync.com',
      passwordHash,
      role: Role.SUPERVISOR,
      phoneNumber: '+251911000100',
      regionId: 'reg-addis-ababa',
      zoneId: 'zone-aa-bole',
      isActive: true,
      mustChangePassword: false,
    },
  });

  // 2.3 Field Officer (Stationed at Bole Woreda 01, Kebele 01 under supervisor)
  const officer = await prisma.user.upsert({
    where: { email: 'officer@fieldsync.com' },
    update: { fullName: 'Field Officer', passwordHash, supervisorId: supervisor.id },
    create: {
      id: 'u_off',
      fullName: 'Field Officer',
      email: 'officer@fieldsync.com',
      passwordHash,
      role: Role.FIELD_OFFICER,
      phoneNumber: '+251911000200',
      regionId: 'reg-addis-ababa',
      zoneId: 'zone-aa-bole',
      woredaId: 'wor-aa-bol-01',
      kebeleId: 'keb-wor-aa-bol-01-1',
      supervisorId: supervisor.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  console.log(`✅ System Users Seeded:`);
  console.log(`   - Manager: ${manager.email}`);
  console.log(`   - Supervisor: ${supervisor.email}`);
  console.log(`   - Field Officer: ${officer.email}`);

  // 2.4 Quick-Sign-In Demo Accounts matching UI buttons
  const demoSuperHash = await bcrypt.hash('super123', 10);
  const demoOfficerHash = await bcrypt.hash('officer123', 10);

  const demoSupervisor = await prisma.user.upsert({
    where: { email: 'birhan@fieldsync.com' },
    update: { fullName: 'Birhan Wolde (Supervisor)', passwordHash: demoSuperHash, role: Role.SUPERVISOR },
    create: {
      id: 'u_demo_sup',
      fullName: 'Birhan Wolde (Supervisor)',
      email: 'birhan@fieldsync.com',
      passwordHash: demoSuperHash,
      role: Role.SUPERVISOR,
      phoneNumber: '+251922334455',
      regionId: 'reg-addis-ababa',
      zoneId: 'zone-aa-bole',
      isActive: true,
      mustChangePassword: false,
    },
  });

  const demoOfficer = await prisma.user.upsert({
    where: { email: 'meseret@fieldsync.com' },
    update: { fullName: 'Meseret Hailu (Field Officer)', passwordHash: demoOfficerHash, role: Role.FIELD_OFFICER, supervisorId: demoSupervisor.id },
    create: {
      id: 'u_demo_off',
      fullName: 'Meseret Hailu (Field Officer)',
      email: 'meseret@fieldsync.com',
      passwordHash: demoOfficerHash,
      role: Role.FIELD_OFFICER,
      phoneNumber: '+251933445566',
      regionId: 'reg-addis-ababa',
      zoneId: 'zone-aa-bole',
      woredaId: 'wor-aa-bol-01',
      kebeleId: 'keb-wor-aa-bol-01-1',
      supervisorId: demoSupervisor.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  console.log(`   - Demo Manager: ${demoManager.email}`);
  console.log(`   - Demo Supervisor: ${demoSupervisor.email}`);
  console.log(`   - Demo Officer: ${demoOfficer.email}`);
  console.log('🎉 Phase 2 Database Seed Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
