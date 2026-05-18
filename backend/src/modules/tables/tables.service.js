const prisma = require('../../utils/prismaClient');
const ApiError = require('../../utils/apiError');

const assertOwner = async (restaurantId, ownerId) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw ApiError.notFound('Ресторан не найден');
  if (restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав');
};

const SLOT_WINDOW_MS = 2 * 60 * 60 * 1000;
/** Максимальная номинальная / макс. вместимость одного стола */
const TABLE_CAP_MAX = 10;

const getByRestaurant = async (restaurantId, slotAtIso = null, excludeReservationId = null) => {
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
      const excludeId = excludeReservationId
        ? parseInt(excludeReservationId, 10)
        : null;
      const taken = await prisma.reservation.findMany({
        where: {
          restaurantId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          date: { gte: windowStart, lte: windowEnd },
          ...(Number.isFinite(excludeId) ? { id: { not: excludeId } } : {}),
        },
        select: {
          tableId: true,
          combinedWithTableId: true,
          combinedWithTableIds: true,
        },
      });
      occupiedIds = new Set();
      for (const r of taken) {
        if (Number.isFinite(r.tableId)) occupiedIds.add(r.tableId);
        if (r.combinedWithTableId && Number.isFinite(r.combinedWithTableId)) {
          occupiedIds.add(r.combinedWithTableId);
        }
        const extra = Array.isArray(r.combinedWithTableIds)
          ? r.combinedWithTableIds
          : [];
        for (const id of extra) {
          const n = Number(id);
          if (Number.isFinite(n)) occupiedIds.add(n);
        }
      }
    }
  }

  const mapped = tables.map((t) => ({
    ...t,
    adjacentTableIds: (Array.isArray(t.adjacentTableIds) ? t.adjacentTableIds : [])
      .map(Number)
      .filter(Number.isFinite),
    occupiedForSlot: slotKnown ? occupiedIds.has(t.id) : null,
    slotKnown,
  }));

  // Build suggested adjacent pairs for availability context
  if (slotKnown) {
    const byId = Object.fromEntries(mapped.map((t) => [t.id, t]));
    const pairSet = new Set();
    const adjacentPairs = [];
    for (const t of mapped) {
      for (const adjId of t.adjacentTableIds) {
        const adj = byId[Number(adjId)];
        if (!adj) continue;
        if (!t.occupiedForSlot && !adj.occupiedForSlot) {
          const key = [Math.min(t.id, adj.id), Math.max(t.id, adj.id)].join('-');
          if (!pairSet.has(key)) {
            pairSet.add(key);
            const combinedCap = t.capacity + adj.capacity;
            const combinedMax = (t.maxCapacity || t.capacity) + (adj.maxCapacity || adj.capacity);
            adjacentPairs.push({ tableIds: [t.id, adj.id], combinedCapacity: combinedCap, combinedMax });
          }
        }
      }
    }
    return { tables: mapped, adjacentPairs };
  }

  return { tables: mapped, adjacentPairs: [] };
};

const parseAdjacent = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(Number).filter(Number.isFinite);
  try { return (JSON.parse(val)).map(Number).filter(Number.isFinite); } catch { return []; }
};

const pickCreateData = (body) => {
  const data = {
    restaurantId: parseInt(body.restaurantId, 10),
    number: parseInt(body.number, 10),
    capacity: parseInt(body.capacity, 10),
    isAvailable: body.isAvailable === undefined ? true : Boolean(body.isAvailable),
    adjacentTableIds: parseAdjacent(body.adjacentTableIds),
  };
  if (body.posX != null) data.posX = parseFloat(body.posX);
  if (body.posY != null) data.posY = parseFloat(body.posY);
  if (body.maxCapacity != null) {
    const mc = parseInt(body.maxCapacity, 10);
    if (Number.isFinite(mc) && mc >= data.capacity && mc <= TABLE_CAP_MAX) data.maxCapacity = mc;
  }
  return data;
};

const pickUpdateData = (body) => {
  const data = {};
  if (body.number !== undefined) data.number = parseInt(body.number, 10);
  if (body.capacity !== undefined) data.capacity = parseInt(body.capacity, 10);
  if (body.isAvailable !== undefined) data.isAvailable = Boolean(body.isAvailable);
  if (body.posX !== undefined) data.posX = body.posX != null ? parseFloat(body.posX) : null;
  if (body.posY !== undefined) data.posY = body.posY != null ? parseFloat(body.posY) : null;
  if (body.adjacentTableIds !== undefined) data.adjacentTableIds = parseAdjacent(body.adjacentTableIds);
  if (body.maxCapacity !== undefined) {
    data.maxCapacity = body.maxCapacity != null ? parseInt(body.maxCapacity, 10) : null;
  }
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
  if (!Number.isFinite(data.capacity) || data.capacity < 1 || data.capacity > TABLE_CAP_MAX) {
    throw ApiError.badRequest(`Вместимость от 1 до ${TABLE_CAP_MAX}`);
  }
  if (data.maxCapacity != null && (!Number.isFinite(data.maxCapacity) || data.maxCapacity < data.capacity || data.maxCapacity > TABLE_CAP_MAX)) {
    throw ApiError.badRequest(`Макс. вместимость от ${data.capacity} до ${TABLE_CAP_MAX}`);
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
    (!Number.isFinite(data.capacity) || data.capacity < 1 || data.capacity > TABLE_CAP_MAX)
  ) {
    throw ApiError.badRequest(`Вместимость от 1 до ${TABLE_CAP_MAX}`);
  }
  const nextCap = data.capacity !== undefined ? data.capacity : table.capacity;
  if (data.maxCapacity !== undefined && data.maxCapacity != null) {
    if (!Number.isFinite(data.maxCapacity) || data.maxCapacity < nextCap || data.maxCapacity > TABLE_CAP_MAX) {
      throw ApiError.badRequest(`Макс. вместимость от ${nextCap} до ${TABLE_CAP_MAX}`);
    }
  }
  if (data.capacity !== undefined && table.maxCapacity != null && data.maxCapacity === undefined) {
    if (data.capacity > table.maxCapacity) {
      throw ApiError.badRequest(`Сначала уменьшите макс. вместимость или укажите её не ниже ${data.capacity}`);
    }
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
