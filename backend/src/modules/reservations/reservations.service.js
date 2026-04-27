const prisma = require('../../utils/prismaClient');
const ApiError = require('../../utils/apiError');
const bonusesService = require('../bonuses/bonuses.service');

const RESERVATION_INCLUDE = {
  restaurant: { select: { id: true, name: true, address: true } },
  table: { select: { id: true, number: true, capacity: true } },
  user: { select: { id: true, name: true, email: true } },
};

const getMyReservations = async (userId) =>
  prisma.reservation.findMany({
    where: { userId },
    include: RESERVATION_INCLUDE,
    orderBy: { date: 'desc' },
  });

const getRestaurantReservations = async (restaurantId, ownerId) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw ApiError.notFound('Ресторан не найден');
  if (restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав');

  return prisma.reservation.findMany({
    where: { restaurantId },
    include: RESERVATION_INCLUDE,
    orderBy: { date: 'desc' },
  });
};

const create = async (userId, { restaurantId, tableId, date, guestsCount, comment }) => {
  const table = await prisma.table.findFirst({
    where: { id: tableId, restaurantId },
  });
  if (!table) throw ApiError.notFound('Столик не найден в этом ресторане');
  if (table.capacity < guestsCount)
    throw ApiError.badRequest(`Столик рассчитан максимум на ${table.capacity} гостей`);

  const conflict = await prisma.reservation.findFirst({
    where: {
      tableId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      date: {
        gte: new Date(new Date(date).getTime() - 2 * 60 * 60 * 1000),
        lte: new Date(new Date(date).getTime() + 2 * 60 * 60 * 1000),
      },
    },
  });
  if (conflict) throw ApiError.conflict('Столик уже занят на выбранное время');

  return prisma.reservation.create({
    data: { userId, restaurantId, tableId, date: new Date(date), guestsCount, comment },
    include: RESERVATION_INCLUDE,
  });
};

const cancel = async (id, userId, role) => {
  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) throw ApiError.notFound('Бронирование не найдено');

  if (role === 'CLIENT' && reservation.userId !== userId)
    throw ApiError.forbidden('Нет прав');

  if (role === 'OWNER') {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: reservation.restaurantId },
    });
    if (restaurant.ownerId !== userId) throw ApiError.forbidden('Нет прав');
  }

  if (!['PENDING', 'CONFIRMED'].includes(reservation.status))
    throw ApiError.badRequest('Нельзя отменить это бронирование');

  return prisma.reservation.update({
    where: { id },
    data: { status: 'CANCELLED' },
    include: RESERVATION_INCLUDE,
  });
};

const confirm = async (id, ownerId) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { restaurant: true },
  });
  if (!reservation) throw ApiError.notFound('Бронирование не найдено');
  if (reservation.restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав');
  if (reservation.status !== 'PENDING') throw ApiError.badRequest('Бронирование уже обработано');

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status: 'CONFIRMED' },
    include: RESERVATION_INCLUDE,
  });

  await bonusesService.earn(
    reservation.userId,
    50,
    `Бонусы за бронирование в "${reservation.restaurant.name}"`
  );

  return updated;
};

module.exports = { getMyReservations, getRestaurantReservations, create, cancel, confirm };
