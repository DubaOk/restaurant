import api from './index';

const buildRestaurantFormData = (data = {}) => {
  const formData = new FormData();

  const scalarFields = [
    'name',
    'description',
    'city',
    'address',
    'cuisine',
    'phone',
    'openTime',
    'closeTime',
    'latitude',
    'longitude',
  ];

  scalarFields.forEach((field) => {
    const value = data[field];
    if (value !== undefined && value !== null && value !== '') {
      formData.append(field, value);
    }
  });

  if (Array.isArray(data.existingImages)) {
    formData.append('existingImages', JSON.stringify(data.existingImages));
  }

  if (Array.isArray(data.images)) {
    data.images.forEach((file) => formData.append('images', file));
  }

  return formData;
};

export const restaurantsApi = {
  getAll: (params) => api.get('/restaurants', { params }),
  getById: (id) => api.get(`/restaurants/${id}`),
  create: (data) => api.post('/restaurants', buildRestaurantFormData(data)),
  update: (id, data) => api.put(`/restaurants/${id}`, buildRestaurantFormData(data)),
  remove: (id) => api.delete(`/restaurants/${id}`),
};
