const prisma = require('../../utils/prismaClient');
const ApiError = require('../../utils/apiError');

const assertOwner = async (restaurantId, ownerId) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw ApiError.notFound('Ресторан не найден');
  if (restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав');
};

const getByRestaurant = async (restaurantId) =>
  prisma.table.findMany({
    where: { restaurantId },
    orderBy: { number: 'asc' },
  });

const create = async (ownerId, data) => {
  await assertOwner(data.restaurantId, ownerId);
  return prisma.table.create({ data });
};

const update = async (id, ownerId, data) => {
  const table = await prisma.table.findUnique({ where: { id }, include: { restaurant: true } });
  if (!table) throw ApiError.notFound('Столик не найден');
  if (table.restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав');
  return prisma.table.update({ where: { id }, data });
};

const remove = async (id, ownerId) => {
  const table = await prisma.table.findUnique({ where: { id }, include: { restaurant: true } });
  if (!table) throw ApiError.notFound('Столик не найден');
  if (table.restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав');
  return prisma.table.delete({ where: { id } });
};

module.exports = { getByRestaurant, create, update, remove };
