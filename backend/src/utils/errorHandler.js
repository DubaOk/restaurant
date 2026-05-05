const ApiError = require('./apiError');
const { nodeEnv } = require('../config');

/**
 * Express global error-handling middleware.
 * Must be registered LAST via app.use(errorHandler).
 */
const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  if (nodeEnv !== 'production') {
    console.error('[Unhandled Error]', err);
  }

  return res.status(500).json({
    success: false,
    message: nodeEnv !== 'production' && err?.message ? err.message : 'Внутренняя ошибка сервера',
  });
};

module.exports = errorHandler;
