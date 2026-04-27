const prisma = require('../../utils/prismaClient');
const ApiError = require('../../utils/apiError');

const getAllUsers = async () => {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, phone: true, isBlocked: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
};

const blockUser = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('Пользователь не найден');
  if (user.role === 'ADMIN') throw ApiError.forbidden('Нельзя заблокировать администратора');

  return prisma.user.update({
    where: { id: userId },
    data: { isBlocked: true },
    select: { id: true, name: true, email: true, role: true, isBlocked: true },
  });
};

const unblockUser = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('Пользователь не найден');

  return prisma.user.update({
    where: { id: userId },
    data: { isBlocked: false },
    select: { id: true, name: true, email: true, role: true, isBlocked: true },
  });
};

module.exports = { getAllUsers, blockUser, unblockUser };
