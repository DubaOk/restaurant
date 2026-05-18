/**
 * Добавить демо-брони для owner@burmalda.by (без пересоздания ресторанов).
 * Docker: docker compose exec backend node scripts/seed-demo-reservations.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const { seedDemoReservations } = require('../prisma/seed-demo-reservations');
const { DEMO_OWNER, DEMO_CLIENT } = require('../prisma/demo-data');

const prisma = new PrismaClient();

async function main() {
  const result = await seedDemoReservations(prisma, { minExisting: 15 });
  if (!result.skipped) {
    console.log('');
    console.log('Аккаунты:');
    console.log(`  Ресторатор: ${DEMO_OWNER.email} / ${DEMO_OWNER.password}`);
    console.log(`  Гость:      ${DEMO_CLIENT.email} / ${DEMO_CLIENT.password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
