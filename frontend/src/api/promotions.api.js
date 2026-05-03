import api from './index';

export const promotionsApi = {
  getByRestaurant: (restaurantId) =>
    api.get(`/promotions/restaurant/${restaurantId}`),
  getByRestaurantAll: (restaurantId) =>
    api.get(`/promotions/restaurant/${restaurantId}?all=true`),
  create: (data) => api.post('/promotions', data),
  update: (id, data) => api.put(`/promotions/${id}`, data),
  remove: (id) => api.delete(`/promotions/${id}`),
};
