const usersService = require('./users.service');

const getAllUsers = async (req, res, next) => {
  try {
    const users = await usersService.getAllUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

const blockUser = async (req, res, next) => {
  try {
    const user = await usersService.blockUser(parseInt(req.params.id));
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

const unblockUser = async (req, res, next) => {
  try {
    const user = await usersService.unblockUser(parseInt(req.params.id));
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllUsers, blockUser, unblockUser };
