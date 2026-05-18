/**
 * Полная очистка данных и единственный пользователь — администратор.
 * Запуск из backend: npm run db:reset
 *
 * ADMIN_EMAIL     (по умолчанию admin@restaurants.by)
 * ADMIN_PASSWORD  (по умолчанию admin123)
 * ADMIN_NAME      (по умолчанию Администратор)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { seedDemo } = require('../prisma/seed-demo');

const prisma = new PrismaClient();

const TABLES = [
  'bonus_transactions',
  'favorites',
  'reviews',
  'reservations',
  'promotions',
  'menu_items',
  'restaurant_images',
  'tables',
  'restaurants',
  'users',
];

async function truncateAll() {
  const list = TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
}

async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@restaurants.by').trim().toLowerCase();
  const passwordPlain = process.env.ADMIN_PASSWORD || 'admin123';
  const name = process.env.ADMIN_NAME || 'Администратор';
  const password = await bcrypt.hash(passwordPlain, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password,
      role: 'ADMIN',
      isBlocked: false,
    },
  });

  return { user, passwordPlain };
}

async function main() {
  console.log('Очистка всех таблиц…');
  await truncateAll();
  console.log('Таблицы очищены (счётчики id сброшены).');

  const { user, passwordPlain } = await ensureAdmin();
  console.log('');
  console.log('Готово. В базе только администратор:');
  console.log('  Email:   ', user.email);
  console.log('  Пароль:  ', passwordPlain);
  console.log('  Вход:    /login → раздел «Админ» (/admin)');
  console.log('');

  console.log('Загрузка демо-ресторанов…');
  await seedDemo(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
