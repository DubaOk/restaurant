import api from './index';

export const adminApi = {
  getUsers: () => api.get('/users'),
  blockUser: (id) => api.patch(`/users/${id}/block`),
  unblockUser: (id) => api.patch(`/users/${id}/unblock`),
  deleteReview: (id) => api.delete(`/reviews/${id}`),
};
