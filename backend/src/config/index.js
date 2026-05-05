require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  jwtSecret: process.env.JWT_SECRET || 'fallback_dev_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  /** JavaScript API + HTTP Геокодер (геокод / обратный геокод на сервере) */
  yandexMapsApiKey: process.env.YANDEX_MAPS_API_KEY || '',
  /** API Геосаджеста (подсказки адреса); если не задан — для suggest используется yandexMapsApiKey */
  yandexGeosuggestApiKey: process.env.YANDEX_GEOSUGGEST_API_KEY || '',
};
