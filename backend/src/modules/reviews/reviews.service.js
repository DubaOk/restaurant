const prisma = require('../../utils/prismaClient');
const ApiError = require('../../utils/apiError');
const { recalcAvgRating } = require('../restaurants/restaurants.service');

const REVIEW_INCLUDE = {
  user: { select: { id: true, name: true } },
};

const getByRestaurant = async (restaurantId) =>
  prisma.review.findMany({
    where: { restaurantId },
    include: REVIEW_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });

const create = async (userId, { restaurantId, rating, comment }) => {
  if (rating < 1 || rating > 5) throw ApiError.badRequest('Оценка должна быть от 1 до 5');

  const existing = await prisma.review.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
  });
  if (existing) throw ApiError.conflict('Вы уже оставили отзыв на этот ресторан');

  const review = await prisma.review.create({
    data: { userId, restaurantId, rating, comment },
    include: REVIEW_INCLUDE,
  });

  await recalcAvgRating(restaurantId);
  return review;
};

const update = async (id, userId, { rating, comment }) => {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw ApiError.notFound('Отзыв не найден');
  if (review.userId !== userId) throw ApiError.forbidden('Нет прав');

  const updated = await prisma.review.update({
    where: { id },
    data: { rating, comment },
    include: REVIEW_INCLUDE,
  });

  await recalcAvgRating(review.restaurantId);
  return updated;
};

const remove = async (id, userId, role) => {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw ApiError.notFound('Отзыв не найден');

  if (role !== 'ADMIN' && review.userId !== userId) throw ApiError.forbidden('Нет прав');

  await prisma.review.delete({ where: { id } });
  await recalcAvgRating(review.restaurantId);
};

module.exports = { getByRestaurant, create, update, remove };
