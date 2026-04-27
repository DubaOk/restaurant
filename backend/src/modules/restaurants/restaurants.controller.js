const restaurantsService = require('./restaurants.service');

const getAll = async (req, res, next) => {
  try {
    const restaurants = await restaurantsService.getAll(req.query);
    res.json({ success: true, data: restaurants });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const restaurant = await restaurantsService.getById(parseInt(req.params.id));
    res.json({ success: true, data: restaurant });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const restaurant = await restaurantsService.create(req.user.id, req.body);
    res.status(201).json({ success: true, data: restaurant });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const restaurant = await restaurantsService.update(
      parseInt(req.params.id),
      req.user.id,
      req.body
    );
    res.json({ success: true, data: restaurant });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await restaurantsService.remove(parseInt(req.params.id), req.user.id);
    res.json({ success: true, message: 'Ресторан удалён' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove };
