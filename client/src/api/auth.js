import { api } from './client.js';
// const data = await api.post('/auth/login', { email, password });
// const services = await api.get('/services');

export const loginRequest = (email, password) =>
  api.post('/auth/login', { email, password });

export const signupRequest = (name, email, password) =>
  api.post('/auth/signup', { name, email, password });

export const logoutRequest = () => api.post('/auth/logout');

// Page refresh par check karta hai ke user abhi login hai ya nahi
export const meRequest = () => api.get('/auth/me');