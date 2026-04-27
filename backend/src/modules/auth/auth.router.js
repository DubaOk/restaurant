const router = require('express').Router();
const { body } = require('express-validator');
const { authenticate } = require('../../middlewares/auth.middleware');
const controller = require('./auth.controller');

const registerRules = [
  body('name').trim().notEmpty().withMessage('Имя обязательно'),
  body('email').isEmail().withMessage('Некорректный email').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Пароль минимум 6 символов'),
  body('role').optional().isIn(['CLIENT', 'OWNER']).withMessage('Недопустимая роль'),
];

const loginRules = [
  body('email').isEmail().withMessage('Некорректный email').normalizeEmail(),
  body('password').notEmpty().withMessage('Пароль обязателен'),
];

router.post('/register', registerRules, controller.register);
router.post('/login', loginRules, controller.login);
router.get('/me', authenticate, controller.getProfile);
router.put('/me', authenticate, controller.updateProfile);

module.exports = router;
