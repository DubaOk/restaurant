import api from './index';

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  updateAvatar: (file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return api.patch('/auth/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
