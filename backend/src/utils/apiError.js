/**
 * Custom application error with HTTP status code.
 * All layers throw ApiError; the global handler converts it to a JSON response.
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Не авторизован') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Доступ запрещён') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Ресурс не найден') {
    return new ApiError(404, message);
  }

  static conflict(message) {
    return new ApiError(409, message);
  }

  static internal(message = 'Внутренняя ошибка сервера') {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;
