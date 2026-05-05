import api from './index';

const toFormData = (data = {}) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (key === 'image' && value instanceof File) {
      formData.append('image', value);
      return;
    }
    formData.append(key, String(value));
  });
  return formData;
};

export const menuApi = {
  getByRestaurant: (restaurantId) => api.get(`/menu/restaurant/${restaurantId}`),
  create: (data) =>
    api.post('/menu', toFormData(data), {
      // Важно: убираем заголовок, чтобы axios корректно поставил boundary для multipart.
      headers: { 'Content-Type': undefined },
    }),
  update: (id, data) =>
    api.put(`/menu/${id}`, toFormData(data), {
      headers: { 'Content-Type': undefined },
    }),
  remove: (id) => api.delete(`/menu/${id}`),
};
