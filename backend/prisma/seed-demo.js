const bcrypt = require('bcryptjs');
const {
  photo,
  DEMO_OWNER,
  DEMO_CLIENT,
  DEFAULT_TABLES,
  DEMO_RESTAURANTS,
} = require('./demo-data');
const { seedDemoReservations } = require('./seed-demo-reservations');

async function seedDemo(prisma) {
  const existing = await prisma.restaurant.count();
  if (existing > 0) {
    console.log(`Demo: в базе уже ${existing} ресторан(ов), пропуск.`);
    return { skipped: true };
  }

  const ownerHash = await bcrypt.hash(DEMO_OWNER.password, 10);
  const owner = await prisma.user.upsert({
    where: { email: DEMO_OWNER.email },
    update: {
      name: DEMO_OWNER.name,
      password: ownerHash,
      role: 'OWNER',
      isBlocked: false,
    },
    create: {
      email: DEMO_OWNER.email,
      name: DEMO_OWNER.name,
      password: ownerHash,
      role: 'OWNER',
    },
  });

  const clientHash = await bcrypt.hash(DEMO_CLIENT.password, 10);
  await prisma.user.upsert({
    where: { email: DEMO_CLIENT.email },
    update: {
      name: DEMO_CLIENT.name,
      password: clientHash,
      role: 'CLIENT',
      isBlocked: false,
    },
    create: {
      email: DEMO_CLIENT.email,
      name: DEMO_CLIENT.name,
      password: clientHash,
      role: 'CLIENT',
    },
  });

  const now = new Date();
  const promoEnd = new Date(now);
  promoEnd.setMonth(promoEnd.getMonth() + 2);

  for (const data of DEMO_RESTAURANTS) {
    const imageUrls = data.images.map((photoId, sortOrder) => ({
      url: photo(photoId),
      sortOrder,
    }));

    const restaurant = await prisma.restaurant.create({
      data: {
        name: data.name,
        description: data.description,
        city: data.city,
        address: data.address,
        cuisine: data.cuisine,
        phone: data.phone,
        openTime: data.openTime,
        closeTime: data.closeTime,
        latitude: data.latitude,
        longitude: data.longitude,
        avgRating: data.avgRating,
        imageUrl: imageUrls[0]?.url ?? null,
        ownerId: owner.id,
        images: { create: imageUrls },
        tables: {
          create: DEFAULT_TABLES.map((t) => ({
            number: t.number,
            capacity: t.capacity,
            maxCapacity: t.maxCapacity ?? null,
            posX: t.posX,
            posY: t.posY,
            isAvailable: true,
            adjacentTableIds: [],
          })),
        },
        menuItems: {
          create: data.menu.map((item) => ({
            name: item.name,
            description: item.description ?? null,
            price: item.price,
            category: item.category,
            imageUrl: item.image ? photo(item.image, 800) : null,
            isAvailable: true,
            isRecommended: Boolean(item.isRecommended),
          })),
        },
        promotions: {
          create: {
            title: `Скидка 10% в «${data.name}»`,
            description: 'Действует на основное меню при бронировании через Бурмалду.',
            startDate: now,
            endDate: promoEnd,
          },
        },
      },
    });

    console.log(`  + ${restaurant.name} (${data.cuisine}, ${data.city})`);
  }

  console.log('');
  console.log('Demo-аккаунты:');
  console.log(`  Ресторатор: ${DEMO_OWNER.email} / ${DEMO_OWNER.password}`);
  console.log(`  Гость:      ${DEMO_CLIENT.email} / ${DEMO_CLIENT.password}`);

  await seedDemoReservations(prisma);

  return { skipped: false, count: DEMO_RESTAURANTS.length };
}

module.exports = { seedDemo };
