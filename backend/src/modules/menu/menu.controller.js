const menuService = require('./menu.service');

const mapFileToUrl = (file) => (file ? `/uploads/menu/${file.filename}` : undefined);
const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};
const parseFloatSafe = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const normalizeCreateUpdatePayload = (payload = {}) => {
  const price = parseFloatSafe(payload.price);
  const restaurantId = parseInt(payload.restaurantId, 10);

  return {
    restaurantId,
    name: payload.name,
    description: payload.description ? String(payload.description) : null,
    price,
    category: payload.category,
    isAvailable: parseBoolean(payload.isAvailable),
    isRecommended: parseBoolean(payload.isRecommended),
  };
};

const getByRestaurant = async (req, res, next) => {
  try {
    const items = await menuService.getByRestaurant(parseInt(req.params.restaurantId));
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const uploadedImageUrl = mapFileToUrl(req.file);
    const payload = normalizeCreateUpdatePayload(req.body);

    const ApiError = require('../../utils/apiError');
    if (!Number.isFinite(payload.restaurantId)) {
      throw ApiError.badRequest('Некорректный restaurantId');
    }
    if (payload.price === undefined) {
      throw ApiError.badRequest('Некорректная цена');
    }

    const item = await menuService.create(req.user.id, {
      restaurantId: payload.restaurantId,
      name: payload.name,
      description: payload.description,
      price: payload.price,
      category: payload.category,
      isAvailable: payload.isAvailable,
      isRecommended: payload.isRecommended,
      ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {}),
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const uploadedImageUrl = mapFileToUrl(req.file);
    const ApiError = require('../../utils/apiError');
    const payload = normalizeCreateUpdatePayload(req.body);

    if (payload.price === undefined) {
      throw ApiError.badRequest('Некорректная цена');
    }

    const item = await menuService.update(parseInt(req.params.id), req.user.id, {
      name: payload.name,
      description: payload.description,
      price: payload.price,
      category: payload.category,
      isAvailable: payload.isAvailable,
      isRecommended: payload.isRecommended,
      ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {}),
    });
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await menuService.remove(parseInt(req.params.id), req.user.id);
    res.json({ success: true, message: 'Позиция удалена' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getByRestaurant, create, update, remove };
