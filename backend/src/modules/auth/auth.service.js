const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../utils/prismaClient');
const ApiError = require('../../utils/apiError');
const { jwtSecret, jwtExpiresIn } = require('../../config');

const SALT_ROUNDS = 10;

const generateToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });

const sanitizeUser = (user) => {
  const { password, ...rest } = user;
  return rest;
};

const register = async ({ name, email, password, role }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('Пользователь с таким email уже существует');

  if (role === 'ADMIN') throw ApiError.forbidden('Нельзя зарегистрироваться как администратор');

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role || 'CLIENT' },
  });

  const token = generateToken(user);
  return { token, user: sanitizeUser(user) };
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized('Неверный email или пароль');

  if (user.isBlocked) throw ApiError.forbidden('Ваш аккаунт заблокирован');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw ApiError.unauthorized('Неверный email или пароль');

  const token = generateToken(user);
  return { token, user: sanitizeUser(user) };
};

const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('Пользователь не найден');
  return sanitizeUser(user);
};

const updateProfile = async (userId, { name, phone }) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name, phone },
  });
  return sanitizeUser(user);
};

const updateAvatar = async (userId, avatarUrl) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
  });
  return sanitizeUser(user);
};

module.exports = { register, login, getProfile, updateProfile, updateAvatar };
