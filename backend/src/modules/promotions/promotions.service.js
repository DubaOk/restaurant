const prisma = require('../../utils/prismaClient');
const ApiError = require('../../utils/apiError');

const assertOwner = async (restaurantId, ownerId) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw ApiError.notFound('Ресторан не найден');
  if (restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав');
};

const validateDates = (startDate, endDate) => {
  if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
    throw ApiError.badRequest('Дата окончания не может быть раньше даты начала');
  }
};

const getByRestaurant = async (restaurantId, { onlyActive = false } = {}) => {
  const where = { restaurantId };
  if (onlyActive) {
    const now = new Date();
    where.OR = [{ endDate: null }, { endDate: { gte: now } }];
  }
  return prisma.promotion.findMany({ where, orderBy: { createdAt: 'desc' } });
};

const create = async (ownerId, data) => {
  await assertOwner(data.restaurantId, ownerId);
  validateDates(data.startDate, data.endDate);
  return prisma.promotion.create({ data });
};

const update = async (id, ownerId, data) => {
  const promo = await prisma.promotion.findUnique({ where: { id }, include: { restaurant: true } });
  if (!promo) throw ApiError.notFound('Акция не найдена');
  if (promo.restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав');
  const effectiveStart = data.startDate !== undefined ? data.startDate : promo.startDate;
  const effectiveEnd = data.endDate !== undefined ? data.endDate : promo.endDate;
  validateDates(effectiveStart, effectiveEnd);
  return prisma.promotion.update({ where: { id }, data });
};

const remove = async (id, ownerId) => {
  const promo = await prisma.promotion.findUnique({ where: { id }, include: { restaurant: true } });
  if (!promo) throw ApiError.notFound('Акция не найдена');
  if (promo.restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав');
  return prisma.promotion.delete({ where: { id } });
};

module.exports = { getByRestaurant, create, update, remove };
