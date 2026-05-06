import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/services/auth.service.js';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hashPassword('password123');

  await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@example.com',
      passwordHash,
      userType: 'SA',
    },
  });

  await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: {
      name: 'Owner Admin',
      email: 'owner@example.com',
      passwordHash,
      userType: 'A',
    },
  });

  console.log('Seeded users: superadmin@example.com and owner@example.com, password password123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
