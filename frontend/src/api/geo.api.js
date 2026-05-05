import api from './index';

export const geoApi = {
  suggest: (params) => api.get('/geo/suggest', { params }),
  geocode: (params) => api.get('/geo/geocode', { params }),
  reverse: (params) => api.get('/geo/reverse', { params }),
};
