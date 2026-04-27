const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const controller = require('./reviews.controller');

router.get('/restaurant/:restaurantId', controller.getByRestaurant);
router.post('/', authenticate, authorize('CLIENT'), controller.create);
router.put('/:id', authenticate, authorize('CLIENT'), controller.update);
router.delete('/:id', authenticate, authorize('CLIENT', 'ADMIN'), controller.remove);

module.exports = router;
