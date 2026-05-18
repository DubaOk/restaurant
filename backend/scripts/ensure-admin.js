/**
 * Создаёт или обновляет учётную запись администратора (роль ADMIN, пароль из env).
 * Запуск из папки backend: npm run admin:ensure
 *
 * ADMIN_EMAIL     по умолчанию admin@restaurants.by
 * ADMIN_PASSWORD  по умолчанию admin123
 * ADMIN_NAME      по умолчанию Администратор
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
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

  console.log('Администратор готов:', user.email);
  console.log('Вход на фронте: /login → затем раздел «Админ» (/admin)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
