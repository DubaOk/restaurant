const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');
const ApiError = require('../utils/apiError');

/**
 * Verifies the Bearer JWT from the Authorization header.
 * On success, attaches decoded payload to req.user = { id, email, role }.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Токен не предоставлен'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return next(ApiError.unauthorized('Недействительный или истёкший токен'));
  }
};

module.exports = { authenticate };
