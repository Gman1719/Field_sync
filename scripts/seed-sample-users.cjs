const { PrismaClient } = require('../server/node_modules/@prisma/client');
const bcrypt = require('../server/node_modules/bcryptjs');
const prisma = new PrismaClient();

const sampleUsers = [
  {
    id: 'u_mgr',
    fullName: 'System Manager',
    email: 'manager@fieldsync.com',
    role: 'MANAGER',
    phoneNumber: '+251911000000',
    regionId: 'reg-addis-ababa',
  },
  {
    id: 'u_sup',
    fullName: 'Regional Supervisor',
    email: 'supervisor@fieldsync.com',
    role: 'SUPERVISOR',
    phoneNumber: '+251911000100',
    regionId: 'reg-addis-ababa',
    zoneId: 'zone-aa-bole',
  },
  {
    id: 'u_off',
    fullName: 'Field Officer',
    email: 'officer@fieldsync.com',
    role: 'FIELD_OFFICER',
    phoneNumber: '+251911000200',
    regionId: 'reg-addis-ababa',
    zoneId: 'zone-aa-bole',
    woredaId: 'wor-aa-bol-01',
    kebeleId: 'keb-wor-aa-bol-01-1',
    supervisorId: 'u_sup',
  },
  {
    id: 'cb0ba983-e234-4596-9cea-34a157af283e',
    fullName: 'Getiye Demis Kassa',
    email: 'getiyedemis@gmail.com',
    role: 'SUPERVISOR',
    phoneNumber: '+251911000104',
    regionId: 'reg-amhara',
    zoneId: 'zone-am-north-shewa',
  },
  {
    id: '21731752-6b65-4726-ad25-c96b57b33aba',
    fullName: 'Ebra kassew Tgegenew',
    email: 'ebra@gmail.com',
    role: 'FIELD_OFFICER',
    phoneNumber: '+251911000213',
    regionId: 'reg-amhara',
    zoneId: 'zone-am-north-shewa',
    woredaId: 'wor-am-angolela-t',
    kebeleId: 'keb-wor-am-angolela-t-2',
    supervisorId: 'cb0ba983-e234-4596-9cea-34a157af283e',
  },
  {
    id: 'b682323b-0eee-4fb0-90cc-c43f55cca73c',
    fullName: 'almaz derese atnafu',
    email: 'almaz@gmail.com',
    role: 'FIELD_OFFICER',
    phoneNumber: '+251911000214',
    regionId: 'reg-amhara',
    zoneId: 'zone-am-north-shewa',
    woredaId: 'wor-am-hagere-m',
    supervisorId: 'cb0ba983-e234-4596-9cea-34a157af283e',
  },
  {
    id: '53ebe5f5-0e57-4cca-bb0b-2ac6e1d80222',
    fullName: 'alemitu kebede welde',
    email: 'alemitu@gmail.com',
    role: 'SUPERVISOR',
    phoneNumber: '+251911000105',
    regionId: 'reg-amhara',
    zoneId: 'zone-am-north-wollo',
  },
  {
    id: 'b9bd86d0-3e5d-4b77-8a9b-17a0ba755480',
    fullName: 'Abebe Kebede Tessema',
    email: 'officer.test6291@fieldsync.com',
    role: 'FIELD_OFFICER',
    phoneNumber: '+251911000215',
    regionId: 'reg-amhara',
    zoneId: 'zone-am-north-wollo',
    woredaId: 'wor-am-bugna',
    supervisorId: '53ebe5f5-0e57-4cca-bb0b-2ac6e1d80222',
  }
];

async function main() {
  const hash = await bcrypt.hash('Password123!', 10);
  for (const u of sampleUsers) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ id: u.id }, { email: u.email }] }
    });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          phoneNumber: u.phoneNumber,
          regionId: u.regionId || null,
          zoneId: u.zoneId || null,
          woredaId: u.woredaId || null,
          kebeleId: u.kebeleId || null,
          supervisorId: u.supervisorId || null,
          isActive: true,
        }
      });
      console.log('Updated user:', u.email, u.id);
    } else {
      await prisma.user.create({
        data: {
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          passwordHash: hash,
          role: u.role,
          phoneNumber: u.phoneNumber,
          regionId: u.regionId || null,
          zoneId: u.zoneId || null,
          woredaId: u.woredaId || null,
          kebeleId: u.kebeleId || null,
          supervisorId: u.supervisorId || null,
          isActive: true,
          mustChangePassword: false,
        }
      });
      console.log('Created user:', u.email, u.id);
    }
  }
  console.log('All sample users synced to Postgres successfully!');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error seeding sample users:', err);
  process.exit(1);
});
