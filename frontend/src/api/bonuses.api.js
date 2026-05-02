import api from './index';

export const bonusesApi = {
  getMyBalance: () => api.get('/bonuses/balance'),
  getMyTransactions: () => api.get('/bonuses/transactions'),
  spend: (amount, description) => api.post('/bonuses/spend', { amount, description }),
};
