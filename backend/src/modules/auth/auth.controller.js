const { validationResult } = require('express-validator');
const ApiError = require('../../utils/apiError');
const authService = require('./auth.service');

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(ApiError.badRequest('Ошибка валидации', errors.array()));

    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(ApiError.badRequest('Ошибка валидации', errors.array()));

    const result = await authService.login(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) return next(new Error('Файл не загружен'));
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await authService.updateAvatar(req.user.id, avatarUrl);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getProfile, updateProfile, updateAvatar };
