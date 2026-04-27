const promotionsService = require('./promotions.service');

const getByRestaurant = async (req, res, next) => {
  try {
    const promotions = await promotionsService.getByRestaurant(parseInt(req.params.restaurantId));
    res.json({ success: true, data: promotions });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const promotion = await promotionsService.create(req.user.id, {
      ...req.body,
      restaurantId: parseInt(req.body.restaurantId),
    });
    res.status(201).json({ success: true, data: promotion });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const promotion = await promotionsService.update(
      parseInt(req.params.id),
      req.user.id,
      req.body
    );
    res.json({ success: true, data: promotion });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await promotionsService.remove(parseInt(req.params.id), req.user.id);
    res.json({ success: true, message: 'Акция удалена' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getByRestaurant, create, update, remove };
