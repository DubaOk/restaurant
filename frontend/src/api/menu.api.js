import api from './index';

export const menuApi = {
  getByRestaurant: (restaurantId) => api.get(`/menu/restaurant/${restaurantId}`),
  create: (data) => api.post('/menu', data),
  update: (id, data) => api.put(`/menu/${id}`, data),
  remove: (id) => api.delete(`/menu/${id}`),
};
