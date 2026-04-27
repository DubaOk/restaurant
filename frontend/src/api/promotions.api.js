import api from './index';

export const promotionsApi = {
  getByRestaurant: (restaurantId) =>
    api.get(`/promotions/restaurant/${restaurantId}`),
  create: (data) => api.post('/promotions', data),
  update: (id, data) => api.put(`/promotions/${id}`, data),
  remove: (id) => api.delete(`/promotions/${id}`),
};
