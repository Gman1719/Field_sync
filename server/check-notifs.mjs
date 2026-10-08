import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.notification.count();
  const samples = await prisma.notification.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { recipient: { select: { fullName: true, role: true, email: true, employeeId: true } } },
  });
  console.log('Total notifications in DB:', count);
  console.log('Recent notifications:', JSON.stringify(samples, null, 2));

  const officers = await prisma.user.findMany({
    where: { role: 'FIELD_OFFICER' },
    select: { id: true, fullName: true, email: true, employeeId: true, supervisorId: true },
  });
  console.log('Officers in DB:', JSON.stringify(officers, null, 2));
  await prisma.$disconnect();
}
main();
