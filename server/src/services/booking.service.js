import { pool, withTransaction } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { checkSlot } from './slots.service.js';
import {
  sendBookingConfirmed,
  sendBookingRescheduled,
  sendBookingCancelled,
} from './email.service.js';

/* ---------- Common query ---------- */

const FROM = `
  FROM bookings b
  JOIN users u     ON u.id = b.customer_id
  JOIN staff s     ON s.id = b.staff_id
  JOIN users su    ON su.id = s.user_id
  JOIN services sv ON sv.id = b.service_id
`;

const COLUMNS = `
  b.id, b.status, b.notes, b.start_time, b.end_time, b.created_at,
  b.customer_id, u.name AS customer_name, u.email AS customer_email,
  b.staff_id,    su.name AS staff_name,   su.email AS staff_email,
  b.service_id,  sv.name AS service_name, sv.duration_min, sv.price_cents
`;

const CUSTOMER_CHANGE_CUTOFF_MS = 2 * 60 * 60 * 1000;

async function fetchBooking(id, db = pool) {
  const { rows } = await db.query(`SELECT ${COLUMNS} ${FROM} WHERE b.id = $1`, [id]);
  return rows[0] || null;
}

// Email ka masla booking ko kharab na kare: alag chalta hai aur error sirf log hota hai
function notify(fn) {
  Promise.resolve()
    .then(fn)
    .catch((err) => console.error('Email nahi gayi:', err.message));
}

// Admin sab dekh sakta hai, customer apni, staff jo booking usay mili ho
function canAccess(user, b) {
  if (user.role === 'admin') return true;
  if (user.role === 'customer') return b.customer_id === user.id;
  if (user.role === 'staff') return user.staffId != null && b.staff_id === user.staffId;
  return false;
}

// Na mile ya ijazat na ho: dono par 404, taake doosron ki booking ka pata na chale
async function getAccessible(id, user, db = pool) {
  const b = await fetchBooking(id, db);
  if (!b || !canAccess(user, b)) throw new HttpError(404, 'Booking nahi mili');
  return b;
}

// LIKE ke khaas characters (% _ \) ko aam harf bana deta hai
const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => '\\' + c);

/* ---------- Banana ---------- */

export async function createBooking({ customerId, serviceId, staffId, date, time, notes }) {
  const id = await withTransaction(async (client) => {
    const { start, end } = await checkSlot({ serviceId, staffId, date, time }, client);

    // Do log ek saath pahunchen to overlap constraint (23P01) doosre ko 409 de deta hai
    const { rows } = await client.query(
      `INSERT INTO bookings (customer_id, staff_id, service_id, start_time, end_time, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [customerId, staffId, serviceId, start, end, notes || '']
    );
    return rows[0].id;
  });

  const booking = await fetchBooking(id);
  notify(() => sendBookingConfirmed(booking));
  return booking;
}

/* ---------- Waqt badalna ---------- */

// Customer apni booking ka waqt badal sakta hai, ya admin. Staff wahi rehta hai.
export async function rescheduleBooking({ id, user, date, time }) {
  if (user.role === 'staff') {
    throw new HttpError(403, 'Is kaam ki ijazat nahi hai');
  }

  const oldStart = await withTransaction(async (client) => {
    // Booking ko lock karte hain taake saath mein cancel/reschedule na ho
    const { rows } = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
    const b = rows[0];

    if (!b || !canAccess(user, b)) throw new HttpError(404, 'Booking nahi mili');
    if (b.status !== 'confirmed') {
      throw new HttpError(400, 'Sirf confirmed booking ka waqt badla ja sakta hai');
    }
    if (
      user.role === 'customer' &&
      b.start_time <= new Date(Date.now() + CUSTOMER_CHANGE_CUTOFF_MS)
    ) {
      throw new HttpError(
        400,
        'Appointment se 2 ghante se kam waqt reh gaya hai, ab tabdeeli nahi ho sakti'
      );
    }

    // excludeBookingId: booking apne purane waqt se na takraye
    const { start, end } = await checkSlot(
      { serviceId: b.service_id, staffId: b.staff_id, date, time, excludeBookingId: b.id },
      client
    );

    await client.query(
      'UPDATE bookings SET start_time = $1, end_time = $2, updated_at = now() WHERE id = $3',
      [start, end, b.id]
    );
    return b.start_time;
  });

  const booking = await fetchBooking(id);
  notify(() => sendBookingRescheduled(booking, oldStart));
  return booking;
}

/* ---------- Cancel / Complete ---------- */

// cancelled: customer (apni), uska staff, ya admin
// completed/no_show: uska staff ya admin
export async function updateBookingStatus({ id, user, status }) {
  await withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
    const b = rows[0];

    if (!b || !canAccess(user, b)) throw new HttpError(404, 'Booking nahi mili');
    if (b.status !== 'confirmed') {
      throw new HttpError(400, `Yeh booking pehle se ${b.status} hai`);
    }

    if (status !== 'cancelled' && user.role === 'customer') {
      throw new HttpError(403, 'Is kaam ki ijazat nahi hai');
    }
    if (
      status === 'cancelled' &&
      user.role === 'customer' &&
      b.start_time <= new Date(Date.now() + CUSTOMER_CHANGE_CUTOFF_MS)
    ) {
      throw new HttpError(
        400,
        'Appointment se 2 ghante se kam waqt reh gaya hai, ab tabdeeli nahi ho sakti'
      );
    }

    await client.query('UPDATE bookings SET status = $1, updated_at = now() WHERE id = $2', [
      status,
      b.id,
    ]);
  });

  const booking = await fetchBooking(id);
  if (status === 'cancelled') {
    notify(() => sendBookingCancelled(booking, user.role));
  }
  return booking;
}

/* ---------- Dekhna ---------- */

export function getBookingForUser(id, user) {
  return getAccessible(id, user);
}

// Customer ki apni saari bookings (naye pehle)
export async function listMyBookings(customerId) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} ${FROM}
      WHERE b.customer_id = $1
      ORDER BY b.start_time DESC`,
    [customerId]
  );
  return rows;
}

// Staff ka ek din ka schedule (date: "YYYY-MM-DD"), waqt ke hisab se
export async function getStaffSchedule({ staffId, range }) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} ${FROM}
      WHERE b.staff_id = $1
        AND b.start_time >= $2
        AND b.start_time <  $3
      ORDER BY b.start_time ASC`,
    [staffId, range.start, range.end]
  );
  return rows;
}

// Admin: saari bookings, search + status filter + pagination
export async function listAllBookings({ q, status, page, limit }) {
  const where = [];
  const params = [];

  if (status) {
    params.push(status);
    where.push(`b.status = $${params.length}`);
  }

  if (q) {
    params.push(`%${escapeLike(q)}%`);
    const i = params.length;
    where.push(
      `(u.name ILIKE $${i} OR u.email ILIKE $${i} OR su.name ILIKE $${i} OR sv.name ILIKE $${i})`
    );
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) AS total ${FROM} ${whereSql}`,
    params
  );
  const total = countRows[0].total;

  const { rows: items } = await pool.query(
    `SELECT ${COLUMNS} ${FROM} ${whereSql}
      ORDER BY b.start_time DESC, b.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit]
  );

  return { items, total, page, limit };
}