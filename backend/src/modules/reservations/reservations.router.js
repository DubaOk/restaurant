const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const controller = require('./reservations.controller');

router.get('/my', authenticate, authorize('CLIENT'), controller.getMyReservations);
router.get(
  '/restaurant/:restaurantId',
  authenticate,
  authorize('OWNER'),
  controller.getRestaurantReservations
);
router.post('/', authenticate, authorize('CLIENT'), controller.create);
router.patch('/:id', authenticate, authorize('CLIENT'), controller.update);
router.patch('/:id/cancel', authenticate, authorize('CLIENT', 'OWNER'), controller.cancel);
router.patch('/:id/confirm', authenticate, authorize('OWNER'), controller.confirm);
router.patch('/:id/complete', authenticate, authorize('OWNER'), controller.complete);

module.exports = router;
