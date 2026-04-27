const prisma = require('../../utils/prismaClient');
const ApiError = require('../../utils/apiError');

const assertOwner = async (restaurantId, ownerId) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw ApiError.notFound('Ресторан не найден');
  if (restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав');
};

const getByRestaurant = async (restaurantId) =>
  prisma.menuItem.findMany({
    where: { restaurantId },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

const create = async (ownerId, data) => {
  await assertOwner(data.restaurantId, ownerId);
  return prisma.menuItem.create({ data });
};

const update = async (id, ownerId, data) => {
  const item = await prisma.menuItem.findUnique({ where: { id }, include: { restaurant: true } });
  if (!item) throw ApiError.notFound('Позиция меню не найдена');
  if (item.restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав');
  return prisma.menuItem.update({ where: { id }, data });
};

const remove = async (id, ownerId) => {
  const item = await prisma.menuItem.findUnique({ where: { id }, include: { restaurant: true } });
  if (!item) throw ApiError.notFound('Позиция меню не найдена');
  if (item.restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав');
  return prisma.menuItem.delete({ where: { id } });
};

module.exports = { getByRestaurant, create, update, remove };
