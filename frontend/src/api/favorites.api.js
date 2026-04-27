import api from './index';

export const favoritesApi = {
  getMyFavorites: () => api.get('/favorites'),
  add: (restaurantId) => api.post('/favorites', { restaurantId }),
  remove: (restaurantId) => api.delete(`/favorites/${restaurantId}`),
};
