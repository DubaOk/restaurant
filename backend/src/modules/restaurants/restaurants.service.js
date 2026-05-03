const prisma = require('../../utils/prismaClient');
const ApiError = require('../../utils/apiError');
const { geocodeAddress } = require('../../services/geocoding.service');

const ALLOWED_SORT = ['name', 'avgRating', 'createdAt'];
const ALLOWED_ORDER = ['asc', 'desc'];
const isMissingImagesTableError = (error) =>
  error?.code === 'P2021' &&
  (String(error?.meta?.table || '').includes('restaurant_images') ||
    String(error?.message || '').includes('restaurant_images'));

const toNumberOrNull = (value) => {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseImageList = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return value.filter(Boolean);

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : null;
  } catch {
    return null;
  }
};

const normalizeRestaurant = (restaurant) => {
  const images = (restaurant.images || []).map((img) => ({
    id: img.id,
    url: img.url,
    sortOrder: img.sortOrder,
  }));

  const legacyFallback = restaurant.imageUrl ? [{ id: -1, url: restaurant.imageUrl, sortOrder: 0 }] : [];
  const normalizedImages = images.length > 0 ? images : legacyFallback;

  return {
    ...restaurant,
    images: normalizedImages,
    coverImage: normalizedImages[0]?.url || null,
    imageUrl: normalizedImages[0]?.url || null,
  };
};

const includeRestaurantRelations = {
  owner: { select: { id: true, name: true } },
  images: { orderBy: { sortOrder: 'asc' } },
};

const includeRestaurantRelationsFallback = {
  owner: { select: { id: true, name: true } },
};

const getAll = async ({
  search,
  cuisine,
  city,
  minRating,
  sortBy = 'name',
  sortOrder = 'asc',
  ownerId,
} = {}) => {
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
  if (city && String(city).trim()) {
    where.city = { equals: String(city).trim(), mode: 'insensitive' };
  }
  if (minRating) where.avgRating = { gte: parseFloat(minRating) };
  if (ownerId) where.ownerId = parseInt(ownerId);

  let restaurants;
  try {
    restaurants = await prisma.restaurant.findMany({
      where,
      orderBy: { [orderField]: orderDir },
      include: {
        ...includeRestaurantRelations,
        _count: { select: { reviews: true, tables: true } },
      },
    });
  } catch (error) {
    if (!isMissingImagesTableError(error)) throw error;
    restaurants = await prisma.restaurant.findMany({
      where,
      orderBy: { [orderField]: orderDir },
      include: {
        ...includeRestaurantRelationsFallback,
        _count: { select: { reviews: true, tables: true } },
      },
    });
  }

  return restaurants.map(normalizeRestaurant);
};

const getById = async (id) => {
  let restaurant;
  try {
    restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        ...includeRestaurantRelations,
        tables: { orderBy: { number: 'asc' } },
        menuItems: { orderBy: { category: 'asc' } },
        _count: { select: { reviews: true, reservations: true } },
      },
    });
  } catch (error) {
    if (!isMissingImagesTableError(error)) throw error;
    restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        ...includeRestaurantRelationsFallback,
        tables: { orderBy: { number: 'asc' } },
        menuItems: { orderBy: { category: 'asc' } },
        _count: { select: { reviews: true, reservations: true } },
      },
    });
  }
  if (!restaurant) throw ApiError.notFound('Ресторан не найден');
  return normalizeRestaurant(restaurant);
};

const resolveCoordinates = async (payload) => {
  const manualLatitude = toNumberOrNull(payload.latitude);
  const manualLongitude = toNumberOrNull(payload.longitude);
  if (manualLatitude != null && manualLongitude != null) {
    return { latitude: manualLatitude, longitude: manualLongitude };
  }

  const geocoded = await geocodeAddress(payload.address);
  if (!geocoded) {
    throw ApiError.badRequest(
      'Не удалось определить координаты по адресу. Выберите точку на карте вручную.'
    );
  }
  return geocoded;
};

const buildImageOperations = (data, uploadedImageUrls, currentRestaurant) => {
  const existingImages = parseImageList(data.existingImages);
  const hasNewUploads = uploadedImageUrls.length > 0;

  if (existingImages === null && !hasNewUploads) {
    return null;
  }

  const mergedImages = [...(existingImages || []), ...uploadedImageUrls];
  return {
    deleteMany: {},
    create: mergedImages.map((url, index) => ({
      url,
      sortOrder: index,
    })),
    imageUrl: mergedImages[0] || null,
  };
};

const create = async (ownerId, data, uploadedImageUrls = []) => {
  const coords = await resolveCoordinates(data);
  const imageOps = buildImageOperations(data, uploadedImageUrls, null);

  const cityValue =
    data.city != null && String(data.city).trim() ? String(data.city).trim() : 'Минск';

  const created = await prisma.restaurant.create({
    data: {
      name: data.name,
      description: data.description || null,
      city: cityValue,
      address: data.address,
      cuisine: data.cuisine,
      phone: data.phone || null,
      openTime: data.openTime || null,
      closeTime: data.closeTime || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      ownerId,
      imageUrl: imageOps?.imageUrl || null,
      images: imageOps
        ? {
            create: imageOps.create,
          }
        : undefined,
    },
    include: includeRestaurantRelations,
  });

  return normalizeRestaurant(created);
};

const update = async (id, ownerId, data, uploadedImageUrls = []) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) throw ApiError.notFound('Ресторан не найден');
  if (restaurant.ownerId !== ownerId) throw ApiError.forbidden('Нет прав на редактирование');

  const addressChanged = data.address && data.address !== restaurant.address;
  let coords = {};
  if (addressChanged || (data.latitude != null && data.longitude != null)) {
    coords = await resolveCoordinates({
      address: data.address || restaurant.address,
      latitude: data.latitude,
      longitude: data.longitude,
    });
  }

  const imageOps = buildImageOperations(data, uploadedImageUrls, restaurant);

  const updated = await prisma.restaurant.update({
    where: { id },
    data: {
      name: data.name ?? restaurant.name,
      description: data.description ?? restaurant.description,
      city:
        data.city != null && String(data.city).trim()
          ? String(data.city).trim()
          : restaurant.city,
      address: data.address ?? restaurant.address,
      cuisine: data.cuisine ?? restaurant.cuisine,
      phone: data.phone ?? restaurant.phone,
      openTime: data.openTime ?? restaurant.openTime,
      closeTime: data.closeTime ?? restaurant.closeTime,
      latitude: coords.latitude ?? restaurant.latitude,
      longitude: coords.longitude ?? restaurant.longitude,
      imageUrl: imageOps?.imageUrl ?? restaurant.imageUrl,
      images: imageOps
        ? {
            deleteMany: imageOps.deleteMany,
            create: imageOps.create,
          }
        : undefined,
    },
    include: includeRestaurantRelations,
  });

  return normalizeRestaurant(updated);
};

const remove = async (id, ownerId, ownerRole) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) throw ApiError.notFound('Ресторан не найден');
  if (restaurant.ownerId !== ownerId && ownerRole !== 'ADMIN') {
    throw ApiError.forbidden('Нет прав на удаление');
  }

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
