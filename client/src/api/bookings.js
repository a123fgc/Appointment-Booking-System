import { api } from './client.js';
import { formatTime } from '../utils/date.js';

const qs = (params) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') sp.set(k, v);
    });
    const s = sp.toString();
    return s ? `?${s}` : '';
};

/* ---------- Customer ---------- */

// GET /slots?staffId=&serviceId=&date=YYYY-MM-DD -> { items: [...] }
// Adapt backend slot fields to the SlotPicker contract.
export const getSlots = async (params) => {
    const data = await api.get(`/slots${qs(params)}`);
    if (!Array.isArray(data?.items)) {
        throw new Error('Slots API returned an invalid response.');
    }

    return {
        slots: data.items.map((slot) => ({
            ...slot,
            label: formatTime(slot.start),
        })),
    };
};

// POST /bookings { staffId, serviceId, date, time } -> { booking }
export const createBooking = (data) => api.post('/bookings', data);

// GET /bookings/mine -> { items: [...] }; split and adapt rows for customer pages.
export const myBookings = async () => {
    const data = await api.get('/bookings/mine');
    if (!Array.isArray(data?.items)) {
        throw new Error('Appointments API returned an invalid response.');
    }

    const now = Date.now();
    const changeCutoff = now + 2 * 60 * 60 * 1000;
    const upcoming = [];
    const history = [];

    for (const item of data.items) {
        const booking = {
            ...item,
            price: Number(item.price_cents) / 100,
            can_change:
                item.status === 'confirmed' &&
                new Date(item.start_time).getTime() > changeCutoff,
        };

        if (item.status === 'confirmed' && new Date(item.start_time).getTime() > now) {
            upcoming.push(booking);
        } else {
            history.push(booking);
        }
    }

    return { upcoming, history };
};

// PATCH /bookings/:id/status { status: 'cancelled' }
export const cancelBooking = (id) =>
    api.patch(`/bookings/${id}/status`, { status: 'cancelled' });

// PATCH /bookings/:id/reschedule { date, time }
export const rescheduleBooking = (id, date, time) =>
    api.patch(`/bookings/${id}/reschedule`, { date, time });

/* ---------- Staff ---------- */

// GET /bookings/schedule?date=YYYY-MM-DD -> { appointments: [...] }
export const mySchedule = (date) =>
    api.get(`/staff/me/schedule${qs({ date })}`);
// PATCH /bookings/:id/status  { status: 'completed' | 'no_show' }
export const setBookingStatus = (id, status) => api.patch(`/bookings/${id}/status`, { status });

/* ---------- Admin ---------- */
export async function getAllBookings(params) {
    return api.get(`/bookings${qs(params)}`);
}
// GET /bookings?q=&status=&page=1&limit=10
//   -> { bookings: [...], total, page, pages }
export const listAllBookings = (params) => api.get(`/bookings${qs(params)}`);