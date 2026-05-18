const { validationResult } = require('express-validator');
const ApiError = require('../../utils/apiError');
const tablesService = require('./tables.service');

const getByRestaurant = async (req, res, next) => {
  try {
    const result = await tablesService.getByRestaurant(
      parseInt(req.params.restaurantId, 10),
      req.query.at || null,
      req.query.excludeReservationId || null
    );
    res.json({ success: true, data: result.tables, adjacentPairs: result.adjacentPairs });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(ApiError.badRequest('Ошибка валидации', errors.array()));

    const table = await tablesService.create(req.user.id, req.body);
    res.status(201).json({ success: true, data: table });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(ApiError.badRequest('Ошибка валидации', errors.array()));

    const table = await tablesService.update(parseInt(req.params.id, 10), req.user.id, req.body);
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

const updateAdjacency = async (req, res, next) => {
  try {
    const table = await tablesService.update(parseInt(req.params.id, 10), req.user.id, {
      adjacentTableIds: req.body.adjacentTableIds ?? [],
    });
    res.json({ success: true, data: table });
  } catch (err) {
    next(err);
  }
};

module.exports = { getByRestaurant, create, update, updateAdjacency, remove };
