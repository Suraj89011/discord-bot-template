/**
 * Prisma seed script - populates initial data
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create app settings
  const appSettings = [
    { key: 'maintenance_mode', value: 'false' },
    { key: 'version', value: '1.0.0' },
    { key: 'default_prefix', value: '!' },
    { key: 'max_servers_per_user', value: '100' },
  ];

  for (const setting of appSettings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
    console.log(`Created/updated setting: ${setting.key}`);
  }

  // In development, create some demo data
  if (process.env.NODE_ENV === 'development') {
    // Create demo admin user
    const demoUser = await prisma.user.upsert({
      where: { discordId: '000000000000000001' },
      update: {},
      create: {
        discordId: '000000000000000001',
        username: 'DemoAdmin',
        discriminator: '0001',
        isAdmin: true,
      },
    });
    console.log(`Created demo user: ${demoUser.username}`);

    // Create demo server
    const demoServer = await prisma.server.upsert({
      where: { discordId: '000000000000000001' },
      update: {},
      create: {
        discordId: '000000000000000001',
        name: 'Demo Server',
        memberCount: 100,
        settings: {
          create: {
            prefix: '!',
            enableLeveling: true,
            enableWelcome: true,
            welcomeMessage: 'Welcome to the server, {user}!',
          },
        },
      },
      include: { settings: true },
    });
    console.log(`Created demo server: ${demoServer.name}`);

    // Add demo user to demo server
    await prisma.serverMember.upsert({
      where: {
        userId_serverId: {
          userId: demoUser.id,
          serverId: demoServer.id,
        },
      },
      update: {},
      create: {
        userId: demoUser.id,
        serverId: demoServer.id,
        xp: 1000,
        level: 5,
        messages: 250,
      },
    });
    console.log('Added demo user to demo server');
  }

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });