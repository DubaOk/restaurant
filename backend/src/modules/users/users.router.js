const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const controller = require('./users.controller');

router.get('/', authenticate, authorize('ADMIN'), controller.getAllUsers);
router.patch('/:id/block', authenticate, authorize('ADMIN'), controller.blockUser);
router.patch('/:id/unblock', authenticate, authorize('ADMIN'), controller.unblockUser);

module.exports = router;
