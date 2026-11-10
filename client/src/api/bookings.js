import { api } from './client.js';

const qs = (params) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') sp.set(k, v);
    });
    const s = sp.toString();
    return s ? `?${s}` : '';
};

/* ---------- Customer ---------- */

// GET /slots?staffId=&serviceId=&date=YYYY-MM-DD&excludeId=
//   -> { slots: [{ start: ISO string, label: "2:30 PM" }] }
export const getSlots = (params) => api.get(`/slots${qs(params)}`);

// POST /bookings  { staffId, serviceId, start }  -> { id }
export const createBooking = (data) => api.post('/bookings', data);

// GET /bookings/mine -> { upcoming: [...], history: [...] }
// har booking: { id, start_time, end_time, status, price, service_name,
//                staff_name, can_change }   (can_change = 2 ghante se zyada baqi)
export const myBookings = () => api.get('/bookings/mine');

// POST /bookings/:id/cancel
export const cancelBooking = (id) => api.post(`/bookings/${id}/cancel`);

// POST /bookings/:id/reschedule  { start }
export const rescheduleBooking = (id, start) => api.post(`/bookings/${id}/reschedule`, { start });

/* ---------- Staff ---------- */

// GET /bookings/schedule?date=YYYY-MM-DD -> { appointments: [...] }
export const mySchedule = (date) =>
    api.get(`/staff/me/schedule${qs({ date })}`);
// PATCH /bookings/:id/status  { status: 'completed' | 'no_show' }
export const setBookingStatus = (id, status) => api.patch(`/bookings/${id}/status`, { status });

/* ---------- Admin ---------- */
export async function getAllBookings(params) {
    const { data } = await client.get('/bookings', { params });
    return data; // { items, total, page, limit }
}
// GET /bookings?q=&status=&page=1&limit=10
//   -> { bookings: [...], total, page, pages }
export const listAllBookings = (params) => api.get(`/bookings${qs(params)}`);