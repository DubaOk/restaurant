const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const ownerPassword = await bcrypt.hash('owner123', 10);
  const clientPassword = await bcrypt.hash('client123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@restaurants.by' },
    update: {},
    create: { name: 'Администратор', email: 'admin@restaurants.by', password: adminPassword, role: 'ADMIN' },
  });

  const owner = await prisma.user.upsert({
    where: { email: 'owner@restaurants.by' },
    update: {},
    create: { name: 'Владелец Иванов', email: 'owner@restaurants.by', password: ownerPassword, role: 'OWNER' },
  });

  const client = await prisma.user.upsert({
    where: { email: 'client@restaurants.by' },
    update: {},
    create: { name: 'Клиент Петров', email: 'client@restaurants.by', password: clientPassword, role: 'CLIENT' },
  });

  const restaurant = await prisma.restaurant.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Ресторан Минск',
      description: 'Уютный ресторан с белорусской кухней в центре Минска.',
      address: 'пр-т Независимости, 17, Минск',
      cuisine: 'Белорусская',
      phone: '+375 17 200-00-01',
      openTime: '11:00',
      closeTime: '23:00',
      latitude: 53.9045,
      longitude: 27.5615,
      ownerId: owner.id,
    },
  });

  await prisma.table.createMany({
    data: [
      { restaurantId: restaurant.id, number: 1, capacity: 2 },
      { restaurantId: restaurant.id, number: 2, capacity: 4 },
      { restaurantId: restaurant.id, number: 3, capacity: 6 },
    ],
    skipDuplicates: true,
  });

  await prisma.menuItem.createMany({
    data: [
      { restaurantId: restaurant.id, name: 'Драники', description: 'Картофельные оладьи со сметаной', price: 8.50, category: 'Закуски' },
      { restaurantId: restaurant.id, name: 'Мачанка', description: 'Свинина в соусе с блинами', price: 15.00, category: 'Главные блюда' },
      { restaurantId: restaurant.id, name: 'Холодник', description: 'Традиционный белорусский суп', price: 6.50, category: 'Супы' },
    ],
    skipDuplicates: true,
  });

  await prisma.promotion.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        title: 'Счастливые часы',
        description: 'Скидка 20% на все меню с 12:00 до 15:00 по будням.',
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed completed:', { admin: admin.email, owner: owner.email, client: client.email });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
