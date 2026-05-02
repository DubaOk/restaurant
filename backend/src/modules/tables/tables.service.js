const prisma = require('../../utils/prismaClient');
const ApiError = require('../../utils/apiError');

const assertOwner = async (restaurantId, ownerId) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw ApiError.notFound('Ресторан не найден');
  if (restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав');
};

const SLOT_WINDOW_MS = 2 * 60 * 60 * 1000;

const getByRestaurant = async (restaurantId, slotAtIso = null) => {
  const tables = await prisma.table.findMany({
    where: { restaurantId },
    orderBy: { number: 'asc' },
  });

  let slotKnown = false;
  let occupiedIds = new Set();

  if (slotAtIso) {
    const date = new Date(slotAtIso);
    if (!Number.isNaN(date.getTime())) {
      slotKnown = true;
      const windowStart = new Date(date.getTime() - SLOT_WINDOW_MS);
      const windowEnd = new Date(date.getTime() + SLOT_WINDOW_MS);
      const taken = await prisma.reservation.findMany({
        where: {
          restaurantId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          date: { gte: windowStart, lte: windowEnd },
        },
        select: { tableId: true },
      });
      occupiedIds = new Set(taken.map((r) => r.tableId));
    }
  }

  return tables.map((t) => ({
    ...t,
    occupiedForSlot: slotKnown ? occupiedIds.has(t.id) : null,
    slotKnown,
  }));
};

const pickCreateData = (body) => ({
  restaurantId: parseInt(body.restaurantId, 10),
  number: parseInt(body.number, 10),
  capacity: parseInt(body.capacity, 10),
  isAvailable: body.isAvailable === undefined ? true : Boolean(body.isAvailable),
});

const pickUpdateData = (body) => {
  const data = {};
  if (body.number !== undefined) data.number = parseInt(body.number, 10);
  if (body.capacity !== undefined) data.capacity = parseInt(body.capacity, 10);
  if (body.isAvailable !== undefined) data.isAvailable = Boolean(body.isAvailable);
  return data;
};

const create = async (ownerId, payload) => {
  const data = pickCreateData(payload);
  if (!Number.isFinite(data.restaurantId) || data.restaurantId < 1) {
    throw ApiError.badRequest('Некорректный ресторан');
  }
  if (!Number.isFinite(data.number) || data.number < 1) {
    throw ApiError.badRequest('Номер стола — целое число от 1');
  }
  if (!Number.isFinite(data.capacity) || data.capacity < 1 || data.capacity > 50) {
    throw ApiError.badRequest('Вместимость от 1 до 50');
  }
  await assertOwner(data.restaurantId, ownerId);
  try {
    return await prisma.table.create({ data });
  } catch (err) {
    if (err?.code === 'P2002') {
      throw ApiError.conflict('Стол с таким номером уже есть в этом ресторане');
    }
    throw err;
  }
};

const update = async (id, ownerId, body) => {
  const table = await prisma.table.findUnique({ where: { id }, include: { restaurant: true } });
  if (!table) throw ApiError.notFound('Столик не найден');
  if (table.restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав');
  const data = pickUpdateData(body);
  if (Object.keys(data).length === 0) {
    throw ApiError.badRequest('Нет полей для обновления');
  }
  if (data.number !== undefined && (!Number.isFinite(data.number) || data.number < 1)) {
    throw ApiError.badRequest('Некорректный номер стола');
  }
  if (
    data.capacity !== undefined &&
    (!Number.isFinite(data.capacity) || data.capacity < 1 || data.capacity > 50)
  ) {
    throw ApiError.badRequest('Вместимость от 1 до 50');
  }
  try {
    return await prisma.table.update({ where: { id }, data });
  } catch (err) {
    if (err?.code === 'P2002') {
      throw ApiError.conflict('Стол с таким номером уже есть в этом ресторане');
    }
    throw err;
  }
};

const remove = async (id, ownerId) => {
  const table = await prisma.table.findUnique({ where: { id }, include: { restaurant: true } });
  if (!table) throw ApiError.notFound('Столик не найден');
  if (table.restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав');
  return prisma.table.delete({ where: { id } });
};

module.exports = { getByRestaurant, create, update, remove };
