import api from './index';

export const bonusesApi = {
  getMyBalance: () => api.get('/bonuses/balance'),
  getMyTransactions: () => api.get('/bonuses/transactions'),
};
