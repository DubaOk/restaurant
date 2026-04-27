const prisma = require('../../utils/prismaClient');
const ApiError = require('../../utils/apiError');

const getMyFavorites = async (userId) =>
  prisma.favorite.findMany({
    where: { userId },
    include: {
      restaurant: {
        select: {
          id: true, name: true, cuisine: true, address: true, avgRating: true, imageUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

const add = async (userId, restaurantId) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw ApiError.notFound('Ресторан не найден');

  const existing = await prisma.favorite.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
  });
  if (existing) throw ApiError.conflict('Ресторан уже в избранном');

  return prisma.favorite.create({ data: { userId, restaurantId } });
};

const remove = async (userId, restaurantId) => {
  const favorite = await prisma.favorite.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
  });
  if (!favorite) throw ApiError.notFound('Ресторан не найден в избранном');

  return prisma.favorite.delete({
    where: { userId_restaurantId: { userId, restaurantId } },
  });
};

module.exports = { getMyFavorites, add, remove };
