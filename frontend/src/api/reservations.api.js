import api from './index';

export const reservationsApi = {
  getMyReservations: () => api.get('/reservations/my'),
  getRestaurantReservations: (restaurantId) =>
    api.get(`/reservations/restaurant/${restaurantId}`),
  create: (data) => api.post('/reservations', data),
  update: (id, data) => api.put(`/reservations/${id}`, data),
  cancel: (id) => api.patch(`/reservations/${id}/cancel`),
  confirm: (id) => api.patch(`/reservations/${id}/confirm`),
};
