const tablesService = require('./tables.service');

const getByRestaurant = async (req, res, next) => {
  try {
    const tables = await tablesService.getByRestaurant(parseInt(req.params.restaurantId));
    res.json({ success: true, data: tables });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const table = await tablesService.create(req.user.id, {
      ...req.body,
      restaurantId: parseInt(req.body.restaurantId),
    });
    res.status(201).json({ success: true, data: table });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const table = await tablesService.update(parseInt(req.params.id), req.user.id, req.body);
    res.json({ success: true, data: table });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await tablesService.remove(parseInt(req.params.id), req.user.id);
    res.json({ success: true, message: 'Столик удалён' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getByRestaurant, create, update, remove };
