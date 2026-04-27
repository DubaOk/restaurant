const ApiError = require('../utils/apiError');

/**
 * RBAC middleware factory.
 * Usage: router.get('/path', authenticate, authorize('ADMIN', 'OWNER'), controller)
 *
 * @param {...string} roles - Allowed roles (GUEST, CLIENT, OWNER, ADMIN)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Роль '${req.user.role}' не имеет доступа к этому ресурсу`
        )
      );
    }

    next();
  };
};

module.exports = { authorize };
