import api from './index';

export const tablesApi = {
  /** @param {string|number} restaurantId */
  /** @param {{ at?: string }} [params] ISO date — занятость в окне ±2 ч как при создании брони */
  getByRestaurant: (restaurantId, params = {}) =>
    api.get(`/tables/restaurant/${restaurantId}`, { params }),

  /**
   * Ресторатор: создать стол в зале.
   * @param {{ restaurantId: number; number: number; capacity: number; isAvailable?: boolean }} payload
   */
  create: (payload) => api.post('/tables', payload),

  /**
   * Ресторатор: обновить стол.
   * @param {number} id
   * @param {{ number?: number; capacity?: number; isAvailable?: boolean }} payload
   */
  update: (id, payload) => api.put(`/tables/${id}`, payload),

  /** Ресторатор: удалить стол */
  remove: (id) => api.delete(`/tables/${id}`),
};
