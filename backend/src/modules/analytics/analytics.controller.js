const analyticsService = require('./analytics.service');

const getRestaurantStats = async (req, res, next) => {
  try {
    const stats = await analyticsService.getRestaurantStats(
      parseInt(req.params.restaurantId),
      req.user.id
    );
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

module.exports = { getRestaurantStats };
