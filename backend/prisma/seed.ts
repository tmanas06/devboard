import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Ensure "Webyalaya" organization exists
  const org1 = await prisma.organization.upsert({
    where: { slug: 'webyalaya' },
    update: {},
    create: {
      name: 'Webyalaya',
      slug: 'webyalaya',
      isActive: true,
    },
  });

  const org2 = await prisma.organization.upsert({
    where: { slug: 'tech-solutions' },
    update: {},
    create: {
      name: 'Tech Solutions',
      slug: 'tech-solutions',
      isActive: true,
    },
  });

  const org3 = await prisma.organization.upsert({
    where: { slug: 'digital-agency' },
    update: {},
    create: {
      name: 'Digital Agency',
      slug: 'digital-agency',
      isActive: true,
    },
  });

  console.log('Organizations seeded:', [org1.name, org2.name, org3.name]);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

