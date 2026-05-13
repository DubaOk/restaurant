const prisma = require('../../utils/prismaClient');
const ApiError = require('../../utils/apiError');
const bonusesService = require('../bonuses/bonuses.service');

const RESERVATION_INCLUDE = {
  restaurant: { select: { id: true, name: true, address: true } },
  table: { select: { id: true, number: true, capacity: true, maxCapacity: true } },
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

const normalizeTableIds = (tableId, combinedWithTableId, combinedWithTableIds) => {
  const ids = [tableId];
  if (combinedWithTableId) ids.push(combinedWithTableId);
  if (Array.isArray(combinedWithTableIds)) ids.push(...combinedWithTableIds);
  return [...new Set(ids.map(Number).filter(Number.isFinite))];
};

const getBusyTableIds = (reservation) => {
  const ids = [reservation.tableId];
  if (reservation.combinedWithTableId) ids.push(reservation.combinedWithTableId);
  if (Array.isArray(reservation.combinedWithTableIds)) ids.push(...reservation.combinedWithTableIds);
  return [...new Set(ids.map(Number).filter(Number.isFinite))];
};

const checkSlotConflict = async (restaurantId, requestedTableIds, date, excludeId = null) => {
  const windowStart = new Date(new Date(date).getTime() - 2 * 60 * 60 * 1000);
  const windowEnd = new Date(new Date(date).getTime() + 2 * 60 * 60 * 1000);
  const reservations = await prisma.reservation.findMany({
    where: {
      restaurantId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      id: excludeId ? { not: excludeId } : undefined,
      date: { gte: windowStart, lte: windowEnd },
    },
    select: {
      id: true,
      tableId: true,
      combinedWithTableId: true,
      combinedWithTableIds: true,
    },
  });
  const requested = new Set(requestedTableIds);
  return reservations.find((r) => getBusyTableIds(r).some((id) => requested.has(id))) || null;
};

const create = async (
  userId,
  { restaurantId, tableId, combinedWithTableId, combinedWithTableIds, date, guestsCount, comment, bonusesToSpend }
) => {
  const requestedTableIds = normalizeTableIds(tableId, combinedWithTableId, combinedWithTableIds);
  if (requestedTableIds.length === 0) throw ApiError.badRequest('Не выбраны столики');

  const tables = await prisma.table.findMany({
    where: { id: { in: requestedTableIds }, restaurantId },
    include: { restaurant: { select: { name: true } } },
  });
  if (tables.length !== requestedTableIds.length) {
    throw ApiError.notFound('Один или несколько столиков не найдены в этом ресторане');
  }
  const mainTable = tables.find((t) => t.id === tableId) || tables[0];

  const joinsCount = Math.max(0, requestedTableIds.length - 1);
  const combinedCap = tables.reduce((sum, t) => sum + t.capacity, 0) - (joinsCount * 2);
  const combinedMax = tables.reduce((sum, t) => sum + (t.maxCapacity || t.capacity), 0) - (joinsCount * 2);
  if (guestsCount > combinedMax) {
    const label = requestedTableIds.length > 1 ? 'Объединённый стол' : 'Столик';
    throw ApiError.badRequest(`${label} рассчитан максимум на ${combinedMax} гостей`);
  }

  const conflict = await checkSlotConflict(restaurantId, requestedTableIds, date);
  if (conflict) throw ApiError.conflict('Один из столиков уже занят на выбранное время');

  const extraChair = guestsCount > combinedCap;
  const depositAmount = calcDeposit(guestsCount);
  let bonusesUsed = 0;

  if (bonusesToSpend && bonusesToSpend > 0) {
    const { balance } = await bonusesService.getBalance(userId);
    bonusesUsed = Math.min(Math.floor(bonusesToSpend), balance, depositAmount);
    if (bonusesUsed > 0) {
      await bonusesService.spend(userId, bonusesUsed, `Оплата части депозита в "${mainTable.restaurant.name}" бонусами`);
    }
  }

  const extraIds = requestedTableIds.filter((id) => id !== mainTable.id);
  const reservation = await prisma.reservation.create({
    data: {
      userId,
      restaurantId,
      tableId: mainTable.id,
      combinedWithTableId: extraIds[0] || null,
      combinedWithTableIds: extraIds,
      date: new Date(date),
      guestsCount,
      comment,
      bonusesUsed,
      extraChair,
    },
    include: RESERVATION_INCLUDE,
  });

  return {
    ...reservation,
    depositAmount,
    bonusesUsed,
    finalDeposit: depositAmount - bonusesUsed,
    extraChair,
    combinedWithTableIds: extraIds,
  };
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

  const conflict = await checkSlotConflict(reservation.restaurantId, [checkTableId], checkDate, id);
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
