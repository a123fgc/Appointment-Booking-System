
import { api } from './client.js';

// Services load karna
export const listServices = async (all = false) => {
  const data = await api.get(`/services${all ? '/all' : ''}`);
  return data.items || [];
};

// Nayi service add karna
export const createService = (data) =>
  api.post('/services', {
    name: data.name,
    durationMin: Number(data.duration_min),
    priceCents: Number(data.price) * 100,
  });

// Existing service update karna
export const updateService = (id, data) =>
  api.patch(`/services/${id}`, {
    name: data.name,
    durationMin: Number(data.duration_min),
    priceCents: Number(data.price) * 100,
  });

// Service active/inactive karna
export const setServiceActive = (id, active) =>
  api.patch(`/services/${id}`, { active });
