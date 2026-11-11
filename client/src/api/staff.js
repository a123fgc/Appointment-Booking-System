import { api } from './client.js';

// GET /staff  -> { staff: [{ id, name, email, bio, photo_url, active,
//                            hours: [{ weekday, start, end }] }] }
// weekday: 0 = Sunday ... 6 = Saturday, start/end: "HH:MM"
export const listStaff = async () => {
  const data = await api.get('/staff');
  return { staff: data.items ?? [] };
};

// GET /staff/all -> all staff profiles, including inactive, for admin management.
export const listAllStaff = async () => {
  const data = await api.get('/staff/all');
  return { staff: data.items ?? [] };
};
// POST /staff  { name, email, password, bio }   (sirf admin)
export const createStaff = (data) => api.post('/staff', data);

// PUT /staff/:id  { name, bio, active }
export const updateStaff = (id, data) => api.patch(`/staff/${id}`, data);

// PUT /staff/:id/hours  { hours: [{ weekday, start, end }] }
// Jis din ki entry na ho, us din staff off hai
export function saveStaffHours(staffId, hours) {
  return api.put(`/staff/${staffId}/hours`, hours);
}
// PATCH /staff/:id with FormData (field name: "photo") -> { staff }
export const uploadStaffPhoto = (id, file) => {
  const fd = new FormData();
  fd.append('photo', file);
  return api.uploadPatch(`/staff/${id}`, fd);
};

// Staff apni khud ki profile: GET /staff/me  -> { staff: { id, name, bio, photo_url } }
export const myStaffProfile = () => api.get('/staff/me');

export const uploadMyStaffPhoto = (file) => {
  const fd = new FormData();
  fd.append('photo', file);
  return api.uploadPatch('/staff/me/photo', fd);
};