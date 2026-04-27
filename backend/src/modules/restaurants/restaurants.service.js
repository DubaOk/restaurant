const prisma = require('../../utils/prismaClient');
const ApiError = require('../../utils/apiError');

const ALLOWED_SORT = ['name', 'avgRating', 'createdAt'];
const ALLOWED_ORDER = ['asc', 'desc'];

const getAll = async ({ search, cuisine, minRating, sortBy = 'name', sortOrder = 'asc', ownerId } = {}) => {
  const orderField = ALLOWED_SORT.includes(sortBy) ? sortBy : 'name';
  const orderDir = ALLOWED_ORDER.includes(sortOrder) ? sortOrder : 'asc';

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (cuisine) where.cuisine = { equals: cuisine, mode: 'insensitive' };
  if (minRating) where.avgRating = { gte: parseFloat(minRating) };
  if (ownerId) where.ownerId = parseInt(ownerId);

  return prisma.restaurant.findMany({
    where,
    orderBy: { [orderField]: orderDir },
    include: {
      owner: { select: { id: true, name: true } },
      _count: { select: { reviews: true, tables: true } },
    },
  });
};

const getById = async (id) => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true } },
      tables: { orderBy: { number: 'asc' } },
      menuItems: { orderBy: { category: 'asc' } },
      _count: { select: { reviews: true, reservations: true } },
    },
  });
  if (!restaurant) throw ApiError.notFound('Ресторан не найден');
  return restaurant;
};

const create = async (ownerId, data) => {
  return prisma.restaurant.create({
    data: { ...data, ownerId },
  });
};

const update = async (id, ownerId, data) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) throw ApiError.notFound('Ресторан не найден');
  if (restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав на редактирование');

  return prisma.restaurant.update({ where: { id }, data });
};

const remove = async (id, ownerId) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) throw ApiError.notFound('Ресторан не найден');
  if (restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав на удаление');

  return prisma.restaurant.delete({ where: { id } });
};

const recalcAvgRating = async (restaurantId) => {
  const result = await prisma.review.aggregate({
    where: { restaurantId },
    _avg: { rating: true },
  });
  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { avgRating: result._avg.rating },
  });
};

module.exports = { getAll, getById, create, update, remove, recalcAvgRating };
