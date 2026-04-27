const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const controller = require('./bonuses.controller');

router.get('/balance', authenticate, authorize('CLIENT'), controller.getBalance);
router.get('/transactions', authenticate, authorize('CLIENT'), controller.getTransactions);
router.post('/spend', authenticate, authorize('CLIENT'), controller.spend);

module.exports = router;
