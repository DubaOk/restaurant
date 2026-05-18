/**
 * Seed: администратор + демо-рестораны (15 заведений).
 * Пропуск демо, если рестораны уже есть. Отключить демо: SEED_DEMO=false
 *
 * Полная очистка: npm run db:reset
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { seedDemo } = require('./seed-demo');
const { seedDemoReservations } = require('./seed-demo-reservations');

const prisma = new PrismaClient();

async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@restaurants.by').trim().toLowerCase();
  const passwordPlain = process.env.ADMIN_PASSWORD || 'admin123';
  const name = process.env.ADMIN_NAME || 'Администратор';
  const password = await bcrypt.hash(passwordPlain, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password,
      role: 'ADMIN',
      isBlocked: false,
    },
    create: {
      email,
      name,
      password,
      role: 'ADMIN',
    },
  });

  console.log('Seed: администратор', user.email);
  return user;
}

async function main() {
  await ensureAdmin();

  if (process.env.SEED_DEMO === 'false') {
    console.log('SEED_DEMO=false — демо-рестораны не загружаются.');
    return;
  }

  console.log('Seed: демо-рестораны…');
  const demoResult = await seedDemo(prisma);
  if (demoResult?.skipped) {
    console.log('Seed: демо-брони…');
    await seedDemoReservations(prisma);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
