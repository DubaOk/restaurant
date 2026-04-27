const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const controller = require('./analytics.controller');

router.get('/restaurant/:restaurantId', authenticate, authorize('OWNER'), controller.getRestaurantStats);

module.exports = router;
