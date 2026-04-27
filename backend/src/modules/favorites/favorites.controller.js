const favoritesService = require('./favorites.service');

const getMyFavorites = async (req, res, next) => {
  try {
    const favorites = await favoritesService.getMyFavorites(req.user.id);
    res.json({ success: true, data: favorites });
  } catch (err) {
    next(err);
  }
};

const add = async (req, res, next) => {
  try {
    const favorite = await favoritesService.add(req.user.id, parseInt(req.body.restaurantId));
    res.status(201).json({ success: true, data: favorite });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await favoritesService.remove(req.user.id, parseInt(req.params.restaurantId));
    res.json({ success: true, message: 'Удалено из избранного' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyFavorites, add, remove };
