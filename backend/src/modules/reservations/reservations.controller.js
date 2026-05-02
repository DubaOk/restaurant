const reservationsService = require('./reservations.service');

const getMyReservations = async (req, res, next) => {
  try {
    const reservations = await reservationsService.getMyReservations(req.user.id);
    res.json({ success: true, data: reservations });
  } catch (err) {
    next(err);
  }
};

const getRestaurantReservations = async (req, res, next) => {
  try {
    const reservations = await reservationsService.getRestaurantReservations(
      parseInt(req.params.restaurantId),
      req.user.id
    );
    res.json({ success: true, data: reservations });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const reservation = await reservationsService.create(req.user.id, req.body);
    res.status(201).json({ success: true, data: reservation });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const reservation = await reservationsService.update(
      parseInt(req.params.id),
      req.user.id,
      req.body
    );
    res.json({ success: true, data: reservation });
  } catch (err) {
    next(err);
  }
};

const cancel = async (req, res, next) => {
  try {
    const reservation = await reservationsService.cancel(
      parseInt(req.params.id),
      req.user.id,
      req.user.role
    );
    res.json({ success: true, data: reservation });
  } catch (err) {
    next(err);
  }
};

const confirm = async (req, res, next) => {
  try {
    const reservation = await reservationsService.confirm(parseInt(req.params.id), req.user.id);
    res.json({ success: true, data: reservation });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyReservations, getRestaurantReservations, create, update, cancel, confirm };
