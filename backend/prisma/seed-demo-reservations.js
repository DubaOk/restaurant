const { DEMO_OWNER, DEMO_CLIENT } = require('./demo-data');

function bookingAt(daysFromNow, timeStr) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const [h, m] = timeStr.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

const BOOKING_TEMPLATES = [
  { days: 0, time: '19:00', guests: 2, status: 'PENDING', comment: 'Стол у окна, если можно' },
  { days: 0, time: '20:30', guests: 4, status: 'CONFIRMED', comment: null },
  { days: 1, time: '18:00', guests: 2, status: 'CONFIRMED', comment: 'День рождения' },
  { days: 1, time: '19:30', guests: 6, status: 'PENDING', comment: null },
  { days: 2, time: '12:30', guests: 3, status: 'CONFIRMED', comment: 'Бизнес-ланч' },
  { days: 3, time: '20:00', guests: 2, status: 'CANCELLED', comment: 'Гость отменил' },
  { days: 5, time: '19:00', guests: 4, status: 'PENDING', comment: null },
  { days: 7, time: '18:30', guests: 2, status: 'CONFIRMED', comment: 'Без орехов' },
  { days: -3, time: '19:00', guests: 2, status: 'COMPLETED', comment: null },
  { days: -1, time: '20:00', guests: 4, status: 'COMPLETED', comment: 'Всё понравилось' },
];

/**
 * Добавляет демо-брони для ресторанов владельца owner@burmalda.by.
 * Идемпотентно: пропуск, если у владельца уже >= minExisting броней.
 */
async function seedDemoReservations(prisma, { minExisting = 15 } = {}) {
  const owner = await prisma.user.findUnique({ where: { email: DEMO_OWNER.email } });
  const client = await prisma.user.findUnique({ where: { email: DEMO_CLIENT.email } });

  if (!owner || !client) {
    console.log('Demo reservations: нет демо-аккаунтов — сначала загрузите рестораны.');
    return { created: 0, skipped: true };
  }

  const existingCount = await prisma.reservation.count({
    where: { restaurant: { ownerId: owner.id } },
  });

  if (existingCount >= minExisting) {
    console.log(`Demo reservations: уже ${existingCount} броней у ресторатора, пропуск.`);
    return { created: 0, skipped: true };
  }

  const restaurants = await prisma.restaurant.findMany({
    where: { ownerId: owner.id },
    include: { tables: { orderBy: { number: 'asc' } } },
    orderBy: { id: 'asc' },
  });

  if (!restaurants.length) {
    console.log('Demo reservations: нет ресторанов у демо-ресторатора.');
    return { created: 0, skipped: true };
  }

  let created = 0;
  let tplIndex = 0;

  for (const restaurant of restaurants) {
    const tables = restaurant.tables.filter((t) => t.isAvailable !== false);
    if (!tables.length) continue;

    const perRestaurant = 3;
    for (let i = 0; i < perRestaurant; i++) {
      const tpl = BOOKING_TEMPLATES[tplIndex % BOOKING_TEMPLATES.length];
      tplIndex += 1;
      const table = tables[i % tables.length];

      await prisma.reservation.create({
        data: {
          userId: client.id,
          restaurantId: restaurant.id,
          tableId: table.id,
          date: bookingAt(tpl.days, tpl.time),
          guestsCount: Math.min(tpl.guests, table.maxCapacity ?? table.capacity),
          status: tpl.status,
          comment: tpl.comment,
        },
      });
      created += 1;
    }
  }

  console.log(`Demo reservations: создано ${created} броней для ${restaurants.length} ресторанов.`);
  return { created, skipped: false };
}

module.exports = { seedDemoReservations };
