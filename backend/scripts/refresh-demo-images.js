/**
 * Обновляет URL фото у существующих демо-ресторанов (без очистки БД).
 * Запуск: npm run db:refresh-images
 * Docker: docker compose exec backend npm run db:refresh-images
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const { photo, DEMO_RESTAURANTS } = require('../prisma/demo-data');

const prisma = new PrismaClient();

async function main() {
  let updated = 0;

  for (const data of DEMO_RESTAURANTS) {
    const restaurant = await prisma.restaurant.findFirst({
      where: { name: data.name },
      include: { menuItems: true },
    });
    if (!restaurant) {
      console.log(`  пропуск: «${data.name}» не найден`);
      continue;
    }

    const imageRows = data.images.map((id, sortOrder) => ({
      restaurantId: restaurant.id,
      url: photo(id),
      sortOrder,
    }));

    await prisma.restaurantImage.deleteMany({ where: { restaurantId: restaurant.id } });
    await prisma.restaurantImage.createMany({ data: imageRows });

    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { imageUrl: imageRows[0]?.url ?? null },
    });

    for (const item of data.menu) {
      await prisma.menuItem.updateMany({
        where: { restaurantId: restaurant.id, name: item.name },
        data: { imageUrl: item.image ? photo(item.image, 800) : null },
      });
    }

    updated += 1;
    console.log(`  ✓ ${data.name}`);
  }

  console.log(`\nГотово: обновлено ${updated} ресторанов.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
