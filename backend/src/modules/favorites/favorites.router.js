const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const controller = require('./favorites.controller');

router.get('/', authenticate, authorize('CLIENT'), controller.getMyFavorites);
router.post('/', authenticate, authorize('CLIENT'), controller.add);
router.delete('/:restaurantId', authenticate, authorize('CLIENT'), controller.remove);

module.exports = router;
