import api from './index';

export const analyticsApi = {
  getRestaurantStats: (restaurantId) =>
    api.get(`/analytics/restaurant/${restaurantId}`),
};
