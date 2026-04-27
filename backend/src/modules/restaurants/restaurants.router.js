const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const controller = require('./restaurants.controller');

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', authenticate, authorize('OWNER'), controller.create);
router.put('/:id', authenticate, authorize('OWNER'), controller.update);
router.delete('/:id', authenticate, authorize('OWNER', 'ADMIN'), controller.remove);

module.exports = router;
