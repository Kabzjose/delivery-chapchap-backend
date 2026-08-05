import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const zoneNames = ['CBD', 'Westlands', 'Karen', 'Kilimani', 'Industrial Area', 'Eastlands'];

  const zones = await Promise.all(
    zoneNames.map((name) =>
      prisma.zone.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  const zoneByName = Object.fromEntries(zones.map((z) => [z.name, z]));

  const routes: [string, string, number][] = [
    ['CBD', 'Westlands', 300],
    ['CBD', 'Karen', 500],
    ['CBD', 'Kilimani', 350],
    ['CBD', 'Industrial Area', 400],
    ['CBD', 'Eastlands', 300],
    ['Westlands', 'Karen', 450],
    ['Westlands', 'Kilimani', 300],
  ];

  for (const [from, to, price] of routes) {
    await prisma.zoneRoute.upsert({
      where: {
        fromZoneId_toZoneId: { fromZoneId: zoneByName[from].id, toZoneId: zoneByName[to].id },
      },
      update: { price },
      create: { fromZoneId: zoneByName[from].id, toZoneId: zoneByName[to].id, price },
    });
    // Mirror the reverse direction with the same price
    await prisma.zoneRoute.upsert({
      where: {
        fromZoneId_toZoneId: { fromZoneId: zoneByName[to].id, toZoneId: zoneByName[from].id },
      },
      update: { price },
      create: { fromZoneId: zoneByName[to].id, toZoneId: zoneByName[from].id, price },
    });
  }

  console.log('✅ Seeded zones and routes');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());