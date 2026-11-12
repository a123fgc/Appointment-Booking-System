import { api } from './client.js';

const qs = (params) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export const listCustomers = (params) => api.get(`/customers${qs(params)}`);

export const listCustomerBookings = (id, params) =>
  api.get(`/customers/${id}/bookings${qs(params)}`);
