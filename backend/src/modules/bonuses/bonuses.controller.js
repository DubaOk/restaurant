const bonusesService = require('./bonuses.service');

const getBalance = async (req, res, next) => {
  try {
    const data = await bonusesService.getBalance(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getTransactions = async (req, res, next) => {
  try {
    const transactions = await bonusesService.getTransactions(req.user.id);
    res.json({ success: true, data: transactions });
  } catch (err) {
    next(err);
  }
};

const spend = async (req, res, next) => {
  try {
    const tx = await bonusesService.spend(
      req.user.id,
      parseInt(req.body.amount),
      req.body.description || 'Списание бонусов'
    );
    res.status(201).json({ success: true, data: tx });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBalance, getTransactions, spend };
