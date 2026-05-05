require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const { port, nodeEnv } = require('./config');
const errorHandler = require('./utils/errorHandler');

const authRouter = require('./modules/auth/auth.router');
const usersRouter = require('./modules/users/users.router');
const restaurantsRouter = require('./modules/restaurants/restaurants.router');
const reservationsRouter = require('./modules/reservations/reservations.router');
const reviewsRouter = require('./modules/reviews/reviews.router');
const menuRouter = require('./modules/menu/menu.router');
const tablesRouter = require('./modules/tables/tables.router');
const favoritesRouter = require('./modules/favorites/favorites.router');
const bonusesRouter = require('./modules/bonuses/bonuses.router');
const promotionsRouter = require('./modules/promotions/promotions.router');
const analyticsRouter = require('./modules/analytics/analytics.router');
const geoRouter = require('./modules/geo/geo.router');

const app = express();

app.use(cors({ origin: '*', credentials: true }));

if (nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/restaurants', restaurantsRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/menu', menuRouter);
app.use('/api/tables', tablesRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/bonuses', bonusesRouter);
app.use('/api/promotions', promotionsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/geo', geoRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`[Server] Running in ${nodeEnv} mode on port ${port}`);
});

module.exports = app;
