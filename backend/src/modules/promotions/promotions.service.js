const prisma = require('../../utils/prismaClient');
const ApiError = require('../../utils/apiError');

const assertOwner = async (restaurantId, ownerId) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw ApiError.notFound('Ресторан не найден');
  if (restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав');
};

const getByRestaurant = async (restaurantId) =>
  prisma.promotion.findMany({
    where: { restaurantId },
    orderBy: { createdAt: 'desc' },
  });

const create = async (ownerId, data) => {
  await assertOwner(data.restaurantId, ownerId);
  return prisma.promotion.create({ data });
};

const update = async (id, ownerId, data) => {
  const promo = await prisma.promotion.findUnique({ where: { id }, include: { restaurant: true } });
  if (!promo) throw ApiError.notFound('Акция не найдена');
  if (promo.restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав');
  return prisma.promotion.update({ where: { id }, data });
};

const remove = async (id, ownerId) => {
  const promo = await prisma.promotion.findUnique({ where: { id }, include: { restaurant: true } });
  if (!promo) throw ApiError.notFound('Акция не найдена');
  if (promo.restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав');
  return prisma.promotion.delete({ where: { id } });
};

module.exports = { getByRestaurant, create, update, remove };
