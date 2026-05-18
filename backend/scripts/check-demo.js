const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const restaurants = await prisma.restaurant.count();
  const images = await prisma.restaurantImage.count();
  const menu = await prisma.menuItem.count();
  const list = await prisma.restaurant.findMany({
    select: { id: true, name: true, cuisine: true, _count: { select: { images: true, menuItems: true } } },
    orderBy: { id: 'asc' },
  });
  console.log(JSON.stringify({ restaurants, images, menu, list }, null, 2));
}

main()
  .finally(() => prisma.$disconnect());
