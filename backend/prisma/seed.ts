import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@videosyt.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@videosyt.com',
      password: hash,
      role: 'ADMIN',
    },
  });
  console.log('Seeded admin:', admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
