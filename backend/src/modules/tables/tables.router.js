const router = require('express').Router();
const { body } = require('express-validator');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const controller = require('./tables.controller');

const createRules = [
  body('restaurantId').isInt({ min: 1 }).withMessage('Укажите ресторан'),
  body('number').isInt({ min: 1 }).withMessage('Номер стола от 1'),
  body('capacity').isInt({ min: 1, max: 50 }).withMessage('Вместимость 1–50'),
  body('isAvailable').optional().isBoolean().withMessage('isAvailable должен быть boolean'),
];

const updateRules = [
  body('number').optional().isInt({ min: 1 }).withMessage('Номер стола от 1'),
  body('capacity').optional().isInt({ min: 1, max: 50 }).withMessage('Вместимость 1–50'),
  body('isAvailable').optional().isBoolean().withMessage('isAvailable должен быть boolean'),
];

router.get('/restaurant/:restaurantId', controller.getByRestaurant);
router.post('/', authenticate, authorize('OWNER'), createRules, controller.create);
router.put('/:id', authenticate, authorize('OWNER'), updateRules, controller.update);
router.patch('/:id/adjacency', authenticate, authorize('OWNER'), controller.updateAdjacency);
router.delete('/:id', authenticate, authorize('OWNER'), controller.remove);

module.exports = router;
