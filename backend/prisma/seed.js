const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const curatedMinskRestaurants = [
  {
    id: 101,
    name: 'ButterBro',
    category: 'Европейская кухня',
    description: 'Современное bistro с акцентом на сезонные продукты и авторскую подачу. Интерьер в теплых тонах создает клубную, камерную атмосферу.',
    rating: 4.8,
    address: 'ул. Комсомольская, 12, Минск',
    coordinates: [53.90418, 27.55676],
    image_url: 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 102,
    name: 'Simple',
    category: 'Гастробар',
    description: 'Лаконичный гастробар с сильной винной картой и элегантной open-kitchen зоной. Идеален для неспешных ужинов в центре города.',
    rating: 4.7,
    address: 'ул. Революционная, 7, Минск',
    coordinates: [53.90358, 27.54994],
    image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 103,
    name: 'Пена Дней',
    category: 'Винный бар',
    description: 'Концептуальный винный бар с камерным светом и продуманной подборкой редких позиций. Пространство для ценителей вкуса и диалога.',
    rating: 4.6,
    address: 'ул. Интернациональная, 25А, Минск',
    coordinates: [53.90541, 27.56053],
    image_url: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 104,
    name: 'Grand Café',
    category: 'Французская кухня',
    description: 'Классика fine dining с акцентом на французские техники и безупречный сервис. Просторный зал подчеркивает статус и премиальность.',
    rating: 4.9,
    address: 'ул. Ленина, 2, Минск',
    coordinates: [53.89977, 27.56156],
    image_url: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 105,
    name: 'Brioche',
    category: 'Французская пекарня и бранч',
    description: 'Городской формат brunch-all-day с изящной французской выпечкой и specialty coffee. Уютный интерьер с мягким дневным светом.',
    rating: 4.7,
    address: 'пр-т Победителей, 9, Минск',
    coordinates: [53.91423, 27.54052],
    image_url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 106,
    name: 'Bergamo',
    category: 'Итальянская кухня',
    description: 'Итальянский ресторан с акцентом на региональные рецепты и домашнюю пасту. Баланс современного дизайна и теплой семейной атмосферы.',
    rating: 4.8,
    address: 'ул. Зыбицкая, 6, Минск',
    coordinates: [53.90599, 27.55884],
    image_url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 107,
    name: 'Charlie',
    category: 'Авторская европейская кухня',
    description: 'Ресторан с театральной эстетикой и авторским меню от шефа. Подходит для знаковых встреч и вечерних событий.',
    rating: 4.9,
    address: 'пр-т Независимости, 46, Минск',
    coordinates: [53.91674, 27.58482],
    image_url: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 108,
    name: 'Falcone',
    category: 'Итальянская кухня',
    description: 'Флагман итальянского формата с премиальной сервировкой и безупречной винной парой. Интерьер выдержан в стиле современной классики.',
    rating: 4.8,
    address: 'пр-т Победителей, 29, Минск',
    coordinates: [53.9231, 27.52273],
    image_url: 'https://images.unsplash.com/photo-1515669097368-22e68427d265?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 109,
    name: 'Maroon',
    category: 'Стейк-хаус',
    description: 'Премиальный стейк-хаус с акцентом на выдержанное мясо и огненную кухню. Интерьер выполнен в темных, благородных тонах.',
    rating: 4.7,
    address: 'ул. Киселева, 12, Минск',
    coordinates: [53.91112, 27.56768],
    image_url: 'https://images.unsplash.com/photo-1508424757105-b6d5ad9329d0?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 110,
    name: 'Le Cro Cro',
    category: 'Французское бистро',
    description: 'Элегантное бистро с винтажными акцентами, легкой кухней и вниманием к деталям. Идеально для дневного city-ritual.',
    rating: 4.6,
    address: 'ул. Карла Маркса, 21, Минск',
    coordinates: [53.90184, 27.55973],
    image_url: 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 111,
    name: 'The View',
    category: 'Панорамный ресторан',
    description: 'Панорамный ресторан с видом на город и современным европейским меню. Пространство для торжественных ужинов и особых поводов.',
    rating: 4.8,
    address: 'ул. Немига, 5, Минск',
    coordinates: [53.90332, 27.54703],
    image_url: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 112,
    name: 'SeaFoodBar Minsk',
    category: 'Морская кухня',
    description: 'Городской seafood-бар с авторскими сетами и свежими продуктами. Контраст темного дерева и мягкого света формирует премиальную атмосферу.',
    rating: 4.7,
    address: 'ул. Интернациональная, 36, Минск',
    coordinates: [53.90621, 27.56112],
    image_url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1400&q=80',
  },
];

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

  for (const item of curatedMinskRestaurants) {
    await prisma.restaurant.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        description: item.description,
        address: item.address,
        cuisine: item.category,
        avgRating: item.rating,
        latitude: item.coordinates[0],
        longitude: item.coordinates[1],
        imageUrl: item.image_url,
        ownerId: owner.id,
      },
      create: {
        id: item.id,
        name: item.name,
        description: item.description,
        address: item.address,
        cuisine: item.category,
        avgRating: item.rating,
        latitude: item.coordinates[0],
        longitude: item.coordinates[1],
        imageUrl: item.image_url,
        ownerId: owner.id,
      },
    });
  }

  console.log('Seed completed:', { admin: admin.email, owner: owner.email, client: client.email });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
