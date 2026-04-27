const prisma = require('../../utils/prismaClient');
const ApiError = require('../../utils/apiError');

const getBalance = async (userId) => {
  const result = await prisma.bonusTransaction.groupBy({
    by: ['type'],
    where: { userId },
    _sum: { amount: true },
  });

  const earned = result.find((r) => r.type === 'EARN')?._sum.amount || 0;
  const spent = result.find((r) => r.type === 'SPEND')?._sum.amount || 0;

  return { balance: earned - spent };
};

const getTransactions = async (userId) =>
  prisma.bonusTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

const earn = async (userId, amount, description) => {
  return prisma.bonusTransaction.create({
    data: { userId, amount, type: 'EARN', description },
  });
};

const spend = async (userId, amount, description) => {
  const { balance } = await getBalance(userId);
  if (balance < amount) throw ApiError.badRequest('Недостаточно бонусов');

  return prisma.bonusTransaction.create({
    data: { userId, amount, type: 'SPEND', description },
  });
};

module.exports = { getBalance, getTransactions, earn, spend };
