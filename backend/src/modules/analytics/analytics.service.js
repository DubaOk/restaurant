const prisma = require('../../utils/prismaClient');
const ApiError = require('../../utils/apiError');

const getRestaurantStats = async (restaurantId, ownerId) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw ApiError.notFound('Ресторан не найден');
  if (restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав');

  const [
    totalReservations,
    confirmedReservations,
    cancelledReservations,
    totalReviews,
    ratingAgg,
    reservationsByStatus,
    recentReservations,
  ] = await Promise.all([
    prisma.reservation.count({ where: { restaurantId } }),
    prisma.reservation.count({ where: { restaurantId, status: 'CONFIRMED' } }),
    prisma.reservation.count({ where: { restaurantId, status: 'CANCELLED' } }),
    prisma.review.count({ where: { restaurantId } }),
    prisma.review.aggregate({ where: { restaurantId }, _avg: { rating: true } }),
    prisma.reservation.groupBy({
      by: ['status'],
      where: { restaurantId },
      _count: { status: true },
    }),
    prisma.reservation.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { name: true } }, table: { select: { number: true } } },
    }),
  ]);

  return {
    totalReservations,
    confirmedReservations,
    cancelledReservations,
    totalReviews,
    avgRating: ratingAgg._avg.rating,
    reservationsByStatus,
    recentReservations,
  };
};

module.exports = { getRestaurantStats };
