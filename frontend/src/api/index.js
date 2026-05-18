import axios from 'axios';

/**
 * Axios instance pre-configured with the base URL and JWT interceptor.
 * All API modules import this instance instead of raw axios.
 */
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const AUTH_PUBLIC_PATHS = ['/auth/login', '/auth/register'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const path = error.config?.url ?? '';
    const isAuthFormRequest = AUTH_PUBLIC_PATHS.some((p) => path.includes(p));

    // 401 при входе/регистрации — показать ошибку на форме, не перезагружать страницу
    if (status === 401 && !isAuthFormRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
