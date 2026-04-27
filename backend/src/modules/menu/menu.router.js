const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const controller = require('./menu.controller');

router.get('/restaurant/:restaurantId', controller.getByRestaurant);
router.post('/', authenticate, authorize('OWNER'), controller.create);
router.put('/:id', authenticate, authorize('OWNER'), controller.update);
router.delete('/:id', authenticate, authorize('OWNER'), controller.remove);

module.exports = router;
