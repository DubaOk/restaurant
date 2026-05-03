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

const DEPOSIT_PER_GUEST = 25;

const calcDeposit = (guestsCount) => Math.max(DEPOSIT_PER_GUEST, guestsCount * DEPOSIT_PER_GUEST);

const create = async (userId, { restaurantId, tableId, date, guestsCount, comment, bonusesToSpend }) => {
  const table = await prisma.table.findFirst({
    where: { id: tableId, restaurantId },
    include: { restaurant: { select: { name: true } } },
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

  const depositAmount = calcDeposit(guestsCount);
  let bonusesUsed = 0;

  if (bonusesToSpend && bonusesToSpend > 0) {
    const { balance } = await bonusesService.getBalance(userId);
    bonusesUsed = Math.min(Math.floor(bonusesToSpend), balance, depositAmount);
    if (bonusesUsed > 0) {
      await bonusesService.spend(
        userId,
        bonusesUsed,
        `Оплата части депозита в "${table.restaurant.name}" бонусами`
      );
    }
  }

  const reservation = await prisma.reservation.create({
    data: { userId, restaurantId, tableId, date: new Date(date), guestsCount, comment, bonusesUsed },
    include: RESERVATION_INCLUDE,
  });

  return { ...reservation, depositAmount, bonusesUsed, finalDeposit: depositAmount - bonusesUsed };
};

const update = async (id, userId, { date, guestsCount, tableId }) => {
  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) throw ApiError.notFound('Бронирование не найдено');
  if (reservation.userId !== userId) throw ApiError.forbidden('Нет прав');
  if (reservation.status !== 'PENDING') throw ApiError.badRequest('Изменять можно только ожидающие бронирования');

  const checkTableId = tableId || reservation.tableId;
  const checkDate = date ? new Date(date) : reservation.date;

  if (tableId && tableId !== reservation.tableId) {
    const table = await prisma.table.findFirst({
      where: { id: tableId, restaurantId: reservation.restaurantId },
    });
    if (!table) throw ApiError.notFound('Столик не найден');
    const effectiveGuests = guestsCount || reservation.guestsCount;
    if (table.capacity < effectiveGuests)
      throw ApiError.badRequest(`Столик рассчитан максимум на ${table.capacity} гостей`);
  }

  const conflict = await prisma.reservation.findFirst({
    where: {
      tableId: checkTableId,
      id: { not: id },
      status: { in: ['PENDING', 'CONFIRMED'] },
      date: {
        gte: new Date(checkDate.getTime() - 2 * 60 * 60 * 1000),
        lte: new Date(checkDate.getTime() + 2 * 60 * 60 * 1000),
      },
    },
  });
  if (conflict) throw ApiError.conflict('Столик уже занят на выбранное время');

  return prisma.reservation.update({
    where: { id },
    data: {
      ...(date && { date: new Date(date) }),
      ...(guestsCount && { guestsCount }),
      ...(tableId && { tableId }),
    },
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

  const cancelled = await prisma.reservation.update({
    where: { id },
    data: { status: 'CANCELLED' },
    include: { ...RESERVATION_INCLUDE, restaurant: { select: { id: true, name: true, address: true } } },
  });

  if (reservation.bonusesUsed > 0) {
    await bonusesService.earn(
      reservation.userId,
      reservation.bonusesUsed,
      `Возврат бонусов за отмену бронирования в "${cancelled.restaurant?.name}"`
    );
  }

  return cancelled;
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

  const depositAmount = calcDeposit(reservation.guestsCount);
  const bonusEarned = Math.max(1, Math.round(depositAmount * 0.1));
  await bonusesService.earn(
    reservation.userId,
    bonusEarned,
    `Бонусы за посещение "${reservation.restaurant.name}" (10% от депозита ${depositAmount} р.)`
  );

  return updated;
};

const complete = async (id, ownerId) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { restaurant: true },
  });
  if (!reservation) throw ApiError.notFound('Бронирование не найдено');
  if (reservation.restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав');
  if (reservation.status !== 'CONFIRMED')
    throw ApiError.badRequest('Подтвердить посещение можно только для подтверждённых броней');

  return prisma.reservation.update({
    where: { id },
    data: { status: 'COMPLETED' },
    include: RESERVATION_INCLUDE,
  });
};

module.exports = { getMyReservations, getRestaurantReservations, create, update, cancel, confirm, complete };
