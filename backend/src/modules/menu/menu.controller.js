const menuService = require('./menu.service');

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
    const item = await menuService.create(req.user.id, {
      ...req.body,
      restaurantId: parseInt(req.body.restaurantId),
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await menuService.update(parseInt(req.params.id), req.user.id, req.body);
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
