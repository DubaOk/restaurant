const reviewsService = require('./reviews.service');

const getByRestaurant = async (req, res, next) => {
  try {
    const reviews = await reviewsService.getByRestaurant(parseInt(req.params.restaurantId));
    res.json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const review = await reviewsService.create(req.user.id, {
      ...req.body,
      restaurantId: parseInt(req.body.restaurantId),
    });
    res.status(201).json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const review = await reviewsService.update(parseInt(req.params.id), req.user.id, req.body);
    res.json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await reviewsService.remove(parseInt(req.params.id), req.user.id, req.user.role);
    res.json({ success: true, message: 'Отзыв удалён' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getByRestaurant, create, update, remove };
