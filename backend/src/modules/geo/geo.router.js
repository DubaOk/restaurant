const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const controller = require('./geo.controller');

router.get('/suggest', authenticate, authorize('OWNER'), controller.suggest);
router.get('/geocode', authenticate, authorize('OWNER'), controller.geocode);
router.get('/reverse', authenticate, authorize('OWNER'), controller.reverse);

module.exports = router;
